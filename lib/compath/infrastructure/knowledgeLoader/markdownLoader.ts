/**
 * Markdown Knowledge Loader
 *
 * Markdownファイルからナレッジを読み込み、InMemoryRetrieverにインデックス化する
 */

import * as fs from "fs/promises";
import * as path from "path";
import type { DocumentToIndex } from "../vectordb/KnowledgeRetriever";

export type MarkdownDocument = {
  filePath: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

/**
 * Markdownファイルを読み込み、DocumentToIndex形式に変換
 */
export async function loadMarkdownFile(filePath: string): Promise<DocumentToIndex> {
  const content = await fs.readFile(filePath, "utf-8");

  // ファイル名からタイトルを抽出（拡張子を除く）
  const fileName = path.basename(filePath, ".md");

  // Markdownの最初の# タイトルを抽出（あれば）
  const titleMatch = content.match(/^#\s+(.+)$/m);
  const title = titleMatch ? titleMatch[1] : fileName;

  // メタデータ
  const metadata = {
    sourceFileName: path.basename(filePath),
    filePath,
    fileType: "markdown",
    category: extractCategory(content),
    indexedAt: new Date().toISOString(),
  };

  return {
    id: `md_${fileName}_${Date.now()}`,
    title,
    content: cleanMarkdownContent(content),
    metadata,
  };
}

/**
 * ディレクトリ内のすべてのMarkdownファイルを読み込む
 */
export async function loadMarkdownDirectory(dirPath: string): Promise<DocumentToIndex[]> {
  try {
    const files = await fs.readdir(dirPath);
    const markdownFiles = files.filter((f) => f.endsWith(".md"));

    const documents: DocumentToIndex[] = [];
    for (const file of markdownFiles) {
      const filePath = path.join(dirPath, file);
      try {
        const doc = await loadMarkdownFile(filePath);
        documents.push(doc);
        console.log(`[MarkdownLoader] Loaded: ${file}`);
      } catch (error) {
        console.warn(`[MarkdownLoader] Failed to load ${file}:`, error);
      }
    }

    return documents;
  } catch (error) {
    console.warn(`[MarkdownLoader] Failed to read directory ${dirPath}:`, error);
    return [];
  }
}

/**
 * Markdownコンテンツをクリーニング（検索に適した形式に）
 */
function cleanMarkdownContent(content: string): string {
  // コードブロックを削除（検索ノイズになりやすい）
  let cleaned = content.replace(/```[\s\S]*?```/g, "");

  // マークダウン記法を削除
  cleaned = cleaned.replace(/^#+\s+/gm, ""); // 見出し記号
  cleaned = cleaned.replace(/\*\*(.+?)\*\*/g, "$1"); // 太字
  cleaned = cleaned.replace(/\*(.+?)\*/g, "$1"); // 斜体
  cleaned = cleaned.replace(/`(.+?)`/g, "$1"); // インラインコード
  cleaned = cleaned.replace(/\[(.+?)\]\(.+?\)/g, "$1"); // リンク

  // 連続する空白・改行を整理
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");
  cleaned = cleaned.replace(/\s{2,}/g, " ");

  return cleaned.trim();
}

/**
 * コンテンツからカテゴリを推測
 */
function extractCategory(content: string): string {
  const lowerContent = content.toLowerCase();

  if (lowerContent.includes("判断事例") || lowerContent.includes("過去事例")) {
    return "decision_case";
  }
  if (lowerContent.includes("手順書") || lowerContent.includes("ガイド")) {
    return "procedure";
  }
  if (lowerContent.includes("解説") || lowerContent.includes("説明")) {
    return "explanation";
  }
  if (lowerContent.includes("選定") || lowerContent.includes("選択")) {
    return "selection_guide";
  }

  return "general";
}
