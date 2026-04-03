/**
 * Phase 4: エキスパートインサイト（若手支援）
 *
 * 「若手は後で知る → 事前に教える」を実現
 * - 見落としやすい観点の事前提示
 * - よくある間違いの警告
 * - ベストプラクティスの提案
 * - 経験者からのヒント
 */

import type { DecisionViewpoint } from "./types";

// ============================================================
// インサイトのタイミング
// ============================================================

/** インサイトのトリガータイミング */
export type InsightTriggerTiming =
  | "on_node_selection"     // ノード選択時
  | "before_confirmation"   // 確定前
  | "on_option_generation"  // 選択肢生成時
  | "on_execution_start"    // 実行開始時
  | "on_risk_detection"     // リスク検出時
  | "on_pattern_match";     // パターンマッチ時

/** インサイトのトリガー条件 */
export type InsightTrigger = {
  timing: InsightTriggerTiming;
  /** 条件（例: "riskLevel === 'high'"） */
  condition?: string;
  /** マッチする問題カテゴリ */
  problemCategories?: string[];
  /** マッチするキーワード */
  keywords?: string[];
  /** 最小確信度（この値以上でトリガー） */
  minConfidence?: number;
};

// ============================================================
// インサイトの内容
// ============================================================

/** 関連事例 */
export type RelatedCase = {
  /** 事例の要約 */
  summary: string;
  /** 結果 */
  outcome: "success" | "failure" | "mixed";
  /** 教訓 */
  lesson: string;
  /** 類似度（0-100） */
  similarity?: number;
};

/** 推奨アクション */
export type SuggestedAction = {
  /** アクション内容 */
  action: string;
  /** 理由 */
  reason: string;
  /** 優先度 */
  priority: "high" | "medium" | "low";
};

/** インサイトの内容 */
export type ExpertInsightContent = {
  /** タイトル */
  title: string;
  /** メッセージ（主要な内容） */
  message: string;
  /** 詳細説明 */
  details?: string;
  /** 関連事例 */
  relatedCases?: RelatedCase[];
  /** 推奨アクション */
  suggestedActions?: SuggestedAction[];
  /** 振り返り用の質問（ユーザーに考えさせる） */
  reflectionQuestions?: string[];
  /** 参考リソースへのリンク/参照 */
  references?: string[];
};

// ============================================================
// エキスパートインサイト
// ============================================================

/** インサイトの種類 */
export type ExpertInsightType =
  | "overlooked_viewpoint"   // 見落としやすい観点
  | "common_mistake"         // よくある間違い
  | "best_practice"          // ベストプラクティス
  | "hidden_assumption"      // 隠れた前提
  | "contextual_warning"     // コンテキスト依存の警告
  | "experienced_tip";       // 経験者からのヒント

/** ターゲットオーディエンス */
export type TargetAudience = "beginner" | "intermediate" | "all";

/** 重要度 */
export type InsightImportance = "critical" | "high" | "medium" | "low";

/** インサイトの統計 */
export type InsightStats = {
  /** 表示回数 */
  displayCount: number;
  /** 「役に立った」回数 */
  helpfulCount: number;
  /** 有用率（helpfulCount / displayCount） */
  helpfulRate: number;
  /** 無視された回数 */
  dismissedCount: number;
};

/** エキスパートインサイト */
export type ExpertInsight = {
  /** 一意識別子 */
  id: string;
  /** インサイトの種類 */
  type: ExpertInsightType;
  /** トリガータイミング */
  triggerTiming: InsightTrigger;
  /** 内容 */
  content: ExpertInsightContent;
  /** ターゲットオーディエンス */
  targetAudience: TargetAudience;
  /** 重要度 */
  importance: InsightImportance;
  /** 統計 */
  stats: InsightStats;
  /** 有効/無効 */
  isActive: boolean;
  /** 作成日時 */
  createdAt: string;
  /** 更新日時 */
  updatedAt: string;
  /** ソース */
  source: "expert_input" | "llm_generated" | "pattern_extracted";
};

// ============================================================
// 見落とし警告（特に重要）
// ============================================================

/** 見落とし警告の歴史的統計 */
export type OverlookedHistoricalStats = {
  /** 見落とし率（0-100） */
  overlookedRate: number;
  /** 結果発生率（見落とした場合に問題が発生した率） */
  consequenceRate: number;
  /** サンプルサイズ */
  sampleSize: number;
};

/** 見落とし警告チェックリスト項目 */
export type OverlookedChecklistItem = {
  /** 確認項目 */
  item: string;
  /** チェック状態 */
  isChecked: boolean;
  /** 重要度 */
  importance: "critical" | "high" | "medium" | "low";
  /** 確認方法のヒント */
  howToCheck?: string;
};

/** 見落とし警告 */
export type OverlookedWarningDetail = {
  /** 一意識別子 */
  id: string;
  /** 見落とされやすい観点 */
  viewpoint: DecisionViewpoint;
  /** 警告メッセージ */
  warning: string;
  /** 潜在的な結果 */
  potentialConsequences: string[];
  /** チェックリスト */
  checklist: OverlookedChecklistItem[];
  /** 歴史的統計 */
  historicalStats?: OverlookedHistoricalStats;
  /** トリガーとなったノードID */
  triggeredByNodeId?: string;
  /** 作成日時 */
  createdAt: string;
};

// ============================================================
// インサイト表示状態
// ============================================================

/** インサイト表示状態 */
export type InsightDisplayState = {
  /** 表示中のインサイトID一覧 */
  activeInsightIds: string[];
  /** 閉じられたインサイトID一覧 */
  dismissedInsightIds: string[];
  /** フィードバック済みのインサイトID */
  feedbackGivenIds: string[];
};

/** インサイトフィードバック */
export type InsightFeedback = {
  /** インサイトID */
  insightId: string;
  /** 役に立ったか */
  wasHelpful: boolean;
  /** コメント */
  comment?: string;
  /** フィードバック日時 */
  feedbackAt: string;
};

// ============================================================
// API リクエスト/レスポンス型
// ============================================================

/** インサイト生成リクエスト */
export type GenerateInsightsRequest = {
  sessionId: string;
  currentNodeId?: string;
  context?: {
    purpose: string;
    selectedPath: string[];
    problemCategory?: string;
  };
  triggerTiming: InsightTriggerTiming;
};

/** インサイト生成レスポンス */
export type GenerateInsightsResponse = {
  insights: ExpertInsight[];
  overlookedWarnings: OverlookedWarningDetail[];
  /** 総合的なリスクスコア（0-100） */
  overallRiskScore: number;
};

/** インサイトフィードバック記録リクエスト */
export type RecordInsightFeedbackRequest = {
  insightId: string;
  wasHelpful: boolean;
  comment?: string;
};
