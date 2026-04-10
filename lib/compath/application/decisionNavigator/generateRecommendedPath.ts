/**
 * 推奨パス全体生成
 * - セッション作成時に推奨パスを一括生成
 * - LLMを使用して動的に推奨パスを生成
 * - フォールバック: テンプレートベースの生成
 */

import { generateId, getTimestamp } from "./utils";
import type {
  DecisionFlowNode,
  DecisionFlowEdge,
  DecisionLevel,
  GeneratedOption,
  RecommendedPath,
  DecisionPoint,
  AlternativeOption,
  LayoutHints,
  LayoutLane,
  DecisionContext,
  SupportMode,
  PreconditionData,
  CriteriaLabel,
  ColumnState,
  ThinkingPattern,
} from "./types";
import {
  generateInitialOptions,
  generateNextOptions,
} from "./generateOptions";
import { generateRationalePresets, generatePresetsForThinkingPattern } from "../../domain/decisionNavigator/rationalePresets";
import { LAYOUT, LAYOUT_V2 } from "../../domain/decisionNavigator/layoutConstants";
import { calculateGoalPosition } from "../../domain/decisionNavigator/layoutHelpers";
import type { SelectionHistoryEntry } from "./types";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { buildRecommendedPathPromptSet } from "./llm/recommendedPathPrompt";
import { parseDecisionTreeResponse, buildRetryPrompt, type LLMDecisionTreeResponse, type LLMTreeNode, type LLMCriteriaOrder } from "./llm/llmParser";
import { THINKING_PATTERN_LABELS } from "./types";
import { createEmptyContext } from "./contextBuilder";
import { env } from "../../config/env";
import { debugLog } from "../../infrastructure/logger";

/** スコア差の閾値 */
const SCORE_THRESHOLDS = {
  CONTENDER: 10, // この差以内は有力候補
  COLLAPSE: 20, // この差以上は初期折りたたみ
};

/** 生成モード */
export type GenerationMode = "llm" | "template" | "fallback";

/**
 * 推奨パス全体を生成
 *
 * LLMによる動的生成を優先し、失敗時はテンプレートベースにフォールバック。
 *
 * @param purpose 目的
 * @param documentContext 文書コンテキスト（オプション）
 * @param currentSituation 現状（オプション）
 * @param supportMode 支援モード（デフォルト: thinking）
 * @param preconditions 前提条件（オプション）
 * @param thinkingStrategy 思考戦略ID（オプション、指定時はstrategy経由でプロンプト生成）
 */
export async function generateRecommendedPath(
  purpose: string,
  documentContext?: string,
  currentSituation?: string,
  supportMode: SupportMode = "thinking",
  preconditions?: PreconditionData,
  thinkingStrategy?: import("../../domain/decisionNavigator/strategies/IThinkingStrategy").ThinkingStrategyId
): Promise<{
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  recommendedPath: RecommendedPath;
  decisionPoints: DecisionPoint[];
  layoutHints: LayoutHints;
  startNodeId: string;
  generationMode: GenerationMode;
  decisionContext: DecisionContext;
  // Phase 8: 判断軸ラベル化
  criteriaLabels?: CriteriaLabel[];
  columnStates?: ColumnState[];
  currentColumnIndex?: number;
  totalColumns?: number;
}> {
  // DecisionContextを作成
  const context = createEmptyContext(purpose, currentSituation);
  if (documentContext) {
    context.documentSummary = documentContext;
  }

  // Phase 5改改: 前提条件をコンテキストに反映
  if (preconditions) {
    const preconditionTexts: string[] = [];
    for (const cond of preconditions.conditions) {
      if (cond.isSelected || cond.detail) {
        const detail = cond.detail ? `: ${cond.detail}` : "";
        preconditionTexts.push(`- ${cond.label}${detail}`);
      }
    }
    if (preconditions.additionalContext) {
      preconditionTexts.push(`- 補足: ${preconditions.additionalContext}`);
    }
    if (preconditionTexts.length > 0) {
      context.constraints = [
        ...(context.constraints || []),
        ...preconditionTexts.map(t => t.replace(/^- /, "")),
      ];
    }
  }

  // LLM APIキーがある場合はLLM生成を試行
  if (env.anthropicApiKey) {
    try {
      debugLog("generateRecommendedPath", "Attempting LLM generation...", { supportMode, thinkingStrategy });
      const result = await generateRecommendedPathWithLLM(context, supportMode, thinkingStrategy);
      return {
        ...result,
        generationMode: "llm",
        decisionContext: context,
        // Phase 8: 判断軸ラベル情報
        criteriaLabels: result.criteriaLabels,
        columnStates: result.columnStates,
        currentColumnIndex: result.currentColumnIndex,
        totalColumns: result.totalColumns,
      };
    } catch (error) {
      console.warn("[generateRecommendedPath] LLM generation failed, falling back to template:", error);
    }
  }

  // フォールバック: テンプレートベースの生成
  debugLog("generateRecommendedPath", "Using template-based generation");
  const result = await generateRecommendedPathWithTemplate(purpose, documentContext, preconditions);
  return {
    ...result,
    generationMode: "fallback",
    decisionContext: context,
  };
}

