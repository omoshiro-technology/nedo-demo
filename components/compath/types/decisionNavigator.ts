import type { SimilarCase } from "../types";

// ============================================================
// 思考戦略エンジン
// ============================================================

/** 利用可能な思考戦略 */
export type ThinkingStrategyId =
  | "forward"     // フォワード: 現状→方針→手法→行動
  | "backcast"    // バックキャスト: ゴールから逆算
  | "constraint"  // 制約ファースト: 制約を先に洗い出し
  | "risk"        // リスクファースト: リスク起点で逆算
  | "analogy";    // アナロジー: 類似事例のパターン転用

/** ゴール距離の4次元 */
export type GoalDistanceDimensions = {
  clarityScore: number;           // 問題の明確さ (0-100)
  riskCoverage: number;           // リスク対応率 (0-100)
  constraintSatisfaction: number; // 制約充足率 (0-100)
  actionReadiness: number;        // 行動への準備度 (0-100)
};

/** 戦略ベースのゴール距離 */
export type StrategyGoalDistance = {
  overall: number;                // 総合距離 (0-100, 0=ゴール到達)
  dimensions: GoalDistanceDimensions;
  strategySpecific?: Record<string, number>;
};

/** 戦略メタ情報 */
export type ThinkingStrategyMeta = {
  id: ThinkingStrategyId;
  name: string;
  description: string;
};

// ============================================================
// Phase X: 熟達者思考プロパティ（エキスパート思考の構造化）
// ============================================================

/** ルールの種類 */
export type DecisionRuleType = "if_then" | "if_else" | "switch" | "threshold";

/** 閾値条件 */
export type ThresholdCondition = {
  value: number;
  unit: string;
  operator: ">" | ">=" | "<" | "<=" | "==" | "!=";
};

/** 判断ルール: IF/Else構造 */
export type DecisionRule = {
  type: DecisionRuleType;
  condition: string;
  thenAction: string;
  elseAction?: string;
  threshold?: ThresholdCondition;
  cases?: Array<{ condition: string; action: string }>;
};

/** 条件の適用範囲 */
export type ConditionScope = "always" | "situational" | "exceptional";

/** 条件の確実性 */
export type ConditionCertainty = "verified" | "assumed" | "uncertain";

/** 判断条件 */
export type DecisionCondition = {
  description: string;
  scope: ConditionScope;
  certainty: ConditionCertainty;
  domain?: string;
  exceptions?: string[];
};

/** 重み付けの根拠 */
export type WeightBasis = "regulation" | "safety" | "cost" | "experience" | "preference" | "risk";

/** 判断の重み付け */
export type DecisionWeight = {
  score: number;
  basis: WeightBasis;
  rationale: string;
  affectedFactors?: string[];
  priorityRank?: number;
};

/** 根拠の種類 */
export type RationaleSource = "regulation" | "standard" | "experience" | "analysis" | "intuition" | "past_case";

/** 判断の根拠 */
export type DecisionRationale = {
  primary: string;
  secondary?: string[];
  source: RationaleSource;
  reference?: string;
  pastExperience?: {
    description: string;
    outcome: "success" | "failure" | "mixed";
    lesson: string;
  };
  confidence: number;
};

/** 観点のカテゴリ */
export type ViewpointCategory = "qcdes" | "stakeholder" | "temporal" | "risk" | "value";

/** QCDESサブカテゴリ */
export type QCDESSubCategory = "quality" | "cost" | "delivery" | "environment" | "safety";

/** 評価結果 */
export type ViewpointEvaluation = {
  score: number;
  comment: string;
};

/** 判断の観点 */
export type DecisionViewpoint = {
  name: string;
  category: ViewpointCategory;
  qcdesType?: QCDESSubCategory;
  perspective: string;
  evaluation: ViewpointEvaluation;
  isOftenOverlooked: boolean;
  overlookedRisk?: string;
  checkpoints?: string[];
};

/** 見落とし警告 */
export type OverlookedWarning = {
  viewpoint: string;
  risk: string;
  suggestion: string;
  severity: "critical" | "high" | "medium" | "low";
  checklist?: Array<{ item: string; isChecked: boolean }>;
};

/** 判断プロパティの情報源 */
export type DecisionPropertySource = "expert_input" | "llm_inference" | "past_case" | "user_experience";

/** 判断プロパティ - 熟達者の「思考の型」を構造化 */
export type DecisionProperty = {
  id: string;
  rule: DecisionRule;
  conditions: DecisionCondition[];
  weight: DecisionWeight;
  rationale: DecisionRationale;
  viewpoints: DecisionViewpoint[];
  source: DecisionPropertySource;
  confidence: number;
  createdAt: string;
  updatedAt: string;
  usageCount?: number;
  effectivenessScore?: number;
};

