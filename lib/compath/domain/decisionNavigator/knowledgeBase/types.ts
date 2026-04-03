/**
 * Phase 3: ナレッジ蓄積（KnowledgeBase）
 *
 * 「使えば使うほど賢くなる」仕組み
 * - ヒューリスティクス（経験則）の蓄積
 * - 判断パターン（成功/失敗）の記録
 * - セッション内ナレッジの管理
 * - エクスポート/インポート機能
 */

// ============================================================
// ヒューリスティクス（経験則）
// ============================================================

/** 信頼性情報 */
export type HeuristicReliability = {
  /** 信頼性スコア（0-100） */
  score: number;
  /** サンプルサイズ（確認された回数） */
  sampleSize: number;
  /** 最終確認日 */
  lastConfirmedAt?: string;
};

/** 使用統計 */
export type HeuristicUsageStats = {
  /** 適用回数 */
  timesApplied: number;
  /** 成功率（0-100） */
  successRate: number;
  /** 失敗時の主な理由 */
  failureReasons?: string[];
};

/** 例外ケース */
export type HeuristicException = {
  /** 条件（この条件下では適用しない） */
  condition: string;
  /** 代替アクション */
  alternative: string;
  /** 発生頻度 */
  frequency?: "rare" | "occasional" | "common";
};

/** ヒューリスティクス（経験則） */
export type Heuristic = {
  /** 一意識別子 */
  id: string;
  /** ルール（"IF〜 THEN〜" 形式） */
  rule: string;
  /** 説明 */
  description: string;
  /** 適用ドメイン/カテゴリ */
  domain: string[];
  /** 信頼性 */
  reliability: HeuristicReliability;
  /** 例外ケース */
  exceptions?: HeuristicException[];
  /** 使用統計 */
  usageStats: HeuristicUsageStats;
  /** ソース */
  source: "expert_input" | "pattern_extraction" | "llm_inference";
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** アクティブ状態 */
  isActive: boolean;
  /** タグ */
  tags?: string[];
};

// ============================================================
// 判断パターン
// ============================================================

/** パターンの適用条件 */
export type PatternCondition = {
  /** 次元（例: "problem_type", "urgency", "scale"） */
  dimension: string;
  /** 条件 */
  condition: string;
};

/** パターンのステップ */
export type PatternStep = {
  /** ステップ番号 */
  step: number;
  /** アクション */
  action: string;
  /** 期待される結果 */
  expectedOutcome: string;
  /** 実際の結果（記録用） */
  actualOutcome?: string;
};

/** 判断パターン（成功/失敗） */
export type DecisionPattern = {
  /** 一意識別子 */
  id: string;
  /** パターン名 */
  name: string;
  /** パターンの種類 */
  type: "success" | "failure";
  /** 適用可能な条件 */
  applicableConditions: PatternCondition[];
  /** ステップシーケンス */
  sequence: PatternStep[];
  /** 教訓 */
  lessons: string[];
  /** 推奨事項 */
  recommendations: string[];
  /** 発生回数 */
  occurrences: number;
  /** 信頼性（0-100） */
  reliability: number;
  /** 最初に発生した日 */
  firstOccurredAt: string;
  /** 最後に発生した日 */
  lastOccurredAt: string;
  /** 関連するセッションID */
  relatedSessionIds?: string[];
  /** タグ */
  tags?: string[];
};

// ============================================================
// セッション内ナレッジ
// ============================================================

/** セッション内で学んだこと */
export type LearnedInSession = {
  /** 学びの種類 */
  type: "insight" | "heuristic" | "pattern" | "warning";
  /** 内容 */
  content: string;
  /** 適用されたノードID */
  appliedTo: string[];
  /** 学習日時 */
  learnedAt: string;
};

/** 適用されたナレッジ */
export type AppliedKnowledge = {
  /** ナレッジID（ヒューリスティクスまたはパターンID） */
  knowledgeId: string;
  /** ナレッジの種類 */
  knowledgeType: "heuristic" | "pattern";
  /** 適用されたノードID */
  nodeId: string;
  /** 役に立ったか */
  wasHelpful: boolean;
  /** フィードバック */
  feedback?: string;
  /** 適用日時 */
  appliedAt: string;
};

