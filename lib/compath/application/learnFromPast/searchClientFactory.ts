/**
 * 検索クライアントファクトリ
 *
 * Presentation層がInfrastructure層の検索クライアントに直接依存しないよう、
 * Application層を経由してアクセスするためのモジュール。
 */

export type {
  IKnowledgeSearchClient,
  SearchOptions,
} from "../../infrastructure/search/IKnowledgeSearchClient";
export { MockSearchClient } from "../../infrastructure/search/MockSearchClient";
