/**
 * プリフェッチ機構
 *
 * セッション作成後に、選択可能なノードの次の選択肢をバックグラウンドで並列取得し、
 * キャッシュに保存することで、ユーザーの選択時のレスポンスを高速化する。
 *
 * 仕様:
 * - 選択可能なノード（available, recommended）に対してプリフェッチを実行
 * - 並列実行数を制限してAPIレート制限を回避
 * - 結果はLRUキャッシュに保存（TTL: 10分）
 * - recordSelectionはキャッシュを優先的に使用
 */

import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  GenerateOptionsResponse,
} from "./types";
import { generateNextOptionsWithLLM, setOptionsCache, getOptionsCacheStats } from "./generateOptions";
import { sessionRepository } from "./sessionRepository";
import { env } from "../../config/env";

/** プリフェッチ結果のキャッシュキー */
type PrefetchCacheKey = `${string}:${string}`; // sessionId:nodeId

/** 進行中のプリフェッチを追跡（重複実行を防止） */
const inProgressPrefetches = new Map<PrefetchCacheKey, Promise<void>>();

/** 並列実行数の制限 */
const MAX_CONCURRENT_PREFETCHES = 3;

/**
 * キャッシュキーを生成
 */
function getCacheKey(sessionId: string, nodeId: string): PrefetchCacheKey {
  return `${sessionId}:${nodeId}`;
}

/**
 * プリフェッチ結果をキャッシュから取得
 * 注意: 現在はgenerateNextOptionsWithLLM内のキャッシュを直接使用するため、
 * この関数は後方互換性のために残しています
 */
export function getPrefetchedOptions(
  sessionId: string,
  nodeId: string
): GenerateOptionsResponse | null {
  // generateNextOptionsWithLLM内のキャッシュを使用するため、ここでは常にnullを返す
  // 実際のキャッシュチェックはgenerateNextOptionsWithLLM内で行われる
  console.log(`[Prefetch] getPrefetchedOptions called for ${sessionId}:${nodeId} (delegating to generateNextOptionsWithLLM)`);
  return null;
}

/**
 * プリフェッチ結果をキャッシュに保存
 * 注意: generateOptionsのキャッシュを使用
 */
export function setPrefetchedOptions(
  sessionId: string,
  nodeId: string,
  options: GenerateOptionsResponse
): void {
  console.log(`[Prefetch] setPrefetchedOptions called for ${sessionId}:${nodeId}`);
  // Note: この関数はGenerateOptionsResponse形式を受け取るが、
  // setOptionsCacheはLLMOptionsResult形式を期待する
  // recordSelection.tsで直接generateNextOptionsWithLLMを呼ぶ際にキャッシュされるため、
  // ここでは何もしない（generateNextOptionsWithLLM内で自動キャッシュされる）
}

/**
 * セッションのプリフェッチ可能なノードを取得
 */
function getPrefetchableNodes(session: DecisionNavigatorSession): DecisionFlowNode[] {
  return session.nodes.filter((node) => {
    // 選択可能なノード（available, recommended）のみ
    if (node.status !== "available" && node.status !== "recommended") {
      return false;
    }
    // スタートノードは除外
    if (node.type === "start") {
      return false;
    }
    // 既にプリフェッチ中のものは除外
    const key = getCacheKey(session.id, node.id);
    if (inProgressPrefetches.has(key)) {
      return false;
    }
    // Note: generateNextOptionsWithLLM内のキャッシュチェックは
    // 実行時に行われるため、ここではスキップ
    return true;
  });
}

/**
 * 単一ノードのプリフェッチを実行
 */
