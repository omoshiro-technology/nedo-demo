/**
 * Decision Navigator コア型定義
 *
 * Domain層で使用される基本型をここに定義
 * Application層からは再エクスポートして後方互換性を維持
 */

import type { SimilarCase } from "../types";
import type { DecisionProperty, OverlookedWarning } from "./expertThinking";

// ============================================================
// リスク関連型
// ============================================================

/** リスクレベル */
export type RiskLevel = "high" | "medium" | "low";

/** リスク対応戦略（PMBOKベース） */
export type RiskStrategy = "avoid" | "mitigate" | "transfer" | "accept";

/** リスク種別 */
export type RiskCategory = "safety" | "quality" | "cost" | "delivery" | "environment" | "scope";

/** LLMリスク情報 */
export type LLMRiskInfo = {
  probability: number;                // 1-5
  impact: number;                     // 1-5
  score: number;                      // 0-100（probability * impact * 4）
  level: RiskLevel;                   // "low" | "medium" | "high"
};

// ============================================================
// 選択理由プリセット
// ============================================================

/** 選択理由プリセット */
export type RationalePreset = {
  id: string;
  label: string;
  category: "qcdes" | "risk" | "evidence" | "thinking" | "custom";
  priority: number; // 表示順（高い順）
};

// ============================================================
// ノード関連型（Domain層で使用する最小限のプロパティ）
// ============================================================

/** 選択肢ノードの種別 */
export type DecisionNodeType =
  | "start"
  | "decision"
  | "action"
  | "outcome"
  | "merge"
  | "clarification"
  | "condition_input"
  | "terminal"
  // Path Comparison UI用
  | "axis"          // 評価軸ノード
  | "pathHeader"    // パスヘッダーノード
  | "pathStep"      // パスステップノード
  | "pathGoal"      // パスゴールノード
  | "delta";        // 差分ノード

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

/** 意思決定レベル（Backcasting Canvas対応） */
export type DecisionLevel = "strategy" | "tactic" | "action" | "sub-action" | "followup" | "criteria" | "outcome";

/** パス内での役割 */
export type PathRole = "recommended" | "selected" | "alternative";

/**
 * DecisionFlowNode の Domain層向け最小インターフェース
 *
 * Domain層のロジックが必要とするプロパティのみを定義
 * Application層の完全な DecisionFlowNode はこれを拡張する
 */
export interface DecisionFlowNodeCore {
  id: string;
  type: DecisionNodeType;
  status: DecisionNodeStatus;
  pathRole?: PathRole;
  parentId?: string;

  // 意思決定レベル（Backcasting Canvas対応）
  level?: DecisionLevel;

  // リスク関連（rationalePresets.ts で使用）
  riskStrategy?: RiskStrategy;
  riskCategories?: RiskCategory[];
  hasPastCase?: boolean;
  isRecommended?: boolean;
}

// ============================================================
// Phase 8: 思考パターン（パス名のカテゴリ）
// ============================================================

/** 思考パターン（パス名のカテゴリ） */
export type ThinkingPattern =
  | "risk-avoidance"           // リスク回避思考
  | "risk-efficiency-tradeoff" // リスクと効率のトレードオフ
  | "cost-priority"            // コスト優先順位
  | "track-record-vs-innovation" // 実績 vs 革新
  | "safety-margin"            // 安全マージン
  | "judgment-basis"           // 判断根拠
  | "future-flexibility"       // 将来の柔軟性
  | "veteran-experience";      // ベテランの経験

/** 思考パターンの表示名マッピング */
export const THINKING_PATTERN_LABELS: Record<ThinkingPattern, string> = {
  "risk-avoidance": "リスク回避か効率か",
  "risk-efficiency-tradeoff": "リスクか効率か",
  "cost-priority": "初期コストか保全性か",
  "track-record-vs-innovation": "実績か新技術か",
  "safety-margin": "マージン大か最小か",
  "judgment-basis": "理論か事例か",
  "future-flexibility": "現状最適か拡張性か",
  "veteran-experience": "経験則か標準か",
};

// ============================================================
// レイアウト関連型
// ============================================================

/** レーン（配置位置）: 0=推奨パス、1,2,3...=代替選択肢（右方向に配置） */
export type LayoutLane = number;

