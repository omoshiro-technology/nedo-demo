/**
 * Knowledge Retriever accessor
 *
 * Presentation層がInfrastructure層のRetrieverに直接依存しないよう、
 * Application層を経由してアクセスするためのモジュール。
 */

export { getInMemoryRetriever } from "../../infrastructure/vectordb/InMemoryRetriever";
export type { DocumentToIndex } from "../../infrastructure/vectordb/KnowledgeRetriever";
