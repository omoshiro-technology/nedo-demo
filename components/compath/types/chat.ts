import type { AnalysisResult, DecisionTimelineResult, LearnFromPastResult, GlobalFeedforward } from "../types";
import type { Artifact } from "./artifact";
import type { ActionLogEntry } from "./agent";
import type { CustomerContext, EvaluationPoints, GeneratedProposal } from "./proposal";
import type { SimilarCaseSearchCondition, SimilarCaseSearchResult } from "./similarCase";

/** エージェント種別 */
export type AgentType =
  | "unified_analysis"      // 統合：議事録分析 + 過去事例検索
  | "knowledge_extraction"  // 文書構造解析
  | "daily_report";         // 日報

/** エージェント定義 */
export type AgentDefinition = {
  type: AgentType;
  label: string;
  description: string;
  icon: "document" | "clock" | "pen" | "search";
  available: boolean;
};

/** 添付データの種別 */
export type AttachedDataType = "analysis_result" | "decision_result" | "learn_result" | "decision_navigator_suggestion" | "sample_data_confirmation" | "artifact";

/** 意思決定ナビゲーター提案データ */
export type DecisionNavigatorSuggestion = {
  /** 抽出された意思決定の目的 */
  purpose: string;
  /** 現在の状況の要約 */
  currentSituation: string;
  /** なぜ意思決定ナビを提案したかの理由 */
  triggerReason: string;
};

/** サンプルデータ確認データ */
export type SampleDataConfirmation = {
  /** サンプルデータの種類 */
  sampleDataId: "meeting_minutes" | "trouble_report";
  /** サンプルデータ名 */
  label: string;
  /** 説明 */
  description: string;
};

/** 意思決定ナビ再開提案データ */
export type DecisionNavigatorResume = {
  /** 目的 */
  purpose: string;
  /** 決定済みかどうか */
  isDecided: boolean;
  /** 最後の選択（未決定時のみ） */
  lastSelection?: string;
  /** セッションID（将来の再開機能用） */
  sessionId?: string;
};

/** 生成された出力データ（コピーレディ出力） */
export type GeneratedOutputData = {
  templateId: string;
  templateName: string;
  output: string;
  format: "markdown" | "plain" | "html" | "csv";
  filledPlaceholders: Record<string, string>;
  missingPlaceholders: string[];
  generatedAt: string;
};

/** 次のステップ提案（Phase 12: 自然連携） */
export type NextStepSuggestion = {
  /** 提案タイプ */
  type: "decision_navigator" | "learn_from_past" | "deeper_analysis";
  /** 提案タイトル */
  title: string;
  /** 提案説明 */
  description: string;
  /** 前のステップとの関連 */
  connectionToResult: string;
  /** 意思決定ナビ用: 提案する目的 */
  suggestedPurpose?: string;
  /** 過去事例検索用: 提案する状況 */
  suggestedSituation?: string;
};

// ============================================
// 技術伝承デモ（判断事例）関連の型
// ============================================

