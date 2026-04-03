/**
 * 外部連携モジュールのエクスポート
 */

// 型定義
export type {
  ExternalActionType,
  ActionStatus,
  ExternalAction,
  ConfirmationRequest,
  ServiceConnection,
  JiraCreateIssueParams,
  ConfluenceCreatePageParams,
  SlackSendMessageParams,
  WebhookCallParams,
} from "./types";

// アクションキュー
export {
  ActionQueue,
  getActionQueue,
} from "./ActionQueue";
export type { ActionQueueConfig } from "./ActionQueue";

// 実行エンジン
export {
  ExternalActionExecutor,
  getExternalActionExecutor,
} from "./ExternalActionExecutor";
export type { ExecutionResult } from "./ExternalActionExecutor";
