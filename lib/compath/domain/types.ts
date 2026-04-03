export type DocumentTypeLabel =
  | "不具合報告書"
  | "日報"
  | "調査報告書"
  | "論文"
  | "製品仕様"
  | "不明";

export type AxisLevel = {
  id: string;
  label: string;
  guide?: string;
};

export type AxisDefinition = {
  id: string;
  label: string;
  levels: AxisLevel[];
};

export type AxisProposal = AxisDefinition & {
  score: number;
  rationale: string;
};

export type GraphNodeStatus = "present" | "missing";

export type GraphNode = {
  id: string;
  label: string;
  levelId: string;
  levelLabel: string;
  status: GraphNodeStatus;
  /** 抽出の信頼度（0-100）。50未満は「参考」として表示 */
  confidence?: number;
  /** ノードタグ情報（確信度など） */
  tags?: NodeTagInfo;
  /** マージ元ノード情報（マージされた場合） */
  mergedFrom?: MergedNodeInfo;
  /** 出典文書ID */
  sourceDocumentId?: string;
};

export type GraphEdge = {
  id: string;
  source: string;
  target: string;
  label?: string;
};

export type GraphResult = {
  axisId: string;
  axisLabel: string;
  levels: AxisLevel[];
  nodes: GraphNode[];
  edges: GraphEdge[];
};

export type AnalysisMeta = {
  fileName: string;
  mimeType: string;
  pageCount: number;
  textLength: number;
};

export type AnalysisResult = {
  summary: string;
  documentType: DocumentTypeLabel;
  axes: AxisProposal[];
  graphs: GraphResult[];
  meta: AnalysisMeta;
  warnings: string[];
  fullText?: string; // 原文テキスト（出典として表示）
};

export type DocumentInput = {
  fileName: string;
  mimeType: string;
  data: Buffer;
};

export type ParsedDocument = {
  fullText: string;
  pages: string[];
};

// 分析履歴
export type AnalysisHistory = {
  id: string;
  fileName: string;
  analyzedAt: string; // ISO 8601形式
  result: AnalysisResult;
  qualityScore?: number;
  missingCount?: number;
  /** 文書分類（試行錯誤中 vs 最終報告） */
  documentClassification?: DocumentClassification;
  /** ユーザーによる手動設定フラグ */
  classificationManuallySet?: boolean;
};

export type AnalysisHistorySummary = {
  id: string;
  fileName: string;
  analyzedAt: string;
  documentType: DocumentTypeLabel;
  qualityScore?: number;
  missingCount?: number;
};

// ===== 意思決定タイムライン分析 =====

/** 意思決定パターンの種別 */
export type DecisionPatternType =
  | "agreement" // 「〜で合意」
  | "decision" // 「〜のように決定」「〜とする」
  | "change" // 「〜に変更」
  | "adoption" // 「〜を採用」
  | "cancellation" // 「〜を中止」
  | "other";

/** 確信度レベル */
export type ConfidenceLevel = "high" | "medium" | "low";

/** 意思決定のステータス */
export type DecisionStatus = "confirmed" | "gray" | "proposed";

/** アクション種別 */
export type GuidanceActionType =
  | "clarify_condition" // 条件を明確化
  | "set_deadline" // 期限を設定
  | "assign_owner" // 担当者を指名
  | "document_decision" // 決定を文書化
  | "get_approval" // 承認を取得
  | "other";

/** 構造化されたアクション項目 */
export type GuidanceActionItem = {
  id: string;
  actionType: GuidanceActionType;
  /** 誰が（例: "プロジェクトマネージャー"） */
  actor?: string;
  /** 何を（例: "予算上限を確認"） */
  target?: string;
  /** いつまで（例: "次回会議まで"） */
  dueDate?: string;
  /** 画面表示用の要約 */
  summary: string;
  /** 未確定フィールド */
  missingFields?: Array<"actor" | "target" | "dueDate">;
  /** 生成元の曖昧性フラグ */
  sourceFlags?: string[];
};

/** 判断支援情報 */
export type DecisionGuidance = {
  /** 足りない情報 */
  missingInfo: string[];
  /** 必要なアクション（既存互換） */
  requiredActions: string[];
  /** 確認すべき質問 */
  suggestedQuestions: string[];
  /** 構造化されたアクション項目（新規） */
  actionItems?: GuidanceActionItem[];
};

