/**
 * 外部アクション実行エンジン
 *
 * 外部サービスへのアクションを実行する
 * 現在はモック実装、将来的に実際のAPI連携を追加
 */

import type {
  ExternalAction,
  ExternalActionType,
  JiraCreateIssueParams,
  ConfluenceCreatePageParams,
  SlackSendMessageParams,
  WebhookCallParams,
  ServiceConnection,
} from "./types";
import { env } from "../../config/env";

/**
 * 実行結果
 */
export type ExecutionResult = {
  success: boolean;
  data?: unknown;
  error?: string;
};

/**
 * 外部アクション実行エンジン
 */
export class ExternalActionExecutor {
  private serviceConnections: Map<string, ServiceConnection> = new Map();

  constructor() {
    this.initializeConnections();
  }

  /**
   * サービス接続を初期化
   */
  private initializeConnections(): void {
    // Jira接続（モック）
    this.serviceConnections.set("jira", {
      serviceName: "jira",
      connected: false, // 実際の接続情報がないためfalse
      lastCheckedAt: Date.now(),
      availableActions: ["jira_create_issue", "jira_update_issue"],
    });

    // Confluence接続（モック）
    this.serviceConnections.set("confluence", {
      serviceName: "confluence",
      connected: false,
      lastCheckedAt: Date.now(),
      availableActions: ["confluence_create_page", "confluence_update_page"],
    });

    // Slack接続（モック）
    this.serviceConnections.set("slack", {
      serviceName: "slack",
      connected: false,
      lastCheckedAt: Date.now(),
      availableActions: ["slack_send_message"],
    });

    // Webhook（常に利用可能）
    this.serviceConnections.set("webhook", {
      serviceName: "webhook",
      connected: true,
      lastCheckedAt: Date.now(),
      availableActions: ["webhook_call"],
    });

    console.log("[ExternalActionExecutor] Initialized with mock connections");
  }

  /**
   * アクションを実行
   */
  async execute(action: ExternalAction): Promise<ExecutionResult> {
    console.log(`[ExternalActionExecutor] Executing: ${action.type}`);

    try {
      switch (action.type) {
        case "jira_create_issue":
          return await this.executeJiraCreateIssue(action.params as JiraCreateIssueParams);

        case "confluence_create_page":
          return await this.executeConfluenceCreatePage(action.params as ConfluenceCreatePageParams);

        case "slack_send_message":
          return await this.executeSlackSendMessage(action.params as SlackSendMessageParams);

        case "webhook_call":
          return await this.executeWebhookCall(action.params as WebhookCallParams);

        default:
          return {
            success: false,
            error: `Unsupported action type: ${action.type}`,
          };
      }
    } catch (error) {
      console.error(`[ExternalActionExecutor] Error:`, error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Jiraチケット作成（モック）
   */
  private async executeJiraCreateIssue(params: JiraCreateIssueParams): Promise<ExecutionResult> {
    console.log("[ExternalActionExecutor] Jira create issue (mock):", params);

    // モック実装：実際の連携は将来実装
    const mockIssueKey = `${params.projectKey}-${Math.floor(Math.random() * 1000)}`;

    return {
      success: true,
      data: {
        issueKey: mockIssueKey,
        issueUrl: `https://jira.example.com/browse/${mockIssueKey}`,
        message: `[Mock] Created Jira issue: ${mockIssueKey}`,
      },
    };
  }

  /**
   * Confluenceページ作成（モック）
   */
  private async executeConfluenceCreatePage(params: ConfluenceCreatePageParams): Promise<ExecutionResult> {
    console.log("[ExternalActionExecutor] Confluence create page (mock):", params);

    const mockPageId = `page-${Date.now()}`;

    return {
      success: true,
      data: {
        pageId: mockPageId,
        pageUrl: `https://confluence.example.com/display/${params.spaceKey}/${encodeURIComponent(params.title)}`,
        message: `[Mock] Created Confluence page: ${params.title}`,
      },
    };
  }

  /**
   * Slackメッセージ送信（モック）
   */
  private async executeSlackSendMessage(params: SlackSendMessageParams): Promise<ExecutionResult> {
    console.log("[ExternalActionExecutor] Slack send message (mock):", params);

    return {
      success: true,
      data: {
        channel: params.channel,
        messageTs: `${Date.now()}.000000`,
        message: `[Mock] Sent Slack message to ${params.channel}`,
      },
    };
  }

  /**
   * Webhook呼び出し（実装）
   */
  private async executeWebhookCall(params: WebhookCallParams): Promise<ExecutionResult> {
    console.log("[ExternalActionExecutor] Webhook call:", params.url, params.method);

    try {
      const response = await fetch(params.url, {
        method: params.method,
        headers: {
          "Content-Type": "application/json",
          ...params.headers,
        },
        body: params.body ? JSON.stringify(params.body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Webhook failed: ${response.status} ${response.statusText} - ${errorText}`,
        };
      }

      const data = await response.json().catch(() => ({}));

      return {
        success: true,
        data: {
          status: response.status,
          response: data,
        },
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Webhook call failed",
      };
    }
  }

  /**
   * サービス接続状態を取得
   */
  getServiceConnections(): ServiceConnection[] {
    return Array.from(this.serviceConnections.values());
  }

  /**
   * 特定のアクションタイプが利用可能かチェック
   */
  isActionAvailable(actionType: ExternalActionType): boolean {
    for (const connection of this.serviceConnections.values()) {
      if (connection.availableActions.includes(actionType) && connection.connected) {
        return true;
      }
    }
    return false;
  }

  /**
   * アクションの説明を生成（ユーザー確認用）
   */
  describeAction(action: ExternalAction): string {
    switch (action.type) {
      case "jira_create_issue": {
        const p = action.params as JiraCreateIssueParams;
        return `Jiraに${p.issueType}を作成します:\n` +
          `  プロジェクト: ${p.projectKey}\n` +
          `  タイトル: ${p.summary}\n` +
          `  優先度: ${p.priority || "Medium"}`;
      }

      case "confluence_create_page": {
        const p = action.params as ConfluenceCreatePageParams;
        return `Confluenceにページを作成します:\n` +
          `  スペース: ${p.spaceKey}\n` +
          `  タイトル: ${p.title}`;
      }

      case "slack_send_message": {
        const p = action.params as SlackSendMessageParams;
        return `Slackにメッセージを送信します:\n` +
          `  チャンネル: ${p.channel}\n` +
          `  内容: ${p.message.substring(0, 100)}...`;
      }

      case "webhook_call": {
        const p = action.params as WebhookCallParams;
        return `Webhookを呼び出します:\n` +
          `  URL: ${p.url}\n` +
          `  メソッド: ${p.method}`;
      }

      default:
        return `アクション: ${action.type}\n説明: ${action.description}`;
    }
  }
}

// シングルトンインスタンス
let executorInstance: ExternalActionExecutor | null = null;

/**
 * 外部アクション実行エンジンのシングルトンインスタンスを取得
 */
export function getExternalActionExecutor(): ExternalActionExecutor {
  if (!executorInstance) {
    executorInstance = new ExternalActionExecutor();
  }
  return executorInstance;
}
