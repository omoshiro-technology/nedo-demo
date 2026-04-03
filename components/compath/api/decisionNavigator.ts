import type {
  DecisionNavigatorSession,
  CreateSessionRequest,
  RecordSelectionRequest,
  ExecutionPlan,
  ExecutionItemStatus,
  // Phase 5: 条件ベース絞り込み
  InitialLayout,
  ThinkingBox,
  GoalCompassState,
  ConditionOption,
  // Phase Strategy: 思考戦略
  ThinkingStrategyId,
  ThinkingStrategyMeta,
} from "../types/decisionNavigator";

const API_BASE = "/api/compath/decision-navigator";

/** 3セット情報（条件・事例・推論） */
type ThreeSetInfo = {
  conditions: Array<{
    id: string;
    label: string;
    category: string;
    description: string;
    confidence?: number;
  }>;
  pastCases: Array<{
    id: string;
    sourceFileName: string;
    content: string;
    similarity: number;
  }>;
  inferredPriorities: string[];
};

type RecordSelectionResult = {
  session: DecisionNavigatorSession;
  nextOptions: {
    options: Array<{
      label: string;
      description: string;
      confidence: number;
      riskLevel: "high" | "medium" | "low";
      relatedPastCases: Array<{
        id: string;
        content: string;
        similarity: number;
        sourceFileName: string;
      }>;
      source: "ai_generated" | "past_case";
    }>;
    warnings?: string[];
  };
  /** Phase 5改: 3セット情報（思考支援の経過） */
  threeSetInfo?: ThreeSetInfo;
  /** Phase 25改: 選択アドバイスは非同期で生成され、チャットに直接追加される */
  // selectionAdvice フィールドは削除済み
};

/** 前提条件データ型 */
type PreconditionData = {
  conditions: Array<{
    id: string;
    label: string;
    category: string;
    detail?: string;
    isSelected: boolean;
  }>;
  additionalContext: string;
};

/**
 * セッションを作成
 */
export async function createSession(
  purpose: string,
  file?: File,
  currentSituation?: string,
  preconditions?: PreconditionData,
  skipClarification?: boolean
): Promise<DecisionNavigatorSession> {
  const body: CreateSessionRequest & { preconditions?: PreconditionData; skipClarification?: boolean } = { purpose };

  if (currentSituation) {
    body.currentSituation = currentSituation;
  }

  if (preconditions) {
    body.preconditions = preconditions;
  }

  if (skipClarification) {
    body.skipClarification = skipClarification;
  }

  if (file) {
    const base64 = await fileToBase64(file);
    body.documentBase64 = base64;
    body.fileName = file.name;
  }

  const response = await fetch(`${API_BASE}/sessions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "セッションの作成に失敗しました");
  }

  return response.json();
}

/**
 * \u30bb\u30c3\u30b7\u30e7\u30f3\u4e00\u89a7\u3092\u53d6\u5f97
 */
export async function getSessions(): Promise<{ sessions: DecisionNavigatorSession[] }> {
  const response = await fetch(`${API_BASE}/sessions`);

  if (!response.ok) {
    throw new Error("\u30bb\u30c3\u30b7\u30e7\u30f3\u4e00\u89a7\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
  }

  return response.json();
}

/**
 * \u30bb\u30c3\u30b7\u30e7\u30f3\u8a73\u7d30\u3092\u53d6\u5f97
 */
export async function getSession(sessionId: string): Promise<DecisionNavigatorSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`);

  if (!response.ok) {
    throw new Error("\u30bb\u30c3\u30b7\u30e7\u30f3\u306e\u53d6\u5f97\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
  }

  return response.json();
}

/**
 * 選択を記録
 * Phase 22: optionIdを追加（放射状展開から選択された場合）
 */
export async function recordSelection(
  sessionId: string,
  nodeId: string,
  rationale?: string,
  selectedConditions?: Array<{
    id: string;
    label: string;
    category: string;
    description: string;
  }>,
  /** Phase 22: 放射状展開から選択された選択肢ID（criteriaNodeのoptionId） */
  optionId?: string
): Promise<RecordSelectionResult> {
  const body: RecordSelectionRequest & {
    selectedConditions?: Array<{
      id: string;
      label: string;
      category: string;
      description: string;
    }>;
    optionId?: string;
  } = { nodeId, rationale };

  if (selectedConditions && selectedConditions.length > 0) {
    body.selectedConditions = selectedConditions;
  }

  // Phase 22: 放射状展開から選択された場合
  if (optionId) {
    body.optionId = optionId;
  }

  const response = await fetch(`${API_BASE}/sessions/${sessionId}/select`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "選択の記録に失敗しました");
  }

  return response.json();
}

