/**
 * Artifact（成果物）の統一スキーマ - フロントエンド用
 *
 * API側の型定義と同期を保つこと
 * @see apps/api/src/domain/artifact.ts
 */

// =============================================================================
// 基本型
// =============================================================================

export type ArtifactType = "FTA" | "MINUTES" | "DECISION_LOG" | "COPY_READY";

export type ArtifactStatus = "draft" | "accepted";

// =============================================================================
// Missing（未確定項目）
// =============================================================================

export type MissingSeverity = "high" | "medium" | "low";

export type MissingItem = {
  id: string;
  field: string;
  question: string;
  severity: MissingSeverity;
  suggested_inputs?: string[];
};

// =============================================================================
// Evidence（根拠）
// =============================================================================

export type EvidenceItem = {
  source_id: string;
  quote: string;
  location: string;
};

// =============================================================================
// Diff（差分情報）
// =============================================================================

export type DiffInfo = {
  changed_fields: string[];
  note: string;
};

// =============================================================================
// 成果物固有のContent型
// =============================================================================

export type FTAContent = {
  top_event: string;
  nodes: Array<{
    id: string;
    label: string;
    kind: "EVENT" | "CAUSE" | "CONTROL";
    note?: string;
  }>;
  edges: Array<{
    from: string;
    to: string;
    gate: "AND" | "OR" | "NONE";
  }>;
  metrics: {
    node_count: number;
    depth: number;
  };
};

export type MinutesContent = {
  meeting: {
    title: string;
    date?: string;
    attendees: string[];
    context?: string;
  };
  agenda: string[];
  discussion: Array<{
    topic: string;
    points: string[];
    decisions: string[];
    open_questions: string[];
  }>;
  action_items: Array<{
    who: string;
    what: string;
    due?: string;
    status: "OPEN" | "DONE";
  }>;
};

export type DecisionLogContent = {
  decision: string;
  options: Array<{
    id: string;
    label: string;
    pros: string[];
    cons: string[];
    risks: string[];
  }>;
  criteria: Array<{
    name: string;
    weight: number;
    notes?: string;
  }>;
  recommendation: {
    option_id: string;
    rationale: string[];
    reversal_conditions: string[];
  };
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

export type Artifact<T extends ArtifactContent = ArtifactContent> = {
  artifact_id: string;
  type: ArtifactType;
  title: string;
  version: number;
  status: ArtifactStatus;
  updated_at: string;
  summary: string;
  content: T;
  missing: MissingItem[];
  evidence: EvidenceItem[];
  diff_from_prev?: DiffInfo;
};

// =============================================================================
// 型付きArtifact
// =============================================================================

export type FTAArtifact = Artifact<FTAContent>;
export type MinutesArtifact = Artifact<MinutesContent>;
export type DecisionLogArtifact = Artifact<DecisionLogContent>;

// =============================================================================
// ラベル定数
// =============================================================================

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  FTA: "FTA（故障の木）",
  MINUTES: "議事録",
  DECISION_LOG: "意思決定ログ",
  COPY_READY: "コピーレディ出力",
};

export const ARTIFACT_STATUS_LABELS: Record<ArtifactStatus, string> = {
  draft: "下書き",
  accepted: "採用済み",
};

export const MISSING_SEVERITY_LABELS: Record<MissingSeverity, string> = {
  high: "高",
  medium: "中",
  low: "低",
};
