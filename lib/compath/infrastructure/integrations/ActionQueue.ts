/**
 * アクションキュー
 *
 * 外部アクションのキュー管理とHuman-in-the-loop承認フローを提供
 */

import type {
  ExternalAction,
  ExternalActionType,
  ActionStatus,
  ConfirmationRequest,
} from "./types";

/**
 * アクションキューの設定
 */
export type ActionQueueConfig = {
  /** 確認リクエストの有効期限（ミリ秒） */
  confirmationTimeout: number;
  /** 自動承認が許可されるリスクレベル */
  autoApproveRiskLevel: "low" | "none";
  /** 最大保留アクション数 */
  maxPendingActions: number;
};

const DEFAULT_CONFIG: ActionQueueConfig = {
  confirmationTimeout: 5 * 60 * 1000, // 5分
  autoApproveRiskLevel: "none",
  maxPendingActions: 10,
};

/**
 * アクションキュー
 */
export class ActionQueue {
  private config: ActionQueueConfig;
  private pendingActions: Map<string, ExternalAction> = new Map();
  private confirmationRequests: Map<string, ConfirmationRequest> = new Map();
  private executedActions: ExternalAction[] = [];

  constructor(config: Partial<ActionQueueConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    console.log("[ActionQueue] Initialized");
  }

  /**
   * アクションをキューに追加
   */
  enqueue(
    type: ExternalActionType,
    description: string,
    params: Record<string, unknown>
  ): ExternalAction {
    const action: ExternalAction = {
      id: `action_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      type,
      description,
      params,
      status: "pending",
      createdAt: Date.now(),
    };

    if (this.pendingActions.size >= this.config.maxPendingActions) {
      throw new Error("Maximum pending actions limit reached");
    }

    this.pendingActions.set(action.id, action);
    console.log(`[ActionQueue] Enqueued: ${action.id} (${type})`);

    return action;
  }

  /**
   * Human-in-the-loop確認リクエストを作成
   */
  createConfirmationRequest(
    sessionId: string,
    action: ExternalAction,
    message: string,
    riskLevel: "low" | "medium" | "high",
    impactDescription: string
  ): ConfirmationRequest {
    const request: ConfirmationRequest = {
      id: `confirm_${Date.now()}`,
      sessionId,
      action,
      message,
      riskLevel,
      impactDescription,
      expiresAt: Date.now() + this.config.confirmationTimeout,
      status: "waiting",
    };

    this.confirmationRequests.set(request.id, request);
    console.log(`[ActionQueue] Confirmation request created: ${request.id}`);

    return request;
  }

  /**
   * アクションを承認
   */
  approve(actionId: string, approvedBy: string = "user"): ExternalAction | null {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      console.warn(`[ActionQueue] Action not found: ${actionId}`);
      return null;
    }

    action.status = "approved";
    action.approvedBy = approvedBy;
    action.approvedAt = Date.now();

    // 関連する確認リクエストを更新
    for (const [, request] of this.confirmationRequests) {
      if (request.action.id === actionId) {
        request.status = "approved";
      }
    }

    console.log(`[ActionQueue] Approved: ${actionId} by ${approvedBy}`);
    return action;
  }

  /**
   * アクションを拒否
   */
  reject(actionId: string, reason: string): ExternalAction | null {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      console.warn(`[ActionQueue] Action not found: ${actionId}`);
      return null;
    }

    action.status = "rejected";
    action.rejectionReason = reason;

    // 関連する確認リクエストを更新
    for (const [, request] of this.confirmationRequests) {
      if (request.action.id === actionId) {
        request.status = "rejected";
      }
    }

    this.pendingActions.delete(actionId);
    console.log(`[ActionQueue] Rejected: ${actionId} - ${reason}`);

    return action;
  }

  /**
   * アクションを実行（承認済みのみ）
   */
  async execute(
    actionId: string,
    executor: (action: ExternalAction) => Promise<{ success: boolean; data?: unknown; error?: string }>
  ): Promise<ExternalAction | null> {
    const action = this.pendingActions.get(actionId);
    if (!action) {
      console.warn(`[ActionQueue] Action not found: ${actionId}`);
      return null;
    }

    if (action.status !== "approved") {
      console.warn(`[ActionQueue] Action not approved: ${actionId} (${action.status})`);
      return null;
    }

    action.status = "executing";
    action.executedAt = Date.now();
    console.log(`[ActionQueue] Executing: ${actionId}`);

    try {
      const result = await executor(action);
      action.result = result;
      action.status = result.success ? "completed" : "failed";

      // 完了したアクションをキューから移動
      this.pendingActions.delete(actionId);
      this.executedActions.push(action);

      console.log(`[ActionQueue] Execution ${result.success ? "succeeded" : "failed"}: ${actionId}`);
      return action;
    } catch (error) {
      action.status = "failed";
      action.result = {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };

      this.pendingActions.delete(actionId);
      this.executedActions.push(action);

      console.error(`[ActionQueue] Execution error: ${actionId}`, error);
      return action;
    }
  }

  /**
   * 保留中のアクションを取得
   */
  getPendingActions(): ExternalAction[] {
    return Array.from(this.pendingActions.values());
  }

  /**
   * セッションの保留中アクションを取得
   */
  getPendingBySession(sessionId: string): ConfirmationRequest[] {
    return Array.from(this.confirmationRequests.values()).filter(
      (r) => r.sessionId === sessionId && r.status === "waiting"
    );
  }

  /**
   * 確認リクエストを取得
   */
  getConfirmationRequest(requestId: string): ConfirmationRequest | undefined {
    return this.confirmationRequests.get(requestId);
  }

  /**
   * 期限切れの確認リクエストをクリーンアップ
   */
  cleanupExpired(): number {
    const now = Date.now();
    let expiredCount = 0;

    for (const [id, request] of this.confirmationRequests) {
      if (request.status === "waiting" && request.expiresAt < now) {
        request.status = "expired";

        // 関連するアクションも期限切れに
        const action = this.pendingActions.get(request.action.id);
        if (action) {
          action.status = "rejected";
          action.rejectionReason = "Confirmation timeout";
          this.pendingActions.delete(action.id);
        }

        expiredCount++;
      }
    }

    if (expiredCount > 0) {
      console.log(`[ActionQueue] Cleaned up ${expiredCount} expired requests`);
    }

    return expiredCount;
  }

  /**
   * 実行履歴を取得
   */
  getExecutionHistory(limit: number = 50): ExternalAction[] {
    return this.executedActions.slice(-limit);
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    pending: number;
    waitingConfirmation: number;
    executed: number;
    successRate: number;
  } {
    const executed = this.executedActions;
    const successCount = executed.filter((a) => a.result?.success).length;

    return {
      pending: this.pendingActions.size,
      waitingConfirmation: Array.from(this.confirmationRequests.values()).filter(
        (r) => r.status === "waiting"
      ).length,
      executed: executed.length,
      successRate: executed.length > 0 ? successCount / executed.length : 0,
    };
  }
}

// シングルトンインスタンス
let actionQueueInstance: ActionQueue | null = null;

/**
 * アクションキューのシングルトンインスタンスを取得
 */
export function getActionQueue(): ActionQueue {
  if (!actionQueueInstance) {
    actionQueueInstance = new ActionQueue();
  }
  return actionQueueInstance;
}
