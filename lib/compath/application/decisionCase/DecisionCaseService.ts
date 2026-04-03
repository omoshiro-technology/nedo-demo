/**
 * 判断事例アプリケーションサービス
 *
 * 技術伝承デモの中核ロジックを提供
 * - 類似事例検索
 * - 確認質問の生成
 * - 判断の記録
 */

import type {
  DecisionCase,
  DecisionCaseQuestion,
  DecisionCaseSearchResult,
  DecisionCaseSearchOptions,
  RecordDecisionInput,
  QuestionAnswer,
  DecisionTrend,
} from "../../domain/decisionCase/types";
import {
  DecisionCaseRepository,
  type IDecisionCaseRepository,
} from "../../infrastructure/repositories/DecisionCaseRepository";

// ============================================================
// サービスインターフェース
// ============================================================

export interface IDecisionCaseService {
  /**
   * 類似事例を検索
   */
  searchSimilarCases(
    query: string,
    options?: DecisionCaseSearchOptions
  ): Promise<DecisionCaseSearchResult[]>;

  /**
   * 事例の詳細を取得
   */
  getCaseById(id: string): Promise<DecisionCase | undefined>;

  /**
   * 確認質問を取得（事例から抽出 + 補完）
   */
  getQuestions(
    caseId: string,
    userContext?: string
  ): Promise<DecisionCaseQuestion[]>;

  /**
   * 過去の判断傾向を取得（「推奨」ではなく「傾向」）
   */
  getDecisionTrend(
    caseId: string,
    answers: QuestionAnswer[]
  ): Promise<DecisionTrend>;

  /**
   * 判断を記録
   */
  recordDecision(input: RecordDecisionInput): Promise<DecisionCase>;

  /**
   * 全事例を取得（管理用）
   */
  getAllCases(): Promise<DecisionCase[]>;
}

// ============================================================
// サービス実装
// ============================================================

export class DecisionCaseService implements IDecisionCaseService {
  constructor(
    private readonly repository: IDecisionCaseRepository = DecisionCaseRepository
  ) {}

  // ============================================================
  // 類似事例検索
  // ============================================================

  async searchSimilarCases(
    query: string,
    options: DecisionCaseSearchOptions = {}
  ): Promise<DecisionCaseSearchResult[]> {
    // MVPではシンプルなテキスト検索
    // 将来: InMemoryRetrieverのベクトル検索と統合
    const results = this.repository.searchByText(query, {
      topK: options.topK ?? 5,
      minSimilarity: options.minSimilarity ?? 0.1,
      domainFilter: options.domainFilter,
    });

    return results;
  }

  // ============================================================
  // 事例詳細取得
  // ============================================================

  async getCaseById(id: string): Promise<DecisionCase | undefined> {
    return this.repository.findById(id);
  }

  // ============================================================
  // 確認質問の取得
  // ============================================================

  async getQuestions(
    caseId: string,
    userContext?: string
  ): Promise<DecisionCaseQuestion[]> {
    const decisionCase = this.repository.findById(caseId);
    if (!decisionCase) {
      return [];
    }

    // 事例に定義された質問を返す
    // 将来: userContextを使ってLLMで追加質問を生成
    const questions = [...decisionCase.questions];

    // ユーザーコンテキストに基づく追加質問（MVPでは簡易実装）
    if (userContext) {
      const additionalQuestions = this.generateContextualQuestions(
        decisionCase,
        userContext
      );
      questions.push(...additionalQuestions);
    }

    return questions;
  }

