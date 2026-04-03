/**
 * ゴール距離コンパス計算
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * ゴールへの距離を計算し、進捗を可視化する
 */

import type {
  CandidateValue,
  ConditionOption,
  GoalDistanceCalculation,
  PriorityAmbiguityLevel,
} from "./types";

// ============================================================
// 重み定義
// ============================================================

/** 各構成要素の重み */
const WEIGHTS = {
  unresolvedConditions: 0.3,  // 未解決条件の重み
  remainingCandidates: 0.4,   // 残り候補数の重み
  informationGaps: 0.2,       // 情報ギャップの重み
  priorityAmbiguity: 0.1,     // 優先順位曖昧さの重み
};

/** 優先順位曖昧さのスコア */
const PRIORITY_AMBIGUITY_SCORES: Record<PriorityAmbiguityLevel, number> = {
  high: 100,
  medium: 50,
  low: 10,
};

// ============================================================
// ゴール距離計算
// ============================================================

/**
 * ゴール距離を計算
 *
 * @param selectedConditions 選択済み条件
 * @param remainingCandidates 残り候補値
 * @param totalInitialCandidates 初期候補数
 * @param informationGaps 情報ギャップ（未解決の質問など）
 * @returns ゴール距離計算結果
 */
export function calculateGoalDistance(
  selectedConditions: ConditionOption[],
  remainingCandidates: CandidateValue[],
  totalInitialCandidates: number,
  informationGaps: string[] = []
): GoalDistanceCalculation {
  // 1. 残り候補数のスコア（候補が1つに絞られたら0）
  const remainingScore = calculateRemainingCandidatesScore(
    remainingCandidates.length,
    totalInitialCandidates
  );

  // 2. 未解決条件のスコア（条件が全て解決されたら0）
  const unresolvedScore = calculateUnresolvedConditionsScore(selectedConditions);

  // 3. 情報ギャップのスコア
  const gapScore = calculateInformationGapsScore(informationGaps);

  // 4. 優先順位の曖昧さを判定
  const priorityAmbiguity = assessPriorityAmbiguity(selectedConditions);
  const priorityScore = PRIORITY_AMBIGUITY_SCORES[priorityAmbiguity];

  // 5. 加重平均でベーススコアを計算
  const baseScore = Math.round(
    remainingScore * WEIGHTS.remainingCandidates +
    unresolvedScore * WEIGHTS.unresolvedConditions +
    gapScore * WEIGHTS.informationGaps +
    priorityScore * WEIGHTS.priorityAmbiguity
  );

  // 6. 表示用の情報を生成
  const display = generateDisplayInfo(
    baseScore,
    remainingCandidates,
    selectedConditions,
    informationGaps
  );

  return {
    baseScore,
    components: {
      unresolvedConditions: {
        count: countUnresolvedConditions(selectedConditions),
        weight: WEIGHTS.unresolvedConditions,
        contribution: Math.round(unresolvedScore * WEIGHTS.unresolvedConditions),
      },
      remainingCandidates: {
        count: remainingCandidates.length,
        weight: WEIGHTS.remainingCandidates,
        contribution: Math.round(remainingScore * WEIGHTS.remainingCandidates),
      },
      informationGaps: {
        count: informationGaps.length,
        weight: WEIGHTS.informationGaps,
        contribution: Math.round(gapScore * WEIGHTS.informationGaps),
      },
      priorityAmbiguity: {
        level: priorityAmbiguity,
        weight: WEIGHTS.priorityAmbiguity,
        contribution: Math.round(priorityScore * WEIGHTS.priorityAmbiguity),
      },
    },
    display,
  };
}

// ============================================================
// スコア計算ヘルパー
// ============================================================

/**
 * 残り候補数からスコアを計算
 * - 1個 → 0（完了）
 * - 2個 → 30
 * - 3個 → 50
 * - 4個以上 → 70-100
 */
function calculateRemainingCandidatesScore(
  remaining: number,
  initial: number
): number {
  if (remaining <= 1) return 0;
  if (remaining === 2) return 30;
  if (remaining === 3) return 50;

  // 4個以上は初期数との比率で計算
  const ratio = remaining / Math.max(initial, 1);
  return Math.min(100, Math.round(50 + ratio * 50));
}

/**
 * 未解決条件のスコアを計算
 */
function calculateUnresolvedConditionsScore(
  selectedConditions: ConditionOption[]
): number {
  // 条件のカテゴリをカウント
  const categories = new Set(selectedConditions.map((c) => c.category));
  const requiredCategories = ["legal", "safety", "cost", "technical"];
  const coveredCount = requiredCategories.filter((cat) =>
    categories.has(cat as ConditionOption["category"])
  ).length;

  // カバーされていないカテゴリの数に応じてスコアを計算
  const uncoveredRatio = 1 - coveredCount / requiredCategories.length;
  return Math.round(uncoveredRatio * 100);
}

/**
 * 情報ギャップのスコアを計算
 */
