/**
 * インメモリ Knowledge Retriever
 *
 * ハイブリッド検索を実装:
 * - キーワード検索（Jaccard類似度）: 30%
 * - エンベディング検索（コサイン類似度）: 70%
 *
 * 永続化なし（サーバー再起動でデータ消失）
 */

import type {
  KnowledgeRetriever,
  ReasonCentricRetriever,
  DocumentToIndex,
  DecisionCaseToIndex,
  RetrievedKnowledge,
  ReasonCentricResult,
  SearchOptions,
  ReasonCentricSearchOptions,
} from "./KnowledgeRetriever";
import {
  generateEmbedding,
  generateEmbeddingsBatch,
  cosineSimilarity,
} from "../llm/embeddingClient";
import { env } from "../../config/env";

// ============================================================
// 型定義
// ============================================================

type IndexedDocument = DocumentToIndex & {
  /** OpenAI Embedding APIで生成されたベクトル */
  embedding: number[];
  /** キーワード検索用のトークン（正規化済み） */
  keywords: Set<string>;
  /** インデックス登録日時 */
  indexedAt: string;
};

/**
 * 判断事例としてインデックスされたドキュメント
 */
type IndexedDecisionCase = IndexedDocument & {
  /** 判断理由（WHY） */
  rationale?: string;
  /** 判断理由のエンベディング */
  rationaleEmbedding?: number[];
  /** 判断条件（IF/THEN） */
  rule?: string;
  /** 結果（短期/長期） */
  outcome?: {
    shortTerm?: string;
    longTerm?: string;
  };
  /** 学び・教訓 */
  learnings?: string[];
};

type InMemoryRetrieverStats = {
  totalDocuments: number;
  lastIndexedAt?: string;
  totalTokensUsed: number;
};

// ============================================================
// ハイブリッド検索の重み
// ============================================================

/** キーワード検索の重み（0〜1） */
const KEYWORD_WEIGHT = 0.3;

/** エンベディング検索の重み（0〜1） */
const EMBEDDING_WEIGHT = 0.7;

// ============================================================
// InMemoryRetriever クラス
// ============================================================

export class InMemoryRetriever implements KnowledgeRetriever, ReasonCentricRetriever {
  private documents: Map<string, IndexedDocument> = new Map();
  private decisionCases: Map<string, IndexedDecisionCase> = new Map();
  private totalTokensUsed = 0;
  private lastIndexedAt?: string;

