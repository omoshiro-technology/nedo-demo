/**
 * 提案書デモ用データ
 *
 * types/proposal.ts から分離した顧客プロファイル・判断論点デフォルト値
 */

import type {
  CustomerProfile,
  EvaluationPoints,
  EvaluationPointRow,
} from "../types/proposal";

/** デモ用の顧客プロファイル一覧（センシング×AI技術企業） */
export const DEMO_CUSTOMER_PROFILES: CustomerProfile[] = [
  {
    id: "omron_sensing",
    name: "オムロン センシング事業部 様",
    industry: "electronics",
    currentIssues: ["skill_transfer", "ip_strategy", "ai_integration"],
    kpiPriority: "innovation",
    additionalContext: "センシング×AI技術の知財戦略と技術伝承が課題。ベテラン技術者の退職が3年以内に予定。",
  },
  {
    id: "keyence_rd",
    name: "キーエンス R&D部門 様",
    industry: "electronics",
    currentIssues: ["tech_differentiation", "ip_strategy", "skill_transfer"],
    kpiPriority: "innovation",
    additionalContext: "画像センサー×AI処理の競争力強化。特許ポートフォリオの拡充が急務。",
  },
  {
    id: "panasonic_device",
    name: "パナソニック デバイス事業部 様",
    industry: "electronics",
    currentIssues: ["ai_integration", "skill_transfer", "future_expansion"],
    kpiPriority: "flexibility",
    additionalContext: "IoTセンサー事業の拡大。AI判断支援による技術伝承を検討中。",
  },
];

/** デフォルトの判断論点 */
export const DEFAULT_EVALUATION_POINTS: EvaluationPoints = {
  bufferCapacity: { importance: "high", currentStatus: "concerning" },
  switchingImpact: { importance: "high", currentStatus: "concerning" },
  contingencyOptions: { importance: "medium", currentStatus: "limited" },
};

/** デフォルトの判断論点行 */
export const DEFAULT_EVALUATION_POINT_ROWS: EvaluationPointRow[] = [
  {
    id: "bufferCapacity",
    title: "技術の可視化レベル",
    importance: "high",
    currentStatus: "concerning",
  },
  {
    id: "switchingImpact",
    title: "知財ポートフォリオの充実度",
    importance: "high",
    currentStatus: "concerning",
  },
  {
    id: "contingencyOptions",
    title: "AI活用による判断支援の実現度",
    importance: "medium",
    currentStatus: "limited",
  },
];
