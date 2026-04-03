/**
 * ID生成・タイムスタンプユーティリティ
 *
 * アプリケーション全体で一貫したID生成とタイムスタンプ管理を提供
 */

import { randomUUID } from "node:crypto";

// ============================================================
// タイムスタンプ関数
// ============================================================

/**
 * 現在のISO8601形式のタイムスタンプを取得
 *
 * @returns ISO8601形式の日時文字列 (例: "2024-01-15T10:30:00.000Z")
 *
 * @example
 * ```typescript
 * const now = getTimestamp();
 * // => "2024-01-15T10:30:00.000Z"
 * ```
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * 指定日時のISO8601形式タイムスタンプを取得
 *
 * @param date 変換対象のDateオブジェクト
 * @returns ISO8601形式の日時文字列
 */
export function toTimestamp(date: Date): string {
  return date.toISOString();
}

/**
 * タイムスタンプから日付部分のみを取得
 *
 * @param timestamp ISO8601形式のタイムスタンプ
 * @returns 日付部分 (例: "2024-01-15")
 */
export function extractDate(timestamp: string): string {
  return timestamp.split("T")[0];
}

// ============================================================
// ID生成関数
// ============================================================

/**
 * 汎用UUIDを生成
 *
 * @returns UUID v4形式の一意識別子
 *
 * @example
 * ```typescript
 * const id = generateId();
 * // => "550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generateId(): string {
  return randomUUID();
}

/**
 * プレフィックス付きIDを生成
 *
 * @param prefix IDのプレフィックス
 * @returns プレフィックス付きUUID
 *
 * @example
 * ```typescript
 * const sessionId = generatePrefixedId("session");
 * // => "session-550e8400-e29b-41d4-a716-446655440000"
 *
 * const nodeId = generatePrefixedId("node");
 * // => "node-550e8400-e29b-41d4-a716-446655440000"
 * ```
 */
export function generatePrefixedId(prefix: string): string {
  return `${prefix}-${randomUUID()}`;
}

// ============================================================
// エンティティ別ID生成関数
// ============================================================

/**
 * セッションIDを生成
 */
export function generateSessionId(): string {
  return generatePrefixedId("session");
}

/**
 * ノードIDを生成
 */
export function generateNodeId(): string {
  return generatePrefixedId("node");
}

/**
 * 選択履歴IDを生成
 */
export function generateSelectionId(): string {
  return generatePrefixedId("sel");
}

/**
 * ヒューリスティクスIDを生成
 */
export function generateHeuristicId(): string {
  return generatePrefixedId("heuristic");
}

/**
 * パターンIDを生成
 */
export function generatePatternId(): string {
  return generatePrefixedId("pattern");
}

/**
 * ラーニングIDを生成
 */
export function generateLearningId(): string {
  return generatePrefixedId("learning");
}

/**
 * インサイトIDを生成
 */
export function generateInsightId(): string {
  return generatePrefixedId("insight");
}

/**
 * 実行計画アイテムIDを生成
 */
export function generateExecutionPlanItemId(): string {
  return generatePrefixedId("exec");
}

// ============================================================
// 複合ユーティリティ
// ============================================================

/**
 * IDとタイムスタンプを同時に生成
 *
 * エンティティ作成時によく使うパターン
 *
 * @returns id, createdAt, updatedAtを含むオブジェクト
 *
 * @example
 * ```typescript
 * const { id, createdAt, updatedAt } = createEntityMeta();
 * const entity = { id, createdAt, updatedAt, ...otherProps };
 * ```
 */
export function createEntityMeta(): {
  id: string;
  createdAt: string;
  updatedAt: string;
} {
  const now = getTimestamp();
  return {
    id: generateId(),
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * プレフィックス付きIDとタイムスタンプを同時に生成
 *
 * @param prefix IDのプレフィックス
 */
export function createPrefixedEntityMeta(prefix: string): {
  id: string;
  createdAt: string;
  updatedAt: string;
} {
  const now = getTimestamp();
  return {
    id: generatePrefixedId(prefix),
    createdAt: now,
    updatedAt: now,
  };
}
