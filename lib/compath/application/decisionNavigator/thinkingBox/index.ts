/**
 * 思考ボックスモジュール
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 */

// 型定義
export * from "./types";

// 距離計算
export {
  calculateGoalDistance,
  isGoalAchieved,
  calculateInitialGoalDistance,
} from "./distanceCalculator";

// 枝刈りロジック
export {
  evaluatePruning,
  narrowCandidates,
  previewPruning,
} from "./pruningLogic";

// 思考ボックス生成
export {
  createInitialThinkingBox,
  processConditionSelection,
  generateGoalCompass,
  checkTerminationCondition,
} from "./generateThinkingBox";

// ゴールコンパス
export {
  type GoalCompassState,
  type ProgressEntry,
  initializeGoalCompass,
  updateGoalCompass,
  generateCompassSummary,
  analyzeProgress,
  analyzeConditionCoverage,
  analyzeCandidates,
} from "./goalCompass";