// ============================================================
// Phase 5改: 条件入力→3セット表示→候補選択のサイクル
// ============================================================

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
  additionalContext: string;
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
  answerType?: ClarificationAnswerType; // 回答形式（未指定時はyes_no）
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
  answer: "yes" | "no" | "skip" | string;
  detail?: string;
};

/** Phase 5改: 条件入力ノードの状態 */
export type ConditionInputState = {
  /** 抽出された条件（選択可能） */
  extractedConditions: Array<{
    id: string;
    label: string;
    category: string;
    description: string;
    isSelected: boolean;
    /** 絶対条件（ユーザー入力の詳細条件） */
    absoluteCondition?: string;
  }>;
  /** ユーザーが追加した条件 */
  userAddedConditions: Array<{
    id: string;
    label: string;
    category: string;
  }>;
  /** 補足条件（自由入力） */
  additionalCondition?: string;
  /** 条件入力が完了したか */
  isComplete: boolean;
};

/** Phase 5改: 3セット情報（類似検索・AI推論の結果） */
export type ThreeSetResult = {
  /** 類似の過去事例 */
  pastCases: Array<{
    id: string;
    sourceFileName: string;
    content: string;
    similarity: number;
  }>;
  /** AI推論による優先事項 */
  inferredPriorities: string[];
  /** AI推論による候補値 */
  candidateValues: Array<{
    id: string;
    value: string;
    rationale: string;
    source: "past_case" | "inference" | "standard";
  }>;
};

// ============================================================
// Phase 5: 条件ベース絞り込みアーキテクチャ
// ============================================================

/** 条件選択肢の種別 */
export type ConditionOptionType =
  | "implicit_condition"      // 暗黙条件: ユーザーが知っているが示していない
  | "unrecognized_condition"  // 未認識条件: ユーザーが気づいていない
  | "knowhow"                 // ノウハウ: 経験則・ベストプラクティス
  | "information_gap";        // 情報ギャップ: 不足している情報

/** 条件のカテゴリ */
export type ConditionCategory =
  | "legal"        // 法規・規制
  | "safety"       // 安全性
  | "cost"         // コスト
  | "time"         // 時間・納期
  | "resource"     // リソース
  | "stakeholder"  // 関係者
  | "technical"    // 技術的
  | "environmental" // 環境
  | "quality"      // 品質
  | "other";       // その他

/** 条件選択肢 */
export type ConditionOption = {
  id: string;
  type: ConditionOptionType;
  label: string;              // 表示ラベル
  description: string;        // 詳細説明
  category: ConditionCategory; // 条件のカテゴリ
  implications: string[];     // この条件を選ぶと何が絞られるか
  narrowsOptions: string[];   // 絞り込まれる選択肢のID
  source: "user_context" | "past_case" | "llm_inference";
  confidence: number;         // 確信度（0-100）
  isSelected?: boolean;       // 選択済みかどうか
  createdAt: string;
};

/** 候補値（最終的な決定値） */
export type CandidateValue = {
  id: string;
  value: string;                    // 例: "1.5m", "100万円"
  rationale: string;                // この値の根拠
  satisfiedConditions: string[];    // 満たす条件のID
  unsatisfiedConditions: string[];  // 満たさない条件のID
  score: number;                    // 総合スコア（0-100）
  isEliminated: boolean;            // 枝刈りされたか
  eliminationReason?: string;       // 枝刈り理由
};

/** 思考ボックス（再帰的に適用される汎用パターン） */
export type ThinkingBox = {
  id: string;
  depth: number;                    // 現在の深さ

  // 入力
  parentConditions: ConditionOption[];  // これまでに選択された条件
  remainingCandidates: CandidateValue[]; // 残っている候補値

  // 三列構造（常に同じパターン）
  columns: {
    contextual: ConditionOption[];   // 文脈から抽出した条件
    experiential: ConditionOption[]; // 過去事例から抽出した条件
    inferred: ConditionOption[];     // LLMが推論した条件
  };

  // ゴール情報
  goalDistance: number;             // ゴールへの距離（0-100、0が完了）
  canPrune: boolean;                // 枝刈り可能か

  // 終了条件
  isTerminal: boolean;              // 終了条件を満たすか
  terminationReason?: string;       // 終了理由

  createdAt: string;
  updatedAt: string;
};

/** ゴール距離計算の構成要素 */
export type GoalDistanceComponents = {
  unresolvedConditions: { count: number; weight: number; contribution: number };
  remainingCandidates: { count: number; weight: number; contribution: number };
  informationGaps: { count: number; weight: number; contribution: number };
  priorityAmbiguity: { level: "high" | "medium" | "low"; weight: number; contribution: number };
};

