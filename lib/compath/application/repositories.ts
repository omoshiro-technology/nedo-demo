/**
 * Application-layer repository accessors
 *
 * Presentation層がInfrastructure層のリポジトリに直接依存しないよう、
 * Application層を経由してアクセスするためのモジュール。
 */

export { AnalysisHistoryRepository } from "../infrastructure/repositories/AnalysisHistoryRepository";
export { KnowledgeRepository } from "../infrastructure/repositories/KnowledgeRepository";
export { ExecutionResultRepository } from "../infrastructure/repositories/ExecutionResultRepository";
export { SessionKnowledgeRepository } from "../infrastructure/repositories/SessionKnowledgeRepository";
