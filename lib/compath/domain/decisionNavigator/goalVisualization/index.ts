/**
 * ゴール可視化モジュール
 *
 * 「達成したい状態」の可視化を強化
 */

export type {
  // ゴール定義
  EnhancedGoalType,
  SuccessCriteria,
  EnhancedGoalDefinition,
  // 分解
  SubGoalStatus,
  SubGoal,
  RequiredDecision,
  GoalDecomposition,
  // 現在状態
  CurrentFocus,
  GoalCurrentState,
  // 進捗
  ProgressTrend,
  SubGoalProgress,
  ProgressHistoryEntry,
  ProgressForecast,
  GoalProgress,
  // 達成評価
  AchievementLevel,
  CriteriaEvaluation,
  ImprovementSuggestion,
  AchievementAssessment,
  // 統合型
  EnhancedGoalVisualization,
  // API型
  GetGoalVisualizationRequest,
  UpdateSubGoalRequest,
  RecordProgressRequest,
  AssessAchievementRequest,
} from "./types";