/** エクスポート可能なサマリー */
export type ExportableSummary = {
  /** 決定内容 */
  decisions: Array<{
    question: string;
    answer: string;
    rationale: string;
  }>;
  /** 学び */
  learnings: string[];
  /** 推奨事項 */
  recommendations: string[];
};

/** セッション内ナレッジ */
export type SessionKnowledge = {
  /** セッションID */
  sessionId: string;
  /** セッション内で学んだこと */
  learnedInSession: LearnedInSession[];
  /** 適用されたナレッジ */
  appliedKnowledge: AppliedKnowledge[];
  /** エクスポート可能なサマリー */
  exportableSummary: ExportableSummary;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
};

// ============================================================
// ナレッジベース全体
// ============================================================

/** ナレッジベース統計 */
export type KnowledgeBaseStats = {
  /** ヒューリスティクス数 */
  heuristicCount: number;
  /** パターン数 */
  patternCount: number;
  /** 成功パターン数 */
  successPatternCount: number;
  /** 失敗パターン数 */
  failurePatternCount: number;
  /** 総適用回数 */
  totalApplications: number;
  /** 平均成功率 */
  averageSuccessRate: number;
  /** 最終更新日 */
  lastUpdatedAt: string;
};

/** ナレッジベース */
export type KnowledgeBase = {
  /** ヒューリスティクス一覧 */
  heuristics: Heuristic[];
  /** パターン一覧 */
  patterns: DecisionPattern[];
  /** 統計 */
  stats: KnowledgeBaseStats;
  /** バージョン */
  version: string;
};

// ============================================================
// エクスポート/インポート
// ============================================================

/** ソース情報 */
export type ExportSourceInfo = {
  /** セッション数 */
  sessionCount: number;
  /** 決定数 */
  decisionCount: number;
  /** エクスポート日時 */
  exportedAt: string;
  /** エクスポート元のシステムバージョン */
  systemVersion?: string;
};

/** ナレッジエクスポート形式 */
export type KnowledgeExport = {
  /** フォーマットバージョン */
  version: string;
  /** ヒューリスティクス */
  heuristics: Heuristic[];
  /** パターン */
  patterns: DecisionPattern[];
  /** ソース情報 */
  sourceInfo: ExportSourceInfo;
  /** メタデータ */
  metadata?: Record<string, unknown>;
};

/** インポート結果 */
export type KnowledgeImportResult = {
  /** 成功したか */
  success: boolean;
  /** インポートされたヒューリスティクス数 */
  importedHeuristics: number;
  /** インポートされたパターン数 */
  importedPatterns: number;
  /** スキップされた項目（重複など） */
  skipped: Array<{
    id: string;
    type: "heuristic" | "pattern";
    reason: string;
  }>;
  /** エラー */
  errors?: string[];
};

// ============================================================
// API リクエスト/レスポンス型
// ============================================================

/** セッションナレッジ取得リクエスト */
export type GetSessionKnowledgeRequest = {
  sessionId: string;
};

/** ナレッジエクスポートリクエスト */
export type ExportKnowledgeRequest = {
  sessionIds?: string[];
  includeHeuristics?: boolean;
  includePatterns?: boolean;
  minReliability?: number;
};

/** ナレッジインポートリクエスト */
export type ImportKnowledgeRequest = {
  data: KnowledgeExport;
  /** 既存の重複をどう扱うか */
  duplicateHandling: "skip" | "overwrite" | "merge";
};

/** ヒューリスティクス適用記録リクエスト */
export type RecordHeuristicApplicationRequest = {
  heuristicId: string;
  sessionId: string;
  nodeId: string;
  wasHelpful: boolean;
  feedback?: string;
};

/** パターンマッチングリクエスト */
export type FindMatchingPatternsRequest = {
  conditions: PatternCondition[];
  type?: "success" | "failure" | "both";
  minReliability?: number;
  limit?: number;
};

/** パターンマッチングレスポンス */
export type FindMatchingPatternsResponse = {
  patterns: DecisionPattern[];
  /** マッチスコア（各パターンとの適合度） */
  matchScores: Record<string, number>;
};