/** リスク情報 */
export type DecisionRisk = {
  /** 遅延リスク */
  delayRisk: "high" | "medium" | "low";
  /** 影響範囲 */
  affectedAreas: string[];
  /** 推定影響 */
  estimatedImpact: string;
};

/** 類似意思決定 */
export type SimilarDecision = {
  /** 決定内容 */
  content: string;
  /** パターン種別 */
  patternType: DecisionPatternType;
  /** ステータス */
  status: DecisionStatus;
  /** 出典ファイル名 */
  sourceFileName: string;
  /** 決定日 */
  decisionDate: string;
  /** 類似度（0-100） */
  similarity: number;
};

// ===== ベテランの声（フィードフォワード） =====

/** ベテランの発言出典 */
export type VeteranQuoteSource = {
  /** 発言日時（例: "2012年3月"） */
  date: string;
  /** 会議名（例: "敦賀2号機 設計審査会議"） */
  meetingName: string;
  /** 発言者の役職（例: "水処理G 佐藤主任"） */
  speakerRole: string;
};

/** ベテランの声（議事録分析のフィードフォワード用） */
export type VeteranVoice = {
  /** 発言内容（引用） */
  quote: string;
  /** 発言出典 */
  quoteSource: VeteranQuoteSource;
  /** ベテランの知見・ワンポイント解説 */
  veteranInsight: string;
  /** 類似度スコア（0-100） */
  relevanceScore: number;
  /** コンテキストタグ（例: ["設備", "樹脂", "運用"]） */
  contextTags: string[];
  /** 適用対象のステータス（どの状態の決定に対する助言か） */
  applicableStatus?: DecisionStatus;
  /** フィードフォワード内容（先を見通した助言・注意点） */
  feedforward?: string;
};

/** 重要度カテゴリ */
export type ImportanceCategory =
  | "budget" // 予算
  | "schedule" // 工期・納期
  | "spec" // 仕様
  | "quality" // 品質
  | "safety" // 安全
  | "contract" // 契約
  | "organization" // 組織・体制
  | "other";

/** 重要度情報 */
export type ImportanceInfo = {
  /** 重要度スコア（0-100） */
  score: number;
  /** 重要度レベル */
  level: "critical" | "high" | "medium" | "low";
  /** 検出されたカテゴリ */
  categories: ImportanceCategory[];
  /** 検出されたキーワード */
  detectedKeywords: string[];
};

/** プロジェクトフェーズ */
export type ProjectPhase =
  | "planning" // 企画
  | "basic_design" // 基本設計
  | "detailed_design" // 詳細設計
  | "procurement" // 調達
  | "construction" // 施工・製造
  | "testing" // 検査・試験
  | "handover" // 引渡し
  | "unknown";

/** フェーズ遅延情報 */
export type PhaseDelayInfo = {
  /** 推定されたフェーズ */
  estimatedPhase: ProjectPhase;
  /** 決定が本来あるべきフェーズ */
  expectedPhase?: ProjectPhase;
  /** 遅延フラグ */
  isDelayed: boolean;
  /** 遅延の説明 */
  delayReason?: string;
};

/** 変更詳細情報（changeパターン用） */
export type ChangeDetail = {
  /** 変更前の状態（抽出できた場合） */
  before?: string;
  /** 変更後の状態 */
  after: string;
  /** 変更の種類 */
  changeType: "specification" | "schedule" | "budget" | "scope" | "other";
  /** 変更影響度 */
  impactLevel: "high" | "medium" | "low";
};