function calculateInformationGapsScore(gaps: string[]): number {
  if (gaps.length === 0) return 0;
  if (gaps.length === 1) return 30;
  if (gaps.length === 2) return 60;
  return 100;
}

/**
 * 未解決条件の数をカウント
 */
function countUnresolvedConditions(
  selectedConditions: ConditionOption[]
): number {
  const categories = new Set(selectedConditions.map((c) => c.category));
  const requiredCategories = ["legal", "safety", "cost", "technical"];
  return requiredCategories.filter(
    (cat) => !categories.has(cat as ConditionOption["category"])
  ).length;
}

/**
 * 優先順位の曖昧さを評価
 */
function assessPriorityAmbiguity(
  selectedConditions: ConditionOption[]
): PriorityAmbiguityLevel {
  // 選択された条件の中から優先順位に関する条件をカウント
  const priorityConditions = selectedConditions.filter(
    (c) =>
      c.type === "implicit_condition" &&
      (c.label.includes("優先") || c.label.includes("重視"))
  );

  if (priorityConditions.length >= 2) return "low";
  if (priorityConditions.length === 1) return "medium";
  return "high";
}

// ============================================================
// 表示情報生成
// ============================================================

/**
 * ユーザー向けの表示情報を生成
 */
function generateDisplayInfo(
  baseScore: number,
  remainingCandidates: CandidateValue[],
  selectedConditions: ConditionOption[],
  informationGaps: string[]
): GoalDistanceCalculation["display"] {
  // 完了率（0-100%）
  const percentage = 100 - baseScore;

  // 残りステップ数を推定
  const remainingSteps = estimateRemainingSteps(
    remainingCandidates.length,
    informationGaps.length
  );

  // 次のマイルストーンを生成
  const nextMilestone = generateNextMilestone(
    remainingCandidates,
    selectedConditions,
    informationGaps
  );

  return {
    percentage,
    remainingSteps,
    nextMilestone,
  };
}

/**
 * 残りステップ数を推定
 */
function estimateRemainingSteps(
  remainingCandidates: number,
  gapCount: number
): number {
  if (remainingCandidates <= 1 && gapCount === 0) return 0;

  // 候補を1つに絞るために必要なステップ数を推定
  // log2(candidates) + gaps で概算
  const candidateSteps = remainingCandidates > 1 ? Math.ceil(Math.log2(remainingCandidates)) : 0;
  return candidateSteps + gapCount;
}

/**
 * 次のマイルストーンを生成
 */
function generateNextMilestone(
  remainingCandidates: CandidateValue[],
  selectedConditions: ConditionOption[],
  informationGaps: string[]
): string {
  // 候補が1つに絞られている場合
  if (remainingCandidates.length === 1) {
    return `決定: ${remainingCandidates[0].value}`;
  }

  // 情報ギャップがある場合
  if (informationGaps.length > 0) {
    return `確認: ${informationGaps[0]}`;
  }

  // 候補が複数ある場合
  if (remainingCandidates.length <= 3) {
    return `候補を${remainingCandidates.length}個から1個に絞る`;
  }

  // カテゴリのカバレッジを確認
  const categories = new Set(selectedConditions.map((c) => c.category));
  if (!categories.has("safety")) {
    return "安全性の条件を確認";
  }
  if (!categories.has("legal")) {
    return "法規制約を確認";
  }
  if (!categories.has("cost")) {
    return "コスト条件を確認";
  }

  return "条件を追加して候補を絞る";
}

// ============================================================
// ゴール達成判定
// ============================================================

/**
 * ゴールが達成されたかを判定
 *
 * @param calculation ゴール距離計算結果
 * @param remainingCandidates 残り候補値
 * @returns ゴール達成の判定結果
 */
export function isGoalAchieved(
  calculation: GoalDistanceCalculation,
  remainingCandidates: CandidateValue[]
): { achieved: boolean; value?: string; reason?: string } {
  // 候補が1つに絞られた場合
  if (remainingCandidates.length === 1) {
    return {
      achieved: true,
      value: remainingCandidates[0].value,
      reason: "候補が1つに絞られました",
    };
  }

  // 完了率が100%の場合
  if (calculation.display.percentage >= 100) {
    return {
      achieved: true,
      value: remainingCandidates[0]?.value,
      reason: "全ての条件が満たされました",
    };
  }

  return { achieved: false };
}

/**
 * 初期ゴール距離を計算
 *
 * @param purpose 目的テキスト
 * @param initialCandidates 初期候補数
 * @returns 初期ゴール距離（0-100）
 */
export function calculateInitialGoalDistance(
  _purpose: string,
  initialCandidates: number
): number {
  // 初期状態では候補数に応じた距離を設定
  if (initialCandidates <= 1) return 20;  // 既にほぼ決まっている
  if (initialCandidates <= 3) return 50;  // やや絞られている
  if (initialCandidates <= 5) return 70;  // 標準的な状態
  return 90;  // 多くの候補がある
}
