/**
 * Chat Service Factory
 * 環境変数に基づいてLLMモードまたはRAGモードのChatStrategyを生成
 */
import { env } from "../../config/env";
import type { ChatStrategy } from "../../domain/chat/ChatStrategy";
import { LLMChatStrategy } from "./LLMChatStrategy";
import { RAGChatStrategy } from "./RAGChatStrategy";
import { PineconeRetriever } from "../../infrastructure/vectordb/PineconeRetriever";
import { getInMemoryRetriever } from "../../infrastructure/vectordb/InMemoryRetriever";
import type { KnowledgeRetriever } from "../../infrastructure/vectordb/KnowledgeRetriever";

/**
 * ChatStrategyを生成
 * 環境変数CHAT_MODEに基づいてLLMモードまたはRAGモードを選択
 *
 * 優先順位:
 * 1. CHAT_MODE=rag: 外部ベクトルDB（Pinecone等）を使用
 * 2. KNOWLEDGE_BASE_ENABLED=true: インメモリKnowledge Baseを使用
 * 3. それ以外: 通常のLLMモード
 */
export function createChatStrategy(): ChatStrategy {
  // 1. 外部ベクトルDB RAGモード
  if (env.chatMode === "rag") {
    console.log("[ChatServiceFactory] Creating RAG strategy (external vector DB)");
    const retriever = createRetriever();
    return new RAGChatStrategy(retriever);
  }

  // 2. インメモリKnowledge Baseモード
  if (env.knowledgeBaseEnabled) {
    console.log("[ChatServiceFactory] Creating RAG strategy (in-memory knowledge base)");
    const retriever = getInMemoryRetriever();
    return new RAGChatStrategy(retriever);
  }

  // 3. 通常のLLMモード
  console.log("[ChatServiceFactory] Creating LLM strategy");
  return new LLMChatStrategy();
}

/**
 * ベクトルDB種別に応じたKnowledgeRetrieverを生成
 */
function createRetriever(): KnowledgeRetriever {
  const dbType = env.vectorDbType;

  switch (dbType) {
    case "pinecone":
      if (!env.vectorDbApiKey || !env.vectorDbNamespace) {
        throw new Error(
          "Pinecone requires VECTOR_DB_API_KEY and VECTOR_DB_NAMESPACE environment variables"
        );
      }
      return new PineconeRetriever({
        apiKey: env.vectorDbApiKey,
        namespace: env.vectorDbNamespace
      });

    case "weaviate":
      // TODO: WeaviateRetrieverの実装
      throw new Error("Weaviate retriever is not implemented yet");

    case "pgvector":
      // TODO: PgVectorRetrieverの実装
      throw new Error("pgvector retriever is not implemented yet");

    default:
      throw new Error(
        `Unknown vector DB type: ${dbType}. ` +
        `Set VECTOR_DB_TYPE to one of: pinecone, weaviate, pgvector`
      );
  }
}
