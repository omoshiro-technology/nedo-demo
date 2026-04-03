/**
 * ドキュメントインデクサー
 *
 * ドキュメントをチャンクに分割してKnowledge Baseに登録
 * - チャンク分割: 1000文字/チャンク、200文字オーバーラップ
 * - 段落境界を尊重
 */

import { getInMemoryRetriever } from "../../infrastructure/vectordb/InMemoryRetriever";
import { parseDocument } from "../../infrastructure/parsers/documentParser";
import type { DocumentToIndex } from "../../infrastructure/vectordb/KnowledgeRetriever";
import { env } from "../../config/env";

// ============================================================
// 設定
// ============================================================

/** チャンクサイズ（文字数） */
const DEFAULT_CHUNK_SIZE = 1000;

/** オーバーラップサイズ（文字数） */
const DEFAULT_CHUNK_OVERLAP = 200;

// ============================================================
// 型定義
// ============================================================

export type IndexDocumentInput = {
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

export type IndexDocumentResult = {
  id: string;
  chunksCreated: number;
};

export type IndexFileInput = {
  /** Base64エンコードされたファイル内容 */
  fileContent: string;
  /** ファイル名 */
  fileName: string;
  /** メタデータ */
  metadata?: Record<string, unknown>;
};

export type IndexFileResult = {
  id: string;
  title: string;
  chunksCreated: number;
};

// ============================================================
// メイン関数
// ============================================================

/**
 * テキストドキュメントをインデックス登録
 */
export async function indexDocument(
  input: IndexDocumentInput
): Promise<IndexDocumentResult> {
  const retriever = getInMemoryRetriever();

  // コンテンツをチャンクに分割
  const chunks = chunkDocument(input.content);

  // ドキュメントIDを生成
  const docId = generateDocumentId();

  // 各チャンクをインデックス登録用に変換
  const documents: DocumentToIndex[] = chunks.map((chunk, index) => ({
    id: `${docId}_chunk_${index}`,
    title: chunks.length > 1 ? `${input.title} (${index + 1}/${chunks.length})` : input.title,
    content: chunk,
    metadata: {
      ...input.metadata,
      parentDocId: docId,
      chunkIndex: index,
      totalChunks: chunks.length,
      originalTitle: input.title,
    },
  }));

  // インデックス登録
  await retriever.index(documents);

  console.log(`[documentIndexer] Indexed "${input.title}" with ${chunks.length} chunks`);

  return {
    id: docId,
    chunksCreated: chunks.length,
  };
}

/**
 * ファイルをパースしてインデックス登録
 */
export async function indexFile(
  input: IndexFileInput
): Promise<IndexFileResult> {
  // Base64デコード
  const buffer = Buffer.from(input.fileContent, "base64");

  // MIMEタイプを推測
  const mimeType = guessMimeType(input.fileName);

  // ドキュメントをパース
  const { parsed, warnings } = await parseDocument({
    fileName: input.fileName,
    mimeType,
    data: buffer,
  });

  if (warnings.length > 0) {
    console.warn(`[documentIndexer] Warnings for "${input.fileName}":`, warnings);
  }

  if (!parsed.fullText || parsed.fullText.trim().length === 0) {
    throw new Error("ファイルからテキストを抽出できませんでした。");
  }

  // タイトルを生成（ファイル名から拡張子を除去）
  const title = input.fileName.replace(/\.[^/.]+$/, "");

  // インデックス登録
  const result = await indexDocument({
    title,
    content: parsed.fullText,
    metadata: {
      ...input.metadata,
      fileName: input.fileName,
      mimeType,
      pageCount: parsed.pages?.length ?? 1,
    },
  });

  return {
    id: result.id,
    title,
    chunksCreated: result.chunksCreated,
  };
}

// ============================================================
// チャンク分割
// ============================================================

/**
 * ドキュメントをチャンクに分割
 *
 * - デフォルト: 1000文字/チャンク、200文字オーバーラップ
 * - 段落境界（改行2つ以上）を尊重
 */
export function chunkDocument(
  content: string,
  chunkSize: number = DEFAULT_CHUNK_SIZE,
  overlap: number = DEFAULT_CHUNK_OVERLAP
): string[] {
  if (content.length <= chunkSize) {
    return [content.trim()];
  }

  const chunks: string[] = [];

  // 段落で分割
  const paragraphs = content.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  let currentChunk = "";

  for (const paragraph of paragraphs) {
    const trimmedPara = paragraph.trim();

    // 段落自体がチャンクサイズを超える場合は分割
    if (trimmedPara.length > chunkSize) {
      // 現在のチャンクを確定
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }

      // 長い段落を文で分割
      const subChunks = splitLongParagraph(trimmedPara, chunkSize, overlap);
      chunks.push(...subChunks);
      continue;
    }

    // 追加すると上限を超える場合
    if (currentChunk.length + trimmedPara.length + 2 > chunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        // オーバーラップを保持
        currentChunk = getOverlapText(currentChunk, overlap);
      }
    }

    // 段落を追加
    if (currentChunk.length > 0) {
      currentChunk += "\n\n";
    }
    currentChunk += trimmedPara;
  }

  // 最後のチャンクを追加
  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * 長い段落を文単位で分割
 */
function splitLongParagraph(
  paragraph: string,
  chunkSize: number,
  overlap: number
): string[] {
  const chunks: string[] = [];

  // 文で分割（日本語の句点と英語のピリオドに対応）
  const sentences = paragraph.split(/(?<=[。．.!?！？])\s*/);

  let currentChunk = "";

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();

    // 文自体がチャンクサイズを超える場合は強制分割
    if (trimmedSentence.length > chunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = "";
      }
      // 文字数で強制分割
      for (let i = 0; i < trimmedSentence.length; i += chunkSize - overlap) {
        chunks.push(trimmedSentence.slice(i, i + chunkSize));
      }
      continue;
    }

    // 追加すると上限を超える場合
    if (currentChunk.length + trimmedSentence.length + 1 > chunkSize) {
      if (currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        currentChunk = getOverlapText(currentChunk, overlap);
      }
    }

    currentChunk += trimmedSentence;
  }

  if (currentChunk.trim().length > 0) {
    chunks.push(currentChunk.trim());
  }

  return chunks;
}

/**
 * チャンクの末尾からオーバーラップ用テキストを取得
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  // 単語境界または文境界で切る
  const start = text.length - overlapSize;
  const overlapText = text.slice(start);

  // 最初の単語境界を探す
  const spaceIndex = overlapText.indexOf(" ");
  const newlineIndex = overlapText.indexOf("\n");

  let boundary = -1;
  if (spaceIndex !== -1 && newlineIndex !== -1) {
    boundary = Math.min(spaceIndex, newlineIndex);
  } else if (spaceIndex !== -1) {
    boundary = spaceIndex;
  } else if (newlineIndex !== -1) {
    boundary = newlineIndex;
  }

  if (boundary !== -1 && boundary < overlapText.length / 2) {
    return overlapText.slice(boundary + 1);
  }

  return overlapText;
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * ドキュメントIDを生成
 */
function generateDocumentId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `doc_${timestamp}_${random}`;
}

/**
 * ファイル名からMIMEタイプを推測
 */
function guessMimeType(fileName: string): string {
  const ext = fileName.toLowerCase().split(".").pop();

  const mimeTypes: Record<string, string> = {
    pdf: "application/pdf",
    txt: "text/plain",
    md: "text/markdown",
    csv: "text/csv",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    json: "application/json",
    html: "text/html",
    htm: "text/html",
  };

  return mimeTypes[ext ?? ""] ?? "application/octet-stream";
}