/**
 * LLMを使用して推奨パスを生成
 * Phase 4: 支援モードに応じたプロンプトを使用
 * - thinking: 最初から根拠付きの具体値を提示（1層で決定）
 * - process: 従来の3階層構造（strategy→tactic→action）
 */
async function generateRecommendedPathWithLLM(
  context: DecisionContext,
  supportMode: SupportMode = "thinking",
  thinkingStrategy?: import("../../domain/decisionNavigator/strategies/IThinkingStrategy").ThinkingStrategyId
): Promise<{
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  recommendedPath: RecommendedPath;
  decisionPoints: DecisionPoint[];
  layoutHints: LayoutHints;
  startNodeId: string;
  // Phase 8: 判断軸ラベル化
  criteriaLabels?: CriteriaLabel[];
  columnStates?: ColumnState[];
  currentColumnIndex?: number;
  totalColumns?: number;
}> {
  const { systemPrompt, userPrompt } = buildRecommendedPathPromptSet(context, supportMode, thinkingStrategy);

  debugLog("generateRecommendedPathWithLLM", "Calling LLM for full recommended path...", { supportMode, thinkingStrategy });

  // LLM呼び出し (Phase 11: 推奨ルート全階層＋代替選択肢を一括生成)
  let response = await generateChatCompletion({
    systemPrompt,
    userContent: userPrompt,
    maxTokens: 4096,  // 全階層生成のため増加
    temperature: 0.7,
  });

  debugLog("generateRecommendedPathWithLLM", "LLM response received, length:", response?.length ?? 0);

  // 新しいツリー形式でパース
  let parseResult = parseDecisionTreeResponse(response);

  // パース失敗時は1回リトライ
  if (!parseResult.success) {
    console.warn("[generateRecommendedPathWithLLM] First parse failed, retrying:", parseResult.error);
    const retryPrompt = buildRetryPrompt(userPrompt, parseResult.error);
    response = await generateChatCompletion({
      systemPrompt,
      userContent: retryPrompt,
      maxTokens: 4096,
      temperature: 0.5,
    });
    parseResult = parseDecisionTreeResponse(response);

    if (!parseResult.success) {
      throw new Error(`LLM parse failed after retry: ${parseResult.error}`);
    }
  }

  const llmResponse = parseResult.data;

  debugLog("generateRecommendedPathWithLLM", "Parse success! Nodes:", llmResponse.tree.nodes.length);

  // Phase 9: ツリー形式のLLMレスポンスをグラフ構造に変換
  return convertDecisionTreeToGraph(context.purpose, llmResponse);
}

/**
 * Phase 9/21/22: ツリー形式のLLMレスポンスをグラフ構造に変換
 *
 * Phase 22: 放射状展開UI
 * - 判断軸（criteria）= CriteriaNode として表示（ノード）
 * - 選択肢（strategy）= 最初は非表示、CriteriaNodeのデータとして保持
 * - ホバーで放射状に展開、選択すると隣接配置
 * - 判断軸ノード間はAI推奨順序でエッジ接続
 */
