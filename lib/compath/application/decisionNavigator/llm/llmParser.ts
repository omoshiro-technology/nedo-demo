/**
 * LLM出力パーサー
 *
 * LLMからのJSON出力を解析・検証・正規化する
 */

import type {
  LLMNextOptionsResponse,
  LLMRecommendedPathResponse,
  LLMGeneratedOption,
  LLMRecommendedPathNode,
  LLMRiskInfo,
  LLMTermination,
  LLMConsistency,
  LLMConsistencyStatus,
  RiskStrategy,
  DecisionLevel,
  GoalStatus,
  NextAction,
  LLMFinalization,
  OptionType,
  LLMAnalysis,
} from "../types";
import {
  validateAndNormalizeRiskInfo,
  validateIrreversibilityScore,
} from "../../../domain/decisionNavigator/riskMatrix";
import {
  extractJsonFromLLMResponse,
} from "../../../infrastructure/llm/jsonExtractor";

// ============================================================
// JSON抽出（共有ユーティリティを利用）
// ============================================================

/**
 * LLM出力からJSONブロックを抽出
 * @deprecated extractJsonFromLLMResponse を直接使用してください
 */
export function extractJsonFromResponse(response: string): string | null {
  const result = extractJsonFromLLMResponse(response);
  // 元の関数は抽出できない場合 null を返していた
  // extractJsonFromLLMResponse は入力をそのまま返すので、
  // JSONとしてパースできるか確認
  try {
    JSON.parse(result);
    return result;
  } catch {
    // コードブロックや JSON が見つかった場合はそのまま返す
    if (result !== response.trim()) {
      return result;
    }
    return null;
  }
}

/**
 * JSONをパースし、エラー時はnullを返す
 */
export function safeJsonParse<T>(jsonString: string): T | null {
  try {
    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
}

// ============================================================
// 次選択肢レスポンスのパース
// ============================================================

/**
 * LLM出力を LLMNextOptionsResponse として解析
 * @param response LLMの生出力
 * @returns パース結果またはエラー
 */
export function parseNextOptionsResponse(
  response: string
): { success: true; data: LLMNextOptionsResponse } | { success: false; error: string } {
  const jsonStr = extractJsonFromResponse(response);
  if (!jsonStr) {
    return { success: false, error: "JSONブロックが見つかりませんでした" };
  }

  const raw = safeJsonParse<Record<string, unknown>>(jsonStr);
  if (!raw) {
    return { success: false, error: "JSONのパースに失敗しました" };
  }

  try {
    const data = normalizeNextOptionsResponse(raw);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "正規化に失敗しました",
    };
  }
}

/**
 * 生のJSONを正規化された LLMNextOptionsResponse に変換
 */
function normalizeNextOptionsResponse(
  raw: Record<string, unknown>
): LLMNextOptionsResponse {
  // 決定値収束アーキテクチャ: 分析結果の正規化
  const analysis = normalizeAnalysis(raw.analysis);

  // Goal-Aware Decision フィールドの正規化
  const goalStatus = normalizeGoalStatus(raw.goalStatus);
  const openGaps = normalizeStringArray(raw.openGaps);
  const nextAction = normalizeNextAction(raw.nextAction);
  const finalization = normalizeFinalization(raw.finalization);

  // options の正規化
  const rawOptions = Array.isArray(raw.options) ? raw.options : [];
  const options: LLMGeneratedOption[] = rawOptions
    .map((opt: unknown) => normalizeOption(opt as Record<string, unknown>))
    .filter((opt): opt is LLMGeneratedOption => opt !== null);

  // goalStatusがachievedまたはnextActionがfinalize/plan_executionの場合は空optionsを許可
  const allowEmptyOptions =
    goalStatus === "achieved" ||
    nextAction === "finalize" ||
    nextAction === "plan_execution";

  if (options.length === 0 && !allowEmptyOptions) {
    throw new Error("有効な選択肢が1つもありません");
  }

  // recommendation の正規化
  const rawRec = raw.recommendation as Record<string, unknown> | undefined;
  const recommendation = rawRec && typeof rawRec.id === "string"
    ? {
        id: rawRec.id,
        reason: typeof rawRec.reason === "string" ? rawRec.reason : "",
      }
    : undefined;

  // termination の正規化
  const termination = normalizeTermination(raw.termination);

  // consistency の正規化
  const consistency = normalizeConsistency(raw.consistency);

  return {
    // 決定値収束アーキテクチャ
    analysis,
    // Goal-Aware Decision フィールド
    goalStatus,
    openGaps: openGaps.length > 0 ? openGaps : undefined,
    nextAction,
    finalization,
    // 既存フィールド
    options,
    recommendation,
    termination,
    consistency,
  };
}

