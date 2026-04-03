/**
 * セッション作成
 * - Phase 3: 推奨パス全体を最初から表示
 * - LLM統合: 動的に推奨パスを生成
 */

import { parseDocument } from "../../infrastructure/parsers/documentParser";
import { generateId, generateSessionId, getTimestamp } from "./utils";
import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  CreateSessionRequest,
  CreateSessionRequestV2,
  StructuredRecommendationRationale,
  SupportMode,
  ClarificationCategory,
} from "./types";
import { SessionStore } from "./sessionStore";
import { sessionRepository } from "./sessionRepository";
import {
  analyzeContextSufficiency,
  createClarificationPhase,
  CLARIFICATION_TEMPLATES,
  type ContextSufficiency,
} from "./clarification";
import { generateRecommendedPath } from "./generateRecommendedPath";
import { computeSelectability } from "../../domain/decisionNavigator/selectability";
import { CLARIFICATION_LAYOUT, LAYOUT } from "../../domain/decisionNavigator/layoutConstants";
import { categorizeProblem } from "./categorization";
import { createEmptyContext } from "./contextBuilder";
import { startPrefetch } from "./prefetch";
import { detectSupportMode } from "./detectSupportMode";
import { detectStrategy } from "./strategyDetector";
import { purposeToGoal } from "./purposeToGoal";
// 思考戦略の登録（起動時に全戦略をレジストリに登録）
import "./strategies/index";

/** リスク戦略のラベル */
const RISK_STRATEGY_LABELS: Record<string, string> = {
  avoid: "リスク回避",
  mitigate: "リスク軽減",
  transfer: "リスク移転",
  accept: "リスク受容",
};

/**
 * 新しい意思決定ナビゲーションセッションを作成
 */
