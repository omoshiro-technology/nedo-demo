import type {
  AnalysisHistory,
  AnalysisHistorySummary,
  AnalysisResult,
  DocumentClassification,
  NodeConfidenceTag
} from "../types";

const API_BASE = "/api/compath";

export async function getHistoryList(): Promise<AnalysisHistorySummary[]> {
  const response = await fetch(`${API_BASE}/history`);
  if (!response.ok) {
    throw new Error("履歴の取得に失敗しました。");
  }
  return response.json();
}

export async function getHistoryById(id: string): Promise<AnalysisHistory> {
  const response = await fetch(`${API_BASE}/history/${id}`);
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("履歴が見つかりません。");
    }
    throw new Error("履歴の取得に失敗しました。");
  }
  return response.json();
}

export async function saveHistory(input: {
  fileName: string;
  result: AnalysisResult;
  qualityScore?: number;
}): Promise<AnalysisHistory> {
  const response = await fetch(`${API_BASE}/history`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input)
  });
  if (!response.ok) {
    throw new Error("履歴の保存に失敗しました。");
  }
  return response.json();
}

export async function deleteHistory(id: string): Promise<void> {
  const response = await fetch(`${API_BASE}/history/${id}`, {
    method: "DELETE"
  });
  if (!response.ok && response.status !== 204) {
    throw new Error("履歴の削除に失敗しました。");
  }
}

/**
 * 文書分類を更新
 */
export async function updateDocumentClassification(
  id: string,
  classification: DocumentClassification
): Promise<AnalysisHistory> {
  const response = await fetch(`${API_BASE}/history/${id}/classification`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ classification })
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("履歴が見つかりません。");
    }
    throw new Error("文書分類の更新に失敗しました。");
  }
  return response.json();
}

/**
 * ノードの確信度タグを更新
 */
export async function updateNodeTag(
  historyId: string,
  axisId: string,
  nodeId: string,
  confidenceTag: NodeConfidenceTag,
  reason?: string
): Promise<AnalysisHistory> {
  const response = await fetch(
    `${API_BASE}/history/${historyId}/axis/${axisId}/nodes/${nodeId}/tags`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ confidenceTag, reason })
    }
  );
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("履歴またはノードが見つかりません。");
    }
    throw new Error("タグの更新に失敗しました。");
  }
  return response.json();
}

/**
 * 複数ノードのタグを一括更新
 */
export async function updateNodeTagsBatch(
  historyId: string,
  updates: Array<{
    axisId: string;
    nodeId: string;
    confidenceTag: NodeConfidenceTag;
    reason?: string;
  }>
): Promise<AnalysisHistory> {
  const response = await fetch(`${API_BASE}/history/${historyId}/nodes/tags/batch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ updates })
  });
  if (!response.ok) {
    if (response.status === 404) {
      throw new Error("履歴が見つかりません。");
    }
    throw new Error("タグの一括更新に失敗しました。");
  }
  return response.json();
}