/**
 * 単一の選択肢を正規化
 */
function normalizeOption(raw: Record<string, unknown>): LLMGeneratedOption | null {
  // 必須フィールドのチェック
  if (typeof raw.id !== "string" || typeof raw.label !== "string") {
    return null;
  }

  // 選択肢の型を正規化（決定値収束アーキテクチャ）
  const optionType = normalizeOptionType(raw.optionType);

  // リスク情報の正規化
  const rawRisk = raw.risk as Partial<LLMRiskInfo> | undefined;
  const risk = validateAndNormalizeRiskInfo(rawRisk ?? {});

  // リスク戦略の正規化
  const riskStrategy = normalizeRiskStrategy(raw.riskStrategy);

  // 不可逆度の正規化
  const irreversibilityScore = validateIrreversibilityScore(raw.irreversibilityScore);

  // contextUpdates の正規化
  const rawUpdates = raw.contextUpdates as Record<string, unknown> | undefined;
  const contextUpdates = rawUpdates
    ? {
        constraints: Array.isArray(rawUpdates.constraints)
          ? rawUpdates.constraints.filter((c): c is string => typeof c === "string")
          : undefined,
        assumptions: Array.isArray(rawUpdates.assumptions)
          ? rawUpdates.assumptions.filter((a): a is string => typeof a === "string")
          : undefined,
        commitments: Array.isArray(rawUpdates.commitments)
          ? rawUpdates.commitments.filter((c): c is string => typeof c === "string")
          : undefined,
      }
    : undefined;

  return {
    id: raw.id,
    label: raw.label,
    description: typeof raw.description === "string" ? raw.description : "",
    optionType,
    riskStrategy,
    risk,
    irreversibilityScore,
    contextUpdates,
  };
}

// ============================================================
// 推奨パスレスポンスのパース
// ============================================================

/**
 * LLM出力を LLMRecommendedPathResponse として解析
 */
export function parseRecommendedPathResponse(
  response: string
): { success: true; data: LLMRecommendedPathResponse } | { success: false; error: string } {
  const jsonStr = extractJsonFromResponse(response);
  if (!jsonStr) {
    return { success: false, error: "JSONブロックが見つかりませんでした" };
  }

  const raw = safeJsonParse<Record<string, unknown>>(jsonStr);
  if (!raw) {
    return { success: false, error: "JSONのパースに失敗しました" };
  }

  try {
    const data = normalizeRecommendedPathResponse(raw);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "正規化に失敗しました",
    };
  }
}

/**
 * 生のJSONを正規化された LLMRecommendedPathResponse に変換
 */
function normalizeRecommendedPathResponse(
  raw: Record<string, unknown>
): LLMRecommendedPathResponse {
  // nodes の正規化
  const rawNodes = Array.isArray(raw.nodes) ? raw.nodes : [];
  const nodes: LLMRecommendedPathNode[] = rawNodes
    .map((node: unknown) => normalizePathNode(node as Record<string, unknown>))
    .filter((node): node is LLMRecommendedPathNode => node !== null);

  if (nodes.length === 0) {
    throw new Error("有効なノードが1つもありません");
  }

  // overallRationale
  const overallRationale = typeof raw.overallRationale === "string"
    ? raw.overallRationale
    : "推奨パスです";

  // alternatives の正規化
  const rawAlternatives = Array.isArray(raw.alternatives) ? raw.alternatives : [];
  const alternatives = rawAlternatives
    .map((alt: unknown) => {
      const altObj = alt as Record<string, unknown>;
      if (typeof altObj.parentNodeId !== "string") return null;

      const options = Array.isArray(altObj.options)
        ? altObj.options
            .map((opt: unknown) => normalizeOption(opt as Record<string, unknown>))
            .filter((opt): opt is LLMGeneratedOption => opt !== null)
        : [];

      return { parentNodeId: altObj.parentNodeId, options };
    })
    .filter((alt): alt is { parentNodeId: string; options: LLMGeneratedOption[] } => alt !== null);

  // termination の正規化
  const termination = normalizeTermination(raw.termination);

  // consistency の正規化
  const consistency = normalizeConsistency(raw.consistency);

  return {
    nodes,
    overallRationale,
    alternatives: alternatives.length > 0 ? alternatives : undefined,
    termination,
    consistency,
  };
}

/**
 * 推奨パスのノードを正規化
 */
