import type { FeedbackSuggestion, FeedforwardSuggestion } from "../utils/knowledgeExtractor";

/**
 * Agent message types for AI-driven knowledge gap suggestions
 */
export type AgentMessageType =
  | "feedback_suggestion"
  | "feedforward_suggestion"
  | "gap_analysis"
  | "status";

/**
 * Gap analysis data for missing nodes in knowledge graph
 */
export type GapAnalysisData = {
  totalMissing: number;
  missingByLevel: {
    levelLabel: string;
    count: number;
    examples: string[];
  }[];
  priority: "high" | "medium" | "low";
  recommendation: string;
};

/**
 * Status message for agent workflow updates
 */
export type StatusMessageData = {
  stage: "analyzing" | "generating" | "completed" | "error";
  message: string;
};

/**
 * Concrete action types that can be extracted from AI suggestions
 */
export type ConcreteActionType =
  | "schedule" // 予定登録（期限・日時を設定）
  | "plan" // 計画作成（アクションプランを立案）
  | "add_detail" // 詳細追記（既存ノードに情報を追加）
  | "verify" // 検証実施（効果測定・確認作業）
  | "deploy" // 横展開（他の箇所への適用）
  | "free_form"; // 自由入力（パターン外）

/**
 * Action that user can take in response to agent message
 */
export type AgentAction = {
  id: string;
  label: string;
  type: "add_node" | "expand_detail" | "dismiss" | "concrete_action";
  data?: any;
  // concrete_actionの場合のみ使用
  concreteType?: ConcreteActionType;
  // 入力フォームのプレースホルダー・ガイド
  formHint?: string;
};

/**
 * Base agent message structure
 */
export type AgentMessage = {
  role: "agent";
  timestamp: number;
} & (
  | {
      type: "feedback_suggestion";
      data: FeedbackSuggestion;
      actions: AgentAction[];
    }
  | {
      type: "feedforward_suggestion";
      data: FeedforwardSuggestion;
      actions: AgentAction[];
    }
  | {
      type: "gap_analysis";
      data: GapAnalysisData;
      actions?: AgentAction[];
    }
  | {
      type: "status";
      data: StatusMessageData;
      actions?: never;
    }
);

/**
 * Extended chat message type that includes agent messages
 */
export type ExtendedChatMessage =
  | { role: "user"; content: string }
  | { role: "assistant"; content: string }
  | AgentMessage;