/**
 * 選択を確定（履歴に記録）
 */
export async function confirmSelection(
  sessionId: string,
  summary?: string
): Promise<DecisionNavigatorSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ summary }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "選択の確定に失敗しました");
  }

  return response.json();
}

/**
 * 選択を取り消し
 */
export async function undoSelection(
  sessionId: string
): Promise<DecisionNavigatorSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/undo`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "選択の取り消しに失敗しました");
  }

  return response.json();
}

/**
 * チャットメッセージを送信
 */
export async function sendChatMessage(
  sessionId: string,
  message: string
): Promise<DecisionNavigatorSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "メッセージ送信に失敗しました");
  }

  return response.json();
}

/**
 * 選択済みノードの理由を更新
 */
export async function updateNodeRationale(
  sessionId: string,
  nodeId: string,
  rationale?: string
): Promise<DecisionNavigatorSession> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/nodes/${nodeId}/rationale`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rationale }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "理由の更新に失敗しました");
  }

  const data = await response.json();
  return data.session;
}

/**
 * 代替選択肢の展開/折りたたみ
 */
export async function toggleAlternatives(
  sessionId: string,
  nodeId: string,
  expand: boolean
): Promise<DecisionNavigatorSession> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/nodes/${nodeId}/toggle-alternatives`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ expand }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "代替選択肢の切り替えに失敗しました");
  }

  const data = await response.json();
  return data.session;
}

/**
 * Clarification質問に回答
 */
export async function submitClarificationAnswers(
  sessionId: string,
  answers: Array<{ question: string; answer: string }>
): Promise<DecisionNavigatorSession> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/clarification`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ answers }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "回答の送信に失敗しました");
  }

  const data = await response.json();
  return data.session;
}

/**
 * \u30bb\u30c3\u30b7\u30e7\u30f3\u3092\u524a\u9664
 */
export async function deleteSession(sessionId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}`, {
    method: "DELETE",
  });

  if (!response.ok) {
    throw new Error("\u30bb\u30c3\u30b7\u30e7\u30f3\u306e\u524a\u9664\u306b\u5931\u6557\u3057\u307e\u3057\u305f");
  }
}

/**
 * セッションを再生成（条件変更時）
 * 条件が変更された場合、推奨パスを再生成してキャンバスを更新する
 */
export async function regenerateSession(
  sessionId: string,
  conditions: Array<{
    id: string;
    criteriaId?: string;
    label: string;
    value: string;
    options: string[];
    isUserDefined?: boolean;
    isPreSelected?: boolean;
  }>
): Promise<DecisionNavigatorSession> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/regenerate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ conditions }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "セッションの再生成に失敗しました");
  }

  return response.json();
}

/**
 * 判断軸を追加
 * 既存の選択状態を保持したまま、新しい判断軸を右端に追加する
 */
export async function addCriteria(
  sessionId: string
): Promise<{
  success: boolean;
  session?: DecisionNavigatorSession;
  addedCriteria?: {
    id: string;
    columnIndex: number;
    question: string;
    description?: string;
  };
  addedNodes?: Array<{
    id: string;
    label: string;
    description?: string;
    isRecommended?: boolean;
  }>;
  reason?: string;
}> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/add-criteria`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({}),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // 400エラー（追加すべき判断軸がない場合）はエラーとして投げない
    if (response.status === 400 && error.reason) {
      return { success: false, reason: error.reason };
    }
    throw new Error(error.message || "判断軸の追加に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase 22: 探索（次の問い生成）
// ============================================================

/**
 * 探索ノードから次の問いを生成
 */
export async function exploreNext(
  sessionId: string,
  explorationNodeId: string
): Promise<{
  success: boolean;
  session?: DecisionNavigatorSession;
  addedCriteria?: {
    id: string;
    columnIndex: number;
    question: string;
    description?: string;
  };
  addedNodes?: Array<{
    id: string;
    label: string;
    description?: string;
    isRecommended?: boolean;
  }>;
  reason?: string;
}> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/explore-next`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ explorationNodeId }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    // 400エラー（これ以上探索すべき問いがない場合）はエラーとして投げない
    if (response.status === 400 && error.reason) {
      return { success: false, reason: error.reason };
    }
    throw new Error(error.message || "探索に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase C: 実行計画
// ============================================================

/**
 * 実行計画を取得（なければ生成）
 */
export async function getExecutionPlan(sessionId: string): Promise<ExecutionPlan> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/execution-plan`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "実行計画の取得に失敗しました");
  }

  const data = await response.json();
  return data.executionPlan;
}

