/**
 * EVALUATEステート
 *
 * 評価フェーズ：実行結果を評価し、次のアクションを決定する
 */

import type { AgentContext } from "../AgentContext";
import type { EvaluationResult, AgentPlan } from "../../../domain/agent/types";
import type { ActResult } from "./ActState";
import type { SenseResult } from "./SenseState";
import { generateChatCompletion } from "../../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../../infrastructure/llm/jsonExtractor";

/**
 * EVALUATEステートを実行
 *
 * @param context エージェントコンテキスト
 * @param senseResult SENSEフェーズの結果
 * @param plan 実行した計画
 * @param actResult ACTフェーズの結果
 * @returns 評価結果
 */
export async function executeEvaluateState(
  context: AgentContext,
  senseResult: SenseResult,
  plan: AgentPlan,
  actResult: ActResult
): Promise<EvaluationResult> {
  console.log("[EvaluateState] Starting evaluate phase...");

  // 実行結果の要約を生成
  const executionSummary = actResult.executedSteps
    .map((es) => {
      const status = es.result.success ? "✓" : "✗";
      const dataPreview = es.result.data
        ? JSON.stringify(es.result.data).substring(0, 200)
        : "なし";
      return `${status} Step ${es.step.order} (${es.step.toolName}): ${es.step.description}\n   結果: ${dataPreview}`;
    })
    .join("\n");

  const systemPrompt = `あなたはタスク実行結果を評価するAIアシスタントです。
ユーザーの意図と実行結果を比較し、目標が達成されたかを判断してください。

## 評価基準
1. **goalAchievement**: 目標達成度（0-1）
   - 1.0: 完全に達成
   - 0.7-0.9: 概ね達成
   - 0.4-0.6: 部分的に達成
   - 0.1-0.3: ほとんど達成できず
   - 0.0: 全く達成できず

2. **confidenceScore**: 評価の確信度（0-1）
   - 結果の品質にどれだけ自信があるか

3. **nextAction**: 次のアクション
   - "complete": タスク完了、ユーザーに結果を返す
   - "retry": 別のアプローチで再試行
   - "clarify": ユーザーに確認が必要
   - "escalate": 人間の介入が必要

以下のJSON形式で回答してください：
{
  "goalAchievement": 0.8,
  "confidenceScore": 0.9,
  "nextAction": "complete",
  "feedback": "評価結果のフィードバック",
  "improvementSuggestions": ["改善提案1", "改善提案2"]
}`;

  const userContent = `## ユーザーの意図
${senseResult.intent}

## 計画
目標: ${plan.goal}
信頼度: ${plan.confidence}

## 実行結果
${executionSummary}

## 成功/失敗
${actResult.allSucceeded ? "すべてのステップが成功" : `ステップ ${actResult.failedStep?.order} で失敗: ${actResult.errorMessage}`}`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      temperature: 0.1,
      maxTokens: 1024,
    });

    // JSONをパース
    const result = parseJsonFromLLMResponse<EvaluationResult>(response);

    console.log("[EvaluateState] Goal achievement:", result.goalAchievement);
    console.log("[EvaluateState] Confidence:", result.confidenceScore);
    console.log("[EvaluateState] Next action:", result.nextAction);

    return result;
  } catch (error) {
    console.error("[EvaluateState] Error:", error);

    // フォールバック：実行結果に基づいて簡易評価
    if (actResult.allSucceeded) {
      return {
        goalAchievement: 0.7,
        confidenceScore: 0.5,
        nextAction: "complete",
        feedback: "実行は成功しましたが、評価プロセスでエラーが発生しました。",
      };
    } else {
      return {
        goalAchievement: 0.2,
        confidenceScore: 0.3,
        nextAction: "retry",
        feedback: `実行に失敗しました: ${actResult.errorMessage}`,
        improvementSuggestions: ["別のアプローチを検討してください"],
      };
    }
  }
}

/**
 * 評価結果に基づいて最終応答を生成
 */
export async function generateFinalResponse(
  context: AgentContext,
  senseResult: SenseResult,
  actResult: ActResult,
  evaluation: EvaluationResult
): Promise<string> {
  console.log("[EvaluateState] Generating final response...");

  // 実行結果のデータを収集
  const resultData = actResult.executedSteps
    .filter((es) => es.result.success && es.result.data)
    .map((es) => ({
      tool: es.step.toolName,
      description: es.step.description,
      data: es.result.data,
    }));

  const systemPrompt = `あなたはユーザーにタスク結果を報告するAIアシスタントです。
実行結果を分かりやすくまとめて、ユーザーに報告してください。

## 報告のルール
1. 結果を簡潔にまとめる
2. 重要な発見や洞察を強調する
3. 次のアクションがあれば提案する
4. 専門用語を避け、分かりやすく説明する`;

  const userContent = `## ユーザーの元のリクエスト
${context.userInput}

## 理解した意図
${senseResult.intent}

## 実行結果
${JSON.stringify(resultData, null, 2)}

## 評価
- 目標達成度: ${(evaluation.goalAchievement * 100).toFixed(0)}%
- フィードバック: ${evaluation.feedback}`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      temperature: 0.3,
      maxTokens: 2048,
    });

    context.setFinalResponse(response);
    return response;
  } catch (error) {
    console.error("[EvaluateState] Error generating response:", error);

    // フォールバック
    const fallbackResponse = `タスクを実行しました。\n\n${evaluation.feedback}`;
    context.setFinalResponse(fallbackResponse);
    return fallbackResponse;
  }
}
