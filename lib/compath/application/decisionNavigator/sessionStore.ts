/**
 * セッションストア（Write-throughキャッシュ方式）
 *
 * インメモリMapをプライマリとし、Neon PostgreSQLにwrite-throughで永続化。
 *
 * - 同一関数インスタンス内の並行リクエスト（Fluid Compute）はメモリ共有
 * - バックグラウンドタスクも最新のインメモリ状態を即座に参照可能
 * - コールドスタート時はDBからリストア
 * - 元のインメモリ動作を維持しつつ永続化の恩恵を得る
 */

import { neon } from "@neondatabase/serverless";
import type { DecisionNavigatorSession } from "./types";
import { getTimestamp } from "./utils";

function getDb() {
  return neon(process.env.DATABASE_URL!);
}

/** インメモリキャッシュ（プライマリストア） */
const cache = new Map<string, DecisionNavigatorSession>();
/** DBから全セッションをロード済みかどうか */
let cacheWarmed = false;

/**
 * DB永続化（fire-and-forget、エラーはログのみ）
 */
function persistToDb(session: DecisionNavigatorSession): void {
  const sql = getDb();
  sql`
    INSERT INTO decision_sessions (id, data, updated_at)
    VALUES (${session.id}, ${JSON.stringify(session)}::jsonb, NOW())
    ON CONFLICT (id) DO UPDATE SET data = ${JSON.stringify(session)}::jsonb, updated_at = NOW()
  `.catch((err) => {
    console.error("[SessionStore] DB persist failed:", err);
  });
}

function deleteFromDb(id: string): void {
  const sql = getDb();
  sql`DELETE FROM decision_sessions WHERE id = ${id}`.catch((err) => {
    console.error("[SessionStore] DB delete failed:", err);
  });
}

/**
 * コールドスタート時にDBからキャッシュをウォームアップ
 */
async function warmCache(): Promise<void> {
  if (cacheWarmed) return;
  try {
    const sql = getDb();
    const rows = await sql`SELECT data FROM decision_sessions ORDER BY updated_at DESC`;
    for (const row of rows) {
      const session = row.data as DecisionNavigatorSession;
      if (!cache.has(session.id)) {
        cache.set(session.id, session);
      }
    }
  } catch (err) {
    console.error("[SessionStore] Cache warm failed:", err);
  }
  cacheWarmed = true;
}

export const SessionStore = {
  /**
   * セッションを保存（同期的にキャッシュ更新 + 非同期DB永続化）
   */
  async save(session: DecisionNavigatorSession): Promise<void> {
    cache.set(session.id, session);
    persistToDb(session);
  },

  /**
   * セッションを取得（キャッシュ優先、なければDBフォールバック）
   */
  async findById(id: string): Promise<DecisionNavigatorSession | undefined> {
    const cached = cache.get(id);
    if (cached) return cached;

    // キャッシュミス: DBから取得
    try {
      const sql = getDb();
      const rows = await sql`SELECT data FROM decision_sessions WHERE id = ${id}`;
      if (rows.length === 0) return undefined;
      const session = rows[0].data as DecisionNavigatorSession;
      cache.set(session.id, session);
      return session;
    } catch (err) {
      console.error("[SessionStore] DB findById failed:", err);
      return undefined;
    }
  },

  /**
   * 全セッションを取得
   */
  async findAll(): Promise<DecisionNavigatorSession[]> {
    await warmCache();
    return Array.from(cache.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  /**
   * セッションを削除
   */
  async delete(id: string): Promise<boolean> {
    const existed = cache.delete(id);
    deleteFromDb(id);
    return existed;
  },

  /**
   * セッションを更新（アトミックなread-modify-write）
   */
  async update(
    id: string,
    updater: (session: DecisionNavigatorSession) => DecisionNavigatorSession
  ): Promise<DecisionNavigatorSession | undefined> {
    // キャッシュから取得（最新状態が保証される）
    let session = cache.get(id);
    if (!session) {
      // フォールバック: DBから取得
      const found = await this.findById(id);
      if (!found) return undefined;
      session = found;
    }

    const updated = updater(session);
    updated.updatedAt = getTimestamp();
    cache.set(id, updated);
    persistToDb(updated);
    return updated;
  },

  /**
   * 全セッションをクリア（テスト用）
   */
  async clear(): Promise<void> {
    cache.clear();
    cacheWarmed = false;
    try {
      const sql = getDb();
      await sql`DELETE FROM decision_sessions`;
    } catch (err) {
      console.error("[SessionStore] DB clear failed:", err);
    }
  },
};
