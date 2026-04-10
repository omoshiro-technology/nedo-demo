/**
 * PLANステート
 *
 * 計画立案フェーズ：使用するツールと実行順序を決定する
 */

import type { AgentContext } from "../AgentContext";
import type { AgentPlan, PlanStep } from "../../../domain/agent/types";
import { generateChatCompletion } from "../../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../../infrastructure/llm/jsonExtractor";
import type { SenseResult } from "./SenseState";

/**
 * PLANステートを実行
 *
 * @param context エージェントコンテキスト
 * @param senseResult SENSEフェーズの結果
 * @returns 計画
 */
export async function executePlanState(
  context: AgentContext,
  senseResult: SenseResult
): Promise<AgentPlan> {
  console.log("[PlanState] Starting plan phase...");

  // 利用可能なツールの説明を生成
  const toolDescriptions = context.availableTools
    .map((tool) => {
      const params = Object.keys(tool.parameters.properties || {}).join(", ");
      return `- **${tool.name}**: ${tool.description}\n  パラメータ: ${params || "なし"}`;
    })
    .join("\n");

  const systemPrompt = `あなたはタスク計画を立案するAIアシスタントです。
ユーザーの意図と利用可能なツールを考慮して、最適な実行計画を立ててください。

## 利用可能なツール
${toolDescriptions}

## 計画立案のルール
1. 必要最小限のステップで目標を達成する
2. 各ステップは1つのツール呼び出しに対応
3. ステップ間の依存関係を明確にする
4. 信頼度（0-1）を設定する（確実な場合は高く、不確実な場合は低く）

以下のJSON形式で回答してください：
{
  "goal": "計画の目標",
  "steps": [
    {
      "order": 1,
      "toolName": "ツール名",
      "params": { "パラメータ名": "値" },
      "description": "このステップの説明",
      "dependsOn": []
    }
  ],
  "confidence": 0.8
}`;

  // ユーザーリクエストとSENSE結果をまとめる
  let userContent = `## 分析結果
- **意図**: ${senseResult.intent}
- **エンティティ**: ${senseResult.entities.map((e) => `${e.type}=${e.value}`).join(", ") || "なし"}
- **不足情報**: ${senseResult.missingInfo.join(", ") || "なし"}

## 元のリクエスト
${context.userInput}`;

  // アップロードファイルがある場合は追加
  if (context.uploadedFiles.length > 0) {
    const fileInfo = context.uploadedFiles
      .map((f) => `- ${f.name} (${f.type}, ${f.size} bytes)`)
      .join("\n");
    userContent += `\n\n## アップロードファイル\n${fileInfo}`;

    // ファイル内容があれば追加（最初の1000文字まで）
    for (const file of context.uploadedFiles) {
      if (file.content) {
        userContent += `\n\n### ${file.name}の内容（先頭部分）\n${file.content.substring(0, 1000)}...`;
      }
    }
  }

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      temperature: 0.2,
      maxTokens: 2048,
    });

    // JSONをパース
    const plan = parseJsonFromLLMResponse<AgentPlan>(response);

    console.log("[PlanState] Goal:", plan.goal);
    console.log("[PlanState] Steps:", plan.steps.length);
    console.log("[PlanState] Confidence:", plan.confidence);

    // 計画をコンテキストに保存
    context.setPlan(plan);

    return plan;
  } catch (error) {
    console.error("[PlanState] Error:", error);

    // フォールバック：空の計画を返す
    const fallbackPlan: AgentPlan = {
      goal: senseResult.intent,
      steps: [],
      confidence: 0,
    };

    context.setPlan(fallbackPlan);
    return fallbackPlan;
  }
}

/**
 * 計画の妥当性をチェック
 */
export function validatePlan(
  plan: AgentPlan,
  context: AgentContext
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const availableToolNames = new Set(context.getAvailableToolNames());

  // 各ステップを検証
  for (const step of plan.steps) {
    // ツールが存在するか
    if (!availableToolNames.has(step.toolName)) {
      errors.push(`Step ${step.order}: Unknown tool "${step.toolName}"`);
    }

    // 依存関係が有効か
    for (const dep of step.dependsOn || []) {
      if (dep >= step.order) {
        errors.push(
          `Step ${step.order}: Invalid dependency on step ${dep} (must be earlier)`
        );
      }
    }
  }

  // 信頼度が有効か
  if (plan.confidence < 0 || plan.confidence > 1) {
    errors.push(`Invalid confidence: ${plan.confidence} (must be 0-1)`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
