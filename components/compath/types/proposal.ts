/**
 * 提案書作成支援の型定義
 * Phase 28: 営業向け提案書作成支援
 */

// ============================================================
// 顧客背景（Step 1）
// ============================================================

/** 業種 */
export type Industry =
  | "manufacturing"     // 製造業
  | "power"            // 電力
  | "chemical"         // 化学
  | "pharmaceutical"   // 製薬
  | "food"             // 食品
  | "electronics"      // 電子部品・センサー
  | "other";           // その他

/** 現状の課題オプション */
export type CurrentIssue =
  | "load_variation"           // 負荷変動への余裕が見えにくい
  | "future_expansion"         // 将来増設への対応が不明
  | "unexpected_trouble"       // 想定外トラブル時の耐性不足
  | "availability_priority"    // 「止めないこと」が最重要
  | "cost_pressure"           // コスト削減圧力
  | "aging_equipment"         // 設備の老朽化
  | "skill_transfer"          // 技術伝承の課題
  | "ip_strategy"             // 知財戦略の明確化
  | "tech_differentiation"    // 技術差別化
  | "ai_integration";         // AI技術の統合

/** 最重要KPI */
export type KpiPriority =
  | "availability"    // 可用性（止めない）
  | "cost"           // コスト最小化
  | "flexibility"    // 柔軟性（将来対応）
  | "innovation";    // 技術革新・差別化

/** 顧客コンテキスト */
export type CustomerContext = {
  name: string;                    // 顧客名/案件名
  industry: Industry;              // 業種
  currentIssues: CurrentIssue[];   // 現状の課題（複数選択可）
  kpiPriority: KpiPriority;        // 最重要KPI
  additionalContext?: string;      // 補足事項
};

// ============================================================
// 判断論点（Step 2）
// ============================================================

/** 重要度 */
export type Importance = "high" | "medium" | "low";

/** 現状ステータス */
export type CurrentStatus =
  | "insufficient"    // 不十分
  | "concerning"      // 懸念あり
  | "limited"         // 限定的
  | "adequate"        // 十分
  | "unknown";        // 不明

/** 判断論点の評価 */
export type EvaluationPoint = {
  importance: Importance;
  currentStatus: CurrentStatus;
  note?: string;
};

/** 判断論点セット */
export type EvaluationPoints = {
  bufferCapacity: EvaluationPoint;      // 技術の可視化レベル
  switchingImpact: EvaluationPoint;     // 知財ポートフォリオの充実度
  contingencyOptions: EvaluationPoint;  // AI活用による判断支援の実現度
};

// ============================================================
// 提案書生成結果（Step 3）
// ============================================================

/** 提案オプション */
export type ProposalOption = {
  id: "A" | "B" | "C";
  name: string;                // 例: "最小構成"
  description: string;         // 詳細説明
  pros: string[];              // メリット
  cons: string[];              // デメリット
  estimatedCostRange?: string; // コスト目安（任意）
  isRecommended?: boolean;     // 推奨フラグ
};

/** 生成された提案書 */
export type GeneratedProposal = {
  positioning: string;             // 0. 提案の位置づけ（1文）
  background: string;              // 1. 背景
  problemRedefinition: string;     // 2. 課題の再定義
  evaluationPoints: string;        // 3. 判断論点
  options: {
    A: ProposalOption;
    B: ProposalOption;
    C: ProposalOption;
  };
  recommendation: string;          // 5. 推奨案と理由
  whyNotOptionA: string;           // 6. A案不採用理由
  beforeAfter: {                   // 7. Before/After比較
    before: string;
    after: string;
  };
  risks: string[];                 // 8. リスクの正直な開示
  tradeoffs: string[];             // 9. 止めない代償
  dataRequirements: string[];      // 10. 必要データ要求
  customerDecisionPoint: string;   // 11. ご判断いただきたい点
};

/** 提案書生成リクエスト */
export type GenerateProposalRequest = {
  customerContext: CustomerContext;
  evaluationPoints: EvaluationPoints;
};

