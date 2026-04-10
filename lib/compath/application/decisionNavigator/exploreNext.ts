/**
 * 探索ノードから次の問いを生成
 *
 * Phase 22: 選択されたノードから次のステップ（問い+選択肢）を生成
 * - 探索ノードの親ノード（選択済みノード）を起点に
 * - AIが次に考えるべき問いを生成
 * - その問いに対する選択肢を生成
 * - 探索ノードを削除し、新しい判断軸+選択肢に置き換える
 */

import { SessionStore } from "./sessionStore";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  DecisionFlowEdge,
  CriteriaLabel,
} from "./types";
import { LAYOUT_V2 } from "../../domain/decisionNavigator/layoutConstants";
import {
  createCriteriaNode,
  createOptionNode,
  createExplorationNode,
  createEdge,
} from "../../domain/decisionNavigator/nodeFactories";
import {
  avoidOverlap,
  recalculateTreeLayout,
  calculateGoalPosition,
} from "../../domain/decisionNavigator/layoutHelpers";
import { generatePresetsForThinkingPattern } from "../../domain/decisionNavigator/rationalePresets";
import { getStrategyOrUndefined } from "../../domain/decisionNavigator/strategies/strategyRegistry";

// ============================================================
// 型定義
// ============================================================

export type ExploreNextRequest = {
  sessionId: string;
  /** 探索ノードID（exploration-xxx形式） */
  explorationNodeId: string;
};

export type ExploreNextResult = {
  success: true;
  session: DecisionNavigatorSession;
  addedCriteria: CriteriaLabel;
  addedNodes: DecisionFlowNode[];
} | {
  success: false;
  reason: string;
};

type ExploreLLMResponse = {
  isRelevant: boolean;
  irrelevantReason?: string;
  criteria?: {
    id?: string;
    question: string;
    description?: string;
  };
  options?: Array<{
    id?: string;
    label: string;
    description?: string;
    isRecommended?: boolean;
    riskStrategy?: string;
  }>;
};

// ============================================================
// LLMプロンプト
// ============================================================

const EXPLORE_NEXT_SYSTEM_PROMPT = `あなたは意思決定支援AIです。
ユーザーの目的達成に必要な問いのみを提案してください。

## 絶対禁止ルール（最優先）
- 「既存の判断軸」にある問いと同じ・類似の問いは絶対に提案しない
- 既に答えが出ている問いを再度提案しない
- 同じ観点を言い換えただけの問いは提案しない

## 最重要ルール
- 目的達成に直接必要な問いだけを提案する
- 発散しない。収束に向かう問いを出す
- 「あると便利」「念のため」の問いは不要
- 目的が達成できる状態なら「これ以上の問いは不要」と判断する

## 問いを提案する基準
1. この問いに答えないと目的が達成できない
2. 今の選択によって新たに決めるべきことが生じた
3. 答えによって最終結果が大きく変わる
4. 既存の判断軸とは明確に異なる観点である

応答は必ず以下のJSON形式で返してください：
\`\`\`json
{
  "isRelevant": true,
  "criteria": {
    "id": "criteria-xxx",
    "question": "次に検討すべき問い？",
    "description": "なぜこの問いが目的達成に必要か（1文で）"
  },
  "options": [
    {
      "id": "option-1",
      "label": "選択肢1",
      "description": "選択肢1の説明",
      "isRecommended": true,
      "riskStrategy": "mitigate"
    },
    {
      "id": "option-2",
      "label": "選択肢2",
      "description": "選択肢2の説明",
      "isRecommended": false,
      "riskStrategy": "accept"
    }
  ]
}
\`\`\`

目的達成に十分な情報が揃っている場合：
\`\`\`json
{
  "isRelevant": false,
  "irrelevantReason": "現在の選択で目的達成に必要な判断は完了しています"
}
\`\`\`
`;

