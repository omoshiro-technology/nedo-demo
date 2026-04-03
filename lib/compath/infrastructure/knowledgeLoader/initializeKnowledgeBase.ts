/**
 * Knowledge Base初期化
 *
 * サーバー起動時にナレッジファイルをInMemoryRetrieverにロードする
 */

import * as path from "path";
import { getInMemoryRetriever } from "../vectordb/InMemoryRetriever";
import { loadMarkdownDirectory } from "./markdownLoader";
import { env } from "../../config/env";

/**
 * ナレッジベースを初期化
 *
 * KNOWLEDGE_BASE_ENABLED=true の場合のみ実行される
 */
export async function initializeKnowledgeBase(): Promise<void> {
  if (!env.knowledgeBaseEnabled) {
    console.log("[KnowledgeBase] Knowledge base is disabled (KNOWLEDGE_BASE_ENABLED !== true)");
    return;
  }

  console.log("[KnowledgeBase] Initializing knowledge base...");

  const retriever = getInMemoryRetriever();

  // ナレッジディレクトリのパス（プロジェクトルートからの相対パス）
  const knowledgeDir = path.join(__dirname, "../../../../../docs/knowledge");

  try {
    // Markdownファイルをロード
    const documents = await loadMarkdownDirectory(knowledgeDir);

    if (documents.length === 0) {
      console.log("[KnowledgeBase] No knowledge documents found in:", knowledgeDir);
      return;
    }

    // InMemoryRetrieverにインデックス化
    await retriever.index(documents);

    const stats = retriever.getStats();
    console.log("[KnowledgeBase] Initialization complete:");
    console.log(`  - Documents indexed: ${stats.totalDocuments}`);
    console.log(`  - Tokens used: ${stats.totalTokensUsed}`);
    console.log(`  - Last indexed: ${stats.lastIndexedAt}`);

    // インデックス化されたドキュメント一覧を表示
    const docList = retriever.getDocuments();
    console.log("[KnowledgeBase] Indexed documents:");
    for (const doc of docList) {
      console.log(`  - ${doc.title} (${doc.contentLength} chars)`);
    }
  } catch (error) {
    console.error("[KnowledgeBase] Failed to initialize:", error);
    // エラーがあってもサーバー起動は継続（RAGなしで動作）
  }
}
