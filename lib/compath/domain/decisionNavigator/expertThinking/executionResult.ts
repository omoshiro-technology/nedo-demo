/**
 * Phase 2: 実行結果と循環サイクル（ExecutionResult + PDCA）
 *
 * 実行結果を記録し、次の判断に活かす
 * - 実行結果の構造化記録
 * - 振り返り（Retrospective）
 * - 学び（Learning）の抽出
 * - PDCAサイクルの可視化
 */

// ============================================================
// 実行結果
// ============================================================

/** 実行ステータス */
export type ExecutionStatus =
  | "not_started"   // 未着手
  | "in_progress"   // 進行中
  | "completed"     // 完了
  | "failed"        // 失敗
  | "cancelled"     // キャンセル
  | "blocked";      // ブロック中

/** 実行結果の評価 */
export type OutcomeEvaluation = "exceeded" | "met" | "partial" | "not_met";

/** 実行結果の詳細 */
export type ExecutionOutcome = {
  /** 結果の評価 */
  evaluation: OutcomeEvaluation;
  /** 実際の成果物/結果 */
  actualResult: string;
  /** 期待との差異 */
  gapFromExpectation?: string;
  /** 数値的な達成度（0-100） */
  achievementRate?: number;
  /** 発生した問題 */
  issuesEncountered?: string[];
  /** 予想外の発見 */
  unexpectedFindings?: string[];
};

/** 実行結果 */
export type ExecutionResult = {
  /** 一意識別子 */
  id: string;
  /** セッションID */
  sessionId: string;
  /** 関連する実行計画アイテムID */
  executionPlanItemId?: string;
  /** 関連するノードID */
  relatedNodeId?: string;
  /** タイトル */
  title: string;
  /** 説明 */
  description?: string;
  /** ステータス */
  status: ExecutionStatus;
  /** 開始日時 */
  startedAt?: string;
  /** 完了日時 */
  completedAt?: string;
  /** 実行結果の詳細 */
  outcome?: ExecutionOutcome;
  /** 振り返り */
  retrospective?: Retrospective;
  /** 抽出された学び */
  learnings: Learning[];
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
};

// ============================================================
// 振り返り（Retrospective）
// ============================================================

/** 判断の妥当性評価 */
export type DecisionValidity = {
  /** 正しい判断だったか */
  wasCorrectDecision: boolean;
  /** 判断の理由 */
  reasoning: string;
  /** 今後同様のケースで変えるべき点 */
  wouldChangeIf?: string;
  /** 判断時に不足していた情報 */
  missingInfoAtDecisionTime?: string[];
};

/** 振り返り */
export type Retrospective = {
  /** うまくいったこと */
  whatWentWell: string[];
  /** 改善できること */
  whatCouldBeBetter: string[];
  /** 次回への提案 */
  suggestions: string[];
  /** 判断の妥当性 */
  decisionValidity: DecisionValidity;
  /** 追加のメモ */
  additionalNotes?: string;
  /** 記録者 */
  recordedBy?: string;
  /** 記録日時 */
  recordedAt: string;
};

// ============================================================
// 学び（Learning）
// ============================================================

/** 学びのカテゴリ */
export type LearningCategory =
  | "success_pattern"   // 成功パターン
  | "failure_pattern"   // 失敗パターン
  | "insight"           // インサイト（気づき）
  | "heuristic"         // ヒューリスティック（経験則）
  | "warning";          // 警告・注意点

/** 将来への影響 */
export type FutureImpact = {
  /** 将来の判断で考慮すべきか */
  shouldConsider: boolean;
  /** 推奨される重み付け */
  suggestedWeight: number;
  /** 適用すべきコンテキスト */
  context: string;
  /** 適用を避けるべきケース */
  antiPatterns?: string[];
};

/** 学び */
export type Learning = {
  /** 一意識別子 */
  id: string;
  /** カテゴリ */
  category: LearningCategory;
  /** 学びの内容 */
  content: string;
  /** 適用可能な条件 */
  applicableConditions: string[];
  /** 確信度（0-100） */
  confidence: number;
  /** 確認回数（同様の学びが確認された回数） */
  confirmationCount: number;
  /** 将来への影響 */
  futureImpact: FutureImpact;
  /** 関連するタグ/キーワード */
  tags?: string[];
  /** ソース（どの実行結果から抽出されたか） */
  sourceExecutionResultId?: string;
  /** 作成日時 */
  createdAt: string;
};

// ============================================================
// PDCAサイクル
// ============================================================

/** PDCAフェーズ */
export type PDCAPhase = "plan" | "do" | "check" | "act" | "completed";

/** ナレッジ更新 */
export type KnowledgeUpdate = {
  /** 更新タイプ */
  type: "add" | "modify" | "deprecate";
  /** 対象のナレッジID */
  knowledgeId?: string;
  /** 更新内容 */
  content: string;
  /** 理由 */
  reason: string;
};

/** Plan フェーズ */
export type PDCAPlan = {
  /** 関連する実行計画ID */
  executionPlanId: string;
  /** 目標 */
  goals: string[];
  /** 成功指標 */
  successMetrics?: string[];
  /** 想定リスク */
  anticipatedRisks?: string[];
};

/** Do フェーズ */
export type PDCADo = {
  /** 現在のステータス */
  currentStatus: string;
  /** 進捗率（0-100） */
  progressPercentage: number;
  /** 実行中のアイテム */
  currentItems?: string[];
  /** ブロッカー */
  blockers?: string[];
};

/** Check フェーズ */
export type PDCACheck = {
  /** 実行結果一覧 */
  executionResults: ExecutionResult[];
  /** 全体評価 */
  overallEvaluation?: OutcomeEvaluation;
  /** ギャップ分析 */
  gapAnalysis?: string;
};

/** Act フェーズ */
export type PDCAAct = {
  /** 抽出された学び */
  learnings: Learning[];
  /** ナレッジベースへの更新 */
  updatedKnowledge: KnowledgeUpdate[];
  /** 次のアクション */
  nextActions?: string[];
};

/** PDCAサイクル */
export type PDCACycle = {
  /** 一意識別子 */
  id: string;
  /** セッションID */
  sessionId: string;
  /** Planフェーズ */
  plan: PDCAPlan;
  /** Doフェーズ */
  do: PDCADo;
  /** Checkフェーズ */
  check: PDCACheck;
  /** Actフェーズ */
  act: PDCAAct;
  /** 現在のフェーズ */
  currentPhase: PDCAPhase;
  /** サイクル番号（同一セッション内での繰り返し） */
  cycleNumber: number;
  /** 開始日時 */
  startedAt: string;
  /** 完了日時 */
  completedAt?: string;
};

// ============================================================
// API リクエスト/レスポンス型
// ============================================================

/** 実行結果記録リクエスト */
export type RecordExecutionResultRequest = {
  executionPlanItemId?: string;
  relatedNodeId?: string;
  title: string;
  description?: string;
  status: ExecutionStatus;
  outcome?: ExecutionOutcome;
  retrospective?: Omit<Retrospective, "recordedAt">;
};

/** 実行結果更新リクエスト */
export type UpdateExecutionResultRequest = {
  status?: ExecutionStatus;
  outcome?: ExecutionOutcome;
  retrospective?: Omit<Retrospective, "recordedAt">;
};

/** 学び抽出リクエスト */
export type ExtractLearningsRequest = {
  executionResultId: string;
  additionalContext?: string;
};

/** 学び抽出レスポンス */
export type ExtractLearningsResponse = {
  learnings: Learning[];
  suggestedKnowledgeUpdates: KnowledgeUpdate[];
};
