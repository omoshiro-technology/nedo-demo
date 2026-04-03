/**
 * ExecutionResult Repository
 *
 * 実行結果の永続化（インメモリ実装）
 * Presentation層からInfrastructure層に移動
 */

import type { ExecutionResult } from "../../domain/decisionNavigator/expertThinking/executionResult";

// インメモリストア
const store = new Map<string, ExecutionResult[]>();

/**
 * ExecutionResult Repository
 */
export const ExecutionResultRepository = {
  /**
   * セッションIDで実行結果一覧を取得
   */
  findBySessionId(sessionId: string): ExecutionResult[] {
    return store.get(sessionId) || [];
  },

  /**
   * 実行結果IDで取得
   */
  findById(sessionId: string, resultId: string): ExecutionResult | undefined {
    const results = store.get(sessionId);
    if (!results) return undefined;
    return results.find((r) => r.id === resultId);
  },

  /**
   * 実行結果を保存
   */
  save(sessionId: string, result: ExecutionResult): void {
    const existing = store.get(sessionId) || [];
    const index = existing.findIndex((r) => r.id === result.id);
    if (index >= 0) {
      existing[index] = result;
    } else {
      existing.push(result);
    }
    store.set(sessionId, existing);
  },

  /**
   * 実行結果を更新
   */
  update(
    sessionId: string,
    resultId: string,
    updates: Partial<ExecutionResult>
  ): ExecutionResult | undefined {
    const results = store.get(sessionId);
    if (!results) return undefined;

    const index = results.findIndex((r) => r.id === resultId);
    if (index === -1) return undefined;

    const updated = { ...results[index], ...updates };
    results[index] = updated;
    store.set(sessionId, results);
    return updated;
  },

  /**
   * セッションの全実行結果を削除
   */
  deleteBySessionId(sessionId: string): void {
    store.delete(sessionId);
  },

  /**
   * ストアをクリア（テスト用）
   */
  clear(): void {
    store.clear();
  },
};