export async function createSession(
  request: CreateSessionRequest
): Promise<DecisionNavigatorSession> {
  const sessionId = generateId();
  const now = getTimestamp();

  // ドキュメントからコンテキストを抽出（オプション）
  let documentSource: DecisionNavigatorSession["documentSource"];
  let extractedContext = "";

  if (request.documentBase64 && request.fileName) {
    const mimeType = getMimeType(request.fileName);
    const buffer = Buffer.from(request.documentBase64, "base64");

    try {
      const { parsed } = await parseDocument({
        fileName: request.fileName,
        mimeType,
        data: buffer,
      });
      extractedContext = parsed.fullText.slice(0, 2000); // 最初の2000文字
      documentSource = {
        fileName: request.fileName,
        extractedContext,
      };
    } catch {
      // パース失敗時は無視
    }
  }

  // Phase 2: 支援モードを判定（明示指定がない場合は自動判定）
  const requestV2 = request as CreateSessionRequestV2;
  let supportMode: SupportMode;

  if (requestV2.supportMode) {
    // 明示的に指定されている場合
    supportMode = requestV2.supportMode;
    console.log("[createSession] supportMode: 明示指定 =", supportMode);
  } else {
    // 自動判定
    const modeResult = await detectSupportMode(request.purpose);
    supportMode = modeResult.mode;
    console.log("[createSession] supportMode: 自動判定 =", supportMode, {
      confidence: modeResult.confidence,
      reason: modeResult.reason,
    });
  }

  // Phase Strategy: 思考戦略を自動判定
  // process → forward、thinking → 5戦略から自動判定（デフォルト: backcast）
  let thinkingStrategy: import("../../domain/decisionNavigator/strategies/IThinkingStrategy").ThinkingStrategyId;
  if (supportMode === "process") {
    thinkingStrategy = "forward";
  } else {
    const strategyResult = await detectStrategy(request.purpose);
    thinkingStrategy = strategyResult.strategy;
    console.log("[createSession] thinkingStrategy: 自動判定 =", thinkingStrategy, {
      confidence: strategyResult.confidence,
      reason: strategyResult.reason,
    });
  }

  // Phase A: 問題カテゴリを判定
  const problemCategory = await categorizeProblem(request.purpose);

  // 目的を逆算してゴール形式に変換
  const goalResult = await purposeToGoal(request.purpose);
  const goalPurpose = goalResult.goal;
  console.log("[createSession] ===== PURPOSE CONVERSION =====");
  console.log("[createSession] Input (original):", request.purpose);
  console.log("[createSession] Output (converted goal):", goalPurpose);
  console.log("[createSession] Confidence:", goalResult.confidence);
  console.log("[createSession] ================================");

  // LLMによるカテゴリ判定が高確度（70%以上）の場合はClarificationをスキップ
  // これにより、技術的な問題や具体的な目的が入力された場合に推奨パス生成へ直行
  // または、リクエストで明示的にスキップが指定されている場合もスキップ
  const skipClarification = request.skipClarification === true || problemCategory.confidence >= 70;

  console.log("[createSession] categorizeProblem result:", {
    primary: problemCategory.primary,
    confidence: problemCategory.confidence,
    skipClarification,
  });

  // 高確度でカテゴリが判定できなかった場合のみ、Clarificationフローを検討
  if (!skipClarification) {
    // 文脈の充足度を分析（従来のキーワードベース判定）
    const contextSufficiency = analyzeContextSufficiency(request.purpose);

    // 文脈が不十分な場合は聞き出しフローを開始
    if (!contextSufficiency.isSufficient && contextSufficiency.missingInfo.length > 0) {
      return createClarificationSession(
        sessionId,
        request,
        goalPurpose,
        contextSufficiency,
        documentSource,
        problemCategory,
        supportMode,
        now
      );
    }
  }

  // 現状入力を取得（V2リクエストの場合）
  const currentSituation = (request as CreateSessionRequestV2).currentSituation;

  // Phase 5改改: 前提条件を取得
  const preconditions = request.preconditions;

  // Phase 3: 推奨パス全体を生成（LLM統合）
  // Phase 4: 支援モードに応じたプロンプトを使用
  // Phase 5改改: 前提条件を渡す
  const {
    nodes,
    edges,
    recommendedPath,
    decisionPoints,
    layoutHints,
    startNodeId,
    generationMode,
    decisionContext,
    // Phase 8: 判断軸ラベル化
    criteriaLabels,
    columnStates,
    currentColumnIndex,
    totalColumns,
  } = await generateRecommendedPath(request.purpose, extractedContext, currentSituation, supportMode, preconditions, thinkingStrategy);

  // 選択可能性を計算
  const nodesWithSelectability = computeSelectability(nodes);

  // チャットメッセージを生成モードに応じて調整
  const modeNote = generationMode === "llm"
    ? "AIが分析した"
    : generationMode === "fallback"
      ? "（AI生成に失敗したため、テンプレートを使用しています）"
      : "";

  // セッションを作成
  // purposeはゴール形式に変換した値を使用（UI表示用）
  // request.purposeは元の質問（LLM推奨パス生成に使用済み）
  const session: DecisionNavigatorSession = {
    id: sessionId,
    title: goalPurpose.slice(0, 30) + (goalPurpose.length > 30 ? "..." : ""),
    purpose: goalPurpose,
    documentSource,
    // Phase 2: 支援モード
    supportMode,
    // Phase Strategy: 思考戦略
    thinkingStrategy,
    // LLM統合: 意思決定コンテキスト
    decisionContext,
    // Phase A: 問題カテゴリ判定結果
    problemCategory,
    nodes: nodesWithSelectability,
    edges,
    // Phase 8: 判断軸ラベル化（ノードとは別管理）
    criteriaLabels,
    columnStates,
    currentColumnIndex,
    totalColumns,
    currentNodeId: startNodeId,
    selectionHistory: [
      {
        id: generateId(),
        nodeId: startNodeId,
        nodeLabel: goalPurpose.slice(0, 30) + (goalPurpose.length > 30 ? "..." : ""),
        level: "strategy",
        selectedAt: now,
      },
    ],
    chatHistory: [
      {
        id: generateId(),
        role: "assistant",
        content: generateWelcomeMessage(goalPurpose, nodesWithSelectability, modeNote),
        timestamp: now,
        type: "text",
      },
    ],
    // Phase 3: 推奨パス情報
    recommendedPath,
    decisionPoints,
    layoutHints,
    // LLM生成モード
    generationMode,
    // Phase 5改改: 前提条件
    preconditions,
    createdAt: now,
    updatedAt: now,
    stats: {
      totalNodes: nodesWithSelectability.length,
      selectedNodes: nodesWithSelectability.filter((n) => n.status === "recommended" || n.status === "selected").length,
      pastCasesUsed: nodesWithSelectability.filter((n) => n.hasPastCase).length,
    },
  };

  // 保存（両方のリポジトリに保存して互換性維持）
  await SessionStore.save(session);
  await sessionRepository.save(session);

  // バックグラウンドで次の選択肢をプリフェッチ
  // (非同期で実行され、レスポンスをブロックしない)
  startPrefetch(session);

  return session;
}

