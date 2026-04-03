/**
 * ACTステート
 *
 * 実行フェーズ：計画に基づいてツールを実行する
 */

import type { AgentContext } from "../AgentContext";
import type { AgentPlan, PlanStep, ToolExecutionRecord, ToolResult } from "../../../domain/agent/types";
import { executeTool } from "../../../infrastructure/agent/toolCatalog";

/**
 * ACT状態の結果
 */
export type ActResult = {
  /** 実行されたステップ */
  executedSteps: Array<{
    step: PlanStep;
    result: ToolResult;
  }>;
  /** すべて成功したか */
  allSucceeded: boolean;
  /** 失敗したステップ（あれば） */
  failedStep?: PlanStep;
  /** エラーメッセージ（失敗時） */
  errorMessage?: string;
};

/**
 * ACTステートを実行
 *
 * @param context エージェントコンテキスト
 * @param plan 実行する計画
 * @returns 実行結果
 */
export async function executeActState(
  context: AgentContext,
  plan: AgentPlan
): Promise<ActResult> {
  console.log("[ActState] Starting act phase...");
  console.log(`[ActState] Executing ${plan.steps.length} steps`);

  const executedSteps: ActResult["executedSteps"] = [];
  const stepResults = new Map<number, ToolResult>();

  // ステップを順番に実行
  const sortedSteps = [...plan.steps].sort((a, b) => a.order - b.order);

  for (const step of sortedSteps) {
    console.log(`[ActState] Step ${step.order}: ${step.toolName}`);

    // 依存関係をチェック
    const dependenciesMet = checkDependencies(step, stepResults);
    if (!dependenciesMet) {
      console.log(`[ActState] Step ${step.order}: Dependencies not met, skipping`);
      continue;
    }

    // パラメータを解決（前のステップの結果を使用可能）
    const resolvedParams = resolveParams(step.params, stepResults);

    try {
      // ツールを実行
      const result = await executeTool(step.toolName, resolvedParams);

      // 結果を記録
      stepResults.set(step.order, result);
      executedSteps.push({ step, result });

      // コンテキストに記録
      const record: ToolExecutionRecord = {
        toolName: step.toolName,
        params: resolvedParams,
        result,
        executedAt: Date.now(),
      };
      context.recordToolExecution(record);

      // 失敗した場合は中断
      if (!result.success) {
        console.log(`[ActState] Step ${step.order} failed: ${result.error}`);
        return {
          executedSteps,
          allSucceeded: false,
          failedStep: step,
          errorMessage: result.error,
        };
      }

      console.log(`[ActState] Step ${step.order} completed successfully`);
    } catch (error) {
      console.error(`[ActState] Step ${step.order} threw exception:`, error);

      const errorResult: ToolResult = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      executedSteps.push({ step, result: errorResult });

      return {
        executedSteps,
        allSucceeded: false,
        failedStep: step,
        errorMessage: errorResult.error,
      };
    }
  }

  console.log("[ActState] All steps completed successfully");

  return {
    executedSteps,
    allSucceeded: true,
  };
}

/**
 * 依存関係が満たされているかチェック
 */
function checkDependencies(
  step: PlanStep,
  stepResults: Map<number, ToolResult>
): boolean {
  if (!step.dependsOn || step.dependsOn.length === 0) {
    return true;
  }

  for (const dep of step.dependsOn) {
    const depResult = stepResults.get(dep);
    if (!depResult || !depResult.success) {
      return false;
    }
  }

  return true;
}

/**
 * パラメータを解決（前のステップの結果を参照可能）
 *
 * パラメータ値に "${step.N.field}" 形式の参照があれば、
 * ステップNの結果のfieldで置換する
 */
function resolveParams(
  params: unknown,
  stepResults: Map<number, ToolResult>
): unknown {
  if (typeof params === "string") {
    // ${step.N.field} パターンをマッチ
    const pattern = /\$\{step\.(\d+)\.(\w+)\}/g;
    return params.replace(pattern, (match, stepNum, field) => {
      const result = stepResults.get(parseInt(stepNum));
      if (result?.data && typeof result.data === "object") {
        const value = (result.data as Record<string, unknown>)[field];
        return value !== undefined ? String(value) : match;
      }
      return match;
    });
  }

  if (Array.isArray(params)) {
    return params.map((p) => resolveParams(p, stepResults));
  }

  if (params && typeof params === "object") {
    const resolved: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(params)) {
      resolved[key] = resolveParams(value, stepResults);
    }
    return resolved;
  }

  return params;
}