/** 抽出された意思決定事項 */
export type DecisionItem = {
  id: string;
  /** 決定内容（原文から抽出したフレーズ） */
  content: string;
  /** マッチしたパターン種別 */
  patternType: DecisionPatternType;
  /** マッチした原文（コンテキスト） */
  sourceText: string;
  /** 出典ファイル名 */
  sourceFileName: string;
  /** 決定日（ファイルメタデータから取得） */
  decisionDate: string; // ISO 8601形式
  /** ファイル内での出現位置 */
  position?: {
    page?: number;
    line?: number;
  };

  // === 確信度判定（Phase 4.5で追加） ===
  /** パターンの確信度 */
  confidence: ConfidenceLevel;
  /** 意思決定のステータス */
  status: DecisionStatus;
  /** 品質スコア（0-100） */
  qualityScore: number;

  // === グレー判定の詳細（オプション） ===
  /** グレー判定の理由 */
  ambiguityFlags?: string[];
  /** 判断支援情報 */
  guidance?: DecisionGuidance;
  /** リスク情報 */
  risks?: DecisionRisk;
  /** 類似事例（上位3件） */
  similarDecisions?: SimilarDecision[];

  // === 重要度・フェーズ・変更詳細（Phase 4.6で追加） ===
  /** 重要度情報 */
  importance?: ImportanceInfo;
  /** フェーズ遅延情報 */
  phaseInfo?: PhaseDelayInfo;
  /** 変更詳細（changeパターンの場合のみ） */
  changeDetail?: ChangeDetail;
  /** 優先度スコア（Phase 4.7で追加） */
  priorityScore?: PriorityScore;

  // === ベテランの声（フィードフォワード） ===
  /** 類似の過去判断からのベテランの声 */
  veteranVoices?: VeteranVoice[];
  /** 決定後の次にやるべきアクション */
  feedforwardActions?: FeedforwardAction[];
};

/** フィードフォワードアクション（決定後の次のステップ） */
export type FeedforwardAction = {
  id: string;
  /** アクション内容（「配管図面を更新する」） */
  action: string;
  /** 推奨期限（「1週間以内」「次回会議まで」） */
  deadline?: string;
  /** 優先度 */
  priority: "high" | "medium" | "low";
  /** なぜ必要か（1文の理由） */
  rationale?: string;
  /** 完了フラグ（UI用） */
  isCompleted?: boolean;
};

// ===== グローバルフィードフォワード（Phase 14） =====

/** グローバルフィードフォワードアクション（複数決定をまたがる統合アクション） */
export type GlobalFeedforwardAction = {
  id: string;
  /** アクション内容（20文字以内） */
  action: string;
  /** 推奨期限 */
  deadline?: string;
  /** 優先度 */
  priority: "high" | "medium" | "low";
  /** なぜ必要か（1文の理由） */
  rationale?: string;
  /** 参照元の決定事項 */
  referencedDecisions: Array<{
    decisionId: string;
    decisionContent: string;
    relevance: "primary" | "secondary";
  }>;
  /** 完了フラグ（UI用） */
  isCompleted?: boolean;
};

/** グローバルフィードフォワード（全決定事項のまとめ） */
export type GlobalFeedforward = {
  /** グループ化されたアクション */
  actions: GlobalFeedforwardAction[];
  /** 全体的な洞察（オプション） */
  globalInsights?: string;
  /** ベテランの声（統合版） */
  veteranVoice?: VeteranVoice;
};

/** 優先度レベル */
export type PriorityLevel = "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "MINIMAL";

/** 優先度スコア */
export type PriorityScore = {
  /** 総合スコア（0-100） */
  score: number;
  /** 優先度レベル */
  level: PriorityLevel;
  /** 重要度コンポーネント（最大40点） */
  importanceComponent: number;
  /** 緊急性コンポーネント（最大35点） */
  urgencyComponent: number;
  /** 実行可能性コンポーネント（最大25点） */
  feasibilityComponent: number;
};

/** 意思決定分析用の入力文書 */
export type DecisionDocumentInput = {
  fileName: string;
  mimeType: string;
  data: Buffer;
  /** ファイルの作成日時（クライアントから送信） */
  createdAt?: string;
  /** ファイルの更新日時（クライアントから送信） */
  modifiedAt?: string;
};

/** 意思決定タイムライン分析結果 */
export type DecisionTimelineResult = {
  /** 抽出された意思決定事項一覧 */
  decisions: DecisionItem[];
  /** 処理した文書情報 */
  processedDocuments: Array<{
    fileName: string;
    documentDate: string;
    decisionCount: number;
  }>;
  /** 時系列範囲 */
  timeRange: {
    earliest: string;
    latest: string;
  };
  /** 警告メッセージ */
  warnings: string[];
  /** 抽出された元テキスト（会話コンテキスト用） */
  extractedTexts?: Array<{
    fileName: string;
    text: string;
  }>;
  /** グローバルフィードフォワード（全決定のまとめ） */
  globalFeedforward?: GlobalFeedforward;
};