function normalizePathNode(raw: Record<string, unknown>): LLMRecommendedPathNode | null {
  if (typeof raw.id !== "string" || typeof raw.label !== "string") {
    return null;
  }

  const risk = validateAndNormalizeRiskInfo(raw.risk as Partial<LLMRiskInfo> ?? {});
  const riskStrategy = normalizeRiskStrategy(raw.riskStrategy);
  const irreversibilityScore = validateIrreversibilityScore(raw.irreversibilityScore);
  const level = normalizeDecisionLevel(raw.level);

  return {
    id: raw.id,
    label: raw.label,
    description: typeof raw.description === "string" ? raw.description : "",
    level,
    riskStrategy,
    risk,
    irreversibilityScore,
    reasonForRecommendation: typeof raw.reasonForRecommendation === "string"
      ? raw.reasonForRecommendation
      : "",
  };
}

// ============================================================
// 共通正規化関数
// ============================================================

/**
 * 分析結果を正規化（決定値収束アーキテクチャ）
 */
function normalizeAnalysis(value: unknown): LLMAnalysis | undefined {
  const obj = value as Record<string, unknown> | undefined;
  if (!obj) return undefined;

  const currentGoal = typeof obj.currentGoal === "string" ? obj.currentGoal : undefined;
  if (!currentGoal) return undefined;

  return {
    currentGoal,
    decidedSoFar: normalizeStringArray(obj.decidedSoFar),
    remainingToDecide: normalizeStringArray(obj.remainingToDecide),
  };
}

/**
 * 選択肢の型を正規化（決定値収束アーキテクチャ）
 */
function normalizeOptionType(value: unknown): OptionType | undefined {
  const validTypes: OptionType[] = ["direction", "priority", "constraint", "info_request", "candidate_value"];
  if (typeof value === "string" && validTypes.includes(value as OptionType)) {
    return value as OptionType;
  }
  return undefined;
}

/**
 * 目的達成状態を正規化
 */
function normalizeGoalStatus(value: unknown): GoalStatus | undefined {
  const validStatuses: GoalStatus[] = ["achieved", "partial", "unknown"];
  if (typeof value === "string" && validStatuses.includes(value as GoalStatus)) {
    return value as GoalStatus;
  }
  return undefined;
}

/**
 * 次アクションを正規化
 */
function normalizeNextAction(value: unknown): NextAction | undefined {
  const validActions: NextAction[] = [
    "propose_options",
    "finalize",
    "ask_clarification",
    "plan_execution",
  ];
  if (typeof value === "string" && validActions.includes(value as NextAction)) {
    return value as NextAction;
  }
  return undefined;
}

/**
 * 確定情報を正規化（拡張版：決定値収束アーキテクチャ）
 */
function normalizeFinalization(value: unknown): LLMFinalization | undefined {
  const obj = value as Record<string, unknown> | undefined;
  if (!obj) return undefined;

  const summary = typeof obj.summary === "string" ? obj.summary : undefined;
  const nextSteps = normalizeStringArray(obj.nextSteps);

  // summaryがなければundefined
  if (!summary) return undefined;

  // 決定値収束アーキテクチャ: 新フィールド
  const decisionValue = typeof obj.decisionValue === "string" ? obj.decisionValue : undefined;
  const rationale = typeof obj.rationale === "string" ? obj.rationale : undefined;
  const tolerance = typeof obj.tolerance === "string" ? obj.tolerance : undefined;

  return {
    summary,
    decisionValue,
    rationale,
    tolerance,
    nextSteps: nextSteps.length > 0 ? nextSteps : [],
  };
}

/**
 * 文字列配列を正規化
 */
function normalizeStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string");
}

/**
 * リスク戦略を正規化
 */
function normalizeRiskStrategy(value: unknown): RiskStrategy {
  const validStrategies: RiskStrategy[] = ["avoid", "mitigate", "transfer", "accept"];
  if (typeof value === "string" && validStrategies.includes(value as RiskStrategy)) {
    return value as RiskStrategy;
  }
  return "accept"; // デフォルト
}

/**
 * 意思決定レベルを正規化
 * Phase 7: criteria（判断軸）と outcome（最終結果）を追加
 */
function normalizeDecisionLevel(value: unknown): DecisionLevel {
  const validLevels: DecisionLevel[] = ["strategy", "tactic", "action", "sub-action", "followup", "criteria", "outcome"];
  if (typeof value === "string" && validLevels.includes(value as DecisionLevel)) {
    return value as DecisionLevel;
  }
  return "strategy"; // デフォルト
}

