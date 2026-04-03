/**
 * ナレッジベースモジュール
 *
 * 「使えば使うほど賢くなる」仕組みの型定義
 */

export type {
  // ヒューリスティクス
  HeuristicReliability,
  HeuristicUsageStats,
  HeuristicException,
  Heuristic,
  // 判断パターン
  PatternCondition,
  PatternStep,
  DecisionPattern,
  // セッション内ナレッジ
  LearnedInSession,
  AppliedKnowledge,
  ExportableSummary,
  SessionKnowledge,
  // ナレッジベース
  KnowledgeBaseStats,
  KnowledgeBase,
  // エクスポート/インポート
  ExportSourceInfo,
  KnowledgeExport,
  KnowledgeImportResult,
  // API型
  GetSessionKnowledgeRequest,
  ExportKnowledgeRequest,
  ImportKnowledgeRequest,
  RecordHeuristicApplicationRequest,
  FindMatchingPatternsRequest,
  FindMatchingPatternsResponse,
} from "./types";
