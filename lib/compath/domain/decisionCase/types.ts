/**
 * 判断事例（DecisionCase）ドメインモデル
 *
 * 技術伝承デモの核となるデータ構造。
 * ベテラン技術者の判断を構造化し、若手が参照・学習できる形で保存する。
 */

// ============================================
// 関連知見への参照
// ============================================

/**
 * 関連する知見（ヒューリスティック、パターン、ドキュメント）への参照
 */
export type RelatedKnowledgeRef = {
  /** 知見の種類 */
  kind: "heuristic" | "pattern" | "document";
  /** 参照先ID */
  id: string;
  /** 関係性 */
  relation: "supports" | "contradicts" | "derived";
  /** 表示用ラベル（例: "手順書 解説-8「樹脂補給装置」"） */
  label?: string;
};

// ============================================
// 確認質問
// ============================================

/**
 * 判断時に確認すべき質問
 */
export type DecisionCaseQuestion = {
  /** 質問ID */
  id: string;
  /** 質問文 */
  text: string;
  /** カテゴリ */
  category: "context" | "risk" | "tradeoff" | "boundary";
  /** 選択肢（選択式の場合） */
  options?: string[];
  /** 必須かどうか */
  required: boolean;
};

/**
 * ユーザーの質問への回答
 */
export type QuestionAnswer = {
  /** 質問ID */
  questionId: string;
  /** 回答内容 */
  answer: string;
  /** 回答日時 */
  answeredAt: string;
};

// ============================================
// 判断事例（コアモデル）
// ============================================

/**
 * 判断内容
 */
export type DecisionContent = {
  /** 判断の要約（例: "1-A案（ホールドアップ式）を採用"） */
  summary: string;
  /** 判断日 */
  date?: string;
  /** 判断者 */
  owner?: string;
};

/**
 * 判断時の条件・前提
 */
export type DecisionConditions = {
  /** 前提条件の説明（例: "起動頻度 20回/年、復旧目標 4時間以内"） */
  context: string;
  /** 制約条件 */
  constraints?: string[];
  /** 前提となる仮定 */
  assumptions?: string[];
};

/**
 * 判断理由
 */
export type DecisionRationale = {
  /** 主な理由 */
  primary: string;
  /** 補足的な理由 */
  supporting?: string[];
  /** トレードオフの考慮 */
  tradeoffs?: string[];
};

/**
 * メタデータ
 */
export type DecisionCaseMetadata = {
  /** ドメインタグ（例: ["PWR", "コンデミ", "樹脂量"]） */
  domain: string[];
  /** プラント名 */
  plantName?: string;
  /** 年度 */
  year?: number;
  /** 情報源 */
  source?: string;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
};

/**
 * 判断事例（DecisionCase）
 *
 * ベテラン技術者の判断を構造化したもの。
 * - 何を判断したか（decision）
 * - どんな条件で（conditions）
 * - なぜその判断に至ったか（rationale）
 * - 判断時に確認した項目（questions）
 */
export type DecisionCase = {
  /** 事例ID */
  id: string;
  /** タイトル（例: "〇〇発電所 1号機 コンデミ樹脂量決定"） */
  title: string;
  /** 判断内容 */
  decision: DecisionContent;
  /** 条件・前提 */
  conditions: DecisionConditions;
  /** 判断理由 */
  rationale: DecisionRationale;
  /** 関連知見 */
  relatedKnowledge: RelatedKnowledgeRef[];
  /** 確認質問 */
  questions: DecisionCaseQuestion[];
  /** メタデータ */
  metadata: DecisionCaseMetadata;
};

// ============================================
// 検索・API用の型
// ============================================

/**
 * 検索結果の判断事例（類似度スコア付き）
 */
export type DecisionCaseSearchResult = {
  /** 事例 */
  case: DecisionCase;
  /** 類似度スコア (0-1) */
  similarity: number;
  /** マッチした理由の説明 */
  matchReason?: string;
};

/**
 * 検索オプション
 */
export type DecisionCaseSearchOptions = {
  /** 取得件数 */
  topK?: number;
  /** 最小類似度 */
  minSimilarity?: number;
  /** ドメインフィルタ */
  domainFilter?: string[];
};

/**
 * 判断記録の入力
 */
export type RecordDecisionInput = {
  /** タイトル */
  title: string;
  /** 判断内容 */
  decision: DecisionContent;
  /** 条件 */
  conditions: DecisionConditions;
  /** 理由 */
  rationale: DecisionRationale;
  /** 関連知見 */
  relatedKnowledge?: RelatedKnowledgeRef[];
  /** 質問への回答 */
  answeredQuestions?: QuestionAnswer[];
  /** 参照した事例ID */
  referencedCaseId?: string;
  /** メタデータ */
  metadata?: Partial<DecisionCaseMetadata>;
};

/**
 * 質問生成リクエスト
 */
export type GenerateQuestionsRequest = {
  /** 事例ID */
  caseId: string;
  /** ユーザーの目的・コンテキスト */
  userContext?: string;
  /** 生成モード */
  mode?: "template" | "llm" | "hybrid";
};

/**
 * 過去の判断傾向（AIが推奨ではなく傾向を示す）
 */
export type DecisionTrend = {
  /** 最も多く選ばれた判断 */
  mostChosen: string;
  /** 件数 */
  count: number;
  /** 補足説明 */
  note?: string;
};
