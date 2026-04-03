/**
 * 信頼度スコアラー
 *
 * 生成結果の信頼度を複数の観点から評価する
 */

import type { ToolExecutionRecord, AgentPlan } from "../../../domain/agent/types";
import type { ActResult } from "../states/ActState";

/**
 * 信頼度評価の観点
 */
export type ConfidenceFactors = {
  /** ツール実行の成功率 */
  toolSuccessRate: number;
  /** 計画の信頼度 */
  planConfidence: number;
  /** データの完全性 */
  dataCompleteness: number;
  /** 実行時間の妥当性 */
  executionTimeScore: number;
  /** エラー発生の有無 */
  errorFreeScore: number;
};

/**
 * 信頼度評価結果
 */
export type ConfidenceResult = {
  /** 総合信頼度スコア（0-1） */
  overallConfidence: number;
  /** 各要素のスコア */
  factors: ConfidenceFactors;
  /** 信頼度レベル */
  level: "high" | "medium" | "low";
  /** 警告メッセージ */
  warnings: string[];
};

/**
 * 信頼度レベルの閾値
 */
const CONFIDENCE_THRESHOLDS = {
  high: 0.8,
  medium: 0.5,
};

/**
 * 信頼度を計算
 *
 * @param plan 実行した計画
 * @param actResult 実行結果
 * @param toolRecords ツール実行記録
 * @returns 信頼度評価結果
 */
export function calculateConfidence(
  plan: AgentPlan,
  actResult: ActResult,
  toolRecords: ToolExecutionRecord[]
): ConfidenceResult {
  console.log("[ConfidenceScorer] Calculating confidence...");

  const factors: ConfidenceFactors = {
    toolSuccessRate: calculateToolSuccessRate(toolRecords),
    planConfidence: plan.confidence,
    dataCompleteness: calculateDataCompleteness(actResult),
    executionTimeScore: calculateExecutionTimeScore(toolRecords),
    errorFreeScore: actResult.allSucceeded ? 1 : 0,
  };

  // 重み付け平均
  const weights = {
    toolSuccessRate: 0.25,
    planConfidence: 0.2,
    dataCompleteness: 0.25,
    executionTimeScore: 0.1,
    errorFreeScore: 0.2,
  };

  const overallConfidence =
    factors.toolSuccessRate * weights.toolSuccessRate +
    factors.planConfidence * weights.planConfidence +
    factors.dataCompleteness * weights.dataCompleteness +
    factors.executionTimeScore * weights.executionTimeScore +
    factors.errorFreeScore * weights.errorFreeScore;

  // 信頼度レベルを決定
  let level: ConfidenceResult["level"];
  if (overallConfidence >= CONFIDENCE_THRESHOLDS.high) {
    level = "high";
  } else if (overallConfidence >= CONFIDENCE_THRESHOLDS.medium) {
    level = "medium";
  } else {
    level = "low";
  }

  // 警告を生成
  const warnings = generateWarnings(factors);

  console.log("[ConfidenceScorer] Overall confidence:", overallConfidence);
  console.log("[ConfidenceScorer] Level:", level);

  return {
    overallConfidence,
    factors,
    level,
    warnings,
  };
}

/**
 * ツール実行成功率を計算
 */
function calculateToolSuccessRate(toolRecords: ToolExecutionRecord[]): number {
  if (toolRecords.length === 0) {
    return 1; // ツールなしは成功とみなす
  }

  const successCount = toolRecords.filter((r) => r.result.success).length;
  return successCount / toolRecords.length;
}

/**
 * データ完全性を計算
 */
function calculateDataCompleteness(actResult: ActResult): number {
  if (actResult.executedSteps.length === 0) {
    return 0;
  }

  let totalScore = 0;

  for (const step of actResult.executedSteps) {
    if (!step.result.success) {
      totalScore += 0;
    } else if (!step.result.data) {
      totalScore += 0.5; // 成功したがデータなし
    } else {
      // データの「充実度」を簡易的に評価
      const dataStr = JSON.stringify(step.result.data);
      if (dataStr.length < 50) {
        totalScore += 0.7;
      } else if (dataStr.length < 500) {
        totalScore += 0.9;
      } else {
        totalScore += 1;
      }
    }
  }

  return totalScore / actResult.executedSteps.length;
}

/**
 * 実行時間の妥当性を計算
 */
function calculateExecutionTimeScore(toolRecords: ToolExecutionRecord[]): number {
  if (toolRecords.length === 0) {
    return 1;
  }

  let totalScore = 0;

  for (const record of toolRecords) {
    const timeMs = record.result.executionTimeMs || 0;

    // 実行時間に基づくスコア（30秒以上はペナルティ）
    if (timeMs < 5000) {
      totalScore += 1;
    } else if (timeMs < 15000) {
      totalScore += 0.8;
    } else if (timeMs < 30000) {
      totalScore += 0.6;
    } else {
      totalScore += 0.3;
    }
  }

  return totalScore / toolRecords.length;
}

/**
 * 警告メッセージを生成
 */
function generateWarnings(factors: ConfidenceFactors): string[] {
  const warnings: string[] = [];

  if (factors.toolSuccessRate < 0.8) {
    warnings.push(`ツール実行成功率が低い (${(factors.toolSuccessRate * 100).toFixed(0)}%)`);
  }

  if (factors.planConfidence < 0.5) {
    warnings.push(`計画の信頼度が低い (${(factors.planConfidence * 100).toFixed(0)}%)`);
  }

  if (factors.dataCompleteness < 0.5) {
    warnings.push(`データの完全性が低い (${(factors.dataCompleteness * 100).toFixed(0)}%)`);
  }

  if (factors.executionTimeScore < 0.5) {
    warnings.push("実行時間が長くなっています");
  }

  if (factors.errorFreeScore === 0) {
    warnings.push("実行中にエラーが発生しました");
  }

  return warnings;
}

/**
 * 信頼度に基づいて推奨アクションを決定
 */
export function getRecommendedAction(
  confidence: ConfidenceResult
): "proceed" | "verify" | "retry" | "escalate" {
  if (confidence.level === "high" && confidence.warnings.length === 0) {
    return "proceed";
  }

  if (confidence.level === "high" || confidence.level === "medium") {
    return "verify";
  }

  if (confidence.overallConfidence > 0.3) {
    return "retry";
  }

  return "escalate";
}
