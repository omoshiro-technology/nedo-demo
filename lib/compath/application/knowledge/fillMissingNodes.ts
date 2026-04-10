import type { GraphResult, GraphNode } from "../../domain/types";
import type { MissingNodeSuggestion } from "./detectMissingNodes";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

export type FillingSuggestion = {
  originalMissing: MissingNodeSuggestion;
  fillingOptions: FillingOption[];
  guidanceQuestions: string[];
};

export type FillingOption = {
  approach: "extract" | "infer" | "prompt-user";
  description: string;
  suggestedContent?: string;
  confidence: "high" | "medium" | "low";
};

/**
 * AIアシスタントによる欠損ノード補完提案
 */
export async function suggestFillingApproach(
  missing: MissingNodeSuggestion,
  graph: GraphResult,
  fullText: string
): Promise<FillingSuggestion> {
  if (!env.anthropicApiKey) {
    return {
      originalMissing: missing,
      fillingOptions: [],
      guidanceQuestions: []
    };
  }

  const prompt = buildFillingPrompt(missing, graph, fullText);

  try {
    const response = await generateChatCompletion({
      systemPrompt: `あなたは過去トラブル分析のナレッジ蓄積を支援するAIアシスタントです。
欠損している情報をどのように埋めるべきか、具体的なアプローチを提案します。
以下の3つのアプローチを使い分けます:
1. extract: 文書から抽出可能な情報
2. infer: 既存情報から論理的に推論可能な情報
3. prompt-user: ユーザーへの質問が必要な情報`,
      userContent: prompt,
      model: env.anthropicModelDefault,
      temperature: 0.3,
      maxTokens: 1200
    });

    const parsed = parseFillingResponse(response);

    return {
      originalMissing: missing,
      fillingOptions: parsed.options,
      guidanceQuestions: parsed.questions
    };
  } catch (error) {
    console.error("補完提案エラー:", error);
    return {
      originalMissing: missing,
      fillingOptions: [],
      guidanceQuestions: []
    };
  }
}

/**
 * 補完プロンプトを構築
 */
function buildFillingPrompt(
  missing: MissingNodeSuggestion,
  graph: GraphResult,
  fullText: string
): string {
  const relatedNodesText = missing.relatedNodes
    .map((label) => `- ${label}`)
    .join("\n");

  const graphContext = graph.nodes
    .filter((n) => n.status === "present")
    .map((n) => `[${n.levelLabel}] ${n.label}`)
    .join("\n");

  return `
# タスク
欠損している「${missing.label}」（${missing.levelLabel}）をどのように埋めるべきか、具体的なアプローチを提案してください。

## 欠損情報
- ノード: ${missing.label}
- レベル: ${missing.levelLabel}
- 必要な理由: ${missing.rationale}
- 信頼度: ${missing.confidence}

## 関連する既存ノード
${relatedNodesText || "なし"}

## 現在のグラフ構造
${graphContext}

## 文書本文（抜粋）
${fullText.slice(0, 2500)}

## 求める提案内容
以下の形式でJSONを返してください:

{
  "options": [
    {
      "approach": "extract" | "infer" | "prompt-user",
      "description": "アプローチの説明",
      "suggestedContent": "提案する具体的な内容（extract/inferの場合）",
      "confidence": "high" | "medium" | "low"
    }
  ],
  "questions": [
    "ユーザーに確認すべき質問（prompt-userアプローチの場合）"
  ]
}

### アプローチ選択基準
- **extract**: 文書中に明示的な記載があるが構造化されていない場合
- **infer**: 既存情報から論理的に推論できる場合（根拠を明確に）
- **prompt-user**: 文書にもグラフにも情報がなく、ユーザーへの質問が必要な場合

最大3つのアプローチを提案してください。
`.trim();
}

/**
 * AI応答をパース
 */
function parseFillingResponse(response: string): {
  options: FillingOption[];
  questions: string[];
} {
  try {
    const parsed = parseJsonFromLLMResponse<{ options?: FillingOption[]; questions?: string[] }>(response);
    return {
      options: parsed.options || [],
      questions: parsed.questions || []
    };
  } catch (error) {
    console.error("パースエラー:", error);
    return { options: [], questions: [] };
  }
}

/**
 * 複数の欠損ノードに対してバッチ処理
 */
export async function batchSuggestFilling(
  missingList: MissingNodeSuggestion[],
  graph: GraphResult,
  fullText: string
): Promise<FillingSuggestion[]> {
  // 重要度の高い順に処理（最大5件）
  const topMissing = missingList.slice(0, 5);

  const suggestions = await Promise.all(
    topMissing.map((missing) => suggestFillingApproach(missing, graph, fullText))
  );

  return suggestions;
}

/**
 * 自動補完可能な欠損ノードを実際に補完
 */
export async function autoFillNodes(
  suggestions: FillingSuggestion[]
): Promise<GraphNode[]> {
  const filledNodes: GraphNode[] = [];

  for (const suggestion of suggestions) {
    // extract または infer で confidence が high の場合のみ自動補完
    const autoFillable = suggestion.fillingOptions.find(
      (opt) =>
        (opt.approach === "extract" || opt.approach === "infer") &&
        opt.confidence === "high" &&
        opt.suggestedContent
    );

    if (autoFillable && autoFillable.suggestedContent) {
      filledNodes.push({
        id: `auto-fill-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        label: autoFillable.suggestedContent,
        levelId: suggestion.originalMissing.levelId,
        levelLabel: suggestion.originalMissing.levelLabel,
        status: "present"
      });
    }
  }

  return filledNodes;
}

/**
 * ユーザー確認が必要な欠損ノードのサマリー生成
 */
export function generateUserConfirmationPrompt(
  suggestions: FillingSuggestion[]
): string {
  const userConfirmNeeded = suggestions.filter((s) =>
    s.fillingOptions.some((opt) => opt.approach === "prompt-user")
  );

  if (userConfirmNeeded.length === 0) {
    return "";
  }

  const lines = [
    "## 欠損情報の補完にご協力ください\n",
    "以下の情報が不足しています。ご回答いただくと、より精度の高いナレッジが蓄積されます。\n"
  ];

  userConfirmNeeded.forEach((suggestion, idx) => {
    lines.push(`### ${idx + 1}. ${suggestion.originalMissing.label}`);
    lines.push(`**レベル**: ${suggestion.originalMissing.levelLabel}`);
    lines.push(`**理由**: ${suggestion.originalMissing.rationale}\n`);

    if (suggestion.guidanceQuestions.length > 0) {
      lines.push("**確認事項**:");
      suggestion.guidanceQuestions.forEach((q) => {
        lines.push(`- ${q}`);
      });
      lines.push("");
    }
  });

  return lines.join("\n");
}
