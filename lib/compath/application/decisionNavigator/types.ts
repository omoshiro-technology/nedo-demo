import type { SimilarCase } from "../../domain/types";
import type {
  ThinkingStrategyId,
  StrategyGoalDistance,
} from "../../domain/decisionNavigator/strategies/IThinkingStrategy";

// ============================================================
// Domain層からの再エクスポート（後方互換性維持）
// ============================================================
export type {
  ThinkingStrategyId,
  StrategyGoalDistance,
  GoalDistanceDimensions,
  StrategyDecisionContext,
  StrategySessionContext,
  PromptSet,
  IThinkingStrategy,
} from "../../domain/decisionNavigator/strategies/IThinkingStrategy";

export type {
  RiskLevel,
  RiskStrategy,
  RiskCategory,
  LLMRiskInfo,
  RationalePreset,
  DecisionNodeType,
  DecisionNodeStatus,
  PathRole,
  DecisionLevel,
  DecisionFlowNodeCore,
  ThinkingPattern,
  LayoutLane,
  DecisionMetadata,
  ConditionInputState,
  ThreeSetResult,
  OptionType,
  RiskDetail,
  RecommendationRationaleType,
  RationaleItem,
  RationaleTradeoff,
  AlternativeComparison,
  ImpactAssessment,
  QCDESImpact,
  CustomerImpact,
  StructuredRecommendationRationale,
  RadialOption,
  DecisionFlowNode,
  DecisionEdgeType,
  DecisionFlowEdge,
} from "../../domain/decisionNavigator/coreTypes";
export { THINKING_PATTERN_LABELS } from "../../domain/decisionNavigator/coreTypes";

// Re-import types used locally in this file
import type {
  RiskLevel,
  RiskStrategy,
  RiskCategory,
  LLMRiskInfo,
  DecisionLevel,
  ThinkingPattern,
  LayoutLane,
  OptionType,
  RiskDetail,
  QCDESImpact,
  CustomerImpact,
  StructuredRecommendationRationale,
  DecisionFlowNode,
  DecisionFlowEdge,
} from "../../domain/decisionNavigator/coreTypes";

/** 聞き出しカテゴリ */
export type ClarificationCategory = "problem_area" | "severity" | "timeline" | "stakeholders";

/** 聞き出しフェーズの状態 */
export type ClarificationPhase = {
  isActive: boolean;
  currentCategory: ClarificationCategory;
  completedCategories: ClarificationCategory[];
  collectedContext: {
    category: ClarificationCategory;
    selectedOptionId: string;
    keywords: string[];
  }[];
  accumulatedScore: number;
};

// DecisionLevel, DecisionMetadata, LayoutLane, ThinkingPattern,
// THINKING_PATTERN_LABELS are re-exported from coreTypes above

/** 判断軸ラベル（ノードではない、列の上に表示する問い） */
export type CriteriaLabel = {
  id: string;
  columnIndex: number;      // 何列目か（0, 1, 2...）- LLMが決定した最適順序に基づく
  question: string;         // 「運転パターンは？」などの問い
  description?: string;     // 補足説明
  /** LLMが決定した順序（1から始まる） */
  order: number;
  /** この順序にした理由 */
  orderReason?: string;
  /** 思考パターン（パス名）- Phase 24 */
  thinkingPattern?: ThinkingPattern;
  /** パス名（日本語表示用）- Phase 24 */
  pathName?: string;
  /** 制約により事前選択済みか */
  isPreSelected?: boolean;
  /** 事前選択された値（isPreSelectedがtrueの場合） */
  preSelectedValue?: string;
  /** 事前選択の理由（制約条件など） */
  preSelectedReason?: string;
};

/** 列の選択状態 */
export type ColumnState = "active" | "completed" | "locked";

// RecommendationRationaleType, RationaleItem, RationaleTradeoff,
// AlternativeComparison, ImpactAssessment, QCDESImpact, CustomerImpact,
// StructuredRecommendationRationale are re-exported from coreTypes above

// ============================================================
// Phase A: 問題カテゴリ自動判定
// ============================================================

/** 問題カテゴリ */
export type ProblemCategory =
  | "technical"       // 技術的問題（バグ、性能、設計）
  | "organizational"  // 組織的問題（人員、プロセス、コミュニケーション）
  | "strategic"       // 戦略的問題（方針、優先順位、リソース配分）
  | "personal";       // 個人的問題（スキル、モチベーション、キャリア）

