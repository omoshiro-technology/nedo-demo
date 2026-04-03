/**
 * 判断事例（DecisionCase）API クライアント
 *
 * 技術伝承デモの中核機能を提供
 * - 類似事例検索
 * - 確認質問取得
 * - 判断傾向取得
 * - 判断記録
 */

const API_BASE = "/api/compath";

// ============================================================
// 型定義
// ============================================================

/** 関連知見への参照 */
export type RelatedKnowledgeRef = {
  kind: "heuristic" | "pattern" | "document";
  id: string;
  relation: "supports" | "contradicts" | "derived";
  label?: string;
};

/** 確認質問 */
export type DecisionCaseQuestion = {
  id: string;
  text: string;
  category: "context" | "risk" | "tradeoff" | "boundary";
  options?: string[];
  required: boolean;
};

/** 質問への回答 */
export type QuestionAnswer = {
  questionId: string;
  answer: string;
  answeredAt: string;
};

/** 判断内容 */
export type DecisionContent = {
  summary: string;
  date?: string;
  owner?: string;
};

/** 条件 */
export type DecisionConditions = {
  context: string;
  constraints?: string[];
  assumptions?: string[];
};

/** 理由 */
export type DecisionRationale = {
  primary: string;
  supporting?: string[];
  tradeoffs?: string[];
};

/** メタデータ */
export type DecisionCaseMetadata = {
  domain: string[];
  plantName?: string;
  year?: number;
  source?: string;
};

/** 検索結果の事例（簡易版） */
export type DecisionCaseSearchItem = {
  id: string;
  title: string;
  decision: DecisionContent;
  conditions: DecisionConditions;
  rationale: DecisionRationale;
  similarity: number;
  matchReason?: string;
  metadata: DecisionCaseMetadata;
};

/** 事例の詳細（フル版） */
export type DecisionCaseFull = {
  id: string;
  title: string;
  decision: DecisionContent;
  conditions: DecisionConditions;
  rationale: DecisionRationale;
  relatedKnowledge: RelatedKnowledgeRef[];
  questions: DecisionCaseQuestion[];
  metadata: DecisionCaseMetadata & {
    createdAt: string;
    updatedAt: string;
  };
};

/** 検索オプション */
export type SearchOptions = {
  topK?: number;
  minSimilarity?: number;
  domainFilter?: string[];
};

/** 検索レスポンス */
export type SearchResponse = {
  total: number;
  results: DecisionCaseSearchItem[];
};

/** 質問レスポンス */
export type QuestionsResponse = {
  caseId: string;
  questions: DecisionCaseQuestion[];
};

/** 判断傾向 */
export type DecisionTrend = {
  mostChosen: string;
  count: number;
  note?: string;
};

/** 傾向レスポンス */
export type TrendResponse = {
  caseId: string;
  trend: DecisionTrend;
  disclaimer: string;
};

/** 記録入力 */
export type RecordDecisionInput = {
  title: string;
  decision: DecisionContent;
  conditions: DecisionConditions;
  rationale: DecisionRationale;
  relatedKnowledge?: RelatedKnowledgeRef[];
  answeredQuestions?: QuestionAnswer[];
  referencedCaseId?: string;
  metadata?: Partial<DecisionCaseMetadata>;
};

/** 記録レスポンス */
export type RecordResponse = {
  id: string;
  title: string;
  message: string;
  indexed: boolean;
};

// ============================================================
// API関数
// ============================================================

/**
 * 類似事例を検索
 */
export async function searchDecisionCases(
  query: string,
  options?: SearchOptions
): Promise<SearchResponse> {
  const response = await fetch(`${API_BASE}/decision-cases/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      query,
      topK: options?.topK,
      minSimilarity: options?.minSimilarity,
      domainFilter: options?.domainFilter,
    }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "検索に失敗しました。" }));
    throw new Error(error.message || "検索に失敗しました。");
  }

  return response.json();
}

/**
 * 事例の詳細を取得
 */
export async function getDecisionCase(id: string): Promise<DecisionCaseFull> {
  const response = await fetch(`${API_BASE}/decision-cases/${id}`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "事例の取得に失敗しました。" }));
    throw new Error(error.message || "事例の取得に失敗しました。");
  }

  return response.json();
}

/**
 * 確認質問を取得
 */
export async function getDecisionCaseQuestions(
  caseId: string,
  userContext?: string
): Promise<QuestionsResponse> {
  const params = new URLSearchParams();
  if (userContext) {
    params.set("userContext", userContext);
  }

  const url = `${API_BASE}/decision-cases/${caseId}/questions${
    params.toString() ? `?${params.toString()}` : ""
  }`;

  const response = await fetch(url);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "質問の取得に失敗しました。" }));
    throw new Error(error.message || "質問の取得に失敗しました。");
  }

  return response.json();
}

/**
 * 過去の判断傾向を取得
 */
export async function getDecisionTrend(
  caseId: string,
  answers: QuestionAnswer[]
): Promise<TrendResponse> {
  const response = await fetch(`${API_BASE}/decision-cases/${caseId}/trend`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ answers }),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "傾向の取得に失敗しました。" }));
    throw new Error(error.message || "傾向の取得に失敗しました。");
  }

  return response.json();
}

/**
 * 判断を記録
 */
export async function recordDecision(
  input: RecordDecisionInput
): Promise<RecordResponse> {
  const response = await fetch(`${API_BASE}/decision-cases/record`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "記録に失敗しました。" }));
    throw new Error(error.message || "記録に失敗しました。");
  }

  return response.json();
}

/**
 * 全事例を取得（管理用）
 */
export async function getAllDecisionCases(): Promise<{
  total: number;
  cases: Array<{
    id: string;
    title: string;
    decision: string;
    year?: number;
    domain: string[];
  }>;
}> {
  const response = await fetch(`${API_BASE}/decision-cases`);

  if (!response.ok) {
    const error = await response
      .json()
      .catch(() => ({ message: "取得に失敗しました。" }));
    throw new Error(error.message || "取得に失敗しました。");
  }

  return response.json();
}