function convertDecisionTreeToGraph(
  purpose: string,
  llmResponse: LLMDecisionTreeResponse
): {
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  recommendedPath: RecommendedPath;
  decisionPoints: DecisionPoint[];
  layoutHints: LayoutHints;
  startNodeId: string;
  // Phase 8: 判断軸ラベル化
  criteriaLabels?: CriteriaLabel[];
  columnStates?: ColumnState[];
  currentColumnIndex?: number;
  totalColumns?: number;
} {
  const nodes: DecisionFlowNode[] = [];
  const edges: DecisionFlowEdge[] = [];
  const recommendedNodeIds: string[] = [];
  const recommendedEdgeIds: string[] = [];
  const decisionPoints: DecisionPoint[] = [];
  const laneOrder: Record<string, LayoutLane> = {};
  const now = getTimestamp();

  // Phase 8: 判断軸ラベル（ノードではない、後方互換用）
  const criteriaLabels: CriteriaLabel[] = [];

  // Phase 23: スタートノードID（後で定義）
  let startNodeId = "";

  // LLMノードをIDでマッピング
  const llmNodeMap = new Map<string, LLMTreeNode>();
  for (const llmNode of llmResponse.tree.nodes) {
    llmNodeMap.set(llmNode.id, llmNode);
  }

  // 推奨パスのノードIDセット
  const recommendedPathSet = new Set(llmResponse.recommendedPath);

  // ============================================================
  // Phase 22: 放射状展開UI - 判断軸をCriteriaNodeとして生成
  // ============================================================

  // Step 1: criteria（判断軸）とoutcome（ゴール）を抽出
  const criteriaLLMNodes: LLMTreeNode[] = [];
  const outcomeNodes: LLMTreeNode[] = [];
  const strategyNodesByCriteria = new Map<string, LLMTreeNode[]>();

  for (const llmNode of llmResponse.tree.nodes) {
    if (llmNode.level === "criteria") {
      criteriaLLMNodes.push(llmNode);
    } else if (llmNode.level === "outcome") {
      outcomeNodes.push(llmNode);
    } else if (llmNode.level === "strategy") {
      // 親（criteria）ごとにグループ化
      const parentId = llmNode.parentId ?? "orphan";
      if (!strategyNodesByCriteria.has(parentId)) {
        strategyNodesByCriteria.set(parentId, []);
      }
      strategyNodesByCriteria.get(parentId)!.push(llmNode);
    }
  }

  // criteriaOrderがあればそれを使用、なければparentIdチェーンでソート
  const criteriaOrderMap = new Map<string, {
    order: number;
    reason?: string;
    isPreSelected?: boolean;
    preSelectedValue?: string;
    preSelectedReason?: string;
    // Phase 24: パス名
    thinkingPattern?: ThinkingPattern;
    pathName?: string;
  }>();

  // [DEBUG] LLM criteriaOrderのログ出力
  debugLog("generateRecommendedPath", "LLM criteriaOrder:", JSON.stringify(llmResponse.criteriaOrder, null, 2));

  if (llmResponse.criteriaOrder && llmResponse.criteriaOrder.length > 0) {
    // LLMが決定した順序を使用
    for (const orderItem of llmResponse.criteriaOrder) {
      criteriaOrderMap.set(orderItem.criteriaId, {
        order: orderItem.order,
        reason: orderItem.reason,
        isPreSelected: orderItem.isPreSelected,
        preSelectedValue: orderItem.preSelectedValue,
        preSelectedReason: orderItem.preSelectedReason,
        // Phase 24: パス名（thinkingPatternから生成、または明示的に指定）
        thinkingPattern: orderItem.thinkingPattern,
        pathName: orderItem.pathName ?? (orderItem.thinkingPattern ? THINKING_PATTERN_LABELS[orderItem.thinkingPattern] : undefined),
      });
    }
    // criteriaOrderの順序でソート
    criteriaLLMNodes.sort((a, b) => {
      const aOrder = criteriaOrderMap.get(a.id)?.order ?? 999;
      const bOrder = criteriaOrderMap.get(b.id)?.order ?? 999;
      return aOrder - bOrder;
    });
  } else {
    // フォールバック: parentIdチェーンに基づく順序
    function getCriteriaOrder(node: LLMTreeNode): number {
      let order = 0;
      let current: LLMTreeNode | undefined = node;
      while (current && current.parentId) {
        order++;
        current = llmNodeMap.get(current.parentId);
      }
      return order;
    }
    criteriaLLMNodes.sort((a, b) => getCriteriaOrder(a) - getCriteriaOrder(b));
  }

  // Step 2: 判断軸と選択肢を生成（最初から全て表示）
  // 判断軸 = 問いノード（左）
  // 選択肢 = アクションノード（右、縦に並ぶ）
  // AIの推奨は最初から選択状態

  let rowIndex = 0;
  const criteriaIdToRowIndex = new Map<string, number>();
  const criteriaNodeIds: string[] = [];

  // Phase 23: スタートノードを作成
  startNodeId = "start-node";
  const totalCriteriaCount = criteriaLLMNodes.length;
  // スタートノードのY位置は全判断軸の中央
  const startNodeY = LAYOUT_V2.START_Y + ((totalCriteriaCount - 1) * LAYOUT_V2.ROW_SPACING) / 2;
  const startNode: DecisionFlowNode = {
    id: startNodeId,
    type: "start",
    level: "strategy",
    label: "スタート",
    description: "以下の問いに答えて、最適な判断を導きましょう",
    status: "selected",
    pathRole: "recommended",
    isRecommended: true,
    isSelectable: false,
    lane: 0,
    depth: -1, // 判断軸より前
    position: {
      x: LAYOUT_V2.START_X - 300, // 判断軸の左側
      y: startNodeY,
    },
    createdAt: now,
    source: "ai_generated",
  };
  nodes.push(startNode);

  // 選択肢の縦配置用のオフセット計算
  const OPTION_X_OFFSET = 280; // 判断軸の右に配置
  const OPTION_Y_SPACING = 90; // 選択肢間の縦間隔（ノード高さ考慮）

  for (const criteriaLLMNode of criteriaLLMNodes) {
    // ラベルテキストから「判断軸N:」を除去して問いの形式にする
    let question = criteriaLLMNode.label;
    if (question.includes(":")) {
      question = question.split(":").slice(1).join(":").trim();
    }
    // 「？」で終わっていなければ追加
    if (!question.endsWith("？") && !question.endsWith("?")) {
      question = question + "？";
    }

    // LLMの順序情報を取得
    const orderInfo = criteriaOrderMap.get(criteriaLLMNode.id);

    // 後方互換: CriteriaLabel を生成
    const label: CriteriaLabel = {
      id: criteriaLLMNode.id,
      columnIndex: rowIndex,
      question,
      description: criteriaLLMNode.description,
      order: orderInfo?.order ?? rowIndex + 1,
      orderReason: orderInfo?.reason,
      isPreSelected: orderInfo?.isPreSelected,
      preSelectedValue: orderInfo?.preSelectedValue,
      preSelectedReason: orderInfo?.preSelectedReason,
      // Phase 24: パス名
      thinkingPattern: orderInfo?.thinkingPattern,
      pathName: orderInfo?.pathName,
    };
    criteriaLabels.push(label);
    criteriaIdToRowIndex.set(criteriaLLMNode.id, rowIndex);

    // この判断軸の選択肢を取得（推奨を先頭にソート後、最大3つに制限）
    const allStrategies = strategyNodesByCriteria.get(criteriaLLMNode.id) || [];
    // 推奨を先頭にソート
    allStrategies.sort((a, b) => {
      const aRec = a.isRecommended ? 0 : 1;
      const bRec = b.isRecommended ? 0 : 1;
      return aRec - bRec;
    });
    // 認知負荷軽減: 1つの判断軸あたり最大3つの選択肢に制限
    const MAX_OPTIONS_PER_CRITERIA = 3;
    const strategies = allStrategies.slice(0, MAX_OPTIONS_PER_CRITERIA);

    // 判断軸の基準Y座標
    const criteriaBaseY = LAYOUT_V2.START_Y + rowIndex * LAYOUT_V2.ROW_SPACING;

    // 判断軸ノード（問い）を生成（番号付き）
    // Phase 23: questionReasonを追加（orderReasonを使用、なければdescriptionを使用）
    const questionReason = orderInfo?.reason || criteriaLLMNode.description || "この問いへの回答がゴールへの道筋を明確にします";

    const criteriaNode: DecisionFlowNode = {
      id: criteriaLLMNode.id,
      type: "decision",
      level: "criteria",
      label: `${rowIndex + 1}. ${question}`,
      description: criteriaLLMNode.description,
      status: "available",
      pathRole: "recommended",
      isRecommended: true,
      isSelectable: true, // 問いをクリック可能に（ポップオーバー表示用）
      lane: 0,
      depth: rowIndex,
      position: {
        x: LAYOUT_V2.START_X,
        y: criteriaBaseY,
      },
      createdAt: now,
      source: "ai_generated",
      metadata: {
        granularityScore: 50,
        reversibilityScore: 80,
        costScore: 30,
        depth: rowIndex,
      },
      veteranInsight: criteriaLLMNode.description,
      questionReason, // Phase 23: なぜこれを聞くのか
      // Phase 24: パス名（思考パターン）
      pathName: orderInfo?.pathName,
      thinkingPattern: orderInfo?.thinkingPattern,
    };

    nodes.push(criteriaNode);
    criteriaNodeIds.push(criteriaLLMNode.id);
    recommendedNodeIds.push(criteriaLLMNode.id);
    laneOrder[criteriaLLMNode.id] = 0;

    // Phase 23: スタートノードから判断軸への破線エッジを追加
    const startToCriteriaEdge: DecisionFlowEdge = {
      id: `edge-${startNodeId}-${criteriaLLMNode.id}`,
      source: startNodeId,
      target: criteriaLLMNode.id,
      type: "available", // 破線
      sourceHandle: "right",
      targetHandle: "left",
    };
    edges.push(startToCriteriaEdge);

    // 選択肢ノードを生成（最初から表示、推奨は選択状態）
    const optionCount = strategies.length;
    const totalOptionsHeight = (optionCount - 1) * OPTION_Y_SPACING;
    const optionStartY = criteriaBaseY - totalOptionsHeight / 2;

    for (let i = 0; i < strategies.length; i++) {
      const strategy = strategies[i];
      const isRecommended = strategy.isRecommended ?? false;

      const optionNode: DecisionFlowNode = {
        id: strategy.id,
        type: "action",
        level: "strategy",
        label: strategy.label,
        description: strategy.description,
        confidence: strategy.risk ? 100 - strategy.risk.score : 70,
        riskLevel: strategy.risk?.level ?? "medium",
        riskStrategy: strategy.riskStrategy,
        // 全て未選択で開始（推奨はpathRoleで表示区別）
        status: "available",
        pathRole: isRecommended ? "recommended" : "alternative",
        isRecommended,
        recommendationReason: isRecommended ? strategy.description : undefined,
        isSelectable: true, // 推奨も含め全ての選択肢を選択可能に
        lane: i + 1, // 選択肢は右側（lane 1以降）
        depth: rowIndex,
        position: {
          x: LAYOUT_V2.START_X + OPTION_X_OFFSET,
          y: optionStartY + i * OPTION_Y_SPACING,
        },
        parentId: criteriaLLMNode.id,
        createdAt: now,
        selectedAt: undefined,
        source: "ai_generated",
        // 親判断軸の思考パターンに基づいたプリセットを設定
        rationalePresets: generatePresetsForThinkingPattern(orderInfo?.thinkingPattern),
      };

      nodes.push(optionNode);
      laneOrder[strategy.id] = i + 1;

      // 判断軸から選択肢へのエッジを生成（全て未選択、推奨は"recommended"で視覚区別）
      const edgeType = isRecommended ? "recommended" : "available";
      const edge: DecisionFlowEdge = {
        id: `edge-${criteriaLLMNode.id}-${strategy.id}`,
        source: criteriaLLMNode.id,
        target: strategy.id,
        sourceHandle: "right",
        targetHandle: "left",
        type: edgeType,
        isRecommended,
      };
      edges.push(edge);

      if (isRecommended) {
        recommendedNodeIds.push(strategy.id);
        recommendedEdgeIds.push(edge.id);

        // Phase 22: 推奨ノード（選択状態）にも探索ノードを追加
        // Phase 26: 最初は非表示、理由を設定した場合のみ表示
        const explorationNodeId = `exploration-${strategy.id}`;
        const explorationNode: DecisionFlowNode = {
          id: explorationNodeId,
          type: "action",
          level: "strategy",
          label: "＋ 新しい観点を追加",
          description: "AIが新しい判断軸を提案します",
          status: "hidden",
          pathRole: undefined,
          isRecommended: false,
          isSelectable: true,
          isExplorationNode: true,
          lane: i + 2, // 選択肢の右
          depth: rowIndex,
          position: {
            x: optionNode.position.x + 300, // 選択肢の右側
            y: optionNode.position.y,
          },
          parentId: strategy.id,
          createdAt: now,
          source: "ai_generated",
        };
        nodes.push(explorationNode);

        // 選択肢から探索ノードへのエッジ
        const explorationEdge: DecisionFlowEdge = {
          id: `edge-${strategy.id}-${explorationNodeId}`,
          source: strategy.id,
          target: explorationNodeId,
          type: "available",
          sourceHandle: "right",
          targetHandle: "left",
        };
        edges.push(explorationEdge);
      }
    }

    // 分岐点情報を作成
    const recommendedOptions = strategies.filter(s => s.isRecommended);
    const alternativeOptions = strategies.filter(s => !s.isRecommended);

    if (strategies.length > 0) {
      const decisionPoint: DecisionPoint = {
        nodeId: criteriaLLMNode.id,
        recommendedOptionId: recommendedOptions[0]?.id ?? strategies[0].id,
        alternatives: alternativeOptions.map((alt) => ({
          optionId: alt.id,
          edgeId: `edge-${criteriaLLMNode.id}-${alt.id}`,
          childNodeId: alt.id,
          score: alt.risk ? 100 - alt.risk.score : 50,
          collapsedByDefault: false,
          scoreDifference: 0,
          isContender: true,
        })),
      };
      decisionPoints.push(decisionPoint);
    }

    rowIndex++;
  }

  // Phase 21: totalColumns → totalRows（行ベースレイアウト）
  const totalColumns = criteriaLabels.length;

  // Step 3: 列のロック状態を初期化
  // 段階的開示: 最初の列だけactive、残りはlockedで認知負荷を軽減
  const columnStates: ColumnState[] = [];
  for (let i = 0; i < criteriaLabels.length; i++) {
    columnStates.push(i === 0 ? "active" : "locked");
  }

  // [DEBUG] columnStates初期化後のログ出力
  console.log("[DN-DEBUG] === generateRecommendedPath INIT ===");
  console.log("[DN-DEBUG] columnStates:", JSON.stringify(columnStates));
  console.log("[DN-DEBUG] criteriaLabels:", criteriaLabels.map((l, i) => `[${i}] ${l.id} "${l.question}" depth=${l.columnIndex}`));
  debugLog("generateRecommendedPath", "columnStates initialized:", columnStates);

  // Step 4: ゴールノード（outcome）を配置
  // ゴールは全ノードの右端＋オフセット、縦方向は中央に配置
  const goalPos = calculateGoalPosition({ nodes });
  for (const outcomeNode of outcomeNodes) {
    const nodeId = outcomeNode.id;

    const goalY = goalPos.y;
    const goalX = goalPos.x;

    const node: DecisionFlowNode = {
      id: nodeId,
      type: "outcome",
      level: "outcome",
      label: `目的達成: ${purpose}`,
      description: "各判断軸での選択に基づいて決定されます",
      confidence: outcomeNode.risk ? 100 - outcomeNode.risk.score : 80,
      riskLevel: outcomeNode.risk?.level ?? "low",
      riskStrategy: outcomeNode.riskStrategy,
      status: "dimmed",
      pathRole: "recommended",
      isRecommended: true,
      isSelectable: false,
      lane: 2, // 選択肢の右側
      depth: 0, // ゴールは最初の行に配置
      position: {
        x: goalX,
        y: goalY,
      },
      createdAt: now,
      source: "ai_generated",
      rationalePresets: generateRationalePresets({
        riskStrategy: outcomeNode.riskStrategy,
        riskCategories: [],
        hasPastCase: false,
        isRecommended: true,
      }),
    };

    nodes.push(node);
    recommendedNodeIds.push(nodeId);
    laneOrder[nodeId] = 2;
    // ゴールへのエッジは選択完了後に動的に生成（ここでは作成しない）
  }

  // 推奨パス情報
  const recommendedPath: RecommendedPath = {
    nodeIds: recommendedNodeIds,
    edgeIds: recommendedEdgeIds,
    score: 80,
    rationaleTags: [llmResponse.overallRationale],
  };

  // レイアウトヒント
  const layoutHints: LayoutHints = {
    laneOrder,
    expandedBranches: [],
  };

  return {
    nodes,
    edges,
    recommendedPath,
    decisionPoints,
    layoutHints,
    startNodeId,
    // Phase 8: 判断軸ラベル情報
    criteriaLabels,
    columnStates,
    currentColumnIndex: 0,
    totalColumns,
  };
}