  /**
   * クエリに関連するドキュメントをハイブリッド検索
   */
  async search(
    query: string,
    options: SearchOptions = {}
  ): Promise<RetrievedKnowledge[]> {
    const { topK = 5, minSimilarity = 0.5, filter } = options;

    if (this.documents.size === 0) {
      return [];
    }

    // クエリのキーワードを抽出
    const queryKeywords = tokenize(query);

    // クエリのエンベディングを生成
    let queryEmbedding: number[] | null = null;
    if (env.openaiApiKey) {
      try {
        const result = await generateEmbedding(query);
        queryEmbedding = result.embedding;
        this.totalTokensUsed += result.totalTokens;
      } catch (error) {
        console.warn("[InMemoryRetriever] Failed to generate query embedding:", error);
      }
    }

    // 各ドキュメントをスコアリング
    const scoredDocs: Array<{
      doc: IndexedDocument;
      score: number;
      keywordScore: number;
      embeddingScore: number;
    }> = [];

    for (const doc of this.documents.values()) {
      // フィルタリング
      if (filter && !matchesFilter(doc, filter)) {
        continue;
      }

      // キーワードスコア（Jaccard類似度）
      const keywordScore = jaccardSimilarity(queryKeywords, doc.keywords);

      // エンベディングスコア（コサイン類似度）
      let embeddingScore = 0;
      if (queryEmbedding && doc.embedding.length > 0) {
        embeddingScore = cosineSimilarity(queryEmbedding, doc.embedding);
        // コサイン類似度を0〜1に正規化（負の値を0に）
        embeddingScore = Math.max(0, embeddingScore);
      }

      // ハイブリッドスコア
      let finalScore: number;
      if (queryEmbedding) {
        finalScore = KEYWORD_WEIGHT * keywordScore + EMBEDDING_WEIGHT * embeddingScore;
      } else {
        // エンベディングがない場合はキーワードのみ
        finalScore = keywordScore;
      }

      scoredDocs.push({
        doc,
        score: finalScore,
        keywordScore,
        embeddingScore,
      });
    }

    // スコアでソートして上位を取得
    scoredDocs.sort((a, b) => b.score - a.score);

    // デバッグ: 全ドキュメントのスコアを出力
    if (scoredDocs.length > 0) {
      console.log(`[InMemoryRetriever] Search scores (minSimilarity: ${minSimilarity}):`);
      scoredDocs.forEach((d) => {
        console.log(`  - "${d.doc.title}": total=${d.score.toFixed(3)}, keyword=${d.keywordScore.toFixed(3)}, embedding=${d.embeddingScore.toFixed(3)}`);
      });
    }

    // 最低類似度でフィルタ
    const filteredDocs = scoredDocs.filter((d) => d.score >= minSimilarity);

    // 上位K件を返却
    const topDocs = filteredDocs.slice(0, topK);

    return topDocs.map(({ doc, score }) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      excerpt: createExcerpt(doc.content, query),
      similarity: score,
      metadata: doc.metadata,
    }));
  }

  /**
   * ドキュメントをインデックスに登録
   */
  async index(documents: DocumentToIndex[]): Promise<void> {
    if (documents.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    // エンベディングを一括生成
    let embeddings: number[][] = [];
    if (env.openaiApiKey) {
      try {
        const texts = documents.map((d) => `${d.title}\n\n${d.content}`);
        const result = await generateEmbeddingsBatch(texts);
        embeddings = result.embeddings;
        this.totalTokensUsed += result.totalTokens;
      } catch (error) {
        console.warn("[InMemoryRetriever] Failed to generate embeddings:", error);
        // エンベディング生成に失敗した場合は空配列で続行
        embeddings = documents.map(() => []);
      }
    } else {
      // APIキーがない場合は空配列
      embeddings = documents.map(() => []);
    }

    // ドキュメントを登録
    for (let i = 0; i < documents.length; i++) {
      const doc = documents[i];
      const indexedDoc: IndexedDocument = {
        ...doc,
        embedding: embeddings[i] ?? [],
        keywords: tokenize(`${doc.title} ${doc.content}`),
        indexedAt: now,
      };
      this.documents.set(doc.id, indexedDoc);
    }

    this.lastIndexedAt = now;

    console.log(
      `[InMemoryRetriever] Indexed ${documents.length} documents. Total: ${this.documents.size}`
    );
  }

  /**
   * ドキュメントを削除
   */
  async delete(id: string): Promise<boolean> {
    return this.documents.delete(id);
  }

  /**
   * 全ドキュメントを削除
   */
  async clear(): Promise<void> {
    this.documents.clear();
    this.lastIndexedAt = undefined;
  }

  /**
   * 統計情報を取得
   */
  getStats(): InMemoryRetrieverStats {
    return {
      totalDocuments: this.documents.size,
      lastIndexedAt: this.lastIndexedAt,
      totalTokensUsed: this.totalTokensUsed,
    };
  }

  /**
   * 登録済みドキュメント一覧を取得
   */
  getDocuments(): Array<{
    id: string;
    title: string;
    contentLength: number;
    metadata?: Record<string, unknown>;
    indexedAt: string;
  }> {
    return Array.from(this.documents.values()).map((doc) => ({
      id: doc.id,
      title: doc.title,
      contentLength: doc.content.length,
      metadata: doc.metadata,
      indexedAt: doc.indexedAt,
    }));
  }

  // ============================================================
  // Reason-Centric Search 実装
  // ============================================================

  /**
   * 判断理由ベースで類似事例を検索
   *
   * キーワードマッチではなく、判断の意図・理由の類似性で検索
   */
  async searchByRationale(
    query: string,
    options: ReasonCentricSearchOptions = {}
  ): Promise<ReasonCentricResult[]> {
    const { topK = 5, minSimilarity = 0.3, filter, context, extractRationale = true } = options;

    // 通常のドキュメントと判断事例の両方を検索対象に
    const allCases = [
      ...Array.from(this.decisionCases.values()),
      ...Array.from(this.documents.values()).map(doc => ({
        ...doc,
        rationale: undefined,
        rationaleEmbedding: undefined,
        rule: undefined,
        outcome: undefined,
        learnings: undefined,
      } as IndexedDecisionCase)),
    ];

    if (allCases.length === 0) {
      return [];
    }

    // クエリのエンベディングを生成
    let queryEmbedding: number[] | null = null;
    if (env.openaiApiKey) {
      try {
        // 文脈を含めたクエリを生成
        const enrichedQuery = context
          ? `${query}\n\n文脈: ${context}`
          : query;
        const result = await generateEmbedding(enrichedQuery);
        queryEmbedding = result.embedding;
        this.totalTokensUsed += result.totalTokens;
      } catch (error) {
        console.warn("[InMemoryRetriever] Failed to generate query embedding:", error);
      }
    }

    const queryKeywords = tokenize(query);

    // 各事例をスコアリング
    const scoredCases: Array<{
      case_: IndexedDecisionCase;
      score: number;
      contentScore: number;
      rationaleScore: number;
    }> = [];

    for (const case_ of allCases) {
      // フィルタリング
      if (filter && !matchesFilter(case_ as IndexedDocument, filter)) {
        continue;
      }

      // コンテンツの類似度
      let contentScore = 0;
      if (queryEmbedding && case_.embedding.length > 0) {
        contentScore = Math.max(0, cosineSimilarity(queryEmbedding, case_.embedding));
      } else {
        contentScore = jaccardSimilarity(queryKeywords, case_.keywords);
      }

      // 判断理由の類似度（より重視）
      let rationaleScore = 0;
      if (queryEmbedding && case_.rationaleEmbedding && case_.rationaleEmbedding.length > 0) {
        rationaleScore = Math.max(0, cosineSimilarity(queryEmbedding, case_.rationaleEmbedding));
      } else if (case_.rationale) {
        // キーワードベースでフォールバック
        const rationaleKeywords = tokenize(case_.rationale);
        rationaleScore = jaccardSimilarity(queryKeywords, rationaleKeywords);
      }

      // 判断理由を重視したスコア計算
      // 理由があれば理由を70%、コンテンツを30%で重み付け
      // 理由がなければコンテンツ100%
      const hasRationale = case_.rationale || case_.rationaleEmbedding;
      const finalScore = hasRationale
        ? contentScore * 0.3 + rationaleScore * 0.7
        : contentScore;

      scoredCases.push({
        case_,
        score: finalScore,
        contentScore,
        rationaleScore,
      });
    }

    // スコアでソート
    scoredCases.sort((a, b) => b.score - a.score);

    // 最低類似度でフィルタ
    const filteredCases = scoredCases.filter((c) => c.score >= minSimilarity);

    // 上位K件を返却
    const topCases = filteredCases.slice(0, topK);

    return topCases.map(({ case_, score, contentScore, rationaleScore }) => {
      const result: ReasonCentricResult = {
        id: case_.id,
        title: case_.title,
        content: case_.content,
        excerpt: createExcerpt(case_.content, query),
        similarity: score,
        metadata: case_.metadata,
      };

      // 判断理由のマッチング情報を追加
      if (extractRationale && case_.rationale) {
        result.matchedRationale = {
          original: case_.rationale,
          similarity: rationaleScore > 0.7
            ? "判断の意図が非常に類似しています"
            : rationaleScore > 0.5
            ? "判断の意図に類似点があります"
            : "一部の観点で関連があります",
        };
      }

      // 結果情報を追加
      if (case_.outcome) {
        result.outcome = case_.outcome;
      }

      // 学びを追加
      if (case_.learnings && case_.learnings.length > 0) {
        result.learnings = case_.learnings;
      }

      // 判断プロパティを追加
      if (case_.rule || case_.rationale) {
        result.decisionProperty = {};
        if (case_.rule) {
          result.decisionProperty.rule = {
            type: "if_then",
            condition: case_.rule,
            thenAction: "選択を実行",
          };
        }
        if (case_.rationale) {
          result.decisionProperty.rationale = {
            primaryReason: case_.rationale,
          };
        }
      }

      return result;
    });
  }

  /**
   * 判断事例をインデックス登録
   */
  async indexDecisionCase(cases: DecisionCaseToIndex[]): Promise<void> {
    if (cases.length === 0) {
      return;
    }

    const now = new Date().toISOString();

    // コンテンツのエンベディングを一括生成
    let contentEmbeddings: number[][] = [];
    let rationaleEmbeddings: number[][] = [];

    if (env.openaiApiKey) {
      try {
        // コンテンツのエンベディング
        const contentTexts = cases.map((c) => `${c.title}\n\n${c.content}`);
        const contentResult = await generateEmbeddingsBatch(contentTexts);
        contentEmbeddings = contentResult.embeddings;
        this.totalTokensUsed += contentResult.totalTokens;

        // 判断理由のエンベディング（存在する場合のみ）
        const rationaleTexts = cases.map((c) =>
          c.rationale
            ? `判断理由: ${c.rationale}${c.rule ? `\n条件: ${c.rule}` : ""}`
            : ""
        );
        const hasRationale = rationaleTexts.some((t) => t.length > 0);
        if (hasRationale) {
          const rationaleResult = await generateEmbeddingsBatch(
            rationaleTexts.map((t) => t || "（理由なし）")
          );
          rationaleEmbeddings = rationaleResult.embeddings;
          this.totalTokensUsed += rationaleResult.totalTokens;
        } else {
          rationaleEmbeddings = cases.map(() => []);
        }
      } catch (error) {
        console.warn("[InMemoryRetriever] Failed to generate embeddings:", error);
        contentEmbeddings = cases.map(() => []);
        rationaleEmbeddings = cases.map(() => []);
      }
    } else {
      contentEmbeddings = cases.map(() => []);
      rationaleEmbeddings = cases.map(() => []);
    }

    // 事例を登録
    for (let i = 0; i < cases.length; i++) {
      const case_ = cases[i];
      const indexedCase: IndexedDecisionCase = {
        ...case_,
        embedding: contentEmbeddings[i] ?? [],
        rationaleEmbedding: rationaleEmbeddings[i] ?? [],
        keywords: tokenize(`${case_.title} ${case_.content} ${case_.rationale || ""}`),
        indexedAt: now,
      };
      this.decisionCases.set(case_.id, indexedCase);
    }

    this.lastIndexedAt = now;

    console.log(
      `[InMemoryRetriever] Indexed ${cases.length} decision cases. Total: ${this.decisionCases.size}`
    );
  }

  /**
   * 登録済み判断事例の一覧を取得
   */
  getDecisionCases(): Array<{
    id: string;
    title: string;
    hasRationale: boolean;
    hasOutcome: boolean;
    learningsCount: number;
    indexedAt: string;
  }> {
    return Array.from(this.decisionCases.values()).map((case_) => ({
      id: case_.id,
      title: case_.title,
      hasRationale: !!case_.rationale,
      hasOutcome: !!case_.outcome,
      learningsCount: case_.learnings?.length ?? 0,
      indexedAt: case_.indexedAt,
    }));
  }
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * テキストをトークン（キーワード）に分割
 *
 * 日本語: 形態素解析は省略し、文字単位でn-gram風に分割
 * 英語: スペース区切りで単語分割
 */
function tokenize(text: string): Set<string> {
  const tokens = new Set<string>();

  // 正規化（小文字化、記号除去）
  const normalized = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();

  // スペース区切りで単語分割
  const words = normalized.split(" ").filter((w) => w.length >= 2);
  for (const word of words) {
    tokens.add(word);
  }

  // 日本語対応: 2-gram, 3-gram
  const noSpaces = normalized.replace(/\s/g, "");
  for (let i = 0; i < noSpaces.length - 1; i++) {
    // 2-gram
    tokens.add(noSpaces.slice(i, i + 2));
    // 3-gram
    if (i < noSpaces.length - 2) {
      tokens.add(noSpaces.slice(i, i + 3));
    }
  }

  return tokens;
}

/**
 * Jaccard類似度を計算
 *
 * Jaccard係数 = |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) {
    return 0;
  }

  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) {
      intersection++;
    }
  }

  const union = a.size + b.size - intersection;
  return intersection / union;
}

/**
 * メタデータフィルタのマッチング
 */
function matchesFilter(
  doc: IndexedDocument,
  filter: Record<string, unknown>
): boolean {
  if (!doc.metadata) {
    return Object.keys(filter).length === 0;
  }

  for (const [key, value] of Object.entries(filter)) {
    if (doc.metadata[key] !== value) {
      return false;
    }
  }

  return true;
}

/**
 * コンテンツから検索クエリに関連する部分を抜粋
 */
function createExcerpt(content: string, query: string, maxLength = 200): string {
  const queryWords = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 2);

  // クエリの単語が含まれる位置を探す
  let bestStart = 0;
  let bestScore = 0;

  for (let i = 0; i < content.length - 50; i += 20) {
    const snippet = content.slice(i, i + maxLength).toLowerCase();
    let score = 0;
    for (const word of queryWords) {
      if (snippet.includes(word)) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestStart = i;
    }
  }

  // 抜粋を作成
  let excerpt = content.slice(bestStart, bestStart + maxLength);

  // 文の途中から始まっている場合は省略記号を追加
  if (bestStart > 0) {
    excerpt = "..." + excerpt;
  }

  // 文の途中で終わっている場合は省略記号を追加
  if (bestStart + maxLength < content.length) {
    excerpt = excerpt + "...";
  }

  return excerpt;
}

// ============================================================
// シングルトンインスタンス
// ============================================================

let instance: InMemoryRetriever | null = null;

/**
 * InMemoryRetrieverのシングルトンインスタンスを取得
 */
export function getInMemoryRetriever(): InMemoryRetriever {
  if (!instance) {
    instance = new InMemoryRetriever();
  }
  return instance;
}
