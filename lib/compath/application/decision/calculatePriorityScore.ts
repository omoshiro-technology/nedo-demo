import type { DecisionItem, PriorityLevel, PriorityScore } from "../../domain/types";

/**
 * 意思決定の優先度スコアを計算
 *
 * 計算式: (重要度 × 0.40) + (緊急性 × 0.35) + (実行可能性 × 0.25)
 *
 * 優先度レベル:
 * - CRITICAL (80-100): 直ちに対応が必要
 * - HIGH (60-79): 早期対応が望ましい
 * - MEDIUM (40-59): 予定に従い対応
 * - LOW (20-39): 機会があれば対応
 * - MINIMAL (0-19): 参考情報
 */
export function calculatePriorityScore(decision: DecisionItem): PriorityScore {
  // 1. 重要度コンポーネント（最大40点）
  // importance.score（0-100）を使用し、40%を適用
  const importanceScore = decision.importance?.score ?? 50;
  const importanceComponent = Math.round(importanceScore * 0.40);

  // 2. 緊急性コンポーネント（最大35点）
  let urgencyBase = 0;

  // ステータスによる基本点
  switch (decision.status) {
    case "confirmed":
      urgencyBase = 10; // 確定済みは緊急性低い
      break;
    case "gray":
      urgencyBase = 20; // グレーは要確定
      break;
    case "proposed":
      urgencyBase = 25; // 提案は要検証
      break;
    default:
      urgencyBase = 15;
  }

  // リスク加点
  if (decision.risks?.delayRisk === "high") {
    urgencyBase += 5;
  } else if (decision.risks?.delayRisk === "medium") {
    urgencyBase += 2;
  }

  // フェーズ遅延加点
  if (decision.phaseInfo?.isDelayed) {
    urgencyBase += 5;
  }

  // 変更パターン加点（変更は影響が大きい）
  if (decision.patternType === "change") {
    urgencyBase += 3;
  }

  // 中止パターンも緊急性あり
  if (decision.patternType === "cancellation") {
    urgencyBase += 2;
  }

  // 重要度がcriticalの場合の加点
  if (decision.importance?.level === "critical") {
    urgencyBase += 3;
  }

  // 複数カテゴリの場合の加点
  const categoryCount = decision.importance?.categories?.length ?? 0;
  if (categoryCount >= 3) {
    urgencyBase += 2;
  }

  const urgencyComponent = Math.min(urgencyBase, 35);

  // 3. 実行可能性コンポーネント（最大25点）
  // 曖昧性が多いほど実行が難しい → 減点
  let feasibilityBase = 25;

  // ambiguityFlagsによる減点
  const ambiguityCount = decision.ambiguityFlags?.length ?? 0;
  feasibilityBase -= ambiguityCount * 2;

  // missingInfoによる減点
  const missingInfoCount = decision.guidance?.missingInfo?.length ?? 0;
  feasibilityBase -= missingInfoCount * 1;

  // 最小5点を保証（完全に実行不可能ということはない）
  const feasibilityComponent = Math.max(5, feasibilityBase);

  // 総合スコア計算
  const score = Math.min(100, importanceComponent + urgencyComponent + feasibilityComponent);

  // レベル判定
  const level: PriorityLevel =
    score >= 80 ? "CRITICAL" :
    score >= 60 ? "HIGH" :
    score >= 40 ? "MEDIUM" :
    score >= 20 ? "LOW" : "MINIMAL";

  return {
    score,
    level,
    importanceComponent,
    urgencyComponent,
    feasibilityComponent,
  };
}