/** 提案書生成レスポンス */
export type GenerateProposalResponse = {
  templateId: string;
  generatedProposal: GeneratedProposal;
  generatedAt: string;
};

// ============================================================
// ウィザード状態
// ============================================================

/** ウィザードのステップ */
export type ProposalWizardStep = 1 | 2 | 3;

/** ウィザードの状態 */
export type ProposalWizardState = {
  currentStep: ProposalWizardStep;
  customerContext: Partial<CustomerContext>;
  evaluationPoints: Partial<EvaluationPoints>;
  generatedProposal?: GeneratedProposal;
  isGenerating: boolean;
  error?: string;
};

// ============================================================
// UI用の定数
// ============================================================

/** 業種のラベル */
export const INDUSTRY_LABELS: Record<Industry, string> = {
  manufacturing: "製造業",
  power: "電力",
  chemical: "化学",
  pharmaceutical: "製薬",
  food: "食品",
  electronics: "電子部品・センサー",
  other: "その他",
};

/** 課題のラベル */
export const CURRENT_ISSUE_LABELS: Record<CurrentIssue, { label: string; description: string }> = {
  load_variation: {
    label: "負荷変動への余裕が見えにくい",
    description: "需要変動に対する設備余裕が不明確",
  },
  future_expansion: {
    label: "将来増設への対応が不明",
    description: "将来の生産拡大に対応できるか不安",
  },
  unexpected_trouble: {
    label: "想定外トラブル時の耐性不足",
    description: "異常時の運転継続性に懸念",
  },
  availability_priority: {
    label: "「止めないこと」が最重要",
    description: "可用性が最優先のKPI",
  },
  cost_pressure: {
    label: "コスト削減圧力",
    description: "初期投資・運用コストの最小化が求められる",
  },
  aging_equipment: {
    label: "設備の老朽化",
    description: "既存設備の更新時期に来ている",
  },
  skill_transfer: {
    label: "技術伝承の課題",
    description: "ベテランのノウハウ継承が課題",
  },
  ip_strategy: {
    label: "知財戦略の明確化が必要",
    description: "特許ポートフォリオの構築・強化が課題",
  },
  tech_differentiation: {
    label: "技術差別化の方向性が不明確",
    description: "競合との差別化ポイントを明確にしたい",
  },
  ai_integration: {
    label: "AI技術の統合・活用方針が未定",
    description: "AIをどう製品・業務に活用するか検討中",
  },
};

/** KPIのラベル */
export const KPI_PRIORITY_LABELS: Record<KpiPriority, { label: string; description: string }> = {
  availability: {
    label: "可用性（止めない）",
    description: "運転継続性を最優先",
  },
  cost: {
    label: "コスト最小化",
    description: "初期投資・運用コストを重視",
  },
  flexibility: {
    label: "柔軟性（将来対応）",
    description: "将来の変化への対応力を重視",
  },
  innovation: {
    label: "技術革新・差別化",
    description: "技術的優位性と競合差別化を重視",
  },
};

/** 重要度のラベル */
export const IMPORTANCE_LABELS: Record<Importance, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

/** 現状ステータスのラベル */
export const CURRENT_STATUS_LABELS: Record<CurrentStatus, string> = {
  insufficient: "不十分",
  concerning: "懸念あり",
  limited: "限定的",
  adequate: "十分",
  unknown: "不明",
};

// ============================================================
// デモ用顧客プロファイル型
// ============================================================

/** デモ用の顧客プロファイル */
export type CustomerProfile = {
  id: string;
  name: string;
  industry: Industry;
  currentIssues: CurrentIssue[];
  kpiPriority: KpiPriority;
  additionalContext?: string;
};

// ============================================================
// 判断論点の動的行用型（自由追加対応）
// ============================================================

/** 判断論点の行データ */
export type EvaluationPointRow = {
  id: string;
  title: string;
  importance: Importance;
  currentStatus: CurrentStatus;
  note?: string;
};