/** ゴール距離の計算結果 */
export type GoalDistanceCalculation = {
  baseScore: number;            // 基本スコア（0-100、0が最も近い）
  components: GoalDistanceComponents;
  display: {
    percentage: number;         // 0-100%（100%が完了）
    remainingSteps: number;     // 推定残りステップ数
    nextMilestone: string;      // 次のマイルストーン
  };
};

/** 進捗エントリ */
export type ProgressEntry = {
  timestamp: string;
  distance: number;
  action: string;
  conditionSelected?: string;
  candidatesRemaining: number;
};

/** ゴールコンパスの状態 */
export type GoalCompassState = {
  currentDistance: number;          // 現在のゴール距離（0-100、0が完了）
  completionPercentage: number;     // 完了率（0-100%）
  estimatedRemainingSteps: number;  // 推定残りステップ
  nextMilestone: string;            // 次のマイルストーン
  progressHistory: ProgressEntry[]; // 進捗履歴
  isAchieved: boolean;              // ゴール達成状態
  achievedValue?: string;           // 達成した決定値
};

/** 三列初期レイアウトの列 */
export type SpecialCircumstancesColumn = {
  type: "special_circumstances";
  title: string;
  items: ConditionOption[];
  source: "user_input" | "document" | "chat_context";
};

export type PastCaseCondition = {
  condition: ConditionOption;
  caseId: string;
  caseSummary: string;
  outcomeValue?: string;
};

export type PastCasesColumn = {
  type: "past_cases";
  title: string;
  items: PastCaseCondition[];
  searchQuery: string;
  totalMatches: number;
};

export type LLMRecommendationColumn = {
  type: "llm_recommendation";
  title: string;
  items: ConditionOption[];
  rationale: string;
};

/** ゴールの種類 */
export type GoalType = "numeric_value" | "process_plan" | "categorical_value" | "unknown";
export type GoalTarget = "distance" | "budget" | "duration" | "process" | "selection" | "unknown";

/** ゴール定義 */
export type GoalDefinition = {
  type: GoalType;
  target: GoalTarget;
  unitHints?: string[];
  completionRule: "numeric_value" | "steps_ready" | "categorical" | "unknown";
  followupHints?: string[];
};

/** 三列初期レイアウト */
export type InitialLayout = {
  columns: {
    specialCircumstances: SpecialCircumstancesColumn;
    pastCases: PastCasesColumn;
    llmRecommendations: LLMRecommendationColumn;
  };
  goalDefinition: GoalDefinition;
  initialDistance: number;
  initialCandidates: CandidateValue[];
};

/** 条件選択結果 */
export type ConditionSelectionResult = {
  selectedCondition: ConditionOption;
  updatedConditions: ConditionOption[];
  remainingCandidates: CandidateValue[];
  eliminatedCandidates: CandidateValue[];
  nextThinkingBox: ThinkingBox;
  goalDistance: GoalDistanceCalculation;
  isGoalAchieved: boolean;
  achievedValue?: string;
};

/** チャットから引き継ぐコンテキスト */
export type ChatContextHandover = {
  purpose: string;
  currentSituation?: string;
  collectedInformation: {
    explicitConditions: ConditionOption[];
    impliedConditions: ConditionOption[];
    mentionedCases: string[];
    priorities: { factor: string; importance: "high" | "medium" | "low" }[];
    rejectedOptions: { option: string; reason: string }[];
  };
  conversationSummary: string;
};

// ============================================================
// 既存の型定義
// ============================================================

/** 選択肢ノードの種別 */
export type DecisionNodeType = "start" | "decision" | "action" | "outcome" | "merge" | "clarification" | "condition_input" | "terminal";

/** 聞き出しカテゴリ */
export type ClarificationCategory = "problem_area" | "severity" | "timeline" | "stakeholders";

/** 選択肢の階層レベル（動的拡張対応） */
export type DecisionLevel = "strategy" | "tactic" | "action" | "sub-action" | "followup" | "criteria" | "outcome";

/** 意思決定メタデータ（Phase 7: 動的深さサポート） */
export type DecisionMetadata = {
  granularityScore: number;      // 0-100: 抽象(0) → 具体(100)
  reversibilityScore: number;    // 0-100: 不可逆(0) → 可逆(100)
  costScore: number;             // 0-100: 低コスト(0) → 高コスト(100)
  depth: number;                 // 現在の深さ（開始を0とする）
  maxDepth?: number;             // 推奨最大深さ（LLMが判断）
};