/** 問題カテゴリ判定結果 */
export type ProblemCategoryResult = {
  primary: ProblemCategory;           // 主カテゴリ
  secondary?: ProblemCategory;        // 副カテゴリ（複合問題の場合）
  confidence: number;                 // 確信度（0-100）
  keywords: string[];                 // 判定に使用したキーワード
};

// DecisionFlowNode, RadialOption, DecisionEdgeType, DecisionFlowEdge
// are re-exported from coreTypes above

/** 選択履歴のエントリ */
export type SelectionHistoryEntry = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  level: DecisionLevel;
  selectedAt: string;
  rationale?: string;
  summary?: string; // 決定サマリー（「納期延長で対応する」等）
  confirmedAt?: string; // 確定日時
};

/** 確定待ちの選択 */
export type PendingSelection = {
  nodeId: string;
  nodeLabel: string;
  level: DecisionLevel;
  selectedAt: string;
  rationale?: string; // 選択理由
};

/** チャットメッセージ */
export type DecisionChatMessage = {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: string;
  relatedNodeId?: string;
  type?: "text" | "suggestion" | "confirmation" | "advice";
};

/** 推奨パス情報 */
export type RecommendedPath = {
  nodeIds: string[]; // 推奨パスのノードID列
  edgeIds: string[]; // 推奨パスのエッジID列
  score: number; // 総合スコア（0-100）
  rationaleTags: string[]; // 推奨理由タグ（例: ["低リスク", "過去実績あり"]）
};

/** 代替選択肢情報 */
export type AlternativeOption = {
  optionId: string;
  edgeId: string;
  childNodeId: string;
  score: number; // スコア（0-100）
  collapsedByDefault: boolean; // 初期状態で折りたたみ
  scoreDifference?: number; // 推奨との差（例: -5 = 推奨より5点低い）
  isContender?: boolean; // 有力候補（差が小さい場合）
  nodeData?: DecisionFlowNode; // 展開時に使用するノード情報
};

/** 分岐点情報 */
export type DecisionPoint = {
  nodeId: string; // 分岐点のノードID
  recommendedOptionId: string; // 推奨選択肢のID
  alternatives: AlternativeOption[]; // 代替選択肢群
};

/** レイアウトヒント */
export type LayoutHints = {
  laneOrder: Record<string, LayoutLane>; // ノードIDごとのレーン
  expandedBranches: string[]; // 展開中の分岐ID
};

/** 意思決定ナビゲーションセッション */
export type DecisionNavigatorSession = {
  id: string;
  title: string;
  purpose: string;
  documentSource?: {
    fileName: string;
    extractedContext: string;
  };

  // Phase 2: 支援モード（セッション開始時に固定）
  supportMode: SupportMode;

  // LLM統合: 意思決定コンテキスト
  decisionContext?: DecisionContext;
  clarificationState?: ClarificationState; // LLMからの質問状態

  // Phase A: 問題カテゴリ判定結果
  problemCategory?: ProblemCategoryResult;

  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];

  // Phase 8: 判断軸ラベル（ノードとは別管理）
  criteriaLabels?: CriteriaLabel[];
  columnStates?: ColumnState[];       // 各列の状態（active, completed, locked）
  currentColumnIndex?: number;        // 現在選択中の列（0からスタート）
  totalColumns?: number;              // 判断軸の総数

  currentNodeId: string;
  selectionHistory: SelectionHistoryEntry[];
  pendingSelection?: PendingSelection; // 確定待ちの選択
  chatHistory: DecisionChatMessage[]; // チャット履歴
  clarificationPhase?: ClarificationPhase; // 聞き出しフェーズの状態

  // Phase 3: 推奨パス全体表示
  recommendedPath?: RecommendedPath; // 推奨パス情報
  decisionPoints?: DecisionPoint[]; // 分岐点ごとの代替情報
  layoutHints?: LayoutHints; // レイアウトヒント

  // Phase C: 実行計画
  executionPlan?: ExecutionPlan;

  // LLM生成モード（フォールバック判定用）
  generationMode?: "llm" | "template" | "fallback";

  // Phase 7: ユーザー主導の終了
  userTerminated?: boolean;      // ユーザーが明示的に終了を選択
  terminationReason?: string;    // 終了理由
  terminatedAt?: string;         // 終了日時

  // Phase 3: 目的達成判定の構造化
  goalDefinition?: GoalDefinitionRef;  // ゴール定義
  goalState?: GoalState;               // ゴール状態

  // Phase 5改改: 前提条件
  preconditions?: PreconditionData;

  // Phase 9: シミュレーション条件（条件パネル用）
  simulationConditions?: SimulationCondition[];

  // 思考戦略エンジン: 使用中の戦略と多次元ゴール距離
  thinkingStrategy?: ThinkingStrategyId;
  strategyGoalDistance?: StrategyGoalDistance;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  stats: {
    totalNodes: number;
    selectedNodes: number;
    pastCasesUsed: number;
  };
};

