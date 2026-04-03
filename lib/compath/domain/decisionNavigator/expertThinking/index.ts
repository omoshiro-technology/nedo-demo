/**
 * エキスパート思考モジュール
 *
 * 熟達者の思考プロセスを構造化して記録・活用する
 */

// 判断プロパティ
export type {
  // ルール関連
  DecisionRuleType,
  ThresholdCondition,
  DecisionRule,
  // 条件関連
  ConditionScope,
  ConditionCertainty,
  DecisionCondition,
  // 重要度関連
  WeightBasis,
  DecisionWeight,
  // 理由関連
  RationaleSource,
  DecisionRationale,
  // 観点関連
  ViewpointCategory,
  QCDESSubCategory,
  ViewpointEvaluation,
  DecisionViewpoint,
  // 見落とし警告
  OverlookedWarning,
  // 判断プロパティ本体
  DecisionPropertySource,
  DecisionProperty,
  DecisionPropertySummary,
  CreateDecisionPropertyRequest,
  UpdateDecisionPropertyRequest,
} from "./types";

// 実行結果とPDCA
export type {
  // 実行ステータス
  ExecutionStatus,
  OutcomeEvaluation,
  ExecutionOutcome,
  ExecutionResult,
  // 振り返り
  DecisionValidity,
  Retrospective,
  // 学び
  LearningCategory,
  FutureImpact,
  Learning,
  // PDCA
  PDCAPhase,
  KnowledgeUpdate,
  PDCAPlan,
  PDCADo,
  PDCACheck,
  PDCAAct,
  PDCACycle,
  // API型
  RecordExecutionResultRequest,
  UpdateExecutionResultRequest,
  ExtractLearningsRequest,
  ExtractLearningsResponse,
} from "./executionResult";

// エキスパートインサイト
export type {
  // トリガー
  InsightTriggerTiming,
  InsightTrigger,
  // 内容
  RelatedCase,
  SuggestedAction,
  ExpertInsightContent,
  // インサイト本体
  ExpertInsightType,
  TargetAudience,
  InsightImportance,
  InsightStats,
  ExpertInsight,
  // 見落とし警告
  OverlookedHistoricalStats,
  OverlookedChecklistItem,
  OverlookedWarningDetail,
  // 表示状態
  InsightDisplayState,
  InsightFeedback,
  // API型
  GenerateInsightsRequest,
  GenerateInsightsResponse,
  RecordInsightFeedbackRequest,
} from "./expertInsight";
