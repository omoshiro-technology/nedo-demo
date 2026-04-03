/**
 * セッションストア（Neon PostgreSQL永続化）
 *
 * Vercelサーバーレス環境でもセッションが維持されるよう、
 * インメモリMapからNeon PostgreSQLに移行。
 */

import { neon } from "@neondatabase/serverless";
import type { DecisionNavigatorSession } from "./types";
import { getTimestamp } from "./utils";

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

export const SessionStore = {
  /**
   * セッションを保存
   */
  async save(session: DecisionNavigatorSession): Promise<void> {
    const sql = getDb();
    await sql`
      INSERT INTO decision_sessions (id, data, updated_at)
      VALUES (${session.id}, ${JSON.stringify(session)}::jsonb, NOW())
      ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(session)}::jsonb, updated_at = NOW()
    `;
  },

  /**
   * セッションを取得
   */
  async findById(id: string): Promise<DecisionNavigatorSession | undefined> {
    const sql = getDb();
    const rows = await sql`SELECT data FROM decision_sessions WHERE id = ${id}`;
    if (rows.length === 0) return undefined;
    return rows[0].data as DecisionNavigatorSession;
  },

  /**
   * 全セッションを取得
   */
  async findAll(): Promise<DecisionNavigatorSession[]> {
    const sql = getDb();
    const rows = await sql`SELECT data FROM decision_sessions ORDER BY updated_at DESC`;
    return rows.map((r) => r.data as DecisionNavigatorSession);
  },

  /**
   * セッションを削除
   */
  async delete(id: string): Promise<boolean> {
    const sql = getDb();
    const result = await sql`DELETE FROM decision_sessions WHERE id = ${id}`;
    return result.length >= 0;
  },

  /**
   * セッションを更新
   */
  async update(
    id: string,
    updater: (session: DecisionNavigatorSession) => DecisionNavigatorSession
  ): Promise<DecisionNavigatorSession | undefined> {
    const sql = getDb();
    const rows = await sql`SELECT data FROM decision_sessions WHERE id = ${id}`;
    if (rows.length === 0) return undefined;

    const session = rows[0].data as DecisionNavigatorSession;
    const updated = updater(session);
    updated.updatedAt = getTimestamp();
    await sql`
      UPDATE decision_sessions SET data = ${JSON.stringify(updated)}::jsonb, updated_at = NOW()
      WHERE id = ${id}
    `;
    return updated;
  },

  /**
   * 全セッションをクリア（テスト用）
   */
  async clear(): Promise<void> {
    const sql = getDb();
    await sql`DELETE FROM decision_sessions`;
  },
};
