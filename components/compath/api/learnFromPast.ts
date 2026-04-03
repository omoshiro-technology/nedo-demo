import type { LearnFromPastResult, DecisionItem } from "../types";

const API_BASE = "/api/compath";

/**
 * 類似事例を検索
 */
export async function searchSimilarCases(
  situation: string,
  options?: {
    limit?: number;
    minSimilarity?: number;
  }
): Promise<LearnFromPastResult> {
  const response = await fetch(`${API_BASE}/learn-from-past/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      situation,
      limit: options?.limit,
      minSimilarity: options?.minSimilarity,
    }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "検索に失敗しました。" }));
    throw new Error(error.message || "検索に失敗しました。");
  }

  return response.json();
}

/**
 * 決定履歴をインポート
 */
export async function importDecisions(
  decisions: DecisionItem[]
): Promise<{ message: string; totalCount: number }> {
  const response = await fetch(`${API_BASE}/learn-from-past/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decisions }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "インポートに失敗しました。" }));
    throw new Error(error.message || "インポートに失敗しました。");
  }

  return response.json();
}

/**
 * 決定履歴の統計を取得
 */
export async function getLearnStats(): Promise<{
  totalCount: number;
  timeRange: { earliest: string; latest: string };
}> {
  const response = await fetch(`${API_BASE}/learn-from-past/stats`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "統計の取得に失敗しました。" }));
    throw new Error(error.message || "統計の取得に失敗しました。");
  }

  return response.json();
}
