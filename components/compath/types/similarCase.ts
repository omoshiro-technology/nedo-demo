/**
 * 類似事例検索の型定義
 * Phase 28+: 過去の類似事例を参照して提案に活かす
 */

import type { Industry, KpiPriority } from "./proposal";

// ============================================================
// 検索条件（Step 1）
// ============================================================

/** 設備タイプ（知財戦略分野） */
export type EquipmentType =
  | "ip_strategy"       // 知財戦略
  | "patent"            // 特許出願
  | "licensing"         // ライセンス
  | "standardization"   // 標準化
  | "rd_management"     // 研究開発管理
  | "technology_transfer" // 技術移管
  | "other";            // その他

/** 検索範囲 */
export type SearchScope =
  | "same_customer"      // 同じ顧客（他拠点）
  | "same_industry"      // 同業種
  | "same_equipment"     // 同設備
  | "all";               // 全件

/** 検索条件 */
export type SimilarCaseSearchCondition = {
  /** 顧客名（オプション - 同じ顧客の他拠点検索用） */
  customerName?: string;
  /** 業種 */
  industry: Industry;
  /** 設備タイプ */
  equipmentType: EquipmentType;
  /** 検索範囲 */
  searchScope: SearchScope;
  /** 最重要KPI（フィルタ用、オプション） */
  kpiPriority?: KpiPriority;
  /** フリーワード検索 */
  freeText?: string;
};

// ============================================================
// 検索結果
// ============================================================

/** 類似事例 */
export type SimilarCase = {
  /** 事例ID */
  id: string;
  /** 事例タイトル */
  title: string;
  /** 顧客名（匿名化済み） */
  customerName: string;
  /** 業種 */
  industry: Industry;
  /** 設備タイプ */
  equipmentType: EquipmentType;
  /** 案件概要 */
  summary: string;
  /** 課題・背景 */
  background: string;
  /** 採用した解決策 */
  adoptedSolution: {
    name: string;
    description: string;
  };
  /** 検討した他の選択肢 */
  otherOptions?: Array<{
    name: string;
    notAdoptedReason: string;
  }>;
  /** 成果・効果 */
  outcomes: string[];
  /** 教訓・学び */
  lessons: string[];
  /** KPI優先度 */
  kpiPriority: KpiPriority;
  /** 類似度スコア (0-100) */
  similarityScore: number;
  /** マッチした理由 */
  matchReasons: string[];
  /** メタデータ */
  metadata: {
    year: number;
    region?: string;
    scale?: string;        // 小規模/中規模/大規模
    projectDuration?: string;
  };
};

/** 検索結果 */
export type SimilarCaseSearchResult = {
  /** 検索条件 */
  condition: SimilarCaseSearchCondition;
  /** 見つかった事例 */
  cases: SimilarCase[];
  /** 総件数 */
  totalCount: number;
  /** 検索日時 */
  searchedAt: string;
};

// ============================================================
// UI用の定数
// ============================================================

/** 設備タイプのラベル（知財戦略分野） */
export const EQUIPMENT_TYPE_LABELS: Record<EquipmentType, string> = {
  ip_strategy: "知財戦略",
  patent: "特許出願",
  licensing: "ライセンス",
  standardization: "標準化",
  rd_management: "研究開発管理",
  technology_transfer: "技術移管",
  other: "その他",
};

/** 検索範囲のラベル */
export const SEARCH_SCOPE_LABELS: Record<SearchScope, { label: string; description: string }> = {
  same_customer: {
    label: "同じ顧客（他拠点）",
    description: "同一顧客の別の発電所・工場での事例",
  },
  same_industry: {
    label: "同業種",
    description: "同じ業種の他社での事例",
  },
  same_equipment: {
    label: "同設備",
    description: "同じ設備タイプでの事例（業種問わず）",
  },
  all: {
    label: "すべて",
    description: "条件に合うすべての事例",
  },
};