/**
 * テンプレートベースの推奨パス生成（フォールバック）
 * @param purpose 目的
 * @param documentContext ドキュメントコンテキスト
 * @param preconditions 前提条件（Phase 5改改改: 追加）
 */
async function generateRecommendedPathWithTemplate(
  purpose: string,
  documentContext?: string,
  preconditions?: PreconditionData
): Promise<{
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  recommendedPath: RecommendedPath;
  decisionPoints: DecisionPoint[];
  layoutHints: LayoutHints;
  startNodeId: string;
}> {
  const nodes: DecisionFlowNode[] = [];
  const edges: DecisionFlowEdge[] = [];
  const recommendedNodeIds: string[] = [];
  const recommendedEdgeIds: string[] = [];
  const decisionPoints: DecisionPoint[] = [];
  const laneOrder: Record<string, LayoutLane> = {};
  const now = getTimestamp();

  // スタートノード作成
  const startNodeId = `start-${generateId().slice(0, 8)}`;
  const startNode: DecisionFlowNode = {
    id: startNodeId,
    type: "start",
    level: "strategy",
    label: "スタート",
    description: purpose,
    status: "recommended",
    pathRole: "recommended",
    lane: 0, // 推奨パス
    depth: 0,
    position: { x: LAYOUT.START_X, y: LAYOUT.START_Y },
    createdAt: now,
    source: "user_input",
  };
  nodes.push(startNode);
  recommendedNodeIds.push(startNodeId);
  laneOrder[startNodeId] = 0; // 推奨パス

  // 各レベルで選択肢を生成し、推奨パスを構築
  const levels: DecisionLevel[] = ["strategy", "tactic", "action"];
  let currentParentId = startNodeId;
  let currentDepth = 1;
  const selectionHistory: SelectionHistoryEntry[] = [];

  for (const level of levels) {
    // 選択肢を生成
    let optionsResponse;
    if (level === "strategy") {
      // Phase 5改改改: 前提条件を渡す
      optionsResponse = await generateInitialOptions(purpose, documentContext, preconditions);
    } else {
      optionsResponse = await generateNextOptions(
        purpose,
        selectionHistory,
        currentParentId,
        levels[levels.indexOf(level) - 1]
      );
    }

    const options = optionsResponse.options;
    if (options.length === 0) break;

    // 各選択肢のスコアを計算し、推奨を決定
    const scoredOptions = scoreOptions(options);
    const recommendedOption = scoredOptions[0];
    const alternativeOptions = scoredOptions.slice(1);

    // 分岐点情報を作成
    const decisionPoint: DecisionPoint = {
      nodeId: currentParentId,
      recommendedOptionId: "",
      alternatives: [],
    };

    // 推奨ノードを作成
    const recommendedNodeId = `${level}-rec-${generateId().slice(0, 8)}`;
    const recommendedNode = createNode(
      recommendedNodeId,
      recommendedOption.option,
      level,
      currentParentId,
      currentDepth,
      0, // 推奨パス
      now,
      true // isRecommended
    );
    recommendedNode.status = "recommended";
    recommendedNode.pathRole = "recommended";
    nodes.push(recommendedNode);
    recommendedNodeIds.push(recommendedNodeId);
    laneOrder[recommendedNodeId] = 0; // 推奨パス
    decisionPoint.recommendedOptionId = recommendedNodeId;

    // 推奨エッジを作成
    const recommendedEdgeId = `edge-rec-${generateId().slice(0, 8)}`;
    const recommendedEdge: DecisionFlowEdge = {
      id: recommendedEdgeId,
      source: currentParentId,
      target: recommendedNodeId,
      type: "recommended",
      isRecommended: true,
    };
    edges.push(recommendedEdge);
    recommendedEdgeIds.push(recommendedEdgeId);

    // 代替選択肢ノードを作成
    const isFirstBranch = level === "strategy";
    const alternativeNodeIds: string[] = [];

    alternativeOptions.forEach((scored, index) => {
      const lane: LayoutLane = index + 1; // 代替は1,2,3...と右方向に配置
      const alternativeNodeId = `${level}-alt-${generateId().slice(0, 8)}`;

      const scoreDiff = recommendedOption.score - scored.score;
      const isContender = scoreDiff <= SCORE_THRESHOLDS.CONTENDER;
      const collapsedByDefault = !isFirstBranch;

      const alternativeNode = createNode(
        alternativeNodeId,
        scored.option,
        level,
        currentParentId,
        currentDepth,
        lane,
        now,
        false
      );
      alternativeNode.status = isFirstBranch ? "available" : "alternative-collapsed";
      alternativeNode.pathRole = "alternative";
      alternativeNode.isContender = isContender;
      alternativeNode.scoreDifference = -scoreDiff;
      laneOrder[alternativeNodeId] = lane;

      if (isFirstBranch) {
        nodes.push(alternativeNode);
        alternativeNodeIds.push(alternativeNodeId);
      }

      const alternativeEdgeId = `edge-alt-${generateId().slice(0, 8)}`;

      if (isFirstBranch) {
        const alternativeEdge: DecisionFlowEdge = {
          id: alternativeEdgeId,
          source: currentParentId,
          target: alternativeNodeId,
          type: "alternative",
        };
        edges.push(alternativeEdge);
      }

      const alternative: AlternativeOption = {
        optionId: alternativeNodeId,
        edgeId: alternativeEdgeId,
        childNodeId: alternativeNodeId,
        score: scored.score,
        collapsedByDefault,
        scoreDifference: -scoreDiff,
        isContender,
        nodeData: isFirstBranch ? undefined : alternativeNode,
      };
      decisionPoint.alternatives.push(alternative);
    });

    decisionPoints.push(decisionPoint);

    // 親ノードに代替情報を追加
    const parentNode = nodes.find((n) => n.id === currentParentId);
    if (parentNode) {
      parentNode.alternatives = {
        total: alternativeOptions.length,
        expanded: isFirstBranch,
        visibleCount: isFirstBranch ? alternativeOptions.length : 0,
      };
      parentNode.childIds = isFirstBranch
        ? [recommendedNodeId, ...alternativeNodeIds]
        : [recommendedNodeId];
    }

    // 履歴を更新
    selectionHistory.push({
      id: generateId(),
      nodeId: recommendedNodeId,
      nodeLabel: recommendedOption.option.label,
      level,
      selectedAt: now,
    });

    currentParentId = recommendedNodeId;
    currentDepth++;
  }

  // 位置を再計算
  calculatePositions(nodes, laneOrder);

  // 推奨パス情報を構築
  const recommendedPath: RecommendedPath = {
    nodeIds: recommendedNodeIds,
    edgeIds: recommendedEdgeIds,
    score: calculatePathScore(nodes.filter((n) => recommendedNodeIds.includes(n.id))),
    rationaleTags: generateRationaleTags(nodes.filter((n) => recommendedNodeIds.includes(n.id))),
  };

  return {
    nodes,
    edges,
    recommendedPath,
    decisionPoints,
    layoutHints: {
      laneOrder,
      expandedBranches: [],
    },
    startNodeId,
  };
}

