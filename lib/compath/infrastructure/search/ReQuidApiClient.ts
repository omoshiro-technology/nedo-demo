import type { IKnowledgeSearchClient, SearchOptions } from "./IKnowledgeSearchClient";
import type { LearnFromPastResult, SimilarCase, NextAction } from "../../domain/types";

const REQUID_API_BASE = "https://requid-dev.azurewebsites.net";

/**
 * ReQuid外部API接続用クライアント
 *
 * 使用するエンドポイント:
 * - POST /knowledge-layer/search/layered - 三層横断検索
 *
 * 認証:
 * - 現在は認証不要
 * - 将来的にtenant_idが必要になる予定
 */
export class ReQuidApiClient implements IKnowledgeSearchClient {
  constructor(private tenantId?: string) {}

  async searchSimilarCases(
    query: string,
    options?: SearchOptions
  ): Promise<LearnFromPastResult> {
    const tenantId = options?.tenantId || this.tenantId;

    if (!tenantId) {
      throw new Error(
        "ReQuid API接続にはtenant_idが必要です。現在はモックモードを使用してください。"
      );
    }

    try {
      // POST /knowledge-layer/search/layered
      const response = await fetch(
        `${REQUID_API_BASE}/knowledge-layer/search/layered`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            query,
            tenant_id: tenantId,
            weights: {
              common: 0.1, // 法令・規格
              context: 0.3, // 自社規程
              episode: 0.6, // 過去事例を重視
            },
          }),
        }
      );

      if (!response.ok) {
        const errorBody = await response.text().catch(() => "");
        throw new Error(
          `ReQuid API error: ${response.status} ${response.statusText}${errorBody ? ` - ${errorBody}` : ""}`
        );
      }

      const data = await response.json();
      return this.transformResponse(query, data);
    } catch (error) {
      if (error instanceof Error) {
        throw error;
      }
      throw new Error("ReQuid APIへの接続に失敗しました。");
    }
  }

  async getStats(): Promise<{
    totalCount: number;
    timeRange: { earliest: string; latest: string };
  }> {
    // 将来実装: GET /ep/v1/list などでエピソード数を取得
    throw new Error(
      "ReQuid API経由の統計取得は未実装です。"
    );
  }

  /**
   * ReQuid APIレスポンスをLearnFromPastResult形式に変換
   */
  private transformResponse(
    query: string,
    apiResponse: ReQuidLayeredSearchResponse
  ): LearnFromPastResult {
    const similarCases: SimilarCase[] = [];

    // episodeレイヤーの結果を変換
    if (apiResponse.results?.episode) {
      for (const episode of apiResponse.results.episode) {
        similarCases.push({
          id: episode.id || `ep-${similarCases.length}`,
          content: episode.content || episode.text || "",
          similarity: Math.round((episode.score || 0) * 100),
          patternType: "decision", // デフォルト値
          status: "confirmed", // デフォルト値
          sourceFileName: episode.source || "ReQuid",
          decisionDate: episode.date || new Date().toISOString().split("T")[0],
          adoptedConclusion: episode.conclusion,
          perspectives: episode.categories,
        });
      }
    }

    // 次のアクションを生成（将来: APIから取得）
    const nextActions = this.generateNextActionsFromCases(similarCases);

    return {
      userSituation: query,
      similarCases,
      nextActions,
      metadata: {
        searchedCount: apiResponse.metadata?.total_count || similarCases.length,
        timeRange: {
          earliest: apiResponse.metadata?.time_range?.earliest || "",
          latest: apiResponse.metadata?.time_range?.latest || "",
        },
      },
    };
  }

  /**
   * 類似事例から次のアクションを生成
   */
  private generateNextActionsFromCases(cases: SimilarCase[]): NextAction[] {
    const actions: NextAction[] = [];
    const topCase = cases[0];

    if (!topCase) {
      return actions;
    }

    // 観点に基づいてアクションを生成
    const perspectives = new Set(
      cases.flatMap((c) => c.perspectives || [])
    );

    if (perspectives.has("予算") || perspectives.has("budget")) {
      actions.push({
        id: "action-1",
        content: "追加コストの見積もりを作成する",
        basedOnCaseId: topCase.id,
        priority: "high",
      });
    }

    if (perspectives.has("スケジュール") || perspectives.has("schedule")) {
      actions.push({
        id: "action-2",
        content: "関係者への影響範囲を確認する",
        basedOnCaseId: topCase.id,
        priority: "high",
      });
    }

    // 共通アクション
    actions.push({
      id: "action-3",
      content: "代替案の検討を行う",
      basedOnCaseId: topCase.id,
      priority: "medium",
    });

    return actions;
  }
}

// ReQuid APIのレスポンス型（推定）
type ReQuidLayeredSearchResponse = {
  results?: {
    common?: ReQuidSearchResult[];
    context?: ReQuidSearchResult[];
    episode?: ReQuidSearchResult[];
    merged?: ReQuidSearchResult[];
  };
  metadata?: {
    total_count?: number;
    time_range?: {
      earliest?: string;
      latest?: string;
    };
  };
};

type ReQuidSearchResult = {
  id?: string;
  content?: string;
  text?: string;
  score?: number;
  source?: string;
  date?: string;
  conclusion?: string;
  categories?: string[];
};
