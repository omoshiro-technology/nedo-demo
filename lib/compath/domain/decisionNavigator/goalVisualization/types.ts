/**
 * Phase 5: ゴール可視化の強化
 *
 * 「達成したい状態」の可視化強化
 * - ゴールの分解（サブゴール）
 * - 進捗トラッキング
 * - 達成評価
 */

// ============================================================
// 強化されたゴール定義
// ============================================================

/** ゴールの種類（拡張版） */
export type EnhancedGoalType =
  | "numeric_value"      // 数値の決定
  | "categorical_value"  // カテゴリ選択
  | "process_plan"       // 手順策定
  | "multi_objective"    // 複合目標
  | "milestone_based";   // マイルストーンベース

/** 成功基準 */
export type SuccessCriteria = {
  /** 基準ID */
  id: string;
  /** 説明 */
  description: string;
  /** 測定方法 */
  measurementMethod?: string;
  /** 目標値（数値の場合） */
  targetValue?: string;
  /** 達成済みか */
  isMet: boolean;
};

/** 強化されたゴール定義 */
export type EnhancedGoalDefinition = {
  /** ゴールID */
  id: string;
  /** ゴールの種類 */
  type: EnhancedGoalType;
  /** 主目標 */
  primaryGoal: string;
  /** 副目標 */
  secondaryGoals?: string[];
  /** 成功基準 */
  successCriteria: SuccessCriteria[];
  /** 制約条件 */
  constraints?: string[];
  /** 優先順位（複合目標の場合） */
  priorities?: Array<{
    goalId: string;
    priority: number;
  }>;
  /** 期限 */
  deadline?: string;
  /** 作成日時 */
  createdAt: string;
};

// ============================================================
// ゴールの分解
// ============================================================

/** サブゴールのステータス */
export type SubGoalStatus =
  | "not_started"
  | "in_progress"
  | "completed"
  | "blocked"
  | "skipped";

/** サブゴール */
export type SubGoal = {
  /** サブゴールID */
  id: string;
  /** 説明 */
  description: string;
  /** 重み（全体に対する比重、0-100） */
  weight: number;
  /** ステータス */
  status: SubGoalStatus;
  /** 依存するサブゴールID */
  dependencies: string[];
  /** 進捗率（0-100） */
  progress: number;
  /** 関連するノードID */
  relatedNodeIds?: string[];
  /** 完了日時 */
  completedAt?: string;
};

/** 必要な決定事項 */
export type RequiredDecision = {
  /** 決定ID */
  id: string;
  /** 質問/決定事項 */
  question: string;
  /** ステータス */
  status: "pending" | "in_progress" | "decided" | "deferred";
  /** 決定された値 */
  decidedValue?: string;
  /** 決定理由 */
  rationale?: string;
  /** 決定日時 */
  decidedAt?: string;
  /** 関連するサブゴールID */
  relatedSubGoalId?: string;
};

/** ゴールの分解 */
export type GoalDecomposition = {
  /** サブゴール一覧 */
  subGoals: SubGoal[];
  /** 必要な決定事項 */
  requiredDecisions: RequiredDecision[];
  /** クリティカルパス（必須のサブゴールID順） */
  criticalPath: string[];
  /** 分解の深さ */
  decompositionDepth: number;
};

// ============================================================
// 現在の状態
// ============================================================

/** 現在のフォーカス */
export type CurrentFocus = {
  /** フォーカス中のサブゴールID */
  subGoalId?: string;
  /** フォーカス中の決定事項ID */
  decisionId?: string;
  /** フォーカス理由 */
  reason: string;
};

/** ゴールの現在状態 */
export type GoalCurrentState = {
  /** 全体ステータス */
  overallStatus: "not_started" | "in_progress" | "near_completion" | "completed" | "blocked";
  /** 現在のフォーカス */
  currentFocus?: CurrentFocus;
  /** ブロッカー */
  blockers?: string[];
  /** 次のアクション */
  nextActions: string[];
  /** 最終更新日時 */
  lastUpdatedAt: string;
};

// ============================================================
// 進捗
// ============================================================

