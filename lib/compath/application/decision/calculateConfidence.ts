import type {
  ConfidenceLevel,
  DecisionStatus,
  DecisionPatternType,
} from "../../domain/types";

/**
 * 確信度スコア計算結果
 */
export type ConfidenceResult = {
  confidence: ConfidenceLevel;
  status: DecisionStatus;
  qualityScore: number;
  ambiguityFlags: string[];
};

/**
 * パターンごとの確信度レベル
 */
const PATTERN_CONFIDENCE: Record<DecisionPatternType, ConfidenceLevel> = {
  decision: "high", // 「〜とする」「〜に決定」
  agreement: "high", // 「〜で合意」
  adoption: "medium", // 「〜を採用」
  change: "medium", // 「〜に変更」
  cancellation: "medium", // 「〜を中止」
  other: "low",
};

/**
 * パターン確信度のスコア
 */
const PATTERN_SCORES: Record<ConfidenceLevel, number> = {
  high: 40,
  medium: 20,
  low: 0,
};

/**
 * 曖昧性を示すパターン（減点対象）
 */
const AMBIGUITY_PATTERNS: Array<{
  pattern: RegExp;
  flag: string;
  penalty: number;
}> = [
  // 条件付き表現
  { pattern: /ただし|但し|ただ、/u, flag: "条件付きの決定", penalty: 15 },
  { pattern: /場合[はに]/u, flag: "条件分岐あり", penalty: 10 },

  // 未確定表現
  { pattern: /予定|よてい/u, flag: "「予定」を含む", penalty: 20 },
  { pattern: /検討|けんとう/u, flag: "「検討」を含む", penalty: 25 },
  { pattern: /協議|きょうぎ/u, flag: "「協議」を含む", penalty: 20 },
  { pattern: /可能性/u, flag: "「可能性」を含む", penalty: 25 },
  { pattern: /方向で/u, flag: "「方向で」を含む（未確定）", penalty: 15 },

  // 疑問形
  { pattern: /[?？]/u, flag: "疑問形", penalty: 30 },
  { pattern: /か[。、]/u, flag: "疑問の「か」を含む", penalty: 20 },

  // 否定・保留
  { pattern: /保留/u, flag: "「保留」を含む", penalty: 25 },
  { pattern: /見送[りる]/u, flag: "「見送り」を含む", penalty: 15 },
];

/**
 * 時制パターン（過去形ほど確定的）
 */
const TENSE_PATTERNS: Array<{
  pattern: RegExp;
  score: number;
  label: string;
}> = [
  { pattern: /した[。、]?$/u, score: 20, label: "過去形" },
  { pattern: /された[。、]?$/u, score: 20, label: "過去形（受身）" },
  { pattern: /とした[。、]?$/u, score: 20, label: "過去形" },
  { pattern: /する[。、]?$/u, score: 10, label: "現在形" },
  { pattern: /とする[。、]?$/u, score: 15, label: "決定形" },
  { pattern: /予定[。、]?$/u, score: 0, label: "未来形" },
];

/**
 * 出典ファイル名からのスコア
 */
function getSourceScore(fileName: string): number {
  const lowerName = fileName.toLowerCase();
  if (
    lowerName.includes("議事録") ||
    lowerName.includes("minutes") ||
    lowerName.includes("会議録")
  ) {
    return 10;
  }
  if (
    lowerName.includes("報告") ||
    lowerName.includes("report") ||
    lowerName.includes("レポート")
  ) {
    return 7;
  }
  return 5;
}

/**
 * 時制スコアを計算
 */
function getTenseScore(content: string, sourceText: string): number {
  const text = content + sourceText;
  for (const { pattern, score } of TENSE_PATTERNS) {
    if (pattern.test(text)) {
      return score;
    }
  }
  return 10; // デフォルト（現在形相当）
}

/**
 * コンテキスト分析でスコアと曖昧性フラグを計算
 */
function analyzeContext(
  content: string,
  sourceText: string
): { score: number; flags: string[] } {
  const text = content + " " + sourceText;
  const flags: string[] = [];
  let penalty = 0;

  for (const { pattern, flag, penalty: p } of AMBIGUITY_PATTERNS) {
    if (pattern.test(text)) {
      flags.push(flag);
      penalty += p;
    }
  }

  // 最大30点から減点
  const score = Math.max(0, 30 - penalty);
  return { score, flags };
}

/**
 * 確信度とステータスを計算
 */
export function calculateConfidence(
  patternType: DecisionPatternType,
  content: string,
  sourceText: string,
  sourceFileName: string
): ConfidenceResult {
  // 1. パターンスコア（40%）
  const patternConfidence = PATTERN_CONFIDENCE[patternType];
  const patternScore = PATTERN_SCORES[patternConfidence];

  // 2. コンテキストスコア（30%）
  const { score: contextScore, flags: ambiguityFlags } = analyzeContext(
    content,
    sourceText
  );

  // 3. 時制スコア（20%）
  const tenseScore = getTenseScore(content, sourceText);

  // 4. 出典スコア（10%）
  const sourceScore = getSourceScore(sourceFileName);

  // 総合スコア
  const qualityScore = patternScore + contextScore + tenseScore + sourceScore;

  // ステータス判定
  let status: DecisionStatus;
  if (qualityScore >= 70) {
    status = "confirmed";
  } else if (qualityScore >= 40) {
    status = "gray";
  } else {
    status = "proposed";
  }

  // 確信度レベル（スコアベースで再計算）
  let confidence: ConfidenceLevel;
  if (qualityScore >= 70) {
    confidence = "high";
  } else if (qualityScore >= 40) {
    confidence = "medium";
  } else {
    confidence = "low";
  }

  return {
    confidence,
    status,
    qualityScore,
    ambiguityFlags,
  };
}