/**
 * 実行計画を再生成
 */
export async function regenerateExecutionPlan(sessionId: string): Promise<ExecutionPlan> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/execution-plan`, {
    method: "POST",
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "実行計画の再生成に失敗しました");
  }

  const data = await response.json();
  return data.executionPlan;
}

/**
 * 実行計画アイテムのステータスを更新
 */
export async function updateExecutionItemStatus(
  sessionId: string,
  itemId: string,
  status: ExecutionItemStatus
): Promise<ExecutionPlan> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/execution-plan/items/${itemId}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "ステータスの更新に失敗しました");
  }

  const data = await response.json();
  return data.executionPlan;
}

// ============================================================
// Phase 5: 条件ベース絞り込みアーキテクチャ
// ============================================================

/**
 * Phase 5 思考ボックス初期化レスポンス
 */
type InitThinkingBoxResponse = {
  thinkingBox: ThinkingBox;
  initialLayout: InitialLayout;
  goalCompass: GoalCompassState;
};

/**
 * Phase 5 条件選択レスポンス
 */
type SelectConditionResponse = {
  thinkingBox: ThinkingBox;
  goalCompass: GoalCompassState;
  isTerminal: boolean;
  terminationReason?: string;
  finalDecision?: {
    value: string;
    rationale: string;
    satisfiedConditions: string[];
  };
};

/**
 * 思考ボックスを初期化（Phase 5）
 * セッション作成後に呼び出し、三列レイアウトを生成
 */
export async function initThinkingBox(
  sessionId: string,
  purpose: string,
  currentSituation?: string
): Promise<InitThinkingBoxResponse> {
  const response = await fetch(`${API_BASE}/thinking-box/init`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sessionId, purpose, currentSituation }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "思考ボックスの初期化に失敗しました");
  }

  return response.json();
}

/**
 * 条件を選択（Phase 5）
 * 選択した条件に基づいて候補を絞り込み、次の思考ボックスを生成
 */
export async function selectCondition(
  thinkingBoxId: string,
  conditionId: string
): Promise<SelectConditionResponse> {
  const response = await fetch(
    `${API_BASE}/thinking-box/${thinkingBoxId}/select-condition`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ conditionId }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "条件の選択に失敗しました");
  }

  return response.json();
}

/**
 * 思考ボックスを取得（Phase 5）
 */
export async function getThinkingBox(
  thinkingBoxId: string
): Promise<{ thinkingBox: ThinkingBox; goalCompass: GoalCompassState }> {
  const response = await fetch(`${API_BASE}/thinking-box/${thinkingBoxId}`);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "思考ボックスの取得に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase 5改改改: 確認質問（暗黙条件引き出し）
// ============================================================

import type { ClarificationQuestion } from "../types/decisionNavigator";

/** 確認質問生成レスポンス */
type GenerateClarificationQuestionsResponse = {
  questions: ClarificationQuestion[];
  contextSufficiency: {
    score: number;
    missingElements: string[];
  };
};

/**
 * 確認質問を生成
 * 目的から暗黙条件や未認識条件を引き出すための質問を生成する
 */
export async function generateClarificationQuestions(
  purpose: string,
  chatContext?: string
): Promise<GenerateClarificationQuestionsResponse> {
  const response = await fetch(`${API_BASE}/clarification-questions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, chatContext }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "確認質問の生成に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase 6: 過去事例から前提条件を取得
