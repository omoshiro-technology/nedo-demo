/**
 * ゴールコンパス
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * ゴールへの距離を可視化し、進捗を追跡する
 */

import type {
  ThinkingBox,
  GoalDistanceCalculation,
  ConditionOption,
  CandidateValue,
} from "./types";
import { calculateGoalDistance, isGoalAchieved } from "./distanceCalculator";
import { getTimestamp } from "../utils";

// ============================================================
// ゴールコンパス状態
// ============================================================

/** ゴールコンパスの状態 */
export type GoalCompassState = {
  /** 現在のゴール距離（0-100、0が完了） */
  currentDistance: number;

  /** 完了率（0-100%） */
  completionPercentage: number;

  /** 推定残りステップ */
  estimatedRemainingSteps: number;

  /** 次のマイルストーン */
  nextMilestone: string;

  /** 進捗履歴 */
  progressHistory: ProgressEntry[];

  /** ゴール達成状態 */
  isAchieved: boolean;

  /** 達成した決定値 */
  achievedValue?: string;
};

/** 進捗エントリ */
export type ProgressEntry = {
  timestamp: string;
  distance: number;
  action: string;
  conditionSelected?: string;
  candidatesRemaining: number;
};

// ============================================================
// ゴールコンパス管理
// ============================================================

/**
 * ゴールコンパスを初期化
 */
export function initializeGoalCompass(
  initialDistance: number,
  initialCandidates: number
): GoalCompassState {
  const now = getTimestamp();

  return {
    currentDistance: initialDistance,
    completionPercentage: 100 - initialDistance,
    estimatedRemainingSteps: Math.ceil(Math.log2(Math.max(initialCandidates, 1))) + 1,
    nextMilestone: "条件を選択して候補を絞り込む",
    progressHistory: [
      {
        timestamp: now,
        distance: initialDistance,
        action: "セッション開始",
        candidatesRemaining: initialCandidates,
      },
    ],
    isAchieved: false,
  };
}

/**
 * 条件選択後にゴールコンパスを更新
 */
export function updateGoalCompass(
  currentState: GoalCompassState,
  thinkingBox: ThinkingBox,
  selectedCondition: ConditionOption,
  goalDistance: GoalDistanceCalculation
): GoalCompassState {
  const now = getTimestamp();

  // 進捗履歴に追加
  const newEntry: ProgressEntry = {
    timestamp: now,
    distance: goalDistance.baseScore,
    action: `条件選択: ${selectedCondition.label}`,
    conditionSelected: selectedCondition.id,
    candidatesRemaining: thinkingBox.remainingCandidates.length,
  };

  const progressHistory = [...currentState.progressHistory, newEntry];

  // ゴール達成判定
  const goalResult = isGoalAchieved(goalDistance, thinkingBox.remainingCandidates);

  return {
    currentDistance: goalDistance.baseScore,
    completionPercentage: goalDistance.display.percentage,
    estimatedRemainingSteps: goalDistance.display.remainingSteps,
    nextMilestone: goalDistance.display.nextMilestone,
    progressHistory,
    isAchieved: goalResult.achieved,
    achievedValue: goalResult.value,
  };
}

/**
 * ゴールコンパスのサマリーを生成
 */
export function generateCompassSummary(state: GoalCompassState): string {
  if (state.isAchieved) {
    return `✓ 決定完了: ${state.achievedValue}`;
  }

  const progressDelta = state.progressHistory.length > 1
    ? state.progressHistory[0].distance - state.currentDistance
    : 0;

  if (progressDelta > 0) {
    return `進捗: ${state.completionPercentage}% (+${progressDelta}%) | 残り約${state.estimatedRemainingSteps}ステップ`;
  }

  return `進捗: ${state.completionPercentage}% | 残り約${state.estimatedRemainingSteps}ステップ`;
}

// ============================================================
// 進捗分析
// ============================================================

/**
 * 進捗の傾向を分析
 */