/** トレンド */
export type ProgressTrend = "improving" | "stable" | "declining";

/** サブゴール別進捗 */
export type SubGoalProgress = {
  /** サブゴールID */
  subGoalId: string;
  /** 進捗率（0-100） */
  percentage: number;
  /** トレンド */
  trend: ProgressTrend;
};

/** 進捗履歴エントリ */
export type ProgressHistoryEntry = {
  /** タイムスタンプ */
  timestamp: string;
  /** 進捗率 */
  percentage: number;
  /** マイルストーン（達成した場合） */
  milestone?: string;
  /** 変化の理由 */
  changeReason?: string;
};

/** 予測 */
export type ProgressForecast = {
  /** 予測完了日 */
  estimatedCompletion: string;
  /** 確信度（0-100） */
  confidence: number;
  /** リスク要因 */
  riskFactors: string[];
  /** 加速要因 */
  accelerators?: string[];
};

/** ゴール進捗 */
export type GoalProgress = {
  /** 全体進捗率（0-100） */
  overallPercentage: number;
  /** サブゴール別進捗 */
  bySubGoal: SubGoalProgress[];
  /** 進捗履歴 */
  history: ProgressHistoryEntry[];
  /** 予測 */
  forecast?: ProgressForecast;
  /** 加速度（正=加速、負=減速） */
  velocity?: number;
};

// ============================================================
// 達成評価
// ============================================================

/** 達成評価レベル */
export type AchievementLevel =
  | "exceeded"      // 目標超過
  | "fully_met"     // 完全達成
  | "mostly_met"    // ほぼ達成
  | "partially_met" // 部分達成
  | "not_met";      // 未達成

/** 基準別評価 */
export type CriteriaEvaluation = {
  /** 基準ID */
  criteriaId: string;
  /** 達成レベル */
  level: AchievementLevel;
  /** 実績値 */
  actualValue?: string;
  /** ギャップ */
  gap?: string;
  /** コメント */
  comment?: string;
};

/** 改善提案 */
export type ImprovementSuggestion = {
  /** 提案内容 */
  suggestion: string;
  /** 期待効果 */
  expectedImpact: string;
  /** 優先度 */
  priority: "high" | "medium" | "low";
  /** 関連するサブゴールID */
  relatedSubGoalId?: string;
};

/** 達成評価 */
export type AchievementAssessment = {
  /** 全体達成レベル */
  overallLevel: AchievementLevel;
  /** 基準別評価 */
  criteriaEvaluations: CriteriaEvaluation[];
  /** 達成スコア（0-100） */
  score: number;
  /** 強み */
  strengths: string[];
  /** 改善点 */
  areasForImprovement: string[];
  /** 改善提案 */
  suggestions: ImprovementSuggestion[];
  /** 評価日時 */
  assessedAt: string;
};

// ============================================================
// 強化されたゴール可視化（統合型）
// ============================================================

/** 強化されたゴール可視化 */
export type EnhancedGoalVisualization = {
  /** ゴール定義 */
  goalDefinition: EnhancedGoalDefinition;
  /** 分解 */
  decomposition: GoalDecomposition;
  /** 現在状態 */
  currentState: GoalCurrentState;
  /** 進捗 */
  progress: GoalProgress;
  /** 達成評価 */
  achievementAssessment?: AchievementAssessment;
  /** セッションID */
  sessionId: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
};

// ============================================================
// API リクエスト/レスポンス型
// ============================================================

/** ゴール可視化取得リクエスト */
export type GetGoalVisualizationRequest = {
  sessionId: string;
};

/** サブゴール更新リクエスト */
export type UpdateSubGoalRequest = {
  sessionId: string;
  subGoalId: string;
  status?: SubGoalStatus;
  progress?: number;
};

/** 進捗記録リクエスト */
export type RecordProgressRequest = {
  sessionId: string;
  percentage: number;
  milestone?: string;
  changeReason?: string;
};

/** 達成評価リクエスト */
export type AssessAchievementRequest = {
  sessionId: string;
  criteriaEvaluations: Omit<CriteriaEvaluation, "criteriaId">[];
};
