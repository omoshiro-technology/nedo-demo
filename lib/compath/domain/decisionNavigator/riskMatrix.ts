/**
 * リスクマトリックス計算モジュール
 *
 * PMBOKベースのリスク評価：
 * - 発生確率 (probability): 1-5
 * - 影響度 (impact): 1-5
 * - リスクスコア: probability * impact * 4 (0-100)
 * - リスクレベル: low / medium / high
 */

import type { RiskLevel, LLMRiskInfo } from "./coreTypes";

// ============================================================
// 定数
// ============================================================

/** リスクスコアの閾値 */
const RISK_THRESHOLDS = {
  HIGH: 60,    // 60以上 = high
  MEDIUM: 30,  // 30以上 = medium
  // 30未満 = low
} as const;

/** 終了判定の閾値 */
const TERMINATION_THRESHOLDS = {
  IRREVERSIBILITY: 70,  // 不可逆度
  RISK_SCORE: 70,       // リスクスコア
} as const;

// ============================================================
// リスク計算関数
// ============================================================

/**
 * 発生確率と影響度からリスクスコアを計算
 * @param probability 発生確率 (1-5)
 * @param impact 影響度 (1-5)
 * @returns リスクスコア (0-100)
 */
export function calculateRiskScore(probability: number, impact: number): number {
  // 値の範囲をクランプ
  const clampedProbability = Math.max(1, Math.min(5, probability));
  const clampedImpact = Math.max(1, Math.min(5, impact));

  // probability * impact * 4 で 0-100 スケールに
  return clampedProbability * clampedImpact * 4;
}

/**
 * リスクスコアからリスクレベルを判定
 * @param score リスクスコア (0-100)
 * @returns リスクレベル
 */
export function scoreToRiskLevel(score: number): RiskLevel {
  if (score >= RISK_THRESHOLDS.HIGH) {
    return "high";
  }
  if (score >= RISK_THRESHOLDS.MEDIUM) {
    return "medium";
  }
  return "low";
}

/**
 * 発生確率と影響度から完全なリスク情報を生成
 * @param probability 発生確率 (1-5)
 * @param impact 影響度 (1-5)
 * @returns LLMRiskInfo
 */
export function createRiskInfo(probability: number, impact: number): LLMRiskInfo {
  const score = calculateRiskScore(probability, impact);
  const level = scoreToRiskLevel(score);

  return {
    probability: Math.max(1, Math.min(5, probability)),
    impact: Math.max(1, Math.min(5, impact)),
    score,
    level,
  };
}

// ============================================================
// 終了判定関数
// ============================================================

/**
 * 選択肢が枝切り（終了）すべきかを判定
 *
 * 判定基準:
 * - 不可逆度が高い (>= 70) かつ リスクスコアが高い (>= 70)
 * - 例: 発注、契約、解雇等の重大な意思決定
 *
 * @param irreversibilityScore 不可逆度 (0-100)
 * @param riskScore リスクスコア (0-100)
 * @returns 終了すべきか
 */
export function shouldTerminate(irreversibilityScore: number, riskScore: number): boolean {
  return (
    irreversibilityScore >= TERMINATION_THRESHOLDS.IRREVERSIBILITY &&
    riskScore >= TERMINATION_THRESHOLDS.RISK_SCORE
  );
}

/**
 * 終了判定の詳細理由を生成
 * @param irreversibilityScore 不可逆度 (0-100)
 * @param riskScore リスクスコア (0-100)
 * @returns 終了理由（終了しない場合はundefined）
 */
export function getTerminationReason(
  irreversibilityScore: number,
  riskScore: number
): string | undefined {
  if (!shouldTerminate(irreversibilityScore, riskScore)) {
    return undefined;
  }

  const reasons: string[] = [];

  if (irreversibilityScore >= 90) {
    reasons.push("この決定は事実上取り消し不可能です");
  } else if (irreversibilityScore >= 80) {
    reasons.push("この決定は取り消しが非常に困難です");
  } else {
    reasons.push("この決定は取り消しにコストがかかります");
  }

  if (riskScore >= 80) {
    reasons.push("リスクが非常に高いです");
  } else {
    reasons.push("リスクが高いです");
  }

  return reasons.join("。") + "。慎重に検討してください。";
}

// ============================================================
// バリデーション関数
// ============================================================

/**
 * LLM出力のリスク情報を検証・正規化
 * @param rawRisk LLMから返されたリスク情報
 * @returns 正規化されたリスク情報
 */
export function validateAndNormalizeRiskInfo(rawRisk: Partial<LLMRiskInfo>): LLMRiskInfo {
  // デフォルト値
  const probability = typeof rawRisk.probability === "number"
    ? Math.max(1, Math.min(5, Math.round(rawRisk.probability)))
    : 3;

  const impact = typeof rawRisk.impact === "number"
    ? Math.max(1, Math.min(5, Math.round(rawRisk.impact)))
    : 3;

  // スコアを再計算（LLMの計算ミスを防ぐ）
  const score = calculateRiskScore(probability, impact);
  const level = scoreToRiskLevel(score);

  return {
    probability,
    impact,
    score,
    level,
  };
}

/**
 * 不可逆度スコアを検証・正規化
 * @param rawScore LLMから返された不可逆度
 * @returns 正規化された不可逆度 (0-100)
 */
export function validateIrreversibilityScore(rawScore: unknown): number {
  if (typeof rawScore !== "number") {
    return 50; // デフォルト値
  }
  return Math.max(0, Math.min(100, Math.round(rawScore)));
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * リスクレベルに応じた表示ラベルを取得
 */
export function getRiskLevelLabel(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "高リスク";
    case "medium":
      return "中リスク";
    case "low":
      return "低リスク";
  }
}

/**
 * リスクスコアに応じた色を取得（UI用）
 */
export function getRiskColor(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "#dc2626"; // 赤
    case "medium":
      return "#f59e0b"; // オレンジ
    case "low":
      return "#10b981"; // 緑
  }
}

// ============================================================
// 閾値のエクスポート（テスト・設定変更用）
// ============================================================

export const THRESHOLDS = {
  RISK: RISK_THRESHOLDS,
  TERMINATION: TERMINATION_THRESHOLDS,
} as const;