/** 判断事例の検索結果 */
export type DecisionCaseSearchResult = {
  id: string;
  title: string;
  decision: {
    summary: string;
    date?: string;
    owner?: string;
  };
  conditions: {
    context: string;
    constraints?: string[];
  };
  rationale: {
    primary: string;
    supporting?: string[];
  };
  similarity: number;
  matchReason?: string;
  metadata: {
    domain: string[];
    plantName?: string;
    year?: number;
  };
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

/** 判断傾向 */
export type DecisionTrend = {
  mostChosen: string;
  count: number;
  note?: string;
};

/** 関連知見への参照 */
export type RelatedKnowledgeRef = {
  kind: "heuristic" | "pattern" | "document";
  id: string;
  relation: "supports" | "contradicts" | "derived";
  label?: string;
};

/** 判断事例検索結果（AttachedData用） */
export type DecisionCaseSearchData = {
  query: string;
  results: DecisionCaseSearchResult[];
  total: number;
};

/** 確認質問データ（AttachedData用） */
export type DecisionCaseQuestionsData = {
  caseId: string;
  caseTitle: string;
  questions: DecisionCaseQuestion[];
};

/** 判断傾向データ（AttachedData用） */
export type DecisionTrendData = {
  caseId: string;
  caseTitle: string;
  trend: DecisionTrend;
  relatedKnowledge?: RelatedKnowledgeRef[];
  disclaimer: string;
};

/** 判断記録完了データ（AttachedData用） */
export type DecisionRecordData = {
  recordedId: string;
  recordedTitle: string;
};

// ============================================
// 技術伝承デモ 条件収集フロー用の型
// ============================================

/** 収集中の条件 */
export type KnowledgeTransferConditions = {
  /** 起動頻度（年間の起動回数） */
  startupFrequency?: "low" | "medium" | "high";
  /** 復旧時間目標（再生中の運転継続要否） */
  recoveryTimeTarget?: "strict" | "moderate" | "flexible";
  /** 設置スペース制約 */
  spaceConstraint?: "tight" | "standard" | "ample";
};

/** 技術伝承デモの収集ステップ */
export type KnowledgeTransferStep =
  | "idle"                    // 未開始
  | "asking_frequency"        // 起動頻度を質問中
  | "asking_recovery_time"    // 復旧時間を質問中
  | "asking_space"            // スペース制約を質問中
  | "searching"               // 検索中
  | "showing_results"         // 結果表示中
  | "completed";              // 完了

/** 意思決定ナビ条件設定データ（AttachedData用） */
export type DecisionNavigatorConditionData = {
  /** 目的（過去事例から自動セットまたはユーザー入力） */
  purpose: string;
  /** 現在の状況 */
  currentSituation: string;
  /** 条件リスト（キー: 条件名、値: 条件値） */
  conditions: Record<string, string>;
  /** 過去事例からの自動セットかどうか */
  isAutoSet: boolean;
  /** 参照した事例ID（あれば） */
  sourceCaseId?: string;
  /** 参照した事例タイトル（あれば） */
  sourceCaseTitle?: string;
};

/** チャット内前提条件確認データ（技術伝承デモ→意思決定ナビ連携用） */
export type PreconditionChatData = {
  /** 目的 */
  purpose: string;
  /** 現在の状況（過去事例からのコンテキスト） */
  currentSituation: string;
  /** 参照した事例ID */
  sourceCaseId?: string;
  /** 参照した事例タイトル */
  sourceCaseTitle?: string;
  /** 確認ステップ（1: 制約確認, 2: 補足条件, 3: 完了） */
  currentStep: number;
  /** 総ステップ数 */
  totalSteps: number;
  /** 制約リスト */
  constraints: Array<{
    id: string;
    label: string;
    category: string;
    value?: string;
  }>;
  /** 補足条件 */
  additionalContext?: string;
};

/** 添付データ */
export type AttachedData =
  | { type: "analysis_result"; data: AnalysisResult; fileName: string }
  | { type: "decision_result"; data: DecisionTimelineResult }
  | { type: "learn_result"; data: LearnFromPastResult }
  | { type: "decision_navigator_suggestion"; data: DecisionNavigatorSuggestion }
  | { type: "sample_data_confirmation"; data: SampleDataConfirmation }
  | { type: "artifact"; data: Artifact }
  | { type: "decision_navigator_resume"; data: DecisionNavigatorResume }
  | { type: "copy_ready_output"; data: GeneratedOutputData }
  | { type: "next_step_suggestion"; data: NextStepSuggestion }
  // 技術伝承デモ関連
  | { type: "decision_case_search"; data: DecisionCaseSearchData }
  | { type: "decision_case_questions"; data: DecisionCaseQuestionsData }
  | { type: "decision_case_trend"; data: DecisionTrendData }
  | { type: "decision_case_record"; data: DecisionRecordData }
  | { type: "decision_navigator_condition"; data: DecisionNavigatorConditionData }
  | { type: "precondition_chat"; data: PreconditionChatData }
  | { type: "knowledge_transfer_questions"; data: null }
  | { type: "global_feedforward"; data: GlobalFeedforward }
  // 提案書作成関連
  | { type: "proposal_input"; data: ProposalInputData }
  | { type: "proposal_result"; data: ProposalResultData }
  | { type: "proposal_error"; data: ProposalErrorData }
  // 類似事例検索関連
  | { type: "similar_case_input"; data: SimilarCaseInputData }
  | { type: "similar_case_result"; data: SimilarCaseSearchResult };

// ============================================
// 提案書作成関連の型
// ============================================

/** 提案書入力データ（AttachedData用） */
export type ProposalInputData = {
  /** 入力ステップ (0: 初期選択, 1: 顧客背景, 2: 判断論点) */
  step: 0 | 1 | 2;
  /** 顧客背景（Step 1で入力済み、Step 2で参照） */
  customerContext?: Partial<CustomerContext>;
  /** 判断論点（Step 2で入力） */
  evaluationPoints?: Partial<EvaluationPoints>;
};

/** 提案書生成結果データ（AttachedData用） */
export type ProposalResultData = {
  /** 顧客背景 */
  customerContext: CustomerContext;
  /** 判断論点 */
  evaluationPoints: EvaluationPoints;
  /** 生成された提案書 */
  generatedProposal: GeneratedProposal;
  /** テンプレートID */
  templateId: string;
  /** 生成日時 */
  generatedAt: string;
};

/** 提案書生成エラーデータ（AttachedData用） */
export type ProposalErrorData = {
  /** エラーメッセージ */
  message: string;
  /** 再試行用の顧客背景 */
  customerContext: CustomerContext;
  /** 再試行用の判断論点 */
  evaluationPoints: EvaluationPoints;
};

// ============================================
// 類似事例検索関連の型
// ============================================

/** 類似事例検索入力データ（AttachedData用） */
export type SimilarCaseInputData = {
  /** 検索条件（部分入力可） */
  condition?: Partial<SimilarCaseSearchCondition>;
};

/** チャットメッセージ */
export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  /** 埋め込み分析結果 */
  attachedData?: AttachedData;
  /** ファイル名（ユーザーがアップロードした場合） */
  uploadedFiles?: string[];
  /** このメッセージ生成時の実行ログ（assistantメッセージのみ） */
  actionLogs?: ActionLogEntry[];
};