export function analyzeProgress(
  state: GoalCompassState
): {
  trend: "accelerating" | "steady" | "slowing" | "stalled";
  averageStepProgress: number;
  recommendation: string;
} {
  const history = state.progressHistory;

  if (history.length < 2) {
    return {
      trend: "steady",
      averageStepProgress: 0,
      recommendation: "条件を選択して進捗を開始してください",
    };
  }

  // 各ステップでの進捗量を計算
  const stepProgresses: number[] = [];
  for (let i = 1; i < history.length; i++) {
    const progress = history[i - 1].distance - history[i].distance;
    stepProgresses.push(progress);
  }

  const averageProgress = stepProgresses.reduce((a, b) => a + b, 0) / stepProgresses.length;

  // 最近の進捗と全体平均を比較
  const recentProgress = stepProgresses.slice(-3);
  const recentAverage = recentProgress.reduce((a, b) => a + b, 0) / recentProgress.length;

  let trend: "accelerating" | "steady" | "slowing" | "stalled";
  let recommendation: string;

  if (recentAverage > averageProgress * 1.2) {
    trend = "accelerating";
    recommendation = "順調に進んでいます。このペースを維持してください。";
  } else if (recentAverage < averageProgress * 0.5) {
    trend = "slowing";
    recommendation = "進捗が遅くなっています。別のカテゴリの条件を試してみてください。";
  } else if (recentAverage < 1) {
    trend = "stalled";
    recommendation = "進捗が停滞しています。条件の優先順位を見直してください。";
  } else {
    trend = "steady";
    recommendation = "安定したペースで進んでいます。";
  }

  return {
    trend,
    averageStepProgress: averageProgress,
    recommendation,
  };
}

// ============================================================
// 条件カバレッジ分析
// ============================================================

/**
 * 条件カテゴリのカバレッジを分析
 */
export function analyzeConditionCoverage(
  selectedConditions: ConditionOption[]
): {
  coveredCategories: string[];
  uncoveredCategories: string[];
  coveragePercentage: number;
  recommendation: string;
} {
  const importantCategories = ["legal", "safety", "cost", "technical"] as const;
  const coveredCategories = new Set(selectedConditions.map((c) => c.category));

  const covered = importantCategories.filter((cat) => coveredCategories.has(cat));
  const uncovered = importantCategories.filter((cat) => !coveredCategories.has(cat));

  const coveragePercentage = (covered.length / importantCategories.length) * 100;

  let recommendation: string;
  if (uncovered.length === 0) {
    recommendation = "全ての重要カテゴリがカバーされています。";
  } else if (uncovered.length === 1) {
    recommendation = `「${getCategoryLabel(uncovered[0])}」の条件を確認することをお勧めします。`;
  } else {
    recommendation = `「${uncovered.map(getCategoryLabel).join("」「")}」の条件を確認することをお勧めします。`;
  }

  return {
    coveredCategories: covered,
    uncoveredCategories: uncovered,
    coveragePercentage,
    recommendation,
  };
}

/**
 * カテゴリのラベルを取得
 */
function getCategoryLabel(category: string): string {
  const labels: Record<string, string> = {
    legal: "法規",
    safety: "安全性",
    cost: "コスト",
    technical: "技術",
    time: "時間",
    resource: "リソース",
    stakeholder: "関係者",
    environmental: "環境",
    quality: "品質",
  };
  return labels[category] ?? category;
}

// ============================================================
// 候補値の分析
// ============================================================

/**
 * 残り候補値の分析
 */
export function analyzeCandidates(
  candidates: CandidateValue[]
): {
  count: number;
  topCandidate: CandidateValue | null;
  scoreSpread: number;
  recommendation: string;
} {
  if (candidates.length === 0) {
    return {
      count: 0,
      topCandidate: null,
      scoreSpread: 0,
      recommendation: "候補がありません。条件を見直してください。",
    };
  }

  // スコア順にソート
  const sorted = [...candidates].sort((a, b) => b.score - a.score);
  const topCandidate = sorted[0];

  // スコアの広がりを計算
  const maxScore = sorted[0].score;
  const minScore = sorted[sorted.length - 1].score;
  const scoreSpread = maxScore - minScore;

  let recommendation: string;
  if (candidates.length === 1) {
    recommendation = `決定値が確定しました: ${topCandidate.value}`;
  } else if (candidates.length === 2 && scoreSpread < 10) {
    recommendation = "2つの候補が拮抗しています。追加の条件で絞り込むか、直接選択してください。";
  } else if (scoreSpread < 15) {
    recommendation = "候補のスコアが近いです。優先順位を明確にする条件を選択してください。";
  } else {
    recommendation = `現在の最有力候補: ${topCandidate.value}（スコア: ${topCandidate.score}）`;
  }

  return {
    count: candidates.length,
    topCandidate,
    scoreSpread,
    recommendation,
  };
}