// ============================================================

/** 過去事例の前提条件エントリ */
export type PastPreconditionEntry = {
  sessionId: string;
  purpose: string;
  preconditions: {
    conditions: Array<{
      id: string;
      label: string;
      category: string;
      description?: string;
      isSelected: boolean;
      detail?: string;
    }>;
    additionalContext?: string;
  };
  createdAt: string;
  similarity: number;
};

/** 過去事例取得レスポンス */
type GetPastPreconditionsResponse = {
  entries: PastPreconditionEntry[];
  total: number;
};

/**
 * 過去事例から前提条件を取得
 * 類似の目的を持つ過去のセッションから前提条件を検索
 */
export async function getPastPreconditions(
  purpose: string,
  limit = 5
): Promise<GetPastPreconditionsResponse> {
  const response = await fetch(`${API_BASE}/past-preconditions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ purpose, limit }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "過去事例の取得に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase X: エキスパートインサイト
// ============================================================

import type { OverlookedWarning } from "../types/decisionNavigator";

/** インサイト生成レスポンス */
type GenerateInsightsResponse = {
  insights: Array<{
    id: string;
    type: string;
    importance: string;
    content: {
      title: string;
      message: string;
    };
  }>;
  overlookedWarnings: OverlookedWarning[];
  riskScore: number;
};

/**
 * インサイトを生成（Phase X: 熟達者思考）
 * ノード選択時などに見落とし警告やエキスパートインサイトを取得
 */
export async function generateInsights(
  sessionId: string,
  currentNodeId?: string,
  triggerTiming: "on_node_selection" | "before_confirmation" | "on_option_generation" = "on_node_selection"
): Promise<GenerateInsightsResponse> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/insights`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentNodeId, triggerTiming }),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "インサイトの取得に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase X: 実行結果記録
// ============================================================

/** 実行結果の型（API用） */
type ExecutionOutcome = {
  evaluation: "exceeded" | "met" | "partial" | "not_met";
  actualResult: string;
  gapFromExpectation?: string;
  achievementRate?: number;
  issuesEncountered?: string[];
  unexpectedFindings?: string[];
};

type Retrospective = {
  whatWentWell: string[];
  whatCouldBeBetter: string[];
  suggestions: string[];
  decisionValidity: {
    wasCorrectDecision: boolean;
    reasoning: string;
    wouldChangeIf?: string;
  };
};

type ExecutionResultInput = {
  executionPlanItemId?: string;
  relatedNodeId?: string;
  title: string;
  description?: string;
  status: "not_started" | "in_progress" | "completed" | "failed" | "cancelled" | "blocked";
  outcome?: ExecutionOutcome;
  retrospective?: Retrospective;
};

/**
 * 実行結果を記録
 */
