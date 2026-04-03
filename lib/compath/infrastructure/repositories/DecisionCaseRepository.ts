/**
 * 判断事例リポジトリ
 *
 * DecisionCaseの永続化と検索を担当
 * CQRS: Query（検索）とCommand（保存・更新）を分離
 *
 * 現在の実装: インメモリ + サンプルデータ
 * 将来: PostgreSQL/MongoDBに置換可能
 */

import type {
  DecisionCase,
  DecisionCaseSearchResult,
  DecisionCaseSearchOptions,
  RecordDecisionInput,
} from "../../domain/decisionCase/types";
import { sampleDecisionCases } from "../seed/sampleDecisionCases";

// ============================================================
// インターフェース定義（依存性逆転の原則）
// ============================================================

export interface IDecisionCaseRepository {
  // ============================================================
  // Query Operations (CQRS - Read)
  // ============================================================

  /**
   * IDで事例を取得
   */
  findById(id: string): DecisionCase | undefined;

  /**
   * 全事例を取得
   */
  findAll(): DecisionCase[];

  /**
   * ドメインタグで事例を検索
   */
  findByDomain(domains: string[]): DecisionCase[];

  /**
   * テキストで類似検索（シンプルなキーワードマッチ）
   */
  searchByText(query: string, options?: DecisionCaseSearchOptions): DecisionCaseSearchResult[];

  // ============================================================
  // Command Operations (CQRS - Write)
  // ============================================================

  /**
   * 新しい判断を記録
   */
  save(decisionCase: DecisionCase): DecisionCase;

  /**
   * 事例を更新
   */
  update(id: string, updates: Partial<DecisionCase>): DecisionCase | undefined;

  /**
   * 事例を削除
   */
  delete(id: string): boolean;

  /**
   * RecordDecisionInputからDecisionCaseを作成
   */
  createFromInput(input: RecordDecisionInput): DecisionCase;

  /**
   * 全データをクリア（テスト用）
   */
  clear(): void;

  /**
   * サンプルデータをリロード
   */
  reloadSampleData(): void;
}

// ============================================================
// インメモリ実装
// ============================================================

export class InMemoryDecisionCaseRepository implements IDecisionCaseRepository {
  private cases: Map<string, DecisionCase> = new Map();
  private idCounter = 100; // サンプルデータと被らないように

  constructor() {
    this.reloadSampleData();
  }

  // ============================================================
  // Query Operations
  // ============================================================

  findById(id: string): DecisionCase | undefined {
    return this.cases.get(id);
  }

  findAll(): DecisionCase[] {
    return Array.from(this.cases.values());
  }

  findByDomain(domains: string[]): DecisionCase[] {
    if (domains.length === 0) return this.findAll();

    const domainSet = new Set(domains.map((d) => d.toLowerCase()));
    return Array.from(this.cases.values()).filter((c) =>
      c.metadata.domain.some((d) => domainSet.has(d.toLowerCase()))
    );
  }

  searchByText(
    query: string,
    options: DecisionCaseSearchOptions = {}
  ): DecisionCaseSearchResult[] {
    const { topK = 5, minSimilarity = 0.1, domainFilter } = options;

    // ドメインフィルタを適用
    let candidates = domainFilter
      ? this.findByDomain(domainFilter)
      : this.findAll();

    // クエリを正規化
    const normalizedQuery = this.normalizeText(query);
    const queryTokens = this.tokenize(normalizedQuery);

    // 各事例のスコアを計算
    const results: DecisionCaseSearchResult[] = candidates
      .map((c) => {
        const similarity = this.calculateSimilarity(c, queryTokens, normalizedQuery);
        return {
          case: c,
          similarity,
          matchReason: this.generateMatchReason(c, queryTokens),
        };
      })
      .filter((r) => r.similarity >= minSimilarity)
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);

