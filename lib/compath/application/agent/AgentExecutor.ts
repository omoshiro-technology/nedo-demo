/**
 * エージェント実行エンジン
 *
 * Sense–Plan–Act–Evaluateループを管理する状態機械
 */

import { AgentContext } from "./AgentContext";
import type { Tool, FileInfo, ConversationMessage, EvaluationResult } from "../../domain/agent/types";
import {
  executeSenseState,
  executePlanState,
  validatePlan,
  executeActState,
  executeEvaluateState,
  generateFinalResponse,
} from "./states";
import type { SenseResult, ActResult } from "./states";
import { getAllTools, initializeDefaultTools } from "../../infrastructure/agent/toolCatalog";

/**
 * エージェント実行オプション
 */
export type AgentExecutorOptions = {
  /** セッションID */
  sessionId: string;
  /** ユーザー入力 */
  userInput: string;
  /** アップロードファイル */
  uploadedFiles?: FileInfo[];
  /** 会話履歴 */
  conversationHistory?: ConversationMessage[];
  /** 最大イテレーション数 */
  maxIterations?: number;
  /** 再試行の最大回数 */
  maxRetries?: number;
  /** 目標達成の閾値 */
  goalThreshold?: number;
};

/**
 * エージェント実行結果
 */
export type AgentExecutorResult = {
  /** 成功したか */
  success: boolean;
  /** 最終応答 */
  response: string;
  /** 実行したツールの記録 */
  toolExecutions: Array<{
    toolName: string;
    success: boolean;
    executionTimeMs?: number;
  }>;
  /** 評価結果 */
  evaluation?: EvaluationResult;
  /** エラー情報（失敗時） */
  error?: string;
  /** 総実行時間（ミリ秒） */
  totalTimeMs: number;
  /** イテレーション回数 */
  iterations: number;
};

/**
 * エージェント実行エンジン
 *
 * 状態遷移:
 * IDLE → SENSE → PLAN → ACT → EVALUATE → (COMPLETE | SENSE)
 *
 * EVALUATEで目標未達成の場合、SENSEに戻って再試行する
 */
export class AgentExecutor {
  private context: AgentContext;
  private maxRetries: number;
  private goalThreshold: number;
  private startTime: number = 0;

  constructor(options: AgentExecutorOptions) {
    // ツールカタログを初期化
    initializeDefaultTools();

    // コンテキストを作成
    this.context = new AgentContext({
      sessionId: options.sessionId,
      userInput: options.userInput,
      uploadedFiles: options.uploadedFiles,
      conversationHistory: options.conversationHistory,
      availableTools: getAllTools(),
      maxIterations: options.maxIterations || 10,
    });

    this.maxRetries = options.maxRetries || 3;
    this.goalThreshold = options.goalThreshold || 0.7;
  }

