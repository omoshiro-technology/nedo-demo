/**
 * エージェント判定API
 *
 * LLMを使ったドキュメントジャンル判定を行い、
 * 適切なエージェントを選択する
 */

import type { AgentType } from "../types/chat";

const API_BASE = "/api/compath";

// =============================================================================
// 型定義
// =============================================================================

/** ドキュメントジャンル */
export type DocumentGenre =
  | "meeting_minutes" // 議事録
  | "technical_paper" // 論文・技術文書
  | "instruction_manual" // 指示書・マニュアル
  | "report" // 報告書
  | "specification" // 仕様書
  | "unknown"; // 不明

/** 分類結果 */
export type ClassificationResult = {
  genre: DocumentGenre;
  confidence: number;
  indicators: string[];
  suggestedAgent: AgentType;
};

// =============================================================================
// ファイルプレビュー抽出
// =============================================================================

/**
 * ファイルからプレビューテキストを抽出
 *
 * @param file 対象ファイル
 * @param maxLength 最大文字数（デフォルト: 2000）
 * @returns 先頭テキスト
 */
export async function extractFilePreview(
  file: File,
  maxLength: number = 2000
): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // テキストファイルの場合
  if (
    fileType.startsWith("text/") ||
    fileName.endsWith(".txt") ||
    fileName.endsWith(".md") ||
    fileName.endsWith(".csv")
  ) {
    const text = await file.text();
    return text.slice(0, maxLength);
  }

  // PDF/DOCXの場合はbase64エンコードして特殊なプレフィックスを付ける
  // バックエンドでパース処理を行う想定
  // 現時点ではファイル名のみを返す（バックエンドでの本格的なパースは別途実装）
  if (
    fileType === "application/pdf" ||
    fileName.endsWith(".pdf") ||
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    fileName.endsWith(".docx")
  ) {
    // PDF/DOCXはフロントエンドでは読み取れないため、
    // ファイル名とメタデータのみを返す
    return `[ファイル: ${file.name}, サイズ: ${Math.round(file.size / 1024)}KB]`;
  }

  // その他のファイルタイプ
  // バイナリファイルなどは読み取れないのでファイル名のみ
  return `[ファイル: ${file.name}]`;
}

// =============================================================================
// API呼び出し
// =============================================================================

/**
 * ドキュメント分類APIを呼び出し
 *
 * @param filePreview ファイルの先頭テキスト（最大2000文字）
 * @param fileName ファイル名
 * @param userMessage ユーザーの入力メッセージ
 * @returns 分類結果（suggestedAgentを含む）
 */
export async function classifyDocumentAPI(
  filePreview: string,
  fileName: string,
  userMessage: string
): Promise<ClassificationResult> {
  const response = await fetch(`${API_BASE}/chat/classify-document`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      filePreview,
      fileName,
      userMessage,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => ({}));
    const message = payload.message ?? "ドキュメント分類に失敗しました。";
    throw new Error(message);
  }

  return response.json();
}