    return results;
  }

  // ============================================================
  // Command Operations
  // ============================================================

  save(decisionCase: DecisionCase): DecisionCase {
    this.cases.set(decisionCase.id, decisionCase);
    return decisionCase;
  }

  update(id: string, updates: Partial<DecisionCase>): DecisionCase | undefined {
    const existing = this.cases.get(id);
    if (!existing) return undefined;

    const updated: DecisionCase = {
      ...existing,
      ...updates,
      id: existing.id, // IDは変更不可
      metadata: {
        ...existing.metadata,
        ...updates.metadata,
        updatedAt: new Date().toISOString(),
      },
    };

    this.cases.set(id, updated);
    return updated;
  }

  delete(id: string): boolean {
    return this.cases.delete(id);
  }

  clear(): void {
    this.cases.clear();
  }

  reloadSampleData(): void {
    this.cases.clear();
    for (const sample of sampleDecisionCases) {
      this.cases.set(sample.id, sample);
    }
  }

  // ============================================================
  // ヘルパーメソッド：判断記録の作成
  // ============================================================

  /**
   * RecordDecisionInputからDecisionCaseを作成
   */
  createFromInput(input: RecordDecisionInput): DecisionCase {
    const now = new Date().toISOString();
    const id = `case-${++this.idCounter}`;

    return {
      id,
      title: input.title,
      decision: input.decision,
      conditions: input.conditions,
      rationale: input.rationale,
      relatedKnowledge: input.relatedKnowledge || [],
      questions: [], // 新規記録時は空（将来的には回答から生成）
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
  // Private: テキスト処理・類似度計算
  // ============================================================

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .replace(/[、。！？「」『』（）\[\]【】]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }

  private tokenize(text: string): string[] {
    // 簡易的なトークナイズ（将来的にはMeCab等を使用）
    return text.split(/\s+/).filter((t) => t.length > 0);
  }

  private calculateSimilarity(
    decisionCase: DecisionCase,
    queryTokens: string[],
    normalizedQuery: string
  ): number {
    // 検索対象テキストを構築
    const targetText = this.normalizeText(
      [
        decisionCase.title,
        decisionCase.decision.summary,
        decisionCase.conditions.context,
        decisionCase.rationale.primary,
        ...(decisionCase.metadata.domain || []),
      ].join(" ")
    );

    // Jaccard類似度（トークンベース）
    const targetTokens = new Set(this.tokenize(targetText));
    const queryTokenSet = new Set(queryTokens);

    const intersection = queryTokens.filter((t) => targetTokens.has(t)).length;
    const union = new Set([...targetTokens, ...queryTokenSet]).size;

    const jaccardSim = union > 0 ? intersection / union : 0;

    // 部分文字列マッチのボーナス
    let substringBonus = 0;
    for (const token of queryTokens) {
      if (targetText.includes(token)) {
        substringBonus += 0.1;
      }
    }

    // 重要キーワードのボーナス（コンデミ、樹脂量、PWRなど）
    const importantKeywords = ["コンデミ", "樹脂", "pwr", "起動", "判断"];
    let keywordBonus = 0;
    for (const kw of importantKeywords) {
      if (normalizedQuery.includes(kw) && targetText.includes(kw)) {
        keywordBonus += 0.15;
      }
    }

    return Math.min(1, jaccardSim + substringBonus + keywordBonus);
  }

  private generateMatchReason(
    decisionCase: DecisionCase,
    queryTokens: string[]
  ): string {
    const matchedDomains = decisionCase.metadata.domain.filter((d) =>
      queryTokens.some((t) => d.toLowerCase().includes(t))
    );

    if (matchedDomains.length > 0) {
      return `ドメイン「${matchedDomains.join("、")}」が一致`;
    }

    const conditionMatch = queryTokens.some((t) =>
      decisionCase.conditions.context.toLowerCase().includes(t)
    );
    if (conditionMatch) {
      return "条件が類似";
    }

    return "関連する判断事例";
  }
}

// ============================================================
// シングルトンインスタンス（DI導入前の暫定措置）
// ============================================================

export const DecisionCaseRepository: IDecisionCaseRepository =
  new InMemoryDecisionCaseRepository();