/** 選択肢の状態 */
export type DecisionNodeStatus =
  | "recommended"            // 推奨パス上のノード（初期表示）
  | "selected"               // ユーザーが明示選択したノード
  | "available"              // 展開された代替選択肢
  | "alternative"            // オンデマンドで取得された代替選択肢
  | "alternative-collapsed"  // 折りたたまれた代替選択肢
  | "hidden"                 // 非表示（代替選択肢、まだ展開されていない）
  | "dimmed"                 // 非フォーカス
  | "locked";                // ロック状態

/** パス内での役割 */
export type PathRole = "recommended" | "selected" | "alternative";

/** レーン（配置位置）: 0=推奨パス、1,2,3...=代替選択肢（右方向に配置） */
export type LayoutLane = number;

// ============================================================
// Phase 8: 判断軸ラベル化（判断軸はノードではなくラベルとして扱う）
// ============================================================

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
  /** 制約により事前選択済みか */
  isPreSelected?: boolean;
  /** 事前選択された値（isPreSelectedがtrueの場合） */
  preSelectedValue?: string;
  /** 事前選択の理由（制約条件など） */
  preSelectedReason?: string;
};

/** 列の選択状態 */
export type ColumnState = "active" | "completed" | "locked";

/** リスクレベル */
export type RiskLevel = "high" | "medium" | "low";

/** リスク対応戦略（PMBOKベース） */
export type RiskStrategy = "avoid" | "mitigate" | "transfer" | "accept";

/** リスク種別 */
export type RiskCategory = "safety" | "quality" | "cost" | "delivery" | "environment" | "scope";

/**
 * Phase 6: リスク詳細情報
 *
 * 選択肢に関連するリスクを明確に説明する
 * - targetRisk: 対象となるリスクの説明
 * - howThisHelps: この選択がリスクにどう対応するか
 * - residualRisk: 残存リスク（この選択を選んでも残るリスク）
 * - tradeoffs: トレードオフ（この選択による代償）
 */
export type RiskDetail = {
  /** 対象となるリスク: 「〇〇というリスクがあります」 */
  targetRisk: string;
  /** この選択の効果: 「この選択を選ぶと、〇〇できます」 */
  howThisHelps: string;
  /** 残存リスク: 「ただし、△△には注意が必要です」（任意） */
  residualRisk?: string;
  /** トレードオフ: 「この選択により、□□が犠牲になる可能性があります」（任意） */
  tradeoffs?: string[];
  /** リスクの深刻度（任意、riskLevelと重複する場合は省略可） */
  severity?: "critical" | "major" | "minor";
};

// ============================================================
// Phase 10: 推奨の根拠表示
// ============================================================

/** 根拠の種類 */
export type RecommendationRationaleType =
  | "pmbok_risk"      // PMBOKリスク戦略
  | "business_value"  // ビジネス観点
  | "context_fit"     // 文脈適合
  | "past_case";      // 過去事例

/** 根拠アイテム */
export type RationaleItem = {
  type: RecommendationRationaleType;
  title: string;       // 表示タイトル
  content: string;     // 詳細説明
  confidence: number;  // 0-100: この根拠の確信度
};

/** トレードオフ情報 */
export type RationaleTradeoff = {
  factor: string;
  impact: "positive" | "negative" | "neutral";
  description: string;
};

/** 他選択肢との比較（Phase 10.5） */
export type AlternativeComparison = {
  alternativeId: string;       // 比較対象の選択肢ID
  alternativeLabel: string;    // 比較対象の選択肢名
  differencePoint: string;     // 差分の一言（例：「顧客関係リスクが高い」）
  advantageAxis: string;       // 推奨が勝っている軸（例：「リスク」「コスト」）
};

// ============================================================
// Phase 13: QCDES・顧客影響評価
// ============================================================

/** 影響評価 */
export type ImpactAssessment = {
  impact: "positive" | "negative" | "neutral";
  description: string;
};

/** QCDES影響評価 */
export type QCDESImpact = {
  quality?: ImpactAssessment;     // 品質への影響
  cost?: ImpactAssessment;        // コストへの影響
  delivery?: ImpactAssessment;    // 納期への影響
  environment?: ImpactAssessment; // 環境への影響
  safety?: ImpactAssessment;      // 安全への影響
};

/** 顧客影響評価 */
export type CustomerImpact = {
  value?: ImpactAssessment;        // 顧客価値への影響
  relationship?: ImpactAssessment; // 顧客関係への影響
  satisfaction?: ImpactAssessment; // 顧客満足度への影響
};

