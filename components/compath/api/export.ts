import type { ExportFormat } from "../types";

const API_BASE = "/api/compath";

type ExportParams = {
  historyId: string;
  axisId: string;
  format: ExportFormat;
  includeTags?: boolean;
  includeEdgeLabels?: boolean;
};

/**
 * グラフをエクスポートしてダウンロード
 */
export async function exportGraph(params: ExportParams): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "エクスポートに失敗しました。" }));
    throw new Error(error.message);
  }

  return response.blob();
}

/**
 * エッジCSVをエクスポートしてダウンロード
 */
export async function exportEdgesCsv(params: {
  historyId: string;
  axisId: string;
  includeEdgeLabels?: boolean;
}): Promise<Blob> {
  const response = await fetch(`${API_BASE}/export/edges`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(params)
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: "エクスポートに失敗しました。" }));
    throw new Error(error.message);
  }

  return response.blob();
}

/**
 * Blobをファイルとしてダウンロード
 */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