// ===== FTA拡張機能 =====

/** 文書分類（試行錯誤中 vs 最終報告） */
export type DocumentClassification = "trial_and_error" | "final_report";

/** 確信度タグ（FTAノード用） - 既存のConfidenceLevelとは別用途 */
export type NodeConfidenceTag = "confirmed" | "estimated" | "unknown";

/** ノードタグ情報 */
export type NodeTagInfo = {
  /** 確信度タグ */
  confidenceTag: NodeConfidenceTag;
  /** タグ設定者 */
  taggedBy: "user" | "system";
  /** タグ設定日時（ISO 8601） */
  taggedAt: string;
  /** タグ設定理由（オプション） */
  reason?: string;
};

/** マージ候補ステータス */
export type MergeCandidateStatus = "pending" | "approved" | "rejected";

/** マージ候補 */
export type MergeCandidate = {
  id: string;
  /** 元ノードID */
  sourceNodeId: string;
  /** ターゲットノードID */
  targetNodeId: string;
  /** 元文書ID */
  sourceDocumentId: string;
  /** ターゲット文書ID */
  targetDocumentId: string;
  /** 類似度スコア（0-100） */
  similarityScore: number;
  /** LLMによる類似理由 */
  similarityReason: string;
  /** ユーザー判定ステータス */
  status: MergeCandidateStatus;
  /** 提案されたマージ後のラベル */
  mergedLabel?: string;
};

/** マージ済みノード情報 */
export type MergedNodeInfo = {
  /** マージ元ノードID群 */
  sourceNodeIds: string[];
  /** 出典文書ID群 */
  sourceDocumentIds: string[];
};

/** エクスポート形式 */
export type ExportFormat = "json" | "csv" | "png" | "svg";

/** エクスポートオプション */
export type ExportOptions = {
  format: ExportFormat;
  /** 含める軸ID（未指定=全て） */
  axisIds?: string[];
  /** タグ情報を含めるか */
  includeTags?: boolean;
  /** エッジラベルを含めるか */
  includeEdgeLabels?: boolean;
  /** 画像の場合の解像度倍率 */
  imageScale?: number;
};

// ===== 過去に学ぶ機能 =====

/** 過去の類似事例 */
export type SimilarCase = {
  id: string;
  /** 決定内容 */
  content: string;
  /** 類似度（0-100） */
  similarity: number;
  /** パターン種別 */
  patternType: DecisionPatternType;
  /** ステータス */
  status: DecisionStatus;
  /** 出典ファイル名 */
  sourceFileName: string;
  /** 決定日 */
  decisionDate: string;
  /** 採用された結論（guidance.requiredActionsの1つ目等から抽出） */
  adoptedConclusion?: string;
  /** 観点（importance.categoriesから） */
  perspectives?: string[];
  /** 実行結果（将来: ユーザーフィードバックから） */
  executionResult?: string;
};

/** アクションリスク情報 */
export type ActionRisk = {
  /** リスク説明（やらないとどうなるか） */
  description: string;
  /** リスク重大度 */
  severity: "high" | "medium" | "low";
  /** リスク軽減方法 */
  mitigation?: string;
};

/** 次のアクション */
export type NextAction = {
  id: string;
  /** アクション内容 */
  content: string;
  /** 根拠となった過去事例ID */
  basedOnCaseId: string;
  /** 優先度 */
  priority: "high" | "medium" | "low";

  // === 新規フィールド ===
  /** なぜ必要か（実行すべき理由） */
  whyImportant?: string;
  /** 根拠（過去事例からの教訓） */
  rationale?: string;
  /** リスク情報 */
  risk?: ActionRisk;
  /** AI対話用のプロンプトヒント */
  aiPromptHint?: string;
};

/** 過去に学ぶ検索結果 */
export type LearnFromPastResult = {
  /** 入力された状況 */
  userSituation: string;
  /** 類似事例一覧 */
  similarCases: SimilarCase[];
  /** 次のアクション一覧 */
  nextActions: NextAction[];
  /** 検索メタデータ */
  metadata: {
    searchedCount: number;
    timeRange: { earliest: string; latest: string };
  };
};
