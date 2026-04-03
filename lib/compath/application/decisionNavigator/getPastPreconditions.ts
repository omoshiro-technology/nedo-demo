/**
 * 過去事例から前提条件を取得
 *
 * 類似の目的を持つ過去のセッションから前提条件を検索し、
 * 再利用可能な形式で返す。
 */

import { sessionRepository } from "./sessionRepository";
import type { DecisionNavigatorSession, PreconditionData } from "./types";

/** 過去の前提条件レスポンス */
export type PastPreconditionEntry = {
  sessionId: string;
  purpose: string;
  preconditions: PreconditionData;
  createdAt: string;
  similarity: number;
};

export type GetPastPreconditionsResponse = {
  entries: PastPreconditionEntry[];
  total: number;
};

/**
 * 類似度を計算（簡易的なキーワードマッチング）
 * 将来的にはembedding検索に置き換え可能
 */
function calculateSimilarity(query: string, target: string): number {
  const queryKeywords = query.toLowerCase().split(/[\s、。・]+/).filter(k => k.length > 1);
  const targetKeywords = target.toLowerCase().split(/[\s、。・]+/).filter(k => k.length > 1);

  if (queryKeywords.length === 0) return 0;

  let matchCount = 0;
  for (const qk of queryKeywords) {
    for (const tk of targetKeywords) {
      if (qk.includes(tk) || tk.includes(qk)) {
        matchCount++;
        break;
      }
    }
  }

  return Math.round((matchCount / queryKeywords.length) * 100);
}

/**
 * 過去事例から前提条件を取得
 *
 * @param purpose 目的（類似度検索のクエリ）
 * @param limit 最大取得件数（デフォルト: 5）
 */
export async function getPastPreconditions(
  purpose: string,
  limit = 5
): Promise<GetPastPreconditionsResponse> {
  // 全セッションを取得
  const allSessions = await sessionRepository.findAll();

  // 前提条件を持つセッションのみフィルタリング
  const sessionsWithPreconditions = allSessions.filter(
    (s): s is DecisionNavigatorSession & { preconditions: PreconditionData } =>
      !!s.preconditions &&
      s.preconditions.conditions.length > 0
  );

  if (sessionsWithPreconditions.length === 0) {
    return { entries: [], total: 0 };
  }

  // 類似度を計算してソート
  const scored = sessionsWithPreconditions.map(session => ({
    session,
    similarity: calculateSimilarity(purpose, session.purpose),
  }));

  // 類似度でソートし、上位limit件を取得
  scored.sort((a, b) => b.similarity - a.similarity);
  const topEntries = scored.slice(0, limit);

  // レスポンス形式に変換
  const entries: PastPreconditionEntry[] = topEntries.map(({ session, similarity }) => ({
    sessionId: session.id,
    purpose: session.purpose,
    preconditions: session.preconditions,
    createdAt: session.createdAt,
    similarity,
  }));

  return {
    entries,
    total: sessionsWithPreconditions.length,
  };
}