/**
 * 終了判定を正規化
 */
function normalizeTermination(raw: unknown): LLMTermination {
  const obj = raw as Record<string, unknown> | undefined;
  return {
    shouldTerminate: obj?.shouldTerminate === true,
    reason: typeof obj?.reason === "string" ? obj.reason : undefined,
  };
}

/**
 * 整合性チェック結果を正規化
 */
function normalizeConsistency(raw: unknown): LLMConsistency {
  const obj = raw as Record<string, unknown> | undefined;

  const validStatuses: LLMConsistencyStatus[] = ["ok", "conflict", "needs-info"];
  const status: LLMConsistencyStatus = typeof obj?.status === "string" &&
    validStatuses.includes(obj.status as LLMConsistencyStatus)
    ? (obj.status as LLMConsistencyStatus)
    : "ok";

  const conflictReasons = Array.isArray(obj?.conflictReasons)
    ? obj.conflictReasons.filter((r): r is string => typeof r === "string")
    : undefined;

  const clarificationQuestions = Array.isArray(obj?.clarificationQuestions)
    ? obj.clarificationQuestions.filter((q): q is string => typeof q === "string")
    : undefined;

  return {
    status,
    conflictReasons: conflictReasons?.length ? conflictReasons : undefined,
    clarificationQuestions: clarificationQuestions?.length ? clarificationQuestions : undefined,
  };
}

// ============================================================
// Phase 9: 意思決定ツリー全体のパース
// ============================================================

/** 思考パターン */
export type ThinkingPattern =
  | "risk-avoidance"
  | "risk-efficiency-tradeoff"
  | "cost-priority"
  | "track-record-vs-innovation"
  | "safety-margin"
  | "judgment-basis"
  | "future-flexibility"
  | "veteran-experience";

/** 思考パターンの日本語ラベル */
export const THINKING_PATTERN_LABELS: Record<ThinkingPattern, string> = {
  "risk-avoidance": "リスク回避思考パス",
  "risk-efficiency-tradeoff": "リスク・効率バランスパス",
  "cost-priority": "コスト優先思考パス",
  "track-record-vs-innovation": "実績vs革新パス",
  "safety-margin": "安全マージンパス",
  "judgment-basis": "判断根拠パス",
  "future-flexibility": "将来柔軟性パス",
  "veteran-experience": "ベテラン経験パス",
};

/** 判断軸の順序情報 */
export type LLMCriteriaOrder = {
  criteriaId: string;
  order: number;
  reason: string;
  isPreSelected?: boolean;
  preSelectedValue?: string;
  preSelectedReason?: string;
  /** Phase 24: 思考パターン */
  thinkingPattern?: ThinkingPattern;
  /** Phase 24: パス名（日本語ラベル） */
  pathName?: string;
};

/**
 * Phase 9 ツリーレスポンスの型
 */
export type LLMDecisionTreeResponse = {
  tree: {
    nodes: LLMTreeNode[];
  };
  recommendedPath: string[];
  overallRationale: string;
  /** Phase 10: 判断軸の最適順序（LLMが決定） */
  criteriaOrder?: LLMCriteriaOrder[];
};

export type LLMTreeNode = {
  id: string;
  parentId: string | null;
  label: string;
  description: string;
  level: DecisionLevel;
  isRecommended: boolean;
  riskStrategy: RiskStrategy;
  risk: LLMRiskInfo;
  irreversibilityScore: number;
};

/**
 * LLM出力を意思決定ツリーとして解析 (Phase 9)
 */
export function parseDecisionTreeResponse(
  response: string
): { success: true; data: LLMDecisionTreeResponse } | { success: false; error: string } {
  const jsonStr = extractJsonFromResponse(response);
  if (!jsonStr) {
    return { success: false, error: "JSONブロックが見つかりませんでした" };
  }

  const raw = safeJsonParse<Record<string, unknown>>(jsonStr);
  if (!raw) {
    return { success: false, error: "JSONのパースに失敗しました" };
  }

  try {
    const data = normalizeDecisionTreeResponse(raw);
    return { success: true, data };
  } catch (e) {
    return {
      success: false,
      error: e instanceof Error ? e.message : "正規化に失敗しました",
    };
  }
}

/**
 * 生のJSONを正規化された LLMDecisionTreeResponse に変換
 */