  /**
   * エージェントを実行
   */
  async execute(): Promise<AgentExecutorResult> {
    this.startTime = Date.now();
    console.log("[AgentExecutor] Starting execution...");
    console.log(`[AgentExecutor] Session: ${this.context.sessionId}`);
    console.log(`[AgentExecutor] Input: ${this.context.userInput.substring(0, 100)}...`);

    let retryCount = 0;
    let lastEvaluation: EvaluationResult | undefined;
    let lastSenseResult: SenseResult | undefined;
    let lastActResult: ActResult | undefined;

    try {
      while (!this.context.hasReachedMaxIterations() && retryCount < this.maxRetries) {
        this.context.incrementIteration();

        // ========== SENSE ==========
        this.context.transitionTo("SENSE");
        lastSenseResult = await executeSenseState(this.context);

        // 確認が必要な場合
        if (lastSenseResult.needsClarification) {
          console.log("[AgentExecutor] Clarification needed");
          return this.buildResult(
            false,
            lastSenseResult.clarificationMessage || "追加情報が必要です。",
            lastEvaluation
          );
        }

        // ========== PLAN ==========
        this.context.transitionTo("PLAN");
        const plan = await executePlanState(this.context, lastSenseResult);

        // 計画を検証
        const validation = validatePlan(plan, this.context);
        if (!validation.valid) {
          console.log("[AgentExecutor] Plan validation failed:", validation.errors);
          retryCount++;
          continue;
        }

        // 計画が空の場合
        if (plan.steps.length === 0) {
          console.log("[AgentExecutor] Empty plan generated");
          return this.buildResult(
            true,
            "ご質問にお答えします。何か具体的な分析や処理が必要な場合は、ファイルをアップロードするか、具体的なタスクをお知らせください。",
            lastEvaluation
          );
        }

        // ========== ACT ==========
        this.context.transitionTo("ACT");
        lastActResult = await executeActState(this.context, plan);

        // ========== EVALUATE ==========
        this.context.transitionTo("EVALUATE");
        lastEvaluation = await executeEvaluateState(
          this.context,
          lastSenseResult,
          plan,
          lastActResult
        );

        // 評価結果に基づいて分岐
        switch (lastEvaluation.nextAction) {
          case "complete":
            // 目標達成 → 最終応答を生成して終了
            if (lastEvaluation.goalAchievement >= this.goalThreshold) {
              this.context.transitionTo("COMPLETE");
              const response = await generateFinalResponse(
                this.context,
                lastSenseResult,
                lastActResult,
                lastEvaluation
              );
              return this.buildResult(true, response, lastEvaluation);
            }
            // 閾値未満でも完了と判断された場合
            this.context.transitionTo("COMPLETE");
            const partialResponse = await generateFinalResponse(
              this.context,
              lastSenseResult,
              lastActResult,
              lastEvaluation
            );
            return this.buildResult(true, partialResponse, lastEvaluation);

          case "retry":
            // 再試行
            console.log("[AgentExecutor] Retrying...");
            retryCount++;
            continue;

          case "clarify":
            // ユーザーに確認
            return this.buildResult(
              false,
              lastEvaluation.feedback || "追加の情報が必要です。",
              lastEvaluation
            );

          case "escalate":
            // 人間の介入が必要
            return this.buildResult(
              false,
              `このタスクには人間の判断が必要です。\n\n${lastEvaluation.feedback}`,
              lastEvaluation
            );
        }
      }

      // 最大イテレーション/リトライに達した場合
      console.log("[AgentExecutor] Max iterations/retries reached");
      this.context.transitionTo("ERROR");

      if (lastActResult && lastSenseResult && lastEvaluation) {
        const response = await generateFinalResponse(
          this.context,
          lastSenseResult,
          lastActResult,
          lastEvaluation
        );
        return this.buildResult(false, response, lastEvaluation, "最大試行回数に達しました");
      }

      return this.buildResult(
        false,
        "タスクを完了できませんでした。別の方法をお試しください。",
        lastEvaluation,
        "Max iterations reached"
      );
    } catch (error) {
      console.error("[AgentExecutor] Execution error:", error);
      this.context.transitionTo("ERROR");

      return this.buildResult(
        false,
        "エラーが発生しました。もう一度お試しください。",
        lastEvaluation,
        error instanceof Error ? error.message : "Unknown error"
      );
    }
  }

  /**
   * 実行結果を構築
   */
  private buildResult(
    success: boolean,
    response: string,
    evaluation?: EvaluationResult,
    error?: string
  ): AgentExecutorResult {
    const toolExecutions = this.context.toolResults.map((r) => ({
      toolName: r.toolName,
      success: r.result.success,
      executionTimeMs: r.result.executionTimeMs,
    }));

    return {
      success,
      response,
      toolExecutions,
      evaluation,
      error,
      totalTimeMs: Date.now() - this.startTime,
      iterations: this.context.currentIteration,
    };
  }

  /**
   * コンテキストを取得（デバッグ用）
   */
  getContext(): AgentContext {
    return this.context;
  }
}

/**
 * エージェントを実行するヘルパー関数
 */
export async function runAgent(
  options: AgentExecutorOptions
): Promise<AgentExecutorResult> {
  const executor = new AgentExecutor(options);
  return executor.execute();
}