// RiskDetail is re-exported from coreTypes above

/** 生成された選択肢 */
export type GeneratedOption = {
  label: string;
  description: string;
  confidence: number;
  riskLevel: RiskLevel;
  riskStrategy?: RiskStrategy; // PMBOKベースのリスク対応戦略
  riskCategories?: RiskCategory[]; // 関連するリスク種別
  riskDetail?: RiskDetail; // Phase 6: リスク詳細情報
  relatedPastCases: SimilarCase[];
  source: "ai_generated" | "past_case";
  isRecommended?: boolean;
  recommendationReason?: string;
  structuredRationale?: StructuredRecommendationRationale; // Phase 10: 構造化された推奨根拠
  // Phase 13: QCDES・顧客影響
  qcdesImpact?: QCDESImpact;       // QCDES影響評価
  customerImpact?: CustomerImpact; // 顧客影響評価
};

/** 選択肢生成レスポンス */
export type GenerateOptionsResponse = {
  options: GeneratedOption[];
  warnings?: string[];
};

/** Phase 5改改: 前提条件 */
export type Precondition = {
  id: string;
  label: string;
  category: string;
  detail?: string;
  isSelected: boolean;
};

/** Phase 5改改: 前提条件データ */
export type PreconditionData = {
  conditions: Precondition[];
  additionalContext?: string;
};

// ============================================================
// Phase 9: シミュレーション条件
// ============================================================

/** シミュレーション条件（チャットで確認した内容をタグ形式で表示） */
export type SimulationCondition = {
  id: string;
  criteriaId?: string;       // 関連する判断軸（任意）
  label: string;             // タグ表示用ラベル（「連続運転」「高頻度」など）
  value: string;             // 内部値
  options: string[];         // 選択可能な値一覧
  isUserDefined?: boolean;   // ユーザーが追加した条件か
  isPreSelected?: boolean;   // 事前収集された条件か
};

// ============================================================
// Phase 5改改改: 確認質問（暗黙条件引き出し）
// ============================================================

/** 確認質問の種別 */
export type ClarificationQuestionType =
  | "what_clarification"      // What（対象）の具体化
  | "implicit_condition"      // 暗黙条件の確認
  | "unrecognized_condition"  // 未認識条件の確認
  | "scope_clarification";    // スコープの明確化

/** 確認質問の回答形式 */
export type ClarificationAnswerType =
  | "yes_no"      // はい/いいえで回答（詳細入力は任意）
  | "free_text";  // 記述式で回答

/** 確認質問 */
export type ClarificationQuestion = {
  id: string;
  type: ClarificationQuestionType;
  question: string;           // 質問文
  category: string;           // 関連カテゴリ（safety, legal, cost, etc.）
  reason?: string;            // なぜこの質問をするか
  answerType: ClarificationAnswerType; // 回答形式
  placeholder?: string;       // 記述式の場合のプレースホルダー
  options?: {                 // 選択肢形式の場合
    id: string;
    label: string;
    implication?: string;     // この選択による影響
  }[];
  allowFreeText?: boolean;    // 自由入力を許可（後方互換性のため残す）
  priority: number;           // 表示優先度（高い順）
};

/** 確認質問への回答 */
export type PreconditionClarificationAnswer = {
  questionId: string;
  answer: "yes" | "no" | "skip" | string;  // はい/いいえ/スキップ または自由入力
  detail?: string;            // 詳細入力
};

/** 確認質問生成リクエスト */
export type GenerateClarificationQuestionsRequest = {
  purpose: string;
  chatContext?: string;       // チャットでの会話内容
};

/** 確認質問生成レスポンス */
export type GenerateClarificationQuestionsResponse = {
  questions: ClarificationQuestion[];
  contextSufficiency: {
    score: number;            // 0-100
    missingElements: string[]; // 不足している要素
  };
};

/** セッション作成リクエスト */
export type CreateSessionRequest = {
  purpose: string;
  documentBase64?: string;
  fileName?: string;
  currentSituation?: string;
  /** Phase 5改改: 前提条件 */
  preconditions?: PreconditionData;
  /** 聞き出しフロー（Clarification）をスキップするか */
  skipClarification?: boolean;
};

/** 選択記録リクエスト */
export type RecordSelectionRequest = {
  nodeId: string;
  rationale?: string;
  /** Phase 22: 放射状展開から選択された選択肢ID（criteriaNodeの場合） */
  optionId?: string;
};