function normalizeDecisionTreeResponse(
  raw: Record<string, unknown>
): LLMDecisionTreeResponse {
  // tree.nodes の正規化
  const rawTree = raw.tree as Record<string, unknown> | undefined;
  const rawNodes = Array.isArray(rawTree?.nodes) ? rawTree.nodes : [];

  const nodes: LLMTreeNode[] = rawNodes
    .map((node: unknown) => normalizeTreeNode(node as Record<string, unknown>))
    .filter((node): node is LLMTreeNode => node !== null);

  if (nodes.length === 0) {
    throw new Error("有効なノードが1つもありません");
  }

  // recommendedPath の正規化
  const rawPath = raw.recommendedPath;
  const recommendedPath = Array.isArray(rawPath)
    ? rawPath.filter((id): id is string => typeof id === "string")
    : [];

  // overallRationale
  const overallRationale = typeof raw.overallRationale === "string"
    ? raw.overallRationale
    : "意思決定ツリーです";

  // criteriaOrder の正規化（オプション）
  const rawCriteriaOrder = raw.criteriaOrder;
  const criteriaOrder: LLMCriteriaOrder[] | undefined = Array.isArray(rawCriteriaOrder)
    ? rawCriteriaOrder
        .map((item: unknown) => normalizeCriteriaOrderItem(item as Record<string, unknown>))
        .filter((item): item is LLMCriteriaOrder => item !== null)
    : undefined;

  return {
    tree: { nodes },
    recommendedPath,
    overallRationale,
    criteriaOrder,
  };
}

/**
 * 思考パターンを正規化
 */
function normalizeThinkingPattern(value: unknown): ThinkingPattern | undefined {
  const validPatterns: ThinkingPattern[] = [
    "risk-avoidance",
    "risk-efficiency-tradeoff",
    "cost-priority",
    "track-record-vs-innovation",
    "safety-margin",
    "judgment-basis",
    "future-flexibility",
    "veteran-experience",
  ];
  if (typeof value === "string" && validPatterns.includes(value as ThinkingPattern)) {
    return value as ThinkingPattern;
  }
  return undefined;
}

/**
 * 判断軸順序アイテムを正規化
 */
function normalizeCriteriaOrderItem(raw: Record<string, unknown>): LLMCriteriaOrder | null {
  if (typeof raw.criteriaId !== "string" || typeof raw.order !== "number") {
    return null;
  }

  // 思考パターンを正規化
  const thinkingPattern = normalizeThinkingPattern(raw.thinkingPattern);

  // パス名: 明示的に指定されていればそれを使用、なければ思考パターンから生成
  let pathName: string | undefined;
  if (typeof raw.pathName === "string") {
    pathName = raw.pathName;
  } else if (thinkingPattern) {
    pathName = THINKING_PATTERN_LABELS[thinkingPattern];
  }

  return {
    criteriaId: raw.criteriaId,
    order: raw.order,
    reason: typeof raw.reason === "string" ? raw.reason : "",
    isPreSelected: typeof raw.isPreSelected === "boolean" ? raw.isPreSelected : undefined,
    preSelectedValue: typeof raw.preSelectedValue === "string" ? raw.preSelectedValue : undefined,
    preSelectedReason: typeof raw.preSelectedReason === "string" ? raw.preSelectedReason : undefined,
    thinkingPattern,
    pathName,
  };
}

/**
 * ツリーノードを正規化
 */
function normalizeTreeNode(raw: Record<string, unknown>): LLMTreeNode | null {
  if (typeof raw.id !== "string" || typeof raw.label !== "string") {
    return null;
  }

  const risk = validateAndNormalizeRiskInfo(raw.risk as Partial<LLMRiskInfo> ?? {});
  const riskStrategy = normalizeRiskStrategy(raw.riskStrategy);
  const irreversibilityScore = validateIrreversibilityScore(raw.irreversibilityScore);
  const level = normalizeDecisionLevel(raw.level);

  return {
    id: raw.id,
    parentId: typeof raw.parentId === "string" ? raw.parentId : null,
    label: raw.label,
    description: typeof raw.description === "string" ? raw.description : "",
    level,
    isRecommended: raw.isRecommended === true,
    riskStrategy,
    risk,
    irreversibilityScore,
  };
}

// ============================================================
// リトライ用プロンプト生成
// ============================================================

/**
 * JSONパース失敗時のリトライプロンプトを生成
 */
export function buildRetryPrompt(originalPrompt: string, error: string): string {
  return `${originalPrompt}

---
【重要】前回の出力はJSONとしてパースできませんでした。
エラー: ${error}

必ず以下の形式で出力してください:
\`\`\`json
{
  // JSONオブジェクト
}
\`\`\`

マークダウンのコードブロック以外のテキストは出力しないでください。`;
}