/**
 * ノードを作成
 */
function createNode(
  id: string,
  option: GeneratedOption,
  level: DecisionLevel,
  parentId: string,
  depth: number,
  lane: LayoutLane,
  now: string,
  isRecommended: boolean
): DecisionFlowNode {
  const node: DecisionFlowNode = {
    id,
    type: level === "action" ? "action" : "decision",
    level,
    label: option.label,
    description: option.description,
    confidence: option.confidence,
    riskLevel: option.riskLevel,
    riskStrategy: option.riskStrategy,
    riskCategories: option.riskCategories,
    hasPastCase: option.relatedPastCases.length > 0,
    pastCaseCount: option.relatedPastCases.length,
    pastCases: option.relatedPastCases,
    isRecommended,
    recommendationReason: option.recommendationReason,
    structuredRationale: option.structuredRationale, // Phase 10: 構造化された推奨根拠
    status: "available",
    lane,
    depth,
    position: { x: 0, y: 0 },
    parentId,
    createdAt: now,
    source: option.source,
  };

  node.rationalePresets = generateRationalePresets(node);
  return node;
}

/**
 * 選択肢をスコアリング
 *
 * スコアリングルール:
 * - confidence: 最大40点（confidence/100 * 40）
 * - riskLevel: low=30, medium=15, high=0
 * - pastCases: 最大30点（件数 * 10）
 * - riskStrategy: avoid=20, mitigate=15, transfer=5, accept=-25（PMBOKベース優先順位）
 */
