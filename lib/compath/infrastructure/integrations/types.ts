/**
 * 外部連携の型定義
 */

/**
 * 外部アクションの種類
 */
export type ExternalActionType =
  | "jira_create_issue"      // Jiraチケット作成
  | "jira_update_issue"      // Jiraチケット更新
  | "confluence_create_page" // Confluenceページ作成
  | "confluence_update_page" // Confluenceページ更新
  | "slack_send_message"     // Slackメッセージ送信
  | "calendar_create_event"  // カレンダーイベント作成
  | "email_send"             // メール送信
  | "webhook_call";          // Webhook呼び出し

/**
 * アクション実行状態
 */
export type ActionStatus =
  | "pending"     // 承認待ち
  | "approved"    // 承認済み
  | "rejected"    // 拒否
  | "executing"   // 実行中
  | "completed"   // 完了
  | "failed";     // 失敗

/**
 * 外部アクションの定義
 */
export type ExternalAction = {
  /** アクションID */
  id: string;
  /** アクションタイプ */
  type: ExternalActionType;
  /** アクションの説明 */
  description: string;
  /** パラメータ */
  params: Record<string, unknown>;
  /** 実行状態 */
  status: ActionStatus;
  /** 作成日時 */
  createdAt: number;
  /** 実行日時 */
  executedAt?: number;
  /** 結果 */
  result?: {
    success: boolean;
    data?: unknown;
    error?: string;
  };
  /** 承認者 */
  approvedBy?: string;
  /** 承認日時 */
  approvedAt?: number;
  /** 拒否理由 */
  rejectionReason?: string;
};

/**
 * Human-in-the-loop確認リクエスト
 */
export type ConfirmationRequest = {
  /** リクエストID */
  id: string;
  /** セッションID */
  sessionId: string;
  /** 実行予定のアクション */
  action: ExternalAction;
  /** 確認メッセージ */
  message: string;
  /** リスクレベル */
  riskLevel: "low" | "medium" | "high";
  /** 影響範囲の説明 */
  impactDescription: string;
  /** 確認期限 */
  expiresAt: number;
  /** 確認状態 */
  status: "waiting" | "approved" | "rejected" | "expired";
};

/**
 * 外部サービスの接続情報
 */
export type ServiceConnection = {
  /** サービス名 */
  serviceName: string;
  /** 接続状態 */
  connected: boolean;
  /** 最終確認日時 */
  lastCheckedAt: number;
  /** 利用可能なアクション */
  availableActions: ExternalActionType[];
};

/**
 * Jiraチケット作成パラメータ
 */
export type JiraCreateIssueParams = {
  projectKey: string;
  issueType: "Task" | "Bug" | "Story" | "Epic";
  summary: string;
  description: string;
  priority?: "Highest" | "High" | "Medium" | "Low" | "Lowest";
  assignee?: string;
  labels?: string[];
};

/**
 * Confluenceページ作成パラメータ
 */
export type ConfluenceCreatePageParams = {
  spaceKey: string;
  title: string;
  content: string;
  parentPageId?: string;
};

/**
 * Slackメッセージ送信パラメータ
 */
export type SlackSendMessageParams = {
  channel: string;
  message: string;
  threadTs?: string;
  blocks?: unknown[];
};

/**
 * Webhookパラメータ
 */
export type WebhookCallParams = {
  url: string;
  method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
};