  /**
   * コンテキストに基づく追加質問を生成（簡易版）
   */
  private generateContextualQuestions(
    decisionCase: DecisionCase,
    userContext: string
  ): DecisionCaseQuestion[] {
    const additional: DecisionCaseQuestion[] = [];
    const contextLower = userContext.toLowerCase();

    // 海水温度に言及がある場合
    if (
      contextLower.includes("海水") ||
      contextLower.includes("温度") ||
      contextLower.includes("沿岸")
    ) {
      const hasSeaWaterQ = decisionCase.questions.some(
        (q) => q.text.includes("海水")
      );
      if (!hasSeaWaterQ) {
        additional.push({
          id: `q-ctx-${Date.now()}-1`,
          text: "海水温度の最高値はどの程度を想定していますか？",
          category: "context",
          options: ["25℃以下", "25-30℃", "30℃超"],
          required: false,
        });
      }
    }

    // スペースに言及がある場合
    if (
      contextLower.includes("スペース") ||
      contextLower.includes("狭い") ||
      contextLower.includes("制約")
    ) {
      const hasSpaceQ = decisionCase.questions.some(
        (q) => q.text.includes("スペース")
      );
      if (!hasSpaceQ) {
        additional.push({
          id: `q-ctx-${Date.now()}-2`,
          text: "設置スペースに特別な制約はありますか？",
          category: "boundary",
          options: ["厳しい制約あり", "若干の制約あり", "制約なし"],
          required: false,
        });
      }
    }

    return additional;
  }

  // ============================================================
  // 過去の判断傾向
  // ============================================================

  async getDecisionTrend(
    caseId: string,
    answers: QuestionAnswer[]
  ): Promise<DecisionTrend> {
    const decisionCase = this.repository.findById(caseId);
    if (!decisionCase) {
      return {
        mostChosen: "データなし",
        count: 0,
        note: "参照事例が見つかりませんでした",
      };
    }

    // MVPでは参照事例の判断をそのまま返す
    // 将来: 類似条件の複数事例を集計して傾向を算出
    const allCases = this.repository.findAll();
    const similarCases = allCases.filter((c) =>
      this.hasOverlappingDomain(c, decisionCase)
    );

    // 判断内容をカウント
    const decisionCounts = new Map<string, number>();
    for (const c of similarCases) {
      const summary = c.decision.summary;
      decisionCounts.set(summary, (decisionCounts.get(summary) || 0) + 1);
    }

    // 最も多い判断を特定
    let mostChosen = decisionCase.decision.summary;
    let maxCount = 1;
    for (const [decision, count] of decisionCounts) {
      if (count > maxCount) {
        mostChosen = decision;
        maxCount = count;
      }
    }

    return {
      mostChosen,
      count: maxCount,
      note: `過去${similarCases.length}件の類似事例に基づく傾向です`,
    };
  }

  private hasOverlappingDomain(a: DecisionCase, b: DecisionCase): boolean {
    const aDomains = new Set(a.metadata.domain.map((d) => d.toLowerCase()));
    return b.metadata.domain.some((d) => aDomains.has(d.toLowerCase()));
  }

  // ============================================================
  // 判断の記録
  // ============================================================

  async recordDecision(input: RecordDecisionInput): Promise<DecisionCase> {
    // リポジトリのヘルパーを使用してDecisionCaseを作成
    const newCase: DecisionCase = this.repository.createFromInput(input);

    // 保存
    return this.repository.save(newCase);
  }

  private createDecisionCase(input: RecordDecisionInput): DecisionCase {
    const now = new Date().toISOString();
    const id = `case-${Date.now()}`;

    return {
      id,
      title: input.title,
      decision: input.decision,
      conditions: input.conditions,
      rationale: input.rationale,
      relatedKnowledge: input.relatedKnowledge || [],
      questions: [],
      metadata: {
        domain: input.metadata?.domain || [],
        plantName: input.metadata?.plantName,
        year: input.metadata?.year || new Date().getFullYear(),
        source: input.metadata?.source || "user_input",
        createdAt: now,
        updatedAt: now,
      },
    };
  }

  // ============================================================
  // 全事例取得（管理用）
  // ============================================================

  async getAllCases(): Promise<DecisionCase[]> {
    return this.repository.findAll();
  }
}

// ============================================================
// シングルトンインスタンス
// ============================================================

export const decisionCaseService: IDecisionCaseService = new DecisionCaseService();