/** 構造化された推奨根拠 */
export type StructuredRecommendationRationale = {
  summary: string;              // 一行サマリー
  primary: RationaleItem;       // 主根拠
  secondary?: RationaleItem[];  // 副次的根拠
  tradeoffs?: RationaleTradeoff[];  // トレードオフ
  // Phase 10.5: 他選択肢との比較
  decisionPoints?: string[];              // 決め手サマリー（3点以内）
  comparisons?: AlternativeComparison[];  // 他選択肢との比較（2件以内）
  // Phase 13: QCDES・顧客影響
  qcdesImpact?: QCDESImpact;       // QCDES影響評価
  customerImpact?: CustomerImpact; // 顧客影響評価
};

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

/** 選択理由プリセット */
export type RationalePreset = {
  id: string;
  label: string;
  category: "qcdes" | "risk" | "evidence" | "thinking" | "custom";
  priority: number; // 表示順（高い順）
};

/** 選択肢ノード */
export type DecisionFlowNode = {
  id: string;
  type: DecisionNodeType;
  level: DecisionLevel;
  label: string;
  description?: string;

  // 評価情報
  confidence?: number; // 確度（0-100）
  riskLevel?: RiskLevel;
  riskStrategy?: RiskStrategy; // PMBOKベースのリスク対応戦略
  riskCategories?: RiskCategory[]; // 関連するリスク種別
  riskDetail?: RiskDetail; // Phase 6: リスク詳細情報
  hasPastCase?: boolean;
  pastCaseCount?: number;
  pastCases?: SimilarCase[]; // 関連する過去事例
  /** SI技術伝承（汎知化）ナレッジベースからの情報を含むかどうか */
  isFromKnowledgeBase?: boolean;

  // Phase 12: 判断理由継承表示
  pastAdoptions?: {
    /** 過去の採用件数 */
    count: number;
    /** 採用理由（上位2-3件） */
    rationales: string[];
  };

  // 推奨情報
  isRecommended?: boolean; // AIが推奨する選択肢
  recommendationReason?: string; // 推奨理由
  structuredRationale?: StructuredRecommendationRationale; // 構造化された推奨根拠（Phase 10）

  // 選択理由プリセット（動的生成）
  rationalePresets?: RationalePreset[];

  // パス情報（Phase 3: 推奨パス全体表示）
  pathRole?: PathRole; // パス内での役割
  recommendationRank?: number; // 推奨順位（1が最高）
  branchId?: string; // 分岐識別子

  // レイアウト情報
  lane?: LayoutLane; // 配置レーン（0=推奨、1,2,3...=代替）
  depth?: number; // ツリー内の深さ

  // 代替選択肢の情報
  alternatives?: {
    total: number; // 代替の総数
    expanded: boolean; // 展開状態
    visibleCount: number; // 表示中の代替数
  };

  // 比較モード用
  isContender?: boolean; // 有力候補（推奨との差が小さい場合）
  scoreDifference?: number; // 推奨との差（負の値 = 推奨より低い）

  // 関係性
  parentDecisionId?: string; // 親の分岐点ノードID
  optionId?: string; // オプション識別子

  // 表示状態
  status: DecisionNodeStatus;
  isExpanded?: boolean;
  isSelectable?: boolean; // 選択可能かどうか（親子関係に基づく）

  // 位置情報
  position: { x: number; y: number };

  // 親子関係
  parentId?: string;
  childIds?: string[];

  // メタデータ
  createdAt: string;
  selectedAt?: string;
  source?: "ai_generated" | "past_case" | "user_input";

  // Phase 7: 動的深さサポート
  metadata?: DecisionMetadata;   // 粒度/可逆性/コストスコア
  isTerminal?: boolean;          // ユーザーが「ここで終了」を選択可能
  canContinue?: boolean;         // さらに深堀り可能か

  // Phase 5改: 条件入力ノード用
  conditionInputState?: ConditionInputState;  // 条件入力の状態（type=condition_input時）
  threeSetResult?: ThreeSetResult;            // 3セット情報（類似検索・AI推論の結果）

  // Phase X: 熟達者思考プロパティ（エキスパート思考の構造化）
  decisionProperty?: DecisionProperty;        // 判断プロパティ（ルール/条件/重要度/理由/観点）
  overlookedWarnings?: OverlookedWarning[];   // 見落とし警告

  // Phase 17: ベテラン思考プロセスの可視化
  veteranInsight?: string;                    // 判断軸(criteria)向け: ベテランの経験談（「私の経験では...」形式）
  rationale?: string;                         // 選択肢(strategy)向け: なぜこれを選ぶ/選ばないかの理由

  // Phase 22: 探索ノードフラグ（クリックで判断軸追加APIを呼び出す）
  isExplorationNode?: boolean;

  // Phase 23: 問いに対する理由（なぜこれを聞くのか）
  questionReason?: string;                    // 目的達成に向けてこの問いが必要な理由

  // Phase 24: パス名（判断軸の上に表示）
  pathName?: string;                          // パス名（例：「リスク回避思考パス」）
  thinkingPattern?: string;                   // 思考パターンのカテゴリ

  // ゴール接続: なぜこの問いに答えるのか（15文字以内）
  goalConnection?: string;
};