async function prefetchSingleNode(
  session: DecisionNavigatorSession,
  node: DecisionFlowNode
): Promise<void> {
  const key = getCacheKey(session.id, node.id);

  // 重複実行を防止
  if (inProgressPrefetches.has(key)) {
    return inProgressPrefetches.get(key);
  }

  const prefetchPromise = (async () => {
    try {
      // LLMで次の選択肢を生成
      const llmResult = await generateNextOptionsWithLLM(session, node);

      // LLMの結果をGenerateOptionsResponse形式に変換
      const options: GenerateOptionsResponse = {
        options: llmResult.options.map((opt) => ({
          label: opt.label,
          description: opt.description,
          confidence: 100 - opt.risk.score,
          riskLevel: opt.risk.level,
          riskStrategy: opt.riskStrategy,
          riskCategories: [],
          relatedPastCases: [],
          source: "ai_generated" as const,
          isRecommended: llmResult.recommendation?.id === opt.id,
          recommendationReason: llmResult.recommendation?.id === opt.id
            ? llmResult.recommendation.reason
            : undefined,
        })),
      };

      // キャッシュに保存
      setPrefetchedOptions(session.id, node.id, options);
    } catch (error) {
      console.error(`[Prefetch] Failed for ${key}:`, error);
      // エラーは無視（選択時に再取得される）
    } finally {
      inProgressPrefetches.delete(key);
    }
  })();

  inProgressPrefetches.set(key, prefetchPromise);
  return prefetchPromise;
}

/**
 * セッション内の選択可能なノードに対してプリフェッチを実行
 *
 * バックグラウンドで非同期実行され、結果を待たずに即座に戻る。
 * 並列実行数を制限してAPIレート制限を回避。
 */
export function startPrefetch(session: DecisionNavigatorSession): void {
  // LLM APIキーがない場合はプリフェッチしない
  if (!env.openaiApiKey) {
    console.log("[Prefetch] Skipped: No OpenAI API key");
    return;
  }

  const prefetchableNodes = getPrefetchableNodes(session);
  if (prefetchableNodes.length === 0) {
    console.log("[Prefetch] No prefetchable nodes");
    return;
  }

  console.log(`[Prefetch] Starting prefetch for ${prefetchableNodes.length} nodes`);

  // 並列実行数を制限しながらプリフェッチ
  // setImmediateで非同期実行（リクエスト処理をブロックしない）
  setImmediate(async () => {
    // チャンクに分割して順次実行
    for (let i = 0; i < prefetchableNodes.length; i += MAX_CONCURRENT_PREFETCHES) {
      const chunk = prefetchableNodes.slice(i, i + MAX_CONCURRENT_PREFETCHES);

      // セッションの最新状態を取得（選択が進んでいる可能性があるため）
      const currentSession = await sessionRepository.findById(session.id);
      if (!currentSession) {
        console.log("[Prefetch] Session no longer exists, stopping");
        break;
      }

      // まだプリフェッチが必要なノードのみ処理（進行中でないもの）
      const stillNeeded = chunk.filter((node) => {
        const key = getCacheKey(session.id, node.id);
        return !inProgressPrefetches.has(key);
      });

      if (stillNeeded.length === 0) {
        continue;
      }

      // 並列実行
      await Promise.allSettled(
        stillNeeded.map((node) => prefetchSingleNode(currentSession, node))
      );

      // 次のチャンクまで少し待機（レート制限対策）
      if (i + MAX_CONCURRENT_PREFETCHES < prefetchableNodes.length) {
        await new Promise((resolve) => setTimeout(resolve, 500));
      }
    }

    console.log("[Prefetch] Completed");
  });
}

/**
 * セッションのキャッシュをクリア
 */
export function clearSessionCache(sessionId: string): void {
  // 注意: LRUCacheはキーのプレフィックス検索をサポートしていないため、
  // 完全なクリアは実装が複雑になる。TTLに任せる。
  console.log(`[Prefetch] Cache will expire naturally for session ${sessionId}`);
}

/**
 * キャッシュ統計を取得（デバッグ用）
 */
export function getCacheStats(): { size: number } {
  return getOptionsCacheStats();
}
