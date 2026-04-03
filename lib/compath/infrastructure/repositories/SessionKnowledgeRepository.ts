/**
 * SessionKnowledge Repository
 *
 * セッション内ナレッジの永続化（インメモリ実装）
 * Presentation層からInfrastructure層に移動
 */

import type { SessionKnowledge } from "../../domain/decisionNavigator/knowledgeBase/types";

// インメモリストア
const store = new Map<string, SessionKnowledge>();

/**
 * SessionKnowledge Repository
 */
export const SessionKnowledgeRepository = {
  /**
   * セッションIDでナレッジを取得
   */
  findBySessionId(sessionId: string): SessionKnowledge | undefined {
    return store.get(sessionId);
  },

  /**
   * ナレッジを保存（作成または更新）
   */
  save(knowledge: SessionKnowledge): void {
    store.set(knowledge.sessionId, knowledge);
  },

  /**
   * ナレッジが存在するか確認
   */
  exists(sessionId: string): boolean {
    return store.has(sessionId);
  },

  /**
   * 全ナレッジを取得
   */
  findAll(): SessionKnowledge[] {
    return Array.from(store.values());
  },

  /**
   * ナレッジのサイズを取得
   */
  count(): number {
    return store.size;
  },

  /**
   * セッションのナレッジを削除
   */
  deleteBySessionId(sessionId: string): boolean {
    return store.delete(sessionId);
  },

  /**
   * ストアをクリア（テスト用）
   */
  clear(): void {
    store.clear();
  },
};