/** エッジの種別 */
export type DecisionEdgeType =
  | "recommended"            // 推奨パスの幹線
  | "selected"               // ユーザー選択パス
  | "available"              // 選択可能なエッジ
  | "alternative"            // 展開済み代替パス
  | "alternative-collapsed"  // 折りたたみの示唆
  | "hidden"                 // 非表示（代替選択肢、まだ展開されていない）
  | "dimmed"                 // 非選択
  | "locked"                 // ロック状態
  | "guide"                  // Phase 21: 誘導エッジ（選択後にAIが関連判断軸を提案）
  | "converge";              // 収束エッジ（既存の判断軸に戻る）

/** 選択肢間のエッジ */
export type DecisionFlowEdge = {
  id: string;
  source: string;
  target: string;
  type: DecisionEdgeType;
  label?: string;
  conditions?: string[]; // この選択肢を選ぶための条件
  isRecommended?: boolean; // 推奨パスのエッジ
  rationale?: string; // 選択理由（selectedエッジのみ）
  // Phase 7: Handle指定（縦方向エッジ用）
  sourceHandle?: string; // "right" | "bottom"
  targetHandle?: string; // "left" | "top"
  // Phase 21: アニメーション（誘導エッジ用）
  animated?: boolean;
};

/** 選択履歴のエントリ */
export type SelectionHistoryEntry = {
  id: string;
  nodeId: string;
  nodeLabel: string;
  level: DecisionLevel;
  selectedAt: string;
  rationale?: string; // 選択理由（任意入力）
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
  relatedNodeId?: string; // 関連するノード
  type?: "text" | "suggestion" | "confirmation"; // メッセージタイプ
};

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
  purpose: string; // 入力された目的/課題
  currentSituation?: string; // 現状・困りごと
  documentSource?: {
    fileName: string;
    extractedContext: string;
  };

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

  // LLM統合
  decisionContext?: DecisionContext; // LLM用コンテキスト
  generationMode?: GenerationMode; // 生成モード
  clarificationState?: ClarificationState; // clarification状態
  terminationWarning?: string; // 終了警告

  // Phase 7: ユーザー主導の終了
  userTerminated?: boolean;      // ユーザーが明示的に終了を選択
  terminationReason?: string;    // 終了理由
  terminatedAt?: string;         // 終了日時

  // Phase 5改改: 前提条件
  preconditions?: PreconditionData;

  // 思考戦略エンジン
  thinkingStrategy?: ThinkingStrategyId;
  strategyGoalDistance?: StrategyGoalDistance;

  createdAt: string;
  updatedAt: string;
  completedAt?: string;

  // 統計
  stats: {
    totalNodes: number;
    selectedNodes: number;
    pastCasesUsed: number;
  };
};

/** 選択肢生成リクエスト */
export type GenerateOptionsRequest = {
  sessionId: string;
  parentNodeId: string; // 親ノードのID
  context: {
    purpose: string;
    selectedPath: SelectionHistoryEntry[];
    documentContext?: string;
  };
};

/** 生成された選択肢 */
export type GeneratedOption = {
  label: string;
  description: string;
  confidence: number;
  riskLevel: RiskLevel;
  riskStrategy?: RiskStrategy; // PMBOKベースのリスク対応戦略
  riskCategories?: RiskCategory[]; // 関連するリスク種別
  relatedPastCases: SimilarCase[];
  source: "ai_generated" | "past_case";
  isRecommended?: boolean;
  recommendationReason?: string;
};

/** 選択肢生成レスポンス */
export type GenerateOptionsResponse = {
  options: GeneratedOption[];
  warnings?: string[];
};

/** セッション作成リクエスト */
export type CreateSessionRequest = {
  purpose: string;
  currentSituation?: string; // 現状・困りごと（オプション）
  documentBase64?: string;
  fileName?: string;
};

// ============================================================
// LLM統合: DecisionContext & Clarification
// ============================================================

/** LLMリスク情報 */
export type LLMRiskInfo = {
  probability: number; // 1-5
  impact: number; // 1-5
  score: number; // 0-100
  level: RiskLevel;
};

/** DecisionContext - LLM用コンテキスト */
export type DecisionContext = {
  purpose: string;
  currentSituation?: string;
  documentSummary?: string;
  constraints: string[];
  assumptions: string[];
  commitments: string[];
  selectedPath: string[];
};

