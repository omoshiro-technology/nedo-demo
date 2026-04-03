/**
 * Decision Navigator - 意思決定ナビゲーター
 *
 * 未来志向のフローチャート型意思決定支援機能
 * LLM統合: 動的な意思決定パス生成
 */

// セッション管理
export { createSession } from "./createSession";
export { regenerateSession } from "./regenerateSession";
export type { RegenerateSessionRequest } from "./regenerateSession";
export { recordSelection, confirmSelection, undoSelection } from "./recordSelection";
export type { ConfirmSelectionRequest } from "./recordSelection";
export { toggleAlternatives } from "./toggleAlternatives";
export type { ToggleAlternativesRequest } from "./toggleAlternatives";

// 選択肢生成
export { generateInitialOptions, generateNextOptions, generateNextOptionsWithLLM } from "./generateOptions";
export { generateRecommendedPath } from "./generateRecommendedPath";
export type { GenerationMode } from "./generateRecommendedPath";

// 判断軸追加
export { addCriteria } from "./addCriteria";
export type { AddCriteriaResult } from "./addCriteria";

// Phase 22: 探索（次の問い生成）
export { exploreNext } from "./exploreNext";
export type { ExploreNextRequest, ExploreNextResult } from "./exploreNext";

// リポジトリ
export { SessionStore } from "./sessionStore";
export { sessionRepository, InMemorySessionRepository } from "./sessionRepository";
export type { ISessionRepository } from "./sessionRepository";

// コンテキスト管理
export {
  getOrCreateContext,
  updateContextWithSelection,
  updateContextWithClarification,
  buildContextSummary,
  createEmptyContext,
} from "./contextBuilder";

// プリフェッチ
export {
  startPrefetch,
  getPrefetchedOptions,
  getCacheStats,
} from "./prefetch";

// 型定義
export * from "./types";
