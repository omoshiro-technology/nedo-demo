import type { IKnowledgeSearchClient, SearchOptions } from "./IKnowledgeSearchClient";
import type {
  LearnFromPastResult,
  SimilarCase,
  NextAction,
} from "../../domain/types";
import { analyzeSituationContext } from "../../application/learnFromPast/analyzeSituationContext";
import { getApplicableActions } from "../../application/learnFromPast/pmbokActionTemplates";
import { MOCK_DECISIONS, KEYWORD_CATEGORY_MAP } from "./mockSearchData";

export class MockSearchClient implements IKnowledgeSearchClient {
  async searchSimilarCases(
    query: string,
    options?: SearchOptions
  ): Promise<LearnFromPastResult> {
    const limit = options?.limit ?? 5;
    const minSimilarity = options?.minSimilarity ?? 20;

    // キーワードマッチングで類似度を調整
    const keywords = this.extractKeywords(query);
    const matchedCategories = this.getMatchedCategories(keywords);

    const results: SimilarCase[] = MOCK_DECISIONS.map((d) => ({
      id: d.id,
      content: d.content,
      similarity: this.calculateSimilarity(d, keywords, matchedCategories),
      patternType: d.patternType,
      status: d.status,
      sourceFileName: d.sourceFileName,
      decisionDate: d.decisionDate,
      adoptedConclusion: d.adoptedConclusion,
      perspectives: d.perspectives,
    }))
      .filter((d) => d.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    // 次のアクションを生成（PMBOKベースのロジックを使用）
    const nextActions = this.generateNextActions(results, query);

    return {
      userSituation: query,
      similarCases: results,
      nextActions,
      metadata: {
        searchedCount: MOCK_DECISIONS.length,
        timeRange: {
          earliest: "2024-01-01",
          latest: "2024-03-31",
        },
      },
    };
  }

  async getStats(): Promise<{
    totalCount: number;
    timeRange: { earliest: string; latest: string };
  }> {
    return {
      totalCount: MOCK_DECISIONS.length,
      timeRange: {
        earliest: "2024-01-01",
        latest: "2024-03-31",
      },
    };
  }

  private extractKeywords(text: string): string[] {
    const allKeywords = Object.keys(KEYWORD_CATEGORY_MAP);
    return allKeywords.filter((k) => text.includes(k));
  }

  private getMatchedCategories(keywords: string[]): Set<string> {
    const categories = new Set<string>();
    for (const keyword of keywords) {
      const cats = KEYWORD_CATEGORY_MAP[keyword];
      if (cats) {
        cats.forEach((c) => categories.add(c));
      }
    }
    return categories;
  }

  private calculateSimilarity(
    decision: Omit<SimilarCase, "similarity"> & { baseSimilarity: number },
    keywords: string[],
    matchedCategories: Set<string>
  ): number {
    let score = decision.baseSimilarity;
    const content = decision.content + (decision.adoptedConclusion || "");

    // キーワードマッチでボーナス
    for (const keyword of keywords) {
      if (content.includes(keyword)) {
        score += 8;
      }
    }

    // カテゴリマッチでボーナス
    if (decision.perspectives) {
      for (const perspective of decision.perspectives) {
        if (matchedCategories.has(perspective)) {
          score += 5;
        }
      }
    }

    // 確定済みの決定は信頼性が高いのでボーナス
    if (decision.status === "confirmed") {
      score += 3;
    }

    return Math.min(score, 100);
  }

  /**
   * PMBOKベースの次のアクション生成
   *
   * 順序の原則:
   * 1. 根本原因分析（常に最優先）
   * 2. 無コスト緩和策（Fast-tracking等）
   * 3. 利害関係者調整
   * 4. コスト発生緩和策（Crashing等）
   * 5. 代替案検討
   */
  private generateNextActions(
    cases: SimilarCase[],
    userSituation: string
  ): NextAction[] {
    // 状況コンテキストを分析
    const context = analyzeSituationContext(userSituation);

    // 最上位の類似事例情報を取得
    const topCase = cases[0];

    // PMBOKベースのアクションを取得（適用条件とorderPriorityで自動ソート）
    return getApplicableActions(
      context,
      topCase?.content,
      topCase?.id
    );
  }
}