export async function recordExecutionResult(
  sessionId: string,
  data: ExecutionResultInput
): Promise<{ id: string }> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/execution-results`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "実行結果の記録に失敗しました");
  }

  return response.json();
}

/**
 * 実行結果一覧を取得
 */
export async function getExecutionResults(
  sessionId: string
): Promise<{ results: ExecutionResultInput[] }> {
  const response = await fetch(
    `${API_BASE}/sessions/${sessionId}/execution-results`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "実行結果の取得に失敗しました");
  }

  return response.json();
}

// ============================================================
// Phase X: ナレッジエクスポート/インポート
// ============================================================

/** ナレッジエクスポートデータ */
type KnowledgeExportData = {
  version: string;
  heuristics: Array<{
    id: string;
    rule: string;
    description: string;
    domain: string[];
  }>;
  patterns: Array<{
    id: string;
    name: string;
    type: "success" | "failure";
  }>;
  sourceInfo: {
    sessionCount: number;
    decisionCount: number;
    exportedAt: string;
  };
};

/**
 * ナレッジをエクスポート
 */
export async function exportKnowledge(
  sessionIds?: string[],
  includeHeuristics = true,
  includePatterns = true,
  minReliability = 0
): Promise<KnowledgeExportData> {
  const params = new URLSearchParams();
  if (sessionIds && sessionIds.length > 0) {
    params.set("sessionIds", sessionIds.join(","));
  }
  params.set("includeHeuristics", String(includeHeuristics));
  params.set("includePatterns", String(includePatterns));
  params.set("minReliability", String(minReliability));

  const response = await fetch(
    `${API_BASE}/knowledge/export?${params.toString()}`
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "ナレッジのエクスポートに失敗しました");
  }

  return response.json();
}

/**
 * ナレッジをインポート
 */
export async function importKnowledge(
  data: KnowledgeExportData,
  duplicateHandling: "skip" | "overwrite" | "merge" = "skip"
): Promise<{ success: boolean; importedHeuristics: number; importedPatterns: number }> {
  const response = await fetch(`${API_BASE}/knowledge/import`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data, duplicateHandling }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "ナレッジのインポートに失敗しました");
  }

  return response.json();
}

/**
 * \u30d5\u30a1\u30a4\u30eb\u3092Base64\u306b\u5909\u63db
 */
async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      // data:application/pdf;base64,... \u306e\u5f62\u5f0f\u304b\u3089base64\u90e8\u5206\u3092\u62bd\u51fa
      const base64 = result.split(",")[1] ?? result;
      resolve(base64);
    };
    reader.onerror = () => reject(new Error("\u30d5\u30a1\u30a4\u30eb\u306e\u8aad\u307f\u8fbc\u307f\u306b\u5931\u6557\u3057\u307e\u3057\u305f"));
    reader.readAsDataURL(file);
  });
}

// ============================================================
// Phase 20: RAG検索（手順書・解説書）
// ============================================================

import type { RelatedDocument } from "../components/decisionNavigator/RelatedDocumentCard";

/** RAG検索結果 */
type SearchRelatedDocumentsResponse = {
  documents: RelatedDocument[];
  total: number;
};

/**
 * RAG検索で関連する手順書・解説書を取得
 * 目的入力時に関連ドキュメントを検索する
 */
export async function searchRelatedDocuments(
  query: string,
  topK = 5,
  minSimilarity = 0.6
): Promise<SearchRelatedDocumentsResponse> {
  const response = await fetch(`/api/compath/knowledge-base/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, topK, minSimilarity }),
  });

  if (!response.ok) {
    // 検索失敗時は空の結果を返す（UI表示には影響させない）
    console.warn("関連ドキュメントの検索に失敗しました");
    return { documents: [], total: 0 };
  }

  const data = await response.json();

  // APIレスポンスをRelatedDocument形式に変換
  const documents: RelatedDocument[] = (data.results ?? []).map(
    (result: { id?: string; content: string; metadata?: { title?: string; category?: string; sourceFileName?: string }; similarity?: number }, index: number) => ({
      id: result.id ?? `doc-${index}`,
      title: result.metadata?.title ?? result.metadata?.sourceFileName ?? `関連文書 ${index + 1}`,
      summary: result.content.slice(0, 150) + (result.content.length > 150 ? "..." : ""),
      category: result.metadata?.category,
      url: result.metadata?.sourceFileName ? `/documents/${encodeURIComponent(result.metadata.sourceFileName)}` : undefined,
    })
  );

  return { documents, total: data.total ?? documents.length };
}

// ============================================================
// Phase Strategy: 思考戦略
// ============================================================

/**
 * 利用可能な思考戦略一覧を取得
 */
export async function getStrategies(): Promise<{ strategies: ThinkingStrategyMeta[] }> {
  const response = await fetch(`${API_BASE}/strategies`);
  if (!response.ok) {
    throw new Error("思考戦略一覧の取得に失敗しました");
  }
  return response.json();
}

/**
 * セッションの思考戦略を切り替え
 */
export async function switchStrategy(
  sessionId: string,
  strategy: ThinkingStrategyId
): Promise<{ session: DecisionNavigatorSession; message: string }> {
  const response = await fetch(`${API_BASE}/sessions/${sessionId}/strategy`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "思考戦略の切り替えに失敗しました");
  }
  return response.json();
}
