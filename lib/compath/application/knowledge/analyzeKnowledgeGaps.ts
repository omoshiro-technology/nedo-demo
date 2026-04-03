import type { GraphResult } from "../../domain/types";
import { detectMissingNodesWithAI, scoreMissingNodes, type MissingNodeSuggestion } from "./detectMissingNodes";
import { batchSuggestFilling, autoFillNodes, generateUserConfirmationPrompt, type FillingSuggestion } from "./fillMissingNodes";

export type KnowledgeGapAnalysis = {
  detectedGaps: MissingNodeSuggestion[];
  fillingSuggestions: FillingSuggestion[];
  autoFilledNodes: Array<{
    levelId: string;
    levelLabel: string;
    label: string;
    confidence: string;
  }>;
  userConfirmationPrompt: string;
  summary: {
    totalGapsDetected: number;
    highConfidenceGaps: number;
    autoFillable: number;
    needsUserInput: number;
  };
};

/**
 * AI主導のナレッジギャップ分析
 * 欠損ノードを検出し、自動補完と手動補完の両方を提案
 */
export async function analyzeKnowledgeGaps(
  graph: GraphResult,
  fullText: string
): Promise<KnowledgeGapAnalysis> {
  // 1. AIで欠損ノードを検出
  const detectedGaps = await detectMissingNodesWithAI(graph, fullText);

  // 2. 重要度順にソート
  const scoredGaps = scoreMissingNodes(detectedGaps);

  // 3. 補完アプローチを提案
  const fillingSuggestions = await batchSuggestFilling(scoredGaps, graph, fullText);

  // 4. 自動補完可能なノードを抽出
  const autoFilledNodes = await autoFillNodes(fillingSuggestions);

  // 5. ユーザー確認プロンプト生成
  const userConfirmationPrompt = generateUserConfirmationPrompt(fillingSuggestions);

  // 6. サマリー情報
  const highConfidenceGaps = scoredGaps.filter((g) => g.confidence === "high").length;
  const autoFillable = fillingSuggestions.filter((s) =>
    s.fillingOptions.some((opt) => opt.approach === "extract" || opt.approach === "infer")
  ).length;
  const needsUserInput = fillingSuggestions.filter((s) =>
    s.fillingOptions.some((opt) => opt.approach === "prompt-user")
  ).length;

  return {
    detectedGaps: scoredGaps,
    fillingSuggestions,
    autoFilledNodes: autoFilledNodes.map((n) => ({
      levelId: n.levelId,
      levelLabel: n.levelLabel,
      label: n.label,
      confidence: "high"
    })),
    userConfirmationPrompt,
    summary: {
      totalGapsDetected: scoredGaps.length,
      highConfidenceGaps,
      autoFillable,
      needsUserInput
    }
  };
}

/**
 * 過去トラブル文書専用の強化分析
 */
export async function analyzePastTroubleDocument(
  graph: GraphResult,
  fullText: string
): Promise<KnowledgeGapAnalysis & { pastTroubleInsights: PastTroubleInsights }> {
  const baseAnalysis = await analyzeKnowledgeGaps(graph, fullText);

  // 過去トラ特有のインサイトを抽出
  const insights = extractPastTroubleInsights(baseAnalysis, graph);

  return {
    ...baseAnalysis,
    pastTroubleInsights: insights
  };
}

type PastTroubleInsights = {
  hasCausalChain: boolean;
  hasRootCause: boolean;
  hasPermanentAction: boolean;
  hasVerification: boolean;
  riskLevel: "high" | "medium" | "low";
  recommendations: string[];
};

/**
 * 過去トラ特有のインサイト抽出
 */
function extractPastTroubleInsights(
  analysis: KnowledgeGapAnalysis,
  graph: GraphResult
): PastTroubleInsights {
  const presentLevels = new Set(
    graph.nodes.filter((n) => n.status === "present").map((n) => n.levelId)
  );

  const hasCausalChain =
    presentLevels.has("phenomenon") &&
    (presentLevels.has("root-cause") || presentLevels.has("direct-cause"));
  const hasRootCause = presentLevels.has("root-cause");
  const hasPermanentAction = presentLevels.has("permanent-action");
  const hasVerification = presentLevels.has("verification");

  // リスクレベル判定
  let riskLevel: "high" | "medium" | "low" = "low";
  if (!hasRootCause || !hasPermanentAction) {
    riskLevel = "high";
  } else if (!hasVerification) {
    riskLevel = "medium";
  }

  // 推奨事項
  const recommendations: string[] = [];
  if (!hasRootCause) {
    recommendations.push("根本原因の特定が不足しています。5WHY分析を実施してください。");
  }
  if (!hasPermanentAction) {
    recommendations.push("恒久対策が未記入です。再発防止のための根本的対策を立案してください。");
  }
  if (!hasVerification) {
    recommendations.push("効果検証の記載がありません。対策の有効性を確認する仕組みを導入してください。");
  }
  if (presentLevels.has("immediate-action") && !presentLevels.has("permanent-action")) {
    recommendations.push("応急対策のみで恒久対策がありません。根本的な解決を検討してください。");
  }

  return {
    hasCausalChain,
    hasRootCause,
    hasPermanentAction,
    hasVerification,
    riskLevel,
    recommendations
  };
}
