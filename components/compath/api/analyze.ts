import type { AnalysisResult } from "../types";

const API_BASE = "/api/compath";

export async function analyzeDocument(file: File): Promise<AnalysisResult> {
  const base64 = await readFileAsBase64(file);
  const response = await fetch(`${API_BASE}/analyze`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      fileName: file.name,
      mimeType: file.type || "application/octet-stream",
      base64
    })
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.message ?? "解析に失敗しました。";
    throw new Error(message);
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
      resolve(base64);
    };
    reader.readAsDataURL(file);
  });
}
