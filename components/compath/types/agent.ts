/**
 * エージェント感強化: 状態管理とアクションログの型定義
 */

// =============================================================================
// AgentState: エージェントの外向き状態
// =============================================================================

export type AgentState =
  | "idle"              // 待機中（何も実行していない）
  | "planning"          // 計画中（SENSE/PLAN相当）
  | "executing"         // 実行中（ACT相当）
  | "artifact_updated"  // 成果物更新完了（EVALUATE相当）
  | "waiting_user_input" // ユーザー入力待ち（missing解消待ち）
  | "accepted";         // 採用済み（確定）

// =============================================================================
// ActionLogEntry: 実行ログの1エントリ
// =============================================================================

export type ActionType =
  | "parse"     // 入力解析
  | "extract"   // 情報抽出
  | "link"      // 関連付け
  | "validate"  // 検証
  | "render"    // レンダリング
  | "save"      // 保存
  | "route"     // ルーティング（エージェント/成果物判定）
  | "generate"; // LLM生成

export type ActionResult = "ok" | "warn" | "fail";

export type ActionLogEntry = {
  id: string;
  timestamp: string;
  step: number;
  actionType: ActionType;
  target: string;
  result: ActionResult;
  message: string;
  errorDetail?: string;
};

// =============================================================================
// AgentPanelState: エージェントパネルの表示状態
// =============================================================================

export type AgentPanelState = {
  state: AgentState;
  goal: string;
  mode: string;
  confidence: number;
  plan: string[];
  planSteps: PlanStep[];
  actions: ActionLogEntry[];
  currentArtifactId?: string;
  currentArtifactType?: ArtifactType;
  routeResult?: RouteResult;
};

// =============================================================================
// ArtifactType: 成果物タイプ（agentDetectorで判定）
// =============================================================================

export type ArtifactType = "FTA" | "MINUTES" | "DECISION_LOG" | "COPY_READY";

// =============================================================================
// RouteResult: ルーティング判定結果
// =============================================================================

export type RouteResult = {
  type: ArtifactType;
  confidence: number;
  reasons: string[];
  fallbackChoices?: ArtifactType[];
};

// =============================================================================
// 状態遷移のラベル（日本語）
// =============================================================================

export const AGENT_STATE_LABELS: Record<AgentState, string> = {
  idle: "待機中",
  planning: "分析中...",
  executing: "実行中...",
  artifact_updated: "更新完了",
  waiting_user_input: "入力待ち",
  accepted: "採用済み",
};

export const AGENT_STATE_COLORS: Record<AgentState, string> = {
  idle: "gray",
  planning: "blue",
  executing: "yellow",
  artifact_updated: "green",
  waiting_user_input: "orange",
  accepted: "purple",
};

export const ACTION_TYPE_LABELS: Record<ActionType, string> = {
  parse: "解析",
  extract: "抽出",
  link: "関連付け",
  validate: "検証",
  render: "表示",
  save: "保存",
  route: "判定",
  generate: "生成",
};

export const ARTIFACT_TYPE_LABELS: Record<ArtifactType, string> = {
  FTA: "FTA（故障の木）",
  MINUTES: "議事録",
  DECISION_LOG: "意思決定ログ",
  COPY_READY: "コピーレディ出力",
};

// =============================================================================
// PlanStep: 計画ステップ（可視化用）
// =============================================================================

export type PlanStepStatus = "pending" | "in_progress" | "completed" | "error";

export type PlanStep = {
  id: string;
  label: string;
  status: PlanStepStatus;
  detail?: string;
};

export const PLAN_STEP_ICONS: Record<PlanStepStatus, string> = {
  pending: "○",
  in_progress: "⏳",
  completed: "✅",
  error: "❌",
};