function scoreOptions(
  options: GeneratedOption[]
): Array<{ option: GeneratedOption; score: number }> {
  const scored = options.map((option) => {
    let score = 0;

    // 確度スコア（最大40点）
    score += (option.confidence / 100) * 40;

    // リスクレベルスコア（low=30, medium=15, high=0）
    const riskLevelScore: Record<string, number> = {
      low: 30,
      medium: 15,
      high: 0,
    };
    score += riskLevelScore[option.riskLevel] ?? 0;

    // 過去事例スコア（最大30点）
    score += Math.min(option.relatedPastCases.length * 10, 30);

    // リスク戦略スコア（PMBOKベース優先順位）
    // - avoid（回避）: 最優先 → ボーナス
    // - mitigate（軽減）: 優先 → ボーナス
    // - transfer（移転）: 次点 → 小ボーナス
    // - accept（受容）: 最終手段 → ペナルティ
    const strategyScore: Record<string, number> = {
      avoid: 20,
      mitigate: 15,
      transfer: 5,
      accept: -25,
    };
    score += strategyScore[option.riskStrategy ?? "accept"] ?? 0;

    return { option, score };
  });

  return scored.sort((a, b) => b.score - a.score);
}

/**
 * ノードの位置を計算
 *
 * 左→右フローレイアウト仕様:
 * - X軸: depth（深さ）に応じて右方向へ配置
 * - Y軸: lane（レーン番号）に応じて下方向へ配置
 *   - lane=0（推奨パス）: Y = START_Y (0)
 *   - lane=1,2,3...（代替）: Y = START_Y + LANE_SPACING_Y * lane
 * - 選択肢数に制限なし（下方向に無限に拡張可能）
 */
