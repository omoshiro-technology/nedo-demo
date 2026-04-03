/**
 * セッションリポジトリ
 *
 * Repository Interface + インメモリ実装
 * 将来的にはPostgreSQL等に差し替え可能
 */

import type { DecisionNavigatorSession, DecisionContext } from "./types";
import { getTimestamp } from "./utils";

// ============================================================
// Repository Interface
// ============================================================

export interface ISessionRepository {
  /** セッションを保存 */
  save(session: DecisionNavigatorSession): Promise<void>;

  /** IDでセッションを取得 */
  findById(id: string): Promise<DecisionNavigatorSession | undefined>;

  /** 全セッションを取得（更新日時降順） */
  findAll(): Promise<DecisionNavigatorSession[]>;

  /** セッションを削除 */
  delete(id: string): Promise<boolean>;

  /** セッションを更新 */
  update(
    id: string,
    updater: (session: DecisionNavigatorSession) => DecisionNavigatorSession
  ): Promise<DecisionNavigatorSession | undefined>;

  /** DecisionContextを更新 */
  updateContext(
    id: string,
    context: Partial<DecisionContext>
  ): Promise<DecisionNavigatorSession | undefined>;

  /** 全セッションをクリア（テスト用） */
  clear(): Promise<void>;
}

// ============================================================
// インメモリ実装
// ============================================================

const sessions = new Map<string, DecisionNavigatorSession>();

export const InMemorySessionRepository: ISessionRepository = {
  async save(session: DecisionNavigatorSession): Promise<void> {
    sessions.set(session.id, session);
  },

  async findById(id: string): Promise<DecisionNavigatorSession | undefined> {
    return sessions.get(id);
  },

  async findAll(): Promise<DecisionNavigatorSession[]> {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  async delete(id: string): Promise<boolean> {
    return sessions.delete(id);
  },

  async update(
    id: string,
    updater: (session: DecisionNavigatorSession) => DecisionNavigatorSession
  ): Promise<DecisionNavigatorSession | undefined> {
    const session = sessions.get(id);
    if (!session) return undefined;

    const updated = updater(session);
    updated.updatedAt = getTimestamp();
    sessions.set(id, updated);
    return updated;
  },

  async updateContext(
    id: string,
    contextUpdate: Partial<DecisionContext>
  ): Promise<DecisionNavigatorSession | undefined> {
    const session = sessions.get(id);
    if (!session) return undefined;

    const currentContext = session.decisionContext ?? {
      purpose: session.purpose,
      constraints: [],
      assumptions: [],
      commitments: [],
      selectedPath: [],
    };

    const updatedContext: DecisionContext = {
      ...currentContext,
      ...contextUpdate,
      // 配列はマージする
      constraints: [
        ...currentContext.constraints,
        ...(contextUpdate.constraints ?? []),
      ],
      assumptions: [
        ...currentContext.assumptions,
        ...(contextUpdate.assumptions ?? []),
      ],
      commitments: [
        ...currentContext.commitments,
        ...(contextUpdate.commitments ?? []),
      ],
      selectedPath: contextUpdate.selectedPath ?? currentContext.selectedPath,
    };

    const updated: DecisionNavigatorSession = {
      ...session,
      decisionContext: updatedContext,
      updatedAt: getTimestamp(),
    };

    sessions.set(id, updated);
    return updated;
  },

  async clear(): Promise<void> {
    sessions.clear();
  },
};

// ============================================================
// デフォルトエクスポート（互換性維持）
// ============================================================

/**
 * デフォルトのリポジトリインスタンス
 * 将来的にDIで差し替え可能
 */
export const sessionRepository: ISessionRepository = InMemorySessionRepository;

/**
 * 後方互換性のための同期API（既存コードとの互換）
 * 新規コードではsessionRepositoryを使用すること
 */
export const SessionStore = {
  save(session: DecisionNavigatorSession): void {
    sessions.set(session.id, session);
  },

  findById(id: string): DecisionNavigatorSession | undefined {
    return sessions.get(id);
  },

  findAll(): DecisionNavigatorSession[] {
    return Array.from(sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  },

  delete(id: string): boolean {
    return sessions.delete(id);
  },

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

  clear(): void {
    sessions.clear();
  },
};
