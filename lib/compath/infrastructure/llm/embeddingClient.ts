/**
 * OpenAI Embedding API クライアント
 *
 * テキストをベクトル（埋め込み）に変換
 * - text-embedding-3-small: 1536次元
 * - text-embedding-3-large: 3072次元
 */

import { env } from "../../config/env";

/** エンベディングモデル */
export type EmbeddingModel = "text-embedding-3-small" | "text-embedding-3-large";

/** エンベディング生成オプション */
export type EmbeddingOptions = {
  model?: EmbeddingModel;
  /** 出力次元数（text-embedding-3系のみサポート） */
  dimensions?: number;
};

/** エンベディング生成結果 */
export type EmbeddingResult = {
  embedding: number[];
  model: string;
  totalTokens: number;
};

/** バッチエンベディング生成結果 */
export type BatchEmbeddingResult = {
  embeddings: number[][];
  model: string;
  totalTokens: number;
};

/**
 * 単一テキストのエンベディングを生成
 */
export async function generateEmbedding(
  text: string,
  options: EmbeddingOptions = {}
): Promise<EmbeddingResult> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const model = options.model ?? "text-embedding-3-small";
  const url = "https://api.openai.com/v1/embeddings";

  const requestBody: Record<string, unknown> = {
    model,
    input: text,
  };

  // text-embedding-3系は次元数を指定可能
  if (options.dimensions) {
    requestBody.dimensions = options.dimensions;
  }

  if (env.debugLlmLog) {
    console.log("[Embedding Request] Model:", model);
    console.log("[Embedding Request] Text length:", text.length);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await safeRead(response);
    throw new Error(
      `Embedding API error: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  const json = (await response.json()) as EmbeddingApiResponse;

  if (env.debugLlmLog) {
    console.log("[Embedding Response] Dimensions:", json.data[0]?.embedding.length);
    console.log("[Embedding Response] Total tokens:", json.usage?.total_tokens);
  }

  return {
    embedding: json.data[0].embedding,
    model: json.model,
    totalTokens: json.usage?.total_tokens ?? 0,
  };
}

/**
 * 複数テキストのエンベディングを一括生成（バッチ処理）
 *
 * 大量のテキストを処理する場合に効率的
 */
export async function generateEmbeddingsBatch(
  texts: string[],
  options: EmbeddingOptions = {}
): Promise<BatchEmbeddingResult> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  if (texts.length === 0) {
    return {
      embeddings: [],
      model: options.model ?? "text-embedding-3-small",
      totalTokens: 0,
    };
  }

  const model = options.model ?? "text-embedding-3-small";
  const url = "https://api.openai.com/v1/embeddings";

  const requestBody: Record<string, unknown> = {
    model,
    input: texts,
  };

  if (options.dimensions) {
    requestBody.dimensions = options.dimensions;
  }

  if (env.debugLlmLog) {
    console.log("[Embedding Batch Request] Model:", model);
    console.log("[Embedding Batch Request] Text count:", texts.length);
  }

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.openaiApiKey}`,
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorText = await safeRead(response);
    throw new Error(
      `Embedding API error: ${response.status} ${response.statusText} ${errorText}`
    );
  }

  const json = (await response.json()) as EmbeddingApiResponse;

  if (env.debugLlmLog) {
    console.log("[Embedding Batch Response] Count:", json.data.length);
    console.log("[Embedding Batch Response] Total tokens:", json.usage?.total_tokens);
  }

  // indexでソートして順序を保証
  const sortedData = [...json.data].sort((a, b) => a.index - b.index);

  return {
    embeddings: sortedData.map((d) => d.embedding),
    model: json.model,
    totalTokens: json.usage?.total_tokens ?? 0,
  };
}

/**
 * 2つのベクトル間のコサイン類似度を計算
 *
 * @returns 0〜1の類似度スコア（1が最も類似）
 */
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error(`Vector dimensions mismatch: ${a.length} vs ${b.length}`);
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

// ============================================================
// 内部型定義
// ============================================================

type EmbeddingApiResponse = {
  object: "list";
  data: Array<{
    object: "embedding";
    index: number;
    embedding: number[];
  }>;
  model: string;
  usage?: {
    prompt_tokens: number;
    total_tokens: number;
  };
};

async function safeRead(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}
