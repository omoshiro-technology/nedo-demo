import type { DecisionTimelineResult, DecisionItem, GlobalFeedforward } from "../types";

const API_BASE = "/api/compath";

type DocumentForUpload = {
  file: File;
  createdAt?: string;
  modifiedAt?: string;
};

export async function analyzeDecisions(
  documents: DocumentForUpload[]
): Promise<DecisionTimelineResult> {
  const documentsPayload = await Promise.all(
    documents.map(async (doc) => ({
      fileName: doc.file.name,
      mimeType: doc.file.type || "application/octet-stream",
      base64: await readFileAsBase64(doc.file),
      createdAt: doc.createdAt,
      modifiedAt: doc.modifiedAt || new Date(doc.file.lastModified).toISOString(),
    }))
  );

  const response = await fetch(`${API_BASE}/analyze-decisions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ documents: documentsPayload }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? "意思決定分析に失敗しました。");
  }

  return response.json();
}

function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("ファイル読み取りに失敗しました。"));
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== "string") {
        reject(new Error("ファイル形式が不正です。"));
        return;
      }
      const base64 = result.includes(",") ? result.split(",")[1] : result;
      resolve(base64 ?? "");
    };
    reader.readAsDataURL(file);
  });
}

/**
 * グローバルフィードフォワードを生成（オンデマンド）
 * 決定事項一覧から「次にやること」をLLMで生成
 */
export async function generateFeedforward(
  decisions: DecisionItem[],
  context?: string
): Promise<GlobalFeedforward> {
  const response = await fetch(`${API_BASE}/generate-feedforward`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ decisions, context }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    throw new Error(payload.message ?? "フィードフォワード生成に失敗しました。");
  }

  const data = await response.json();
  return data.globalFeedforward;
}
