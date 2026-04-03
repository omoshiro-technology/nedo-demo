/**
 * Knowledge Retriever Interface
 * ベクトルDBからナレッジを検索するためのインターフェース
 */

export type RetrievedKnowledge = {
  id: string;
  title: string;
  content: string;
  excerpt: string;
  similarity: number;
  metadata?: Record<string, unknown>;
};

/**
 * Reason-Centric Search用の検索結果
 * 判断理由ベースの類似検索結果
 */
export type ReasonCentricResult = RetrievedKnowledge & {
  /** マッチした判断理由の類似性説明 */
  matchedRationale?: {
    original: string;
    similarity: string;
  };
  /** 過去の結果（あれば） */
  outcome?: {
    shortTerm?: string;
    longTerm?: string;
  };
  /** 学び・教訓 */
  learnings?: string[];
  /** 判断プロパティ（あれば） */
  decisionProperty?: {
    rule?: {
      type: string;
      condition: string;
      thenAction: string;
      elseAction?: string;
    };
    rationale?: {
      primaryReason: string;
      tradeOffs?: string[];
    };
  };
};

export type SearchOptions = {
  /** 取得する件数（デフォルト: 5） */
  topK?: number;
  /** 最低類似度（デフォルト: 0.7） */
  minSimilarity?: number;
  /** メタデータによるフィルタ */
  filter?: Record<string, unknown>;
};

/**
 * Reason-Centric Search用のオプション
 */
export type ReasonCentricSearchOptions = SearchOptions & {
  /** 判断の文脈（目的、状況など） */
  context?: string;
  /** 問題カテゴリ */
  problemCategory?: string;
  /** 類似理由の抽出を有効化 */
  extractRationale?: boolean;
};

export type DocumentToIndex = {
  id: string;
  title: string;
  content: string;
  metadata?: Record<string, unknown>;
};

/**
 * 判断事例としてインデックスするドキュメント
 */
export type DecisionCaseToIndex = DocumentToIndex & {
  /** 判断理由（WHY） */
  rationale?: string;
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

/**
 * Knowledge Retriever Interface
 * 各ベクトルDB実装（Pinecone、Weaviate、pgvector等）がこのインターフェースを実装
 */
export interface KnowledgeRetriever {
  /**
   * クエリに関連するナレッジを検索
   */
  search(query: string, options?: SearchOptions): Promise<RetrievedKnowledge[]>;

  /**
   * ドキュメントをベクトルDBにインデックス登録
   */
  index(documents: DocumentToIndex[]): Promise<void>;
}

/**
 * Reason-Centric Retriever Interface
 * 判断理由ベースの検索をサポートする拡張インターフェース
 */
export interface ReasonCentricRetriever extends KnowledgeRetriever {
  /**
   * 判断理由ベースで類似事例を検索
   *
   * キーワードマッチではなく、判断の意図・理由の類似性で検索
   */
  searchByRationale(
    query: string,
    options?: ReasonCentricSearchOptions
  ): Promise<ReasonCentricResult[]>;

  /**
   * 判断事例をインデックス登録
   */
  indexDecisionCase(cases: DecisionCaseToIndex[]): Promise<void>;
}
