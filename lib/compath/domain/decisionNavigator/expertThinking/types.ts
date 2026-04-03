/**
 * Phase 1: 熟達者思考プロパティ（DecisionProperty）
 *
 * ベテランの「思考の型」を構造化して記録する
 * - ルール（IF/Else）: どの条件でこの選択が適用されるか
 * - 条件（Where）: ルールが適用される状況
 * - 重要度（Weight）: この判断の重み付け
 * - 理由（Why）: なぜこの判断をするのか
 * - 観点（View）: どの視点から判断しているか
 */

// ============================================================
// ルール（IF/Else構造）
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
  /** 条件文（例: 「設置スペースが1.5m以上確保できる場合」） */
  condition: string;
  /** ThenアクションまたはTrue時の結論 */
  thenAction: string;
  /** ElseアクションまたはFalse時の結論（if_else, switchで使用） */
  elseAction?: string;
  /** 閾値（threshold typeで使用） */
  threshold?: ThresholdCondition;
  /** Switch caseの選択肢（switch typeで使用） */
  cases?: Array<{
    condition: string;
    action: string;
  }>;
};

// ============================================================
// 条件（Where）
// ============================================================

/** 条件の適用範囲 */
export type ConditionScope = "always" | "situational" | "exceptional";

/** 条件の確実性 */
export type ConditionCertainty = "verified" | "assumed" | "uncertain";

/** 判断条件: このルールが適用される状況 */
export type DecisionCondition = {
  /** 条件の説明 */
  description: string;
  /** 適用範囲 */
  scope: ConditionScope;
  /** 確実性 */
  certainty: ConditionCertainty;
  /** 関連するドメイン/カテゴリ */
  domain?: string;
  /** 例外ケース */
  exceptions?: string[];
};

// ============================================================
// 重要度（Weight）
// ============================================================

/** 重み付けの根拠 */
export type WeightBasis = "regulation" | "safety" | "cost" | "experience" | "preference" | "risk";

/** 判断の重み付け */
export type DecisionWeight = {
  /** 重要度スコア（0-100） */
  score: number;
  /** 重み付けの根拠 */
  basis: WeightBasis;
  /** 根拠の説明 */
  rationale: string;
  /** この重みが影響する要素 */
  affectedFactors?: string[];
  /** 優先順位（他の判断との相対的な順位） */
  priorityRank?: number;
};

// ============================================================
// 理由（Why）
// ============================================================

/** 根拠の種類 */
export type RationaleSource = "regulation" | "standard" | "experience" | "analysis" | "intuition" | "past_case";

/** 判断の根拠 */
export type DecisionRationale = {
  /** 主な理由 */
  primary: string;
  /** 補足理由 */
  secondary?: string[];
  /** 根拠の種類 */
  source: RationaleSource;
  /** 参照元（規格番号、文献など） */
  reference?: string;
  /** 過去の経験・事例 */
  pastExperience?: {
    description: string;
    outcome: "success" | "failure" | "mixed";
    lesson: string;
  };
  /** この理由の確信度（0-100） */
  confidence: number;
};

// ============================================================
// 観点（View）
// ============================================================

/** 観点のカテゴリ */
export type ViewpointCategory =
  | "qcdes"        // Quality, Cost, Delivery, Environment, Safety
  | "stakeholder"  // ステークホルダー視点
  | "temporal"     // 時間軸（短期/長期）
  | "risk"         // リスク視点
  | "value";       // 価値視点

/** QCDESサブカテゴリ */
export type QCDESSubCategory = "quality" | "cost" | "delivery" | "environment" | "safety";

/** 評価結果 */
export type ViewpointEvaluation = {
  /** 評価スコア（-100〜+100、負=悪影響、正=好影響） */
  score: number;
  /** 評価コメント */
  comment: string;
};

/** 判断の観点 */
export type DecisionViewpoint = {
  /** 観点名（例: 「安全性」「コスト」「顧客満足」） */
  name: string;
  /** カテゴリ */
  category: ViewpointCategory;
  /** QCDESの場合のサブカテゴリ */
  qcdesType?: QCDESSubCategory;
  /** この観点からの見方・考慮事項 */
  perspective: string;
  /** この観点での評価 */
  evaluation: ViewpointEvaluation;
  /** 若手が見落としやすいか（重要フラグ） */
  isOftenOverlooked: boolean;
  /** 見落とした場合のリスク（isOftenOverlooked=trueの場合） */
  overlookedRisk?: string;
  /** 見落とし防止のための確認ポイント */
  checkpoints?: string[];
};

// ============================================================
// 見落とし警告
// ============================================================

/** 見落とし警告 */
export type OverlookedWarning = {
  /** 見落とされやすい観点 */
  viewpoint: string;
  /** リスク説明 */
  risk: string;
  /** 改善提案 */
  suggestion: string;
  /** 重要度 */
  severity: "critical" | "high" | "medium" | "low";
  /** チェックリスト項目 */
  checklist?: Array<{
    item: string;
    isChecked: boolean;
  }>;
};

// ============================================================
// 判断プロパティ（統合型）
// ============================================================

/** 判断プロパティの情報源 */
export type DecisionPropertySource =
  | "expert_input"      // エキスパートが直接入力
  | "llm_inference"     // LLMによる推論
  | "past_case"         // 過去事例からの抽出
  | "user_experience";  // ユーザーの経験から学習

/** 判断プロパティ - 熟達者の「思考の型」を構造化 */
export type DecisionProperty = {
  /** 一意識別子 */
  id: string;
  /** ルール（IF/Else） - この選択が適用される条件式 */
  rule: DecisionRule;
  /** 条件（Where） - ルールが適用される状況 */
  conditions: DecisionCondition[];
  /** 重要度（Weight） - この判断の重み付け */
  weight: DecisionWeight;
  /** 理由（Why） - なぜこの判断をするのか */
  rationale: DecisionRationale;
  /** 観点（View） - どの視点から判断しているか */
  viewpoints: DecisionViewpoint[];
  /** 情報源 */
  source: DecisionPropertySource;
  /** 全体の確信度（0-100） */
  confidence: number;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** 適用回数（ナレッジ蓄積用） */
  usageCount?: number;
  /** 有効性スコア（フィードバックから算出） */
  effectivenessScore?: number;
};

// ============================================================
// ユーティリティ型
// ============================================================

/** 判断プロパティのサマリー（UI表示用の軽量版） */
export type DecisionPropertySummary = {
  id: string;
  ruleType: DecisionRuleType;
  ruleSummary: string;          // ルールの一言要約
  weightScore: number;
  confidence: number;
  viewpointCount: number;
  hasOverlookedWarnings: boolean;
};

/** 判断プロパティ作成リクエスト */
export type CreateDecisionPropertyRequest = {
  rule: DecisionRule;
  conditions?: DecisionCondition[];
  weight: DecisionWeight;
  rationale: DecisionRationale;
  viewpoints?: DecisionViewpoint[];
  source: DecisionPropertySource;
};

/** 判断プロパティ更新リクエスト */
export type UpdateDecisionPropertyRequest = Partial<CreateDecisionPropertyRequest>;