function buildExploreNextPrompt(context: {
  purpose: string;
  /** 今クリックした探索ノードの親（ユーザーが選択したノード） */
  currentSelection: {
    question: string;
    selectedOption: string;
    description?: string;
  };
  selectedPath: Array<{ question: string; selectedOption: string }>;
  existingCriteria: Array<{ question: string }>;
}): string {
  const pathSummary = context.selectedPath
    .map((p, i) => `${i + 1}. ${p.question} → ${p.selectedOption}`)
    .join("\n");

  const existingSummary = context.existingCriteria
    .map((c, i) => `${i + 1}. ${c.question}`)
    .join("\n");

  return `
## 目的（これを達成することがゴール）
${context.purpose}

## 今回の選択
- 判断軸: ${context.currentSelection.question}
- 選択: ${context.currentSelection.selectedOption}
${context.currentSelection.description ? `- 説明: ${context.currentSelection.description}` : ""}

## これまでの選択
${pathSummary || "（まだ選択なし）"}

## 既存の判断軸
${existingSummary || "（なし）"}

## 判断してください
「${context.purpose}」を達成するために、まだ決めていないことはありますか？

考え方:
1. 【最重要】既存の判断軸にある問いと同じ・類似の問いは絶対に提案しない
2. 目的を達成するために必要な判断は何か？
3. 今の選択（${context.currentSelection.selectedOption}）で新たに決めるべきことが生じたか？
4. 既存の判断軸で十分ではないか？

- 必要な問いがあれば提案（2〜3個の選択肢、1つは推奨）
- 目的達成に十分、または新しい観点がなければ「isRelevant: false」
`;
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 類似度チェック（主要キーワードの一致）
 * - ループを防ぐため、閾値を低めに設定（40%一致で類似とみなす）
 * - 特定のキーワードが一致すれば類似とみなす
 */
function isSimilarQuestion(q1: string, q2: string): boolean {
  const normalize = (s: string) => s.toLowerCase().replace(/[？?。、]/g, "").replace(/^\d+\.\s*/, "");
  const n1 = normalize(q1);
  const n2 = normalize(q2);

  // 完全一致
  if (n1 === n2) return true;

  // 一方が他方を含む場合（十分な長さがある場合のみ — 短い文字列の誤爆防止）
  if (n1.length >= 15 && n2.length >= 15) {
    if (n1.includes(n2) || n2.includes(n1)) return true;
  }

  // 主要な単語の70%以上が一致すれば類似とみなす（異なる枝からの誤収束を防止）
  const words1 = n1.split(/[\s、,・]+/).filter(w => w.length > 1);
  const words2 = n2.split(/[\s、,・]+/).filter(w => w.length > 1);
  if (words1.length === 0 || words2.length === 0) return false;

  const matchCount = words1.filter(w => words2.some(w2 => w2.includes(w) || w.includes(w2))).length;
  const matchRatio = matchCount / Math.min(words1.length, words2.length);

  return matchRatio >= 0.7;
}

/**
 * 選択パスを収集
 */
function collectSelectedPath(
  session: DecisionNavigatorSession
): Array<{ question: string; selectedOption: string }> {
  const selectedPath: Array<{ question: string; selectedOption: string }> = [];
  const selectedNodes = session.nodes.filter(n => n.status === "selected" && n.level === "strategy");

  for (const selectedNode of selectedNodes) {
    const criteriaNode = session.nodes.find(n => n.id === selectedNode.parentId);
    if (criteriaNode) {
      selectedPath.push({
        question: criteriaNode.label.replace(/^\d+\.\s*/, ""),
        selectedOption: selectedNode.label,
      });
    }
  }

  return selectedPath;
}

/**
 * 重複判断軸の処理（収束エッジを追加）
 */
async function handleDuplicateCriteria(
  session: DecisionNavigatorSession,
  parentNodeId: string,
  duplicateCriteria: DecisionFlowNode,
  explorationNodeId: string,
  now: string
): Promise<ExploreNextResult> {
  const newEdges: DecisionFlowEdge[] = [];

  // 既存のエッジがなければ収束エッジを追加
  const existingEdge = session.edges.find(e =>
    e.source === parentNodeId && e.target === duplicateCriteria.id
  );

  if (!existingEdge) {
    newEdges.push(createEdge({
      source: parentNodeId,
      target: duplicateCriteria.id,
      type: "converge",
    }));
  }

  // 探索ノードとそのエッジを削除
  const updatedNodes = session.nodes.filter(n => n.id !== explorationNodeId);
  const updatedEdges = session.edges.filter(e =>
    e.source !== explorationNodeId && e.target !== explorationNodeId
  );

  const duplicateIndex = session.criteriaLabels?.findIndex(l => l.id === duplicateCriteria.id) ?? -1;
  const updatedSession: DecisionNavigatorSession = {
    ...session,
    nodes: updatedNodes,
    edges: [...updatedEdges, ...newEdges],
    currentColumnIndex: duplicateIndex >= 0 ? duplicateIndex : session.currentColumnIndex,
    updatedAt: now,
  };

  await SessionStore.save(updatedSession);

  const existingLabel = session.criteriaLabels?.find(l => l.id === duplicateCriteria.id);
  return {
    success: true,
    session: updatedSession,
    addedCriteria: existingLabel || {
      id: duplicateCriteria.id,
      columnIndex: duplicateCriteria.depth ?? 0,
      question: duplicateCriteria.label,
      order: duplicateCriteria.depth ?? 0,
    },
    addedNodes: [],
  };
}

// ============================================================
// メイン関数
// ============================================================

/**
 * 探索ノードから次の問いを生成
 */
export async function exploreNext(request: ExploreNextRequest): Promise<ExploreNextResult> {
  const session = await SessionStore.findById(request.sessionId);
  if (!session) {
    return { success: false, reason: "セッションが見つかりません" };
  }

  // 探索ノードを取得
  const explorationNode = session.nodes.find(n => n.id === request.explorationNodeId);
  if (!explorationNode || !explorationNode.isExplorationNode) {
    return { success: false, reason: "探索ノードが見つかりません" };
  }

  // 親ノード（選択されたノード）を取得
  const parentNodeId = explorationNode.parentId;
  if (!parentNodeId) {
    return { success: false, reason: "親ノードが見つかりません" };
  }

  const parentNode = session.nodes.find(n => n.id === parentNodeId);
  if (!parentNode) {
    return { success: false, reason: "親ノードが見つかりません" };
  }

  // 今選択したノードの判断軸（問い）を取得
  const parentCriteriaNode = session.nodes.find(n => n.id === parentNode.parentId);
  const parentCriteriaLabel = session.criteriaLabels?.find(c => c.id === parentNode.parentId);
  const currentQuestion = parentCriteriaLabel?.question
    || parentCriteriaNode?.label.replace(/^\d+\.\s*/, "")
    || "（不明）";

  // 今選択したノードの情報
  const currentSelection = {
    question: currentQuestion,
    selectedOption: parentNode.label,
    description: parentNode.description,
  };

  // これまでの選択パスを収集（今選択したノードは除外）
  const selectedPath = collectSelectedPath(session).filter(
    p => p.selectedOption !== parentNode.label
  );

  // 既存の判断軸を収集
  const existingCriteria = (session.criteriaLabels || []).map(c => ({
    question: c.question,
  }));

  console.log("[exploreNext] Current selection:", currentSelection);
  console.log("[exploreNext] Selected path:", selectedPath);

  // LLM呼び出し
  // Phase Strategy: セッションに思考戦略が設定されている場合、戦略固有のプロンプトを優先使用
  let llmResponse: ExploreLLMResponse;
  try {
    let systemPromptToUse = EXPLORE_NEXT_SYSTEM_PROMPT;
    let userPromptToUse: string;

    const strategy = session.thinkingStrategy
      ? getStrategyOrUndefined(session.thinkingStrategy)
      : undefined;

    if (strategy) {
      // 戦略固有の探索プロンプトを構築
      const strategyPrompts = strategy.buildExplorePrompt(
        {
          id: session.id,
          purpose: session.purpose,
          nodes: session.nodes.map(n => ({
            id: n.id,
            type: n.type ?? "decision",
            status: n.status ?? "available",
            level: n.level,
            parentId: n.parentId,
          })),
          selectionHistory: session.selectionHistory.map(h => ({
            nodeId: h.nodeId,
            nodeLabel: h.nodeLabel,
            level: h.level,
          })),
        },
        parentNodeId
      );
      systemPromptToUse = strategyPrompts.systemPrompt;
      userPromptToUse = strategyPrompts.userPrompt;
    } else {
      userPromptToUse = buildExploreNextPrompt({
        purpose: session.purpose,
        currentSelection,
        selectedPath,
        existingCriteria,
      });
    }

    const responseText = await generateChatCompletion({
      systemPrompt: systemPromptToUse,
      userContent: userPromptToUse,
      maxTokens: 1500,
      temperature: 0.7,
    });

    llmResponse = parseJsonFromLLMResponse(responseText);
  } catch (error) {
    console.error("[exploreNext] LLM error:", error);
    return { success: false, reason: "AIによる問い生成に失敗しました" };
  }

  // 追加の意味がない場合
  if (!llmResponse.isRelevant || !llmResponse.criteria || !llmResponse.options) {
    return {
      success: false,
      reason: llmResponse.irrelevantReason || "これ以上検討すべき問いはありません",
    };
  }

  const now = getTimestamp();

  // === 既存判断軸との重複チェック ===
  const existingCriteriaNodes = session.nodes.filter(n => n.level === "criteria");
  const duplicateCriteria = existingCriteriaNodes.find(n =>
    isSimilarQuestion(n.label, llmResponse.criteria!.question)
  );

  if (duplicateCriteria) {
    console.log("[exploreNext] Duplicate criteria found:", duplicateCriteria.label);
    return handleDuplicateCriteria(
      session,
      parentNodeId,
      duplicateCriteria,
      request.explorationNodeId,
      now
    );
  }

  // === 新しいノードを生成 ===
  const explorationPosition = explorationNode.position;
  const parentDepth = parentNode.depth ?? 0;

  // Phase 28改改: 探索階層の計算
  // 「行インデックス」ではなく「このブランチ内での探索回数」を計算
  // 親ノードからルートまで遡り、「探索により追加」された判断軸の数をカウント
  let explorationDepthFromParent = 0;
  {
    let currentNodeId: string | undefined = parentNodeId;
    while (currentNodeId) {
      const node = session.nodes.find(n => n.id === currentNodeId);
      if (!node) break;

      // このノードの親の判断軸が探索で追加されたものかチェック
      if (node.level === "strategy" && node.parentId) {
        const criteriaLabel = session.criteriaLabels?.find(c => c.id === node.parentId);
        if (criteriaLabel?.orderReason === "探索により追加") {
          explorationDepthFromParent++;
        }
      }

      currentNodeId = node.parentId;
    }
  }
  console.log("[exploreNext] Exploration depth from parent:", explorationDepthFromParent);

  // 判断軸ラベル
  // 注意: LLMが返すIDは重複する可能性があるため、常にユニークIDを生成
  const newCriteriaLabel: CriteriaLabel = {
    id: `criteria-${generateId()}`,
    columnIndex: parentDepth,
    question: llmResponse.criteria.question,
    description: llmResponse.criteria.description,
    order: parentDepth + 1,
    orderReason: "探索により追加",
  };

  // 判断軸ノード（探索ノードの位置を起点）
  const criteriaNode = createCriteriaNode({
    id: newCriteriaLabel.id,
    question: llmResponse.criteria.question,
    description: llmResponse.criteria.description,
    rowIndex: parentDepth,
    parentId: parentNodeId,
    position: explorationPosition, // 探索ノードの位置を起点
    questionReason: llmResponse.criteria.description || "この選択を踏まえて、さらに検討が必要な観点です",
    withNumber: false, // 続きなので番号なし
    lane: (parentNode.lane ?? 0) + 1,
  });

  const newNodes: DecisionFlowNode[] = [criteriaNode];
  const newEdges: DecisionFlowEdge[] = [];

  // 探索ノードを除いた既存ノード（重なり判定用）
  const existingNodesForOverlap = session.nodes.filter(
    n => n.id !== request.explorationNodeId
  );
  const nodesForOptionOverlap = [...existingNodesForOverlap, criteriaNode];

  // 選択肢ノードを生成（認知負荷軽減: 最大3つに制限）
  const MAX_EXPLORE_OPTIONS = 3;
  const limitedOptions = llmResponse.options.slice(0, MAX_EXPLORE_OPTIONS);
  const optionCount = limitedOptions.length;
  const totalOptionsHeight = (optionCount - 1) * LAYOUT_V2.OPTION_Y_SPACING;
  const optionStartY = explorationPosition.y - totalOptionsHeight / 2;
  const optionX = explorationPosition.x + LAYOUT_V2.OPTION_X_OFFSET;

  limitedOptions.forEach((option, optionIndex) => {
    // 注意: LLMが返すIDは重複する可能性があるため、常にユニークIDを生成
    const nodeId = `option-${generateId()}`;
    const isRecommended = option.isRecommended ?? false;

    // 重なり回避
    const baseOptionY = optionStartY + optionIndex * LAYOUT_V2.OPTION_Y_SPACING;
    const adjustedOptionY = avoidOverlap(baseOptionY, nodesForOptionOverlap, optionX);

    const optionNode = createOptionNode({
      id: nodeId,
      label: option.label,
      description: option.description,
      parentId: newCriteriaLabel.id,
      rowIndex: parentDepth,
      optionIndex,
      totalOptions: optionCount,
      baseY: explorationPosition.y,
      isRecommended,
      riskStrategy: option.riskStrategy as DecisionFlowNode["riskStrategy"],
      position: { x: optionX, y: adjustedOptionY },
    });

    // 親の判断軸の思考パターンを取得（探索の起点となった判断軸）
    // 探索で追加されたノードは親の思考パターンを継承
    const parentThinkingPattern = parentCriteriaLabel?.thinkingPattern ?? parentCriteriaNode?.thinkingPattern;
    optionNode.rationalePresets = generatePresetsForThinkingPattern(parentThinkingPattern);

    newNodes.push(optionNode);
    nodesForOptionOverlap.push(optionNode);

    // 判断軸→選択肢のエッジ
    newEdges.push(createEdge({
      source: newCriteriaLabel.id,
      target: nodeId,
      type: isRecommended ? "selected" : "available",
    }));

    // Phase 28改改: 探索階層でゴール収束を判定
    // 「行インデックス」ではなく「このブランチ内での探索回数」で判定
    // これにより、並列な判断軸が互いに独立して深掘りできる
    const currentExplorationDepth = explorationDepthFromParent + 1; // 今追加で探索が1つ増える
    const MAX_EXPLORATION_DEPTH = 2; // 探索2回までは継続可能

    console.log(`[exploreNext] Current exploration depth: ${currentExplorationDepth}, MAX: ${MAX_EXPLORATION_DEPTH}`);

    if (isRecommended && currentExplorationDepth >= MAX_EXPLORATION_DEPTH) {
      // 3階層目以降: ゴールに収束
      const goalNode = session.nodes.find(n => n.type === "outcome" || n.level === "outcome");
      if (goalNode) {
        newEdges.push(createEdge({
          source: nodeId,
          target: goalNode.id,
          type: "guide",
          animated: true,
          label: "（さらに検討可能）",
        }));
        console.log(`[exploreNext] Exploration depth ${currentExplorationDepth}: Added dashed edge to goal`);
      }
    } else if (isRecommended) {
      // 2階層目まで: 探索ノードを追加
      const explorationNode = createExplorationNode({
        parentNodeId: nodeId,
        parentPosition: { x: optionX, y: adjustedOptionY },
        rowIndex: parentDepth + 1, // 行インデックスは親の深さ + 1
        lane: (parentNode.lane ?? 0) + 1,
      });
      newNodes.push(explorationNode);
      newEdges.push(createEdge({
        source: nodeId,
        target: explorationNode.id,
        type: "guide",
        animated: true,
      }));
      console.log(`[exploreNext] Exploration depth ${currentExplorationDepth}: Added exploration node for further decisions`);
    }
  });

  // 親ノード→判断軸のエッジ（選択からの遷移理由をラベルに表示）
  // llmResponse.criteria.description に「この問いが重要な理由」が含まれる
  const transitionLabel = llmResponse.criteria.description
    ? `→ ${llmResponse.criteria.description}`
    : undefined;
  newEdges.push(createEdge({
    source: parentNodeId,
    target: newCriteriaLabel.id,
    type: "selected",
    label: transitionLabel,
  }));

  // 探索ノードとそのエッジを削除
  const updatedNodes = session.nodes.filter(n => n.id !== request.explorationNodeId);
  const updatedEdges = session.edges.filter(e =>
    e.source !== request.explorationNodeId && e.target !== request.explorationNodeId
  );

  // ツリーレイアウトを再計算
  const allNodes = [...updatedNodes, ...newNodes];
  const allEdges = [...updatedEdges, ...newEdges];
  const layoutedNodes = recalculateTreeLayout(allNodes, allEdges);

  // ゴールノードの位置を更新
  const goalPosition = calculateGoalPosition({ nodes: layoutedNodes });
  const finalNodes = layoutedNodes.map(node => {
    if (node.type === "outcome" || node.level === "outcome") {
      return { ...node, position: goalPosition };
    }
    return node;
  });

  // セッションを更新（criteriaLabels/columnStates/currentColumnIndexも更新）
  const updatedCriteriaLabels = [...(session.criteriaLabels ?? []), newCriteriaLabel];
  const updatedColumnStates = [...(session.columnStates ?? []), "active" as const];

  console.log("[DN-DEBUG] === exploreNext column state ===");
  console.log("[DN-DEBUG] BEFORE columnStates:", JSON.stringify(session.columnStates));
  console.log("[DN-DEBUG] AFTER columnStates:", JSON.stringify(updatedColumnStates));
  console.log("[DN-DEBUG] new currentColumnIndex:", updatedCriteriaLabels.length - 1);
  console.log("[DN-DEBUG] new criteriaLabel:", newCriteriaLabel.id, newCriteriaLabel.question);

  const updatedSession: DecisionNavigatorSession = {
    ...session,
    nodes: [...finalNodes],
    edges: [...updatedEdges, ...newEdges],
    criteriaLabels: updatedCriteriaLabels,
    columnStates: updatedColumnStates,
    currentColumnIndex: updatedCriteriaLabels.length - 1,
    totalColumns: updatedCriteriaLabels.length,
    updatedAt: now,
  };

  await SessionStore.save(updatedSession);

  return {
    success: true,
    session: updatedSession,
    addedCriteria: newCriteriaLabel,
    addedNodes: newNodes,
  };
}