// ============================================================
// Phase C: 実行支援パネル
// ============================================================

/** 実行計画アイテムの優先度 */
export type ExecutionPriority = "high" | "medium" | "low";

/** 実行計画アイテムのステータス */
export type ExecutionItemStatus = "pending" | "in_progress" | "completed";

/** 実行計画アイテム */
export type ExecutionPlanItem = {
  id: string;
  order: number;                      // 実行順序
  title: string;                      // タイトル
  description: string;                // 詳細説明
  estimatedDuration?: string;         // 所要時間目安（例: "1-2時間"）
  priority: ExecutionPriority;
  status: ExecutionItemStatus;
  dependencies?: string[];            // 依存する他のアイテムID
  relatedNodeId?: string;             // 関連するノードID
};

/** 実行計画のリスク */
export type ExecutionRisk = {
  description: string;
  mitigation: string;
};

/** 実行計画 */
export type ExecutionPlan = {
  id: string;
  sessionId: string;
  title: string;
  summary: string;                    // 決定の要約
  items: ExecutionPlanItem[];
  risks: ExecutionRisk[];
  createdAt: string;
  updatedAt: string;
};

// ============================================================
// LLM統合: 動的意思決定生成
// ============================================================

/** 意思決定コンテキスト（LLM入力の中核） */
export type DecisionContext = {
  purpose: string;                    // 目的（どうしたいか）
  currentSituation?: string;          // 現状（困っていること）
  documentSummary?: string;           // アップロード文書の要約
  constraints: string[];              // 累積した制約
  assumptions: string[];              // 累積した前提条件
  commitments: string[];              // 確定した約束事
  selectedPath: string[];             // 選択済みノードID列
};

/** LLMコンテキスト更新 */
export type LLMContextUpdates = {
  constraints?: string[];             // 新たな制約
  assumptions?: string[];             // 新たな前提条件
  commitments?: string[];             // 新たな約束事
};

/** LLM生成オプション */
export type LLMGeneratedOption = {
  id: string;
  label: string;
  description: string;
  optionType?: OptionType;            // 選択肢の型（決定値収束アーキテクチャ）
  riskStrategy: RiskStrategy;
  risk: LLMRiskInfo;
  irreversibilityScore: number;       // 0-100（不可逆度）
  contextUpdates?: LLMContextUpdates;
  // Phase 7: 動的深さサポート
  isTerminal?: boolean;               // 終了選択肢フラグ
  metadata?: {
    granularityScore?: number;        // 0-100
    reversibilityScore?: number;      // 0-100
    costScore?: number;               // 0-100
  };
};

/** LLM推奨情報 */
export type LLMRecommendation = {
  id: string;                         // 推奨オプションのID
  reason: string;                     // 推奨理由
};

/** LLM終了判定 */
export type LLMTermination = {
  shouldTerminate: boolean;           // 枝切りすべきか
  reason?: string;                    // 枝切り理由
};

/** LLM整合性ステータス */
export type LLMConsistencyStatus = "ok" | "conflict" | "needs-info";

/** LLM整合性チェック結果 */
export type LLMConsistency = {
  status: LLMConsistencyStatus;
  conflictReasons?: string[];         // conflict時の矛盾理由
  clarificationQuestions?: string[];  // needs-info時の質問
};

/** 目的達成状態 */
export type GoalStatus = "achieved" | "partial" | "unknown";

/** 次アクション種別 */
export type NextAction = "propose_options" | "finalize" | "ask_clarification" | "plan_execution";

// OptionType is re-exported from coreTypes above

/** LLM分析結果（決定値収束アーキテクチャ） */
export type LLMAnalysis = {
  currentGoal: string;           // ユーザーが最終的に決めたいこと
  decidedSoFar: string[];        // この選択で決まったこと
  remainingToDecide: string[];   // まだ決まっていないこと
};

/** 確定時の情報（拡張版） */
export type LLMFinalization = {
  summary: string;              // 決定内容のサマリー
  decisionValue?: string;       // 確定した決定値（例: "1.5m"）
  rationale?: string;           // 選択の根拠
  tolerance?: string;           // 許容範囲（例: "±0.2m"）
  nextSteps: string[];          // 次の実行ステップ
};

/** LLM次選択肢生成レスポンス */
export type LLMNextOptionsResponse = {
  // Phase: 決定値収束アーキテクチャ
  analysis?: LLMAnalysis;               // LLMの分析結果
  goalStatus?: GoalStatus;              // 目的達成状態
  openGaps?: string[];                  // 未解決項目
  nextAction?: NextAction;              // 次のアクション種別
  finalization?: LLMFinalization;       // 確定時の情報

  // 既存フィールド
  options: LLMGeneratedOption[];
  recommendation?: LLMRecommendation;
  termination: LLMTermination;
  consistency: LLMConsistency;
};

