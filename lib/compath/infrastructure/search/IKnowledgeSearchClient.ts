import type { LearnFromPastResult } from "../../domain/types";

export type SearchOptions = {
  limit?: number;
  minSimilarity?: number;
  tenantId?: string; // 将来: 認証から取得
};

export interface IKnowledgeSearchClient {
  /**
   * 類似事例を検索
   */
  searchSimilarCases(
    query: string,
    options?: SearchOptions
  ): Promise<LearnFromPastResult>;

  /**
   * 統計情報を取得
   */
  getStats(): Promise<{
    totalCount: number;
    timeRange: { earliest: string; latest: string };
  }>;
}