function calculatePositions(
  nodes: DecisionFlowNode[],
  laneOrder: Record<string, LayoutLane>
): void {
  const depthGroups = new Map<number, DecisionFlowNode[]>();
  for (const node of nodes) {
    const depth = node.depth ?? 0;
    if (!depthGroups.has(depth)) {
      depthGroups.set(depth, []);
    }
    depthGroups.get(depth)!.push(node);
  }

  depthGroups.forEach((groupNodes, depth) => {
    // 左→右フロー: X = depth方向（右へ）
    const baseX = LAYOUT.START_X + depth * LAYOUT.NODE_SPACING_X;

    // 各ノードの位置を計算（lane番号に基づく）
    groupNodes.forEach((node) => {
      const laneIndex = laneOrder[node.id] ?? 0;
      // Y = lane方向（下へ）
      node.position = {
        x: baseX,
        y: LAYOUT.START_Y + LAYOUT.LANE_SPACING_Y * laneIndex,
      };
    });
  });
}

/**
 * パスの総合スコアを計算
 */
function calculatePathScore(nodes: DecisionFlowNode[]): number {
  if (nodes.length === 0) return 0;

  let totalScore = 0;
  for (const node of nodes) {
    if (node.confidence) {
      totalScore += node.confidence;
    }
    if (node.riskLevel === "low") {
      totalScore += 20;
    } else if (node.riskLevel === "medium") {
      totalScore += 10;
    }
  }

  return Math.round(totalScore / nodes.length);
}

/**
 * 推奨理由タグを生成
 */
function generateRationaleTags(nodes: DecisionFlowNode[]): string[] {
  const tags = new Set<string>();

  for (const node of nodes) {
    if (node.riskLevel === "low") {
      tags.add("低リスク");
    }
    if (node.hasPastCase) {
      tags.add("過去実績あり");
    }
    if (node.confidence && node.confidence >= 80) {
      tags.add("高確度");
    }
    if (node.riskStrategy === "avoid") {
      tags.add("リスク回避");
    }
    if (node.riskStrategy === "mitigate") {
      tags.add("リスク軽減");
    }
  }

  return Array.from(tags).slice(0, 4);
}
