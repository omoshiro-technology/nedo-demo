/**
 * Artifact（成果物）の統一スキーマ
 *
 * エージェント感強化のための成果物駆動UIを支援するための共通型定義
 *
 * 対象成果物:
 * - FTA: 故障の木分析（GraphResult相当）
 * - MINUTES: 議事録（DecisionTimelineResult相当）
 * - DECISION_LOG: 意思決定ログ（DecisionNavigatorSession相当）
 */

// =============================================================================
// 基本型
// =============================================================================

export type ArtifactType = "FTA" | "MINUTES" | "DECISION_LOG";

export type ArtifactStatus = "draft" | "accepted";

// =============================================================================
// Missing（未確定項目）
// =============================================================================

export type MissingSeverity = "high" | "medium" | "low";

export type MissingItem = {
  /** 一意のID */
  id: string;
  /** 対象フィールド名 */
  field: string;
  /** ユーザーに表示する質問 */
  question: string;
  /** 重要度 */
  severity: MissingSeverity;
  /** 入力候補（オプション） */
  suggested_inputs?: string[];
};

// =============================================================================
// Evidence（根拠）
// =============================================================================

export type EvidenceItem = {
  /** 出典のID */
  source_id: string;
  /** 引用テキスト */
  quote: string;
  /** 参照位置（ページ番号、行番号など） */
  location: string;
};

// =============================================================================
// Diff（差分情報）
// =============================================================================

export type DiffInfo = {
  /** 変更されたフィールドのリスト */
  changed_fields: string[];
  /** 変更の要約 */
  note: string;
};

// =============================================================================
// 成果物固有のContent型
// =============================================================================

/**
 * FTA（故障の木）のContent
 */
export type FTAContent = {
  /** トップイベント */
  top_event: string;
  /** ノード一覧 */
  nodes: Array<{
    id: string;
    label: string;
    kind: "EVENT" | "CAUSE" | "CONTROL";
    note?: string;
  }>;
  /** エッジ一覧 */
  edges: Array<{
    from: string;
    to: string;
    gate: "AND" | "OR" | "NONE";
  }>;
  /** メトリクス */
  metrics: {
    node_count: number;
    depth: number;
  };
};

/**
 * 議事録（MINUTES）のContent
 */
export type MinutesContent = {
  /** 会議情報 */
  meeting: {
    title: string;
    date?: string;
    attendees: string[];
    context?: string;
  };
  /** 議題 */
  agenda: string[];
  /** 議論内容 */
  discussion: Array<{
    topic: string;
    points: string[];
    decisions: string[];
    open_questions: string[];
  }>;
  /** アクションアイテム */
  action_items: Array<{
    who: string;
    what: string;
    due?: string;
    status: "OPEN" | "DONE";
  }>;
};

/**
 * 意思決定ログ（DECISION_LOG）のContent
 */
export type DecisionLogContent = {
  /** 決定事項 */
  decision: string;
  /** 選択肢一覧 */
  options: Array<{
    id: string;
    label: string;
    pros: string[];
    cons: string[];
    risks: string[];
  }>;
  /** 評価軸 */
  criteria: Array<{
    name: string;
    weight: number;
    notes?: string;
  }>;
  /** 推奨 */
  recommendation: {
    option_id: string;
    rationale: string[];
    reversal_conditions: string[];
  };
  /** 履歴 */
  history: Array<{
    timestamp: string;
    event: "CREATED" | "REVISED" | "ACCEPTED";
    note: string;
  }>;
};

// =============================================================================
// Artifact統一型
// =============================================================================

export type ArtifactContent = FTAContent | MinutesContent | DecisionLogContent;

/**
 * 統一Artifact型
 */
export type Artifact<T extends ArtifactContent = ArtifactContent> = {
  /** 成果物の一意ID */
  artifact_id: string;
  /** 成果物タイプ */
  type: ArtifactType;
  /** タイトル */
  title: string;
  /** バージョン番号 */
  version: number;
  /** ステータス */
  status: ArtifactStatus;
  /** 更新日時（ISO 8601） */
  updated_at: string;
  /** サマリー */
  summary: string;
  /** 成果物固有のコンテンツ */
  content: T;
  /** 未確定項目 */
  missing: MissingItem[];
  /** 根拠 */
  evidence: EvidenceItem[];
  /** 前バージョンからの差分（オプション） */
  diff_from_prev?: DiffInfo;
};

// =============================================================================
// 型付きArtifact
// =============================================================================

export type FTAArtifact = Artifact<FTAContent>;
export type MinutesArtifact = Artifact<MinutesContent>;
export type DecisionLogArtifact = Artifact<DecisionLogContent>;

// =============================================================================
// ユーティリティ型
// =============================================================================

/**
 * ArtifactTypeに対応するContent型を取得
 */
export type ContentForType<T extends ArtifactType> =
  T extends "FTA" ? FTAContent :
  T extends "MINUTES" ? MinutesContent :
  T extends "DECISION_LOG" ? DecisionLogContent :
  never;

/**
 * ArtifactTypeに対応するArtifact型を取得
 */
export type ArtifactForType<T extends ArtifactType> = Artifact<ContentForType<T>>;