/** 意思決定メタデータ（Phase 7: 動的深さサポート） */
export type DecisionMetadata = {
  granularityScore: number;      // 0-100: 抽象(0) → 具体(100)
  reversibilityScore: number;    // 0-100: 不可逆(0) → 可逆(100)
  costScore: number;             // 0-100: 低コスト(0) → 高コスト(100)
  depth: number;                 // 現在の深さ（開始を0とする）
  maxDepth?: number;             // 推奨最大深さ（LLMが判断）
};

// ============================================================
// 条件入力・3セット関連型
// ============================================================

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
// 選択肢の型
// ============================================================

/** 選択肢の型（方向性重視アーキテクチャ） */
export type OptionType =
  | "direction"        // 進むべき方向性
  | "priority"         // 優先順位
  | "constraint"       // 制約確認
  | "info_request"     // 情報要求
  | "candidate_value"; // 具体的な候補値

// ============================================================
// リスク詳細
// ============================================================

/**
 * Phase 6: リスク詳細情報
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
};

// ============================================================
// 推奨根拠関連型
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
  differencePoint: string;     // 差分の一言
  advantageAxis: string;       // 推奨が勝っている軸
};

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
// 放射状展開
// ============================================================

/** Phase 22: 放射状に展開される選択肢 */
export type RadialOption = {
  id: string;
  label: string;
  description?: string;
  isRecommended?: boolean;
  riskStrategy?: RiskStrategy;
  angle: number;              // 放射状配置の角度（度）
  distance: number;           // 中心からの距離（px）
};

// ============================================================
// DecisionFlowNode（完全な選択肢ノード型）
// ============================================================

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
  pastCases?: SimilarCase[];

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

  // Phase 3: 目的達成判定の構造化
  optionType?: OptionType;       // 選択肢の型（candidate_value/constraint/priority/info_request）

  // Phase 5改: 条件入力ノード用
  conditionInputState?: ConditionInputState;  // 条件入力の状態（type=condition_input時）
  threeSetResult?: ThreeSetResult;            // 3セット情報（類似検索・AI推論の結果）

  // Phase X: 熟達者思考プロパティ（エキスパート思考の構造化）
  decisionProperty?: DecisionProperty;        // 判断プロパティ（ルール/条件/重要度/理由/観点）
  overlookedWarnings?: OverlookedWarning[];   // 見落とし警告

  // Phase 17: ベテラン思考プロセスの可視化
  veteranInsight?: string;                    // 判断軸(criteria)向け: ベテランの経験談（「私の経験では...」形式）
  rationale?: string;                         // 選択肢(strategy)向け: なぜこれを選ぶ/選ばないかの理由

  // Phase 22: 放射状展開UI用（判断軸ノードが保持する選択肢）
  radialOptions?: RadialOption[];             // 放射状に展開する選択肢

  // Phase 22: 探索ノードフラグ（クリックで判断軸追加APIを呼び出す）
  isExplorationNode?: boolean;

  // Phase 23: 問いに対する理由（なぜこれを聞くのか）
  questionReason?: string;                    // 目的達成に向けてこの問いが必要な理由

  // Phase 24: パス名（判断軸の上に表示）
  pathName?: string;                          // パス名（例：「リスク回避思考パス」）
  thinkingPattern?: ThinkingPattern;          // 思考パターンのカテゴリ

  // Phase 31: パス比較UI用
  pathId?: string;                            // パスID（パス比較のグループ識別子）
  pathColor?: string;                         // パスカラー（パス比較の色分け用）
};

// ============================================================
// DecisionFlowEdge（エッジ型）
// ============================================================

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
  | "guide"                  // Phase 21: 誘導エッジ
  | "converge"               // 収束エッジ
  // Path Comparison UI用
  | "pathEdge"               // パス内のエッジ
  | "axisLink";              // 評価軸へのリンク

/** 選択肢間のエッジ */
export type DecisionFlowEdge = {
  id: string;
  source: string;
  target: string;
  type: DecisionEdgeType;
  label?: string;
  conditions?: string[];
  isRecommended?: boolean; // 推奨パスのエッジ
  rationale?: string; // 選択理由（selectedエッジのみ）
  // Phase 7: Handle指定（縦方向エッジ用）
  sourceHandle?: string; // "right" | "bottom"
  targetHandle?: string; // "left" | "top"
  // Phase 21: アニメーション（誘導エッジ用）
  animated?: boolean;
};
