/**
 * セッションのインメモリストア
 *
 * 将来的にはデータベースやファイルシステムに永続化
 */

import type { DecisionNavigatorSession } from "./types";
import { getTimestamp } from "./utils";

const sessions = new Map<string, DecisionNavigatorSession>();

export const SessionStore = {
  /**
   * セッションを保存
   */
  save(session: DecisionNavigatorSession): void {
    sessions.set(session.id, session);
  },

  /**
   * セッションを取得
   */
  findById(id: string): DecisionNavigatorSession | undefined {
    return sessions.get(id);
  },

  /**
   * 全セッションを取得
   */
  findAll(): DecisionNavigatorSession[] {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * セッションを削除
   */
  delete(id: string): boolean {
    return sessions.delete(id);
  },

  /**
   * セッションを更新
   */
  update(
    id: string,
    updater: (session: DecisionNavigatorSession) => DecisionNavigatorSession
  ): DecisionNavigatorSession | undefined {
    const session = sessions.get(id);
    if (!session) return undefined;

    const updated = updater(session);
    updated.updatedAt = getTimestamp();
    sessions.set(id, updated);
    return updated;
  },

  /**
   * 全セッションをクリア（テスト用）
   */
  clear(): void {
    sessions.clear();
  },
};