/** LLM推奨パスノード */
export type LLMRecommendedPathNode = {
  id: string;
  label: string;
  description: string;
  level: DecisionLevel;
  riskStrategy: RiskStrategy;
  risk: LLMRiskInfo;
  irreversibilityScore: number;
  reasonForRecommendation: string;
};

/** LLM推奨パス生成レスポンス */
export type LLMRecommendedPathResponse = {
  nodes: LLMRecommendedPathNode[];
  overallRationale: string;           // 推奨パス全体の理由
  alternatives?: {                    // 各ノードでの代替案
    parentNodeId: string;
    options: LLMGeneratedOption[];
  }[];
  termination: LLMTermination;
  consistency: LLMConsistency;
};

/** clarification回答 */
export type ClarificationAnswer = {
  questionIndex: number;
  answer: string;
};

/** clarification状態 */
export type ClarificationState = {
  isActive: boolean;
  questions: string[];
  answers: ClarificationAnswer[];
  sourceNodeId?: string;              // 質問が発生したノードID
};

// ============================================================
// Phase 2: 2モード分離アーキテクチャ（支援モード自動切替）
// ============================================================

/** 支援モード */
export type SupportMode =
  | "process"   // プロセス支援: 次に何をするべきか（how）
  | "thinking"; // 思考支援: どう考えるべきか（why/which）

/** 支援モード判定結果 */
export type SupportModeDetectionResult = {
  mode: SupportMode;
  confidence: number;       // 0-1: 判定の確信度
  reason: string;           // 判定理由
  matchedKeywords?: string[]; // マッチしたキーワード（ルールベースの場合）
};

/** セッション作成リクエスト（拡張版） */
export type CreateSessionRequestV2 = {
  purpose: string;
  currentSituation?: string;          // 現状入力（オプション）
  documentBase64?: string;
  fileName?: string;
  supportMode?: SupportMode;          // 明示指定（省略時は自動判定）
};

// ============================================================
// Phase 3: 目的達成判定の構造化（Goal Completion Architecture）
// ============================================================

/** ゴールの種類（goalDefinition.tsからの参照用） */
export type GoalType =
  | "numeric_value"     // 数値の決定（距離、金額、期間など）
  | "process_plan"      // 手順・プロセスの策定
  | "categorical_value" // カテゴリ選択（A or B）
  | "unknown";          // 不明

/** ゴールの対象（goalDefinition.tsからの参照用） */
export type GoalTarget =
  | "distance"   // 距離・間隔
  | "budget"     // 予算・金額
  | "duration"   // 期間・時間
  | "quantity"   // 数量
  | "ratio"      // 比率・割合
  | "process"    // 手順・プロセス
  | "selection"  // 選択（A or B）
  | "unknown";   // 不明

/** 完了条件の種類 */
export type CompletionRule =
  | "numeric_value"  // 数値が確定したら完了
  | "steps_ready"    // 手順が揃ったら完了
  | "categorical"    // カテゴリが選択されたら完了
  | "unknown";       // 不明

/** ゴール定義（セッション保存用の参照型） */
export type GoalDefinitionRef = {
  type: GoalType;
  target: GoalTarget;
  unitHints?: string[];           // 単位のヒント（m, mm, 円など）
  completionRule: CompletionRule;
  followupHints?: string[];       // 完了後の次の意思決定候補
};

/** ゴール状態 */
export type GoalState = {
  status: GoalStatus;
  decisionValue?: string;  // 確定した値（例: "0.8m"）
  decidedAt?: string;      // 確定日時
  reason?: string;         // 判定理由
};

// ============================================================
// Phase 5: 条件ベース絞り込みアーキテクチャ
// ============================================================

// 思考ボックス関連の型は thinkingBox/types.ts からエクスポート
export type {
  ConditionOptionType,
  ConditionCategory,
  ConditionSource,
  ConditionOption,
  CandidateValue,
  SpecialCircumstancesColumn,
  PastCaseCondition,
  PastCasesColumn,
  LLMRecommendationColumn,
  ThreeColumnLayout,
  InitialLayout,
  ThinkingBox,
  GoalDistanceCalculation,
  PruningDecision,
  ConditionSelectionResult,
  ChatContextHandover,
  CollectedInformation,
  CreateSessionRequestV3,
  CreateSessionResponseV3,
} from "./thinkingBox/types";
