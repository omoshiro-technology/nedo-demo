/**
 * 品質ゲート
 *
 * 生成結果の品質を検証し、閾値を下回る場合は再生成を促す
 */

import { generateChatCompletion } from "../../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../../infrastructure/llm/jsonExtractor";

/**
 * 品質スコア
 */
export type QualityScore = {
  /** 総合スコア（0-1） */
  overall: number;
  /** 完全性スコア（0-1）：必要な情報がすべて含まれているか */
  completeness: number;
  /** 正確性スコア（0-1）：情報が正確か */
  accuracy: number;
  /** 関連性スコア（0-1）：リクエストに対して関連しているか */
  relevance: number;
  /** 一貫性スコア（0-1）：内部矛盾がないか */
  consistency: number;
};

/**
 * 品質評価結果
 */
export type QualityEvaluation = {
  /** 品質スコア */
  scores: QualityScore;
  /** 品質ゲートを通過したか */
  passed: boolean;
  /** 問題点のリスト */
  issues: string[];
  /** 改善提案 */
  suggestions: string[];
  /** 再生成が推奨されるか */
  shouldRegenerate: boolean;
};

/**
 * 品質ゲートの設定
 */
export type QualityGateConfig = {
  /** 総合スコアの閾値（デフォルト: 0.7） */
  overallThreshold: number;
  /** 各スコアの最低閾値（デフォルト: 0.5） */
  minimumThreshold: number;
  /** 最大再生成回数（デフォルト: 3） */
  maxRegenerations: number;
};

const DEFAULT_CONFIG: QualityGateConfig = {
  overallThreshold: 0.7,
  minimumThreshold: 0.5,
  maxRegenerations: 3,
};

/**
 * 生成結果の品質を評価
 *
 * @param content 評価対象のコンテンツ
 * @param context 元のリクエストや期待される出力の説明
 * @param config 品質ゲートの設定
 * @returns 品質評価結果
 */
export async function evaluateQuality(
  content: string,
  context: {
    originalRequest: string;
    expectedOutput?: string;
    previousAttempts?: number;
  },
  config: Partial<QualityGateConfig> = {}
): Promise<QualityEvaluation> {
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  console.log("[QualityGate] Evaluating content quality...");

  const systemPrompt = `あなたは生成コンテンツの品質を評価する審査員です。
以下の観点から評価し、0から1のスコアを付けてください：

1. **completeness（完全性）**: 必要な情報がすべて含まれているか
2. **accuracy（正確性）**: 情報が正確で誤りがないか
3. **relevance（関連性）**: リクエストに対して適切に回答しているか
4. **consistency（一貫性）**: 内部矛盾がなく論理的か

以下のJSON形式で回答してください：
{
  "scores": {
    "overall": 0.8,
    "completeness": 0.9,
    "accuracy": 0.8,
    "relevance": 0.9,
    "consistency": 0.7
  },
  "issues": ["問題点1", "問題点2"],
  "suggestions": ["改善提案1", "改善提案2"]
}`;

  const userContent = `## 元のリクエスト
${context.originalRequest}

${context.expectedOutput ? `## 期待される出力\n${context.expectedOutput}\n` : ""}

## 評価対象のコンテンツ
${content}

${context.previousAttempts ? `\n注: これは${context.previousAttempts + 1}回目の試行です。` : ""}`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      temperature: 0.1,
      maxTokens: 1024,
    });

    // JSONをパース
    const parsed = parseJsonFromLLMResponse<{
      scores: QualityScore;
      issues: string[];
      suggestions: string[];
    }>(response);

    // 品質ゲートの判定
    const passed = checkQualityGate(parsed.scores, mergedConfig);
    const shouldRegenerate =
      !passed && (context.previousAttempts || 0) < mergedConfig.maxRegenerations;

    console.log("[QualityGate] Overall score:", parsed.scores.overall);
    console.log("[QualityGate] Passed:", passed);
    console.log("[QualityGate] Should regenerate:", shouldRegenerate);

    return {
      scores: parsed.scores,
      passed,
      issues: parsed.issues || [],
      suggestions: parsed.suggestions || [],
      shouldRegenerate,
    };
  } catch (error) {
    console.error("[QualityGate] Evaluation error:", error);

    // フォールバック：デフォルトの評価を返す
    return {
      scores: {
        overall: 0.5,
        completeness: 0.5,
        accuracy: 0.5,
        relevance: 0.5,
        consistency: 0.5,
      },
      passed: false,
      issues: ["品質評価中にエラーが発生しました"],
      suggestions: ["再試行してください"],
      shouldRegenerate: (context.previousAttempts || 0) < mergedConfig.maxRegenerations,
    };
  }
}

/**
 * 品質ゲートを通過したかチェック
 */
function checkQualityGate(
  scores: QualityScore,
  config: QualityGateConfig
): boolean {
  // 総合スコアが閾値以上か
  if (scores.overall < config.overallThreshold) {
    return false;
  }

  // 各スコアが最低閾値以上か
  if (
    scores.completeness < config.minimumThreshold ||
    scores.accuracy < config.minimumThreshold ||
    scores.relevance < config.minimumThreshold ||
    scores.consistency < config.minimumThreshold
  ) {
    return false;
  }

  return true;
}

/**
 * 再生成用のプロンプト改善提案を生成
 */
export async function generateImprovementPrompt(
  originalPrompt: string,
  evaluation: QualityEvaluation
): Promise<string> {
  console.log("[QualityGate] Generating improvement prompt...");

  const systemPrompt = `あなたはプロンプトエンジニアです。
品質評価の結果を踏まえて、より良い出力を得るためのプロンプト改善を提案してください。
改善されたプロンプトをそのまま出力してください。`;

  const userContent = `## 元のプロンプト
${originalPrompt}

## 品質評価結果
- 総合スコア: ${evaluation.scores.overall}
- 問題点: ${evaluation.issues.join(", ")}
- 改善提案: ${evaluation.suggestions.join(", ")}

## 改善すべき点
${evaluation.issues.map((issue, i) => `${i + 1}. ${issue}`).join("\n")}`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      temperature: 0.3,
      maxTokens: 2048,
    });

    return response;
  } catch (error) {
    console.error("[QualityGate] Error generating improvement prompt:", error);
    return originalPrompt; // エラー時は元のプロンプトを返す
  }
}