/** チャットセッション */
export type ChatSession = {
  id: string;
  agentType: AgentType;
  title: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

/** チャット状態 */
export type ChatState = {
  /** 現在のセッション */
  currentSession: ChatSession | null;
  /** 選択されたエージェント（セッション開始前） */
  selectedAgent: AgentType | null;
  /** セッション履歴 */
  sessions: ChatSession[];
  /** サイドバー開閉状態 */
  sidebarOpen: boolean;
};

/** エージェント一覧 */
export const AGENTS: AgentDefinition[] = [
  {
    type: "unified_analysis",
    label: "議事録分析",
    description: "議事録分析・過去事例検索を自動判定",
    icon: "search",
    available: true,
  },
  {
    type: "knowledge_extraction",
    label: "文書構造解析",
    description: "報告書から知見を構造化し、穴を見つける",
    icon: "document",
    available: true,
  },
  {
    type: "daily_report",
    label: "日報を書く",
    description: "毎日の業務記録・ヒヤリハットを入力",
    icon: "pen",
    available: false,
  },
];

/** デモ用クイックアクション（エージェント選択とは別） */
export type DemoAction = {
  id: string;
  label: string;
  description: string;
  icon: "document" | "search" | "compass";
  /** チャット欄に入力するデモ用データ */
  prompt: string;
  /** デモ用サンプルデータのID（分析実行に使用） */
  sampleDataId?: "meeting_minutes" | "trouble_report" | null;
};