/** Clarification状態 */
export type ClarificationState = {
  isActive: boolean;
  questions: string[];
  answers?: Array<{ question: string; answer: string }>;
};

/** 生成モード */
export type GenerationMode = "llm" | "template" | "fallback";

/** 選択記録リクエスト */
export type RecordSelectionRequest = {
  nodeId: string;
  rationale?: string;
};

/** ReactFlow用のノードデータ */
export type FlowNodeData = {
  label: string;
  description?: string;
  type: DecisionNodeType;
  level: DecisionLevel;
  status: DecisionNodeStatus;
  confidence?: number;
  riskLevel?: RiskLevel;
  riskStrategy?: RiskStrategy; // PMBOKベースのリスク対応戦略
  riskCategories?: RiskCategory[]; // 関連するリスク種別
  hasPastCase?: boolean;
  pastCaseCount?: number;
  /** SI技術伝承（汎知化）ナレッジベースからの情報を含むかどうか */
  isFromKnowledgeBase?: boolean;
  // Phase 12: 判断理由継承表示
  pastAdoptions?: {
    count: number;
    rationales: string[];
  };
  isRecommended?: boolean;
  recommendationReason?: string;
  rationalePresets?: RationalePreset[]; // 選択理由プリセット（動的生成）
  nodeId: string; // 元のノードID
  onSelect?: (nodeId: string) => void; // 選択ボタンクリック時のコールバック
  // Phase 3: 推奨パス全体表示
  pathRole?: PathRole;
  lane?: LayoutLane;
  alternatives?: {
    total: number;
    expanded: boolean;
    visibleCount: number;
  };
  onToggleAlternatives?: (nodeId: string, expand: boolean) => void; // 代替選択肢の展開/折りたたみ
  // Phase 3: 比較モード用
  isContender?: boolean; // 有力候補（推奨との差が小さい場合）
  scoreDifference?: number; // 推奨との差（負の値 = 推奨より低い）
  // 選択可能フラグ
  isSelectable?: boolean; // 選択可能かどうか（親子関係に基づく）
  // Phase 8: ローディング中フラグ
  isLoadingNext?: boolean; // 次の選択肢を取得中
  // Phase 6: 前提条件との整合性
  preconditionMatch?: "recommended" | "neutral" | "conflict"; // 前提条件との整合性
  // Phase 16: 必須検討マーカー（同じラベルの選択肢が複数段階に出現する場合）
  isRecurringOption?: boolean; // 他の段階でも出現する選択肢
  recurringDepths?: number[];  // 出現する段階のリスト（現在の段階を含む）
  // Phase 5改: 条件入力ノード用
  conditionInputState?: ConditionInputState;
  isActive?: boolean;
  onConditionToggle?: (conditionId: string) => void;
  onConditionAdd?: (label: string, category: string) => void;
  onAdditionalContextChange?: (context: string) => void;
  onComplete?: () => void;
  // Phase 22: 探索ノードフラグ
  isExplorationNode?: boolean;
  // Phase 22: 探索中フラグ（APIコール中）
  isExploring?: boolean;
  // Phase 23: 問いに対する理由
  questionReason?: string;
  // Phase 24: パス名（思考パターン）
  pathName?: string;
  thinkingPattern?: string;
  // ゴール接続: なぜこの問いに答えるのか（15文字以内）
  goalConnection?: string;
  // 選択後圧縮: この列が選択済みか
  isColumnCompleted?: boolean;
  // 選択後圧縮: 非表示の兄弟数（compact criteria用）
  hiddenAlternativeCount?: number;
  // カバレッジマップ（outcomeノード用）: 判断軸の網羅性を視覚化
  coveragePieces?: Array<{
    id: string;
    label: string;
    state: "completed" | "active" | "locked";
  }>;
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
// 意思決定ナビゲーター終了結果（チャット復帰用）
// ============================================================

/** ナビゲーター終了時のステータス */
export type DecisionNavigatorCloseReason =
  | "completed"       // 最終決定まで完了
  | "in_progress"     // 途中で閉じた（再開可能）
  | "cancelled";      // キャンセル（セッション未開始）

/** ナビゲーター終了時の結果 */
export type DecisionNavigatorCloseResult = {
  reason: DecisionNavigatorCloseReason;
  sessionId?: string;
  purpose?: string;
  /** 完了時: 最終決定の内容 */
  finalDecision?: {
    value: string;
    rationale: string;
    satisfiedConditions: string[];
  };
  /** 途中終了時: 現在の進捗 */
  progress?: {
    selectedNodes: number;
    totalNodes: number;
    lastSelectedNode?: string;
  };
  /** セッションの選択履歴（再開用） */
  selectionHistory?: SelectionHistoryEntry[];
};

// ============================================================
// Phase 9: シミュレーション条件 + 過去事例参照
// ============================================================

/** シミュレーション条件（チャットで確認した内容をタグ形式で表示） */
export type SimulationCondition = {
  id: string;
  criteriaId?: string;       // 関連する判断軸（任意）
  label: string;             // タグ表示用ラベル（「連続運転」「高頻度」など）
  value: string;             // 内部値
  options: string[];         // 選択可能な値一覧
  isUserDefined?: boolean;   // ユーザーが追加した条件か
  isPreSelected?: boolean;   // 事前収集された条件か（KnowledgeTransferQuestionCardで収集）
};

/** 過去事例の判断詳細 */
export type PastCaseDecision = {
  criteriaId: string;
  criteriaLabel: string;      // 判断軸の表示名
  selectedOption: string;     // 選択した選択肢
  rationale: string;          // 判断理由
};

/** 過去事例参照（上半分パネル用） */
export type PastCaseReference = {
  id: string;
  caseNumber: string;         // 工番
  date: string;               // 日付
  summary: string;            // 概要
  purpose: string;            // 目的
  decisions: PastCaseDecision[];  // 各判断軸での決定
  outcome: string;            // 最終結果
  similarity?: number;        // 現在の目的との類似度（0-100）
  /** SI技術伝承（汎知化）ナレッジベースからの事例かどうか */
  isFromKnowledgeBase?: boolean;
  /** ベテランの経験談・技術的アドバイス（Phase 29: RAG材料強化） */
  veteranInsight?: string;
};

// ============================================================
// Phase 21: 放射状展開UI
// ============================================================

/**
 * 放射状に展開される選択肢
 * - angle: 中心からの角度（度）
 * - distance: 中心からの距離（px）
 */
export type RadialOption = {
  id: string;
  label: string;
  description?: string;
  isRecommended?: boolean;
  riskStrategy?: RiskStrategy;
  angle: number;              // 放射状配置の角度（度）
  distance: number;           // 中心からの距離（px）
};

/**
 * 判断軸ノードの展開状態
 */
export type CriteriaExpandState = "collapsed" | "expanded" | "decided";

/**
 * 判断軸ノードのデータ（ReactFlow用）
 * - 展開前: 問いのみ表示
 * - 展開中: 放射状に選択肢が表示
 * - 決定後: 選択内容が表示、関連ノードへエッジ接続
 */
export type CriteriaNodeData = {
  type: "criteria";
  criteriaId: string;
  question: string;
  description?: string;
  goalConnection?: string;      // ゴールとの繋がり（「〇〇を決めるために」形式）
  expandState: CriteriaExpandState;
  selectedOptionId?: string;    // 選択済みの場合
  options: RadialOption[];      // 放射状に表示する選択肢
  nodeId: string;               // 元のノードID（FlowNodeData互換）
  onOptionSelect?: (criteriaId: string, optionId: string) => void;
  onExpandStateChange?: (criteriaId: string, state: CriteriaExpandState) => void;
};

// ============================================================
// Phase 27: 意思決定履歴可視化（DecisionJourneyView）
// ============================================================

/**
 * 判断ジャーニーの1ステップ
 * 判断軸 → 選択内容 → 理由 → リスク戦略の構造
 */
export type DecisionJourneyStep = {
  order: number;                  // 判断順序（1, 2, 3...）
  criteriaId: string;             // 判断軸ID
  criteriaLabel: string;          // 判断軸の問い（例: 起動頻度は？）
  selectedOption: string;         // 選択内容（例: 30回以上）
  selectedOptionDescription?: string; // 選択内容の補足説明
  rationale?: string;             // 判断理由
  riskStrategy?: RiskStrategy;    // リスク戦略（回避/軽減/転嫁/受容）
  riskLevel?: RiskLevel;          // リスクレベル
  timestamp: string;              // 決定日時
};

/**
 * 判断ジャーニー全体のデータ
 * 目的達成のために行った判断のパスと内容
 */
export type DecisionJourneyData = {
  purpose: string;                // 意思決定の目的
  currentSituation?: string;      // 現状の状況説明
  steps: DecisionJourneyStep[];   // 判断ステップのリスト
  summary: {
    totalSteps: number;           // 総判断数
    riskHedgeCount: number;       // リスクヘッジ（回避/軽減）の数
    riskTakeCount: number;        // リスクテイク（受容）の数
    primaryConsiderations: string[]; // 主要な考慮点
  };
  outcome?: string;               // 最終結果・結論
  createdAt: string;              // 作成日時
  completedAt?: string;           // 完了日時
};