/**
 * ファイル名からMIMEタイプを推定
 */
function getMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();
  switch (ext) {
    case "pdf":
      return "application/pdf";
    case "docx":
      return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    case "txt":
      return "text/plain";
    default:
      return "text/plain";
  }
}


/**
 * 聞き出しフロー用のセッションを作成
 */
async function createClarificationSession(
  sessionId: string,
  request: CreateSessionRequest,
  goalPurpose: string,
  contextSufficiency: ContextSufficiency,
  documentSource: DecisionNavigatorSession["documentSource"],
  problemCategory: DecisionNavigatorSession["problemCategory"],
  supportMode: SupportMode,
  now: string
): Promise<DecisionNavigatorSession> {
  // 開始ノードを作成（ゴール形式の目的を使用）
  const startNode: DecisionFlowNode = {
    id: `node-start-${sessionId}`,
    type: "start",
    level: "strategy",
    label: "スタート",
    description: goalPurpose,
    status: "selected",
    position: { x: 0, y: 0 },
    createdAt: now,
    selectedAt: now,
    source: "user_input",
  };

  const clarificationPhase = createClarificationPhase(contextSufficiency.missingInfo);
  const currentCategory = clarificationPhase.currentCategory;
  const template = CLARIFICATION_TEMPLATES[currentCategory];

  // 聞き出しノードを作成
  const optionCount = template.options.length;
  const clarificationNodes: DecisionFlowNode[] = template.options.map(
    (option, index) => {
      const centerOffset = ((optionCount - 1) / 2) * CLARIFICATION_LAYOUT.NODE_SPACING_X;
      return {
        id: `node-clarify-${sessionId}-${index}`,
        type: "clarification" as const,
        level: "strategy" as const,
        label: option.label,
        description: undefined,
        confidence: undefined,
        riskLevel: undefined,
        hasPastCase: false,
        pastCaseCount: 0,
        pastCases: [],
        isRecommended: false,
        status: "available" as const,
        position: {
          x: index * CLARIFICATION_LAYOUT.NODE_SPACING_X - centerOffset,
          y: -CLARIFICATION_LAYOUT.NODE_SPACING_Y,
        },
        parentId: startNode.id,
        createdAt: now,
        source: "ai_generated" as const,
      };
    }
  );

  // 開始ノードに子IDを設定
  startNode.childIds = clarificationNodes.map((n) => n.id);

  // エッジを作成
  const edges = clarificationNodes.map((node) => ({
    id: `edge-${startNode.id}-${node.id}`,
    source: startNode.id,
    target: node.id,
    type: "available" as const,
  }));

  // 選択可能性を計算
  const allNodes = [startNode, ...clarificationNodes];
  const nodesWithSelectability = computeSelectability(allNodes);

  // セッションを作成（ゴール形式の目的を使用）
  const session: DecisionNavigatorSession = {
    id: sessionId,
    title: goalPurpose.slice(0, 30) + (goalPurpose.length > 30 ? "..." : ""),
    purpose: goalPurpose,
    documentSource,
    // Phase 2: 支援モード
    supportMode,
    // Phase A: 問題カテゴリ判定結果
    problemCategory,
    nodes: nodesWithSelectability,
    edges,
    currentNodeId: startNode.id,
    selectionHistory: [
      {
        id: generateId(),
        nodeId: startNode.id,
        nodeLabel: startNode.label,
        level: "strategy",
        selectedAt: now,
      },
    ],
    chatHistory: [
      {
        id: generateId(),
        role: "assistant",
        content: generateClarificationMessage(goalPurpose, currentCategory, template.question),
        timestamp: now,
        type: "text",
      },
    ],
    clarificationPhase,
    createdAt: now,
    updatedAt: now,
    stats: {
      totalNodes: nodesWithSelectability.length,
      selectedNodes: nodesWithSelectability.filter((n) => n.status === "selected").length,
      pastCasesUsed: nodesWithSelectability.filter((n) => n.hasPastCase).length,
    },
  };

  // 保存
  await SessionStore.save(session);

  return session;
}

