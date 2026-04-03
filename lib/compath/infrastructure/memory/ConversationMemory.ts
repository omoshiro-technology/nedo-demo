/**
 * 会話メモリ
 *
 * 会話履歴を管理し、コンテキストを維持する
 */

import { getMemoryStore, type MemoryEntry } from "./MemoryStore";
import type { ConversationMessage } from "../../domain/agent/types";

/**
 * 会話メモリのエントリ
 */
export type ConversationMemoryEntry = {
  /** セッションID */
  sessionId: string;
  /** メッセージ */
  message: ConversationMessage;
  /** 重要度スコア（0-1） */
  importance: number;
  /** 関連するツール実行 */
  relatedToolExecutions?: string[];
};

/**
 * 会話メモリの設定
 */
export type ConversationMemoryConfig = {
  /** セッションあたりの最大メッセージ数 */
  maxMessagesPerSession: number;
  /** コンテキストウィンドウサイズ */
  contextWindowSize: number;
};

const DEFAULT_CONFIG: ConversationMemoryConfig = {
  maxMessagesPerSession: 100,
  contextWindowSize: 10,
};

/**
 * 会話メモリマネージャー
 */
export class ConversationMemory {
  private config: ConversationMemoryConfig;

  constructor(config: Partial<ConversationMemoryConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * メッセージを保存
   */
  saveMessage(
    sessionId: string,
    message: ConversationMessage,
    importance: number = 0.5,
    relatedToolExecutions?: string[]
  ): void {
    const store = getMemoryStore();
    const id = `conv_${sessionId}_${message.timestamp}`;

    const entry: ConversationMemoryEntry = {
      sessionId,
      message,
      importance,
      relatedToolExecutions,
    };

    store.save({
      id,
      type: "conversation",
      content: message.content,
      metadata: {
        sessionId,
        role: message.role,
        importance,
        relatedToolExecutions,
      },
      ttl: 7 * 24 * 60 * 60 * 1000, // 7日間保持
    });
  }

  /**
   * セッションの会話履歴を取得
   */
  getHistory(sessionId: string, limit?: number): ConversationMessage[] {
    const store = getMemoryStore();
    const entries = store.getBySession(sessionId, "conversation");

    const messages = entries.map((entry) => ({
      role: entry.metadata.role as ConversationMessage["role"],
      content: entry.content,
      timestamp: entry.createdAt,
    }));

    // 最新のN件を返す
    const actualLimit = limit || this.config.contextWindowSize;
    return messages.slice(-actualLimit);
  }

  /**
   * 重要なメッセージを取得（コンテキスト構築用）
   */
  getImportantMessages(sessionId: string, threshold: number = 0.7): ConversationMessage[] {
    const store = getMemoryStore();
    const entries = store.getBySession(sessionId, "conversation");

    return entries
      .filter((entry) => (entry.metadata.importance as number) >= threshold)
      .map((entry) => ({
        role: entry.metadata.role as ConversationMessage["role"],
        content: entry.content,
        timestamp: entry.createdAt,
      }));
  }

  /**
   * 関連する会話を検索
   */
  searchRelated(query: string, sessionId?: string, limit: number = 5): ConversationMessage[] {
    const store = getMemoryStore();
    const entries = store.search(query, {
      type: "conversation",
      sessionId,
      limit,
    });

    return entries.map((entry) => ({
      role: entry.metadata.role as ConversationMessage["role"],
      content: entry.content,
      timestamp: entry.createdAt,
    }));
  }

  /**
   * セッションの会話を要約
   */
  async summarizeSession(sessionId: string): Promise<string> {
    const history = this.getHistory(sessionId, 50);

    if (history.length === 0) {
      return "会話履歴がありません。";
    }

    // 簡易的な要約（将来はLLMで要約）
    const userMessages = history.filter((m) => m.role === "user");
    const assistantMessages = history.filter((m) => m.role === "assistant");

    return `このセッションでは ${userMessages.length} 件のユーザーリクエストと ${assistantMessages.length} 件の応答がありました。`;
  }

  /**
   * 古い会話をアーカイブ
   */
  archiveOldMessages(sessionId: string, keepRecent: number = 20): number {
    const store = getMemoryStore();
    const entries = store.getBySession(sessionId, "conversation");

    if (entries.length <= keepRecent) {
      return 0;
    }

    // 古いメッセージを削除
    const toDelete = entries.slice(0, entries.length - keepRecent);
    let deletedCount = 0;

    for (const entry of toDelete) {
      if (store.delete(entry.id)) {
        deletedCount++;
      }
    }

    console.log(
      `[ConversationMemory] Archived ${deletedCount} messages for session ${sessionId}`
    );
    return deletedCount;
  }
}

// シングルトンインスタンス
let conversationMemoryInstance: ConversationMemory | null = null;

/**
 * 会話メモリのシングルトンインスタンスを取得
 */
export function getConversationMemory(): ConversationMemory {
  if (!conversationMemoryInstance) {
    conversationMemoryInstance = new ConversationMemory();
  }
  return conversationMemoryInstance;
}
