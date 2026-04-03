import type { MergeCandidate, GraphResult } from "../types";

const API_BASE = "/api/compath";

/**
 * マージ検出のオプション
 */
type DetectOptions = {
  minJaccardSimilarity?: number;
  similarityThreshold?: number;
  maxCandidates?: number;
};

/**
 * マージ検出結果
 */
type DetectMergeResult = {
  candidates: MergeCandidate[];
  totalCount: number;
};

/**
 * マージ候補を検出
 */
export async function detectMergeCandidates(
  historyIds: string[],
  options?: DetectOptions
): Promise<DetectMergeResult> {
  const response = await fetch(`${API_BASE}/merge/detect`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ historyIds, options })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "マージ候補の検出に失敗しました。" }));
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * マージ候補の承認/却下
 */
export async function updateMergeCandidate(
  candidateId: string,
  status: "approved" | "rejected",
  mergedLabel?: string
): Promise<MergeCandidate> {
  const response = await fetch(`${API_BASE}/merge/candidates/${candidateId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status, mergedLabel })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "候補の更新に失敗しました。" }));
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * マージ候補の一括更新
 */
export async function updateMergeCandidatesBatch(
  updates: Array<{
    candidateId: string;
    status: "approved" | "rejected";
    mergedLabel?: string;
  }>
): Promise<{ updated: MergeCandidate[] }> {
  const response = await fetch(`${API_BASE}/merge/candidates/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "候補の一括更新に失敗しました。" }));
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * 統合グラフの結果
 */
type UnifiedGraphResult = {
  graph: GraphResult;
  mergedNodeCount: number;
  sourceDocumentIds: string[];
  warnings: string[];
};

/**
 * マージを実行して統合グラフを生成
 */
export async function executeMerge(
  historyIds: string[],
  axisId: string,
  candidateIds?: string[],
  approvedOnly: boolean = true
): Promise<UnifiedGraphResult> {
  const response = await fetch(`${API_BASE}/merge/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ historyIds, axisId, candidateIds, approvedOnly })
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "マージの実行に失敗しました。" }));
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * マージ候補一覧を取得
 */
export async function getMergeCandidates(): Promise<{ candidates: MergeCandidate[] }> {
  const response = await fetch(`${API_BASE}/merge/candidates`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "候補の取得に失敗しました。" }));
    throw new Error(error.message);
  }

  return response.json();
}

/**
 * マージ候補をクリア
 */
export async function clearMergeCandidates(): Promise<void> {
  const response = await fetch(`${API_BASE}/merge/candidates`, {
    method: "DELETE"
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "候補のクリアに失敗しました。" }));
    throw new Error(error.message);
  }
}
