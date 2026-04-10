import type { GraphResult, GraphNode, AxisLevel } from "../../domain/types";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

export type MissingNodeSuggestion = {
  levelId: string;
  levelLabel: string;
  label: string;
  rationale: string;
  confidence: "high" | "medium" | "low";
  relatedNodes: string[];
};

/**
 * GPTを活用して欠損ノードを高精度に検出
 */
export async function detectMissingNodesWithAI(
  graph: GraphResult,
  fullText: string
): Promise<MissingNodeSuggestion[]> {
  if (!env.anthropicApiKey) {
    return [];
  }

  const suggestions: MissingNodeSuggestion[] = [];

  // 各レベルごとに欠損を分析
  for (const level of graph.levels) {
    const levelNodes = graph.nodes.filter((n) => n.levelId === level.id);
    const presentNodes = levelNodes.filter((n) => n.status === "present");
    const missingNodes = levelNodes.filter((n) => n.status === "missing");

    // すでに十分な情報がある場合はスキップ
    if (presentNodes.length >= 2 && missingNodes.length === 0) {
      continue;
    }

    // 前後のレベルのコンテキストを取得
    const context = buildLevelContext(level, graph);

    const levelSuggestions = await detectMissingForLevel(
      level,
      presentNodes,
      context,
      fullText
    );

    suggestions.push(...levelSuggestions);
  }

  return suggestions;
}

/**
 * 特定レベルの欠損ノードをAIで検出
 */
async function detectMissingForLevel(
  level: AxisLevel,
  presentNodes: GraphNode[],
  context: LevelContext,
  fullText: string
): Promise<MissingNodeSuggestion[]> {
  const prompt = buildDetectionPrompt(level, presentNodes, context, fullText);

  try {
    const response = await generateChatCompletion({
      systemPrompt: `あなたは過去トラブル分析の専門家です。
文書から欠落している重要な情報を検出し、構造化されたナレッジとして抽出します。
必ず指定されたJSON形式で返してください。`,
      userContent: prompt,
      model: env.anthropicModelDefault,
      temperature: 0.2,
      maxTokens: 1000
    });

    const parsed = parseDetectionResponse(response);
    return parsed.map((item) => ({
      ...item,
      levelId: level.id,
      levelLabel: level.label
    }));
  } catch (error) {
    console.error(`欠損検出エラー (${level.label}):`, error);
    return [];
  }
}

/**
 * 検出プロンプトを構築
 */
function buildDetectionPrompt(
  level: AxisLevel,
  presentNodes: GraphNode[],
  context: LevelContext,
  fullText: string
): string {
  const presentList = presentNodes.map((n) => `- ${n.label}`).join("\n");
  const beforeList = context.beforeLevel
    ? context.beforeLevel.nodes.map((n) => `- ${n.label}`).join("\n")
    : "なし";
  const afterList = context.afterLevel
    ? context.afterLevel.nodes.map((n) => `- ${n.label}`).join("\n")
    : "なし";

  return `
# タスク
以下の文書から「${level.label}」レベルで欠落している重要な情報を検出してください。

## ${level.label}の定義
${level.guide || level.label}

## 現在記載されている${level.label}
${presentList || "（未記入）"}

## 前のレベル (${context.beforeLevel?.label || "なし"})
${beforeList}

## 後のレベル (${context.afterLevel?.label || "なし"})
${afterList}

## 文書本文（抜粋）
${fullText.slice(0, 3000)}

## 検出ルール
1. 文書中に記載はあるが構造化されていない情報を優先
2. 因果関係の整合性（前後のレベルとの論理的つながり）
3. 再発防止の観点で重要だが欠けている情報
4. 一般論や推測ではなく、文書に根拠がある情報のみ

## 出力形式（JSON）
{
  "missing": [
    {
      "label": "欠落しているノードのラベル（具体的に）",
      "rationale": "なぜこのノードが必要か（根拠を明確に）",
      "confidence": "high" | "medium" | "low",
      "relatedNodes": ["関連する既存ノードのラベル"]
    }
  ]
}

最大3件まで、信頼度の高い順に返してください。
文書に根拠がない場合は空配列を返してください。
`.trim();
}

/**
 * レベルのコンテキストを構築
 */
type LevelContext = {
  beforeLevel?: { label: string; nodes: GraphNode[] };
  afterLevel?: { label: string; nodes: GraphNode[] };
};

function buildLevelContext(level: AxisLevel, graph: GraphResult): LevelContext {
  const levelIndex = graph.levels.findIndex((l) => l.id === level.id);
  const context: LevelContext = {};

  if (levelIndex > 0) {
    const beforeLevel = graph.levels[levelIndex - 1]!;
    context.beforeLevel = {
      label: beforeLevel.label,
      nodes: graph.nodes.filter((n) => n.levelId === beforeLevel.id)
    };
  }

  if (levelIndex < graph.levels.length - 1) {
    const afterLevel = graph.levels[levelIndex + 1]!;
    context.afterLevel = {
      label: afterLevel.label,
      nodes: graph.nodes.filter((n) => n.levelId === afterLevel.id)
    };
  }

  return context;
}

/**
 * AI応答をパース
 */
function parseDetectionResponse(response: string): Array<{
  label: string;
  rationale: string;
  confidence: "high" | "medium" | "low";
  relatedNodes: string[];
}> {
  try {
    const parsed = parseJsonFromLLMResponse<{ missing?: Array<{ label: string; rationale: string; confidence: "high" | "medium" | "low"; relatedNodes: string[] }> }>(response);
    return parsed.missing || [];
  } catch (error) {
    console.error("パースエラー:", error);
    return [];
  }
}

/**
 * 欠損ノードの重要度をスコアリング
 */
export function scoreMissingNodes(
  suggestions: MissingNodeSuggestion[]
): MissingNodeSuggestion[] {
  return suggestions
    .map((s) => ({
      ...s,
      score: calculateImportanceScore(s)
    }))
    .sort((a, b) => b.score - a.score);
}

function calculateImportanceScore(suggestion: MissingNodeSuggestion): number {
  let score = 0;

  // 信頼度によるスコア
  if (suggestion.confidence === "high") score += 10;
  else if (suggestion.confidence === "medium") score += 5;
  else score += 2;

  // 関連ノード数（つながりが多い = 重要）
  score += Math.min(suggestion.relatedNodes.length * 2, 10);

  // 根拠の長さ（具体的な根拠 = 重要）
  score += Math.min(suggestion.rationale.length / 50, 5);

  // レベルによる重要度（根本原因・恒久対策は優先度高）
  if (suggestion.levelId === "root-cause" || suggestion.levelId === "permanent-action") {
    score += 5;
  }

  return score;
}