/**
 * 聞き出しフロー用のメッセージを生成
 * - 質問の意図を理解して受け止める
 * - なぜこの情報が必要かを説明
 * - 選択肢を提示
 */
function generateClarificationMessage(
  goalPurpose: string,
  currentCategory: ClarificationCategory,
  templateQuestion: string
): string {
  // カテゴリごとの「なぜ聞く必要があるか」の説明
  const whyNeeded: Record<ClarificationCategory, string> = {
    problem_area: "具体的な判断軸や解決策を絞り込むため、問題の分野を特定する必要があります。",
    severity: "優先順位と対応の緊急度を判断するため、問題の深刻度を把握する必要があります。",
    timeline: "実行可能な選択肢を提案するため、解決までの時間制約を確認する必要があります。",
    stakeholders: "関係者への影響を考慮した判断軸を設定するため、主要な関係者を把握する必要があります。",
  };

  // 目的の理解を示すフレーズ
  const understanding = `「${goalPurpose}」について、最適な判断を導くお手伝いをさせていただきます。`;

  // なぜこの情報が必要かの説明
  const reason = whyNeeded[currentCategory] || "適切な判断軸を設定するため、追加の情報が必要です。";

  // 組み立て
  return `${understanding}\n\n${reason}\n\n${templateQuestion}`;
}

/**
 * 推奨ノードの根拠を含むウェルカムメッセージを生成
 */
function generateWelcomeMessage(
  purpose: string,
  nodes: DecisionFlowNode[],
  modeNote: string
): string {
  const lines: string[] = [];

  // 基本メッセージ
  lines.push(`「${purpose}」について、${modeNote}推奨される解決策の道筋を表示しました。`);
  lines.push("");

  // 推奨ノードの根拠を抽出
  const recommendedNodes = nodes.filter((n) => n.isRecommended && n.structuredRationale);

  if (recommendedNodes.length > 0) {
    lines.push("【推奨ルートの根拠】");

    for (const node of recommendedNodes.slice(0, 3)) {
      const rationale = node.structuredRationale;
      if (!rationale) continue;

      const strategyLabel = node.riskStrategy
        ? RISK_STRATEGY_LABELS[node.riskStrategy] || node.riskStrategy
        : "";

      // ノード名と戦略
      lines.push(`● ${node.label}（${strategyLabel}）`);

      // 根拠のサマリー
      if (rationale.summary) {
        lines.push(`  → ${rationale.summary}`);
      }
    }

    lines.push("");
  }

  lines.push("各判断軸に対してAIが推奨する選択肢を提示しています。");
  lines.push("選択肢をクリックして決定すると、エッジ上に選んだ理由が表示されます。");
  lines.push("判断軸は順番に関係なく、どこからでも選択できます。");

  return lines.join("\n");
}
