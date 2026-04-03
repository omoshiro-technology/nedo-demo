/**
 * 状況コンテキスト分析器
 *
 * ユーザー入力からPMBOKのトリプル制約（スコープ/スケジュール/コスト）に基づいた
 * 状況コンテキストを分析する
 */

/** 問題の重大度 */
export type IssueSeverity = "high" | "medium" | "low";

/** 検出された問題 */
export type DetectedIssue = {
  severity: IssueSeverity;
  keywords: string[];
};

/** 制約タイプ（PMBOKトリプル制約 + 品質） */
export type ConstraintType = "schedule" | "cost" | "scope" | "quality" | "safety";

/** 根本原因カテゴリ */
export type RootCauseCategory =
  | "resources" // リソース不足
  | "procurement" // 調達問題
  | "design" // 設計変更
  | "external" // 外部要因
  | "unknown"; // 不明（要調査）

/** 状況コンテキスト */
export type SituationContext = {
  /** 検出された問題 */
  detectedIssues: {
    scheduleDelay?: DetectedIssue;
    costOverrun?: DetectedIssue;
    qualityRisk?: DetectedIssue;
    safetyRisk?: DetectedIssue;
    scopeChange?: DetectedIssue;
    procurementIssue?: DetectedIssue;
  };

  /** 根本原因カテゴリ（推定） */
  rootCauseCategory: RootCauseCategory;

  /** 根本原因が特定されているかどうか */
  isRootCauseIdentified: boolean;

  /** 制約ランキング（トリプル制約） */
  constraintRanking: {
    primary: ConstraintType;
    secondary: ConstraintType;
  };

  /** 検出されたカテゴリ（既存互換） */
  matchedCategories: Set<string>;

  /** 元の入力テキスト */
  originalInput: string;

  /** 緊急性フラグ（止血対応が必要かどうか） */
  isUrgent: boolean;
};

// キーワード定義
const SCHEDULE_KEYWORDS = [
  "遅れ",
  "遅延",
  "工期",
  "納期",
  "スケジュール",
  "間に合わ",
  "期限",
  "延長",
  "短縮",
];

const COST_KEYWORDS = [
  "コスト",
  "予算",
  "費用",
  "追加",
  "超過",
  "見積",
  "金額",
];

const QUALITY_KEYWORDS = [
  "品質",
  "不良",
  "欠陥",
  "検査",
  "基準",
  "規格",
];

const SAFETY_KEYWORDS = [
  "安全",
  "事故",
  "危険",
  "リスク",
  "災害",
];

const SCOPE_KEYWORDS = [
  "仕様",
  "変更",
  "要件",
  "追加機能",
  "スコープ",
];

const PROCUREMENT_KEYWORDS = [
  "調達",
  "資材",
  "サプライヤー",
  "納品",
  "部材",
  "発注",
];

// 緊急性キーワード（止血対応が必要）
const URGENCY_KEYWORDS = [
  "明日",
  "今日中",
  "今週",
  "至急",
  "緊急",
  "すぐに",
  "間に合わない",
  "急ぎ",
  "直ちに",
  "早急",
];

// 根本原因を示唆するキーワード
const ROOT_CAUSE_KEYWORDS: Record<RootCauseCategory, string[]> = {
  resources: ["人手", "リソース", "人員", "増員", "不足"],
  procurement: ["調達", "資材", "サプライヤー", "納品遅れ"],
  design: ["設計変更", "仕様変更", "設計ミス"],
  external: ["天候", "災害", "外部", "不可抗力", "法規制"],
  unknown: [],
};

/**
 * キーワードマッチを検出
 */
function detectKeywordMatch(
  input: string,
  keywords: string[]
): DetectedIssue | undefined {
  const matchedKeywords = keywords.filter((k) => input.includes(k));
  if (matchedKeywords.length === 0) return undefined;

  // 重大度を決定（マッチ数と特定のキーワードで判断）
  let severity: IssueSeverity = "medium";
  if (matchedKeywords.length >= 3) {
    severity = "high";
  } else if (matchedKeywords.some((k) => ["遅延", "超過", "事故", "不良"].includes(k))) {
    severity = "high";
  }

  return { severity, keywords: matchedKeywords };
}

/**
 * 緊急性を検出
 */
function detectUrgency(input: string): boolean {
  return URGENCY_KEYWORDS.some((k) => input.includes(k));
}

/**
 * 根本原因カテゴリを推定
 */
function detectRootCauseCategory(input: string): {
  category: RootCauseCategory;
  isIdentified: boolean;
} {
  for (const [category, keywords] of Object.entries(ROOT_CAUSE_KEYWORDS)) {
    if (category === "unknown") continue;
    if (keywords.some((k) => input.includes(k))) {
      return {
        category: category as RootCauseCategory,
        isIdentified: true,
      };
    }
  }
  return { category: "unknown", isIdentified: false };
}

/**
 * 制約ランキングを決定（先に言及された問題が主制約）
 */
function determineConstraintRanking(
  input: string,
  issues: SituationContext["detectedIssues"]
): { primary: ConstraintType; secondary: ConstraintType } {
  const constraintPositions: Array<{ type: ConstraintType; position: number }> = [];

  // 各制約タイプの最初の出現位置を取得
  if (issues.scheduleDelay) {
    const pos = Math.min(
      ...issues.scheduleDelay.keywords.map((k) =>
        input.indexOf(k) >= 0 ? input.indexOf(k) : Infinity
      )
    );
    constraintPositions.push({ type: "schedule", position: pos });
  }

  if (issues.costOverrun) {
    const pos = Math.min(
      ...issues.costOverrun.keywords.map((k) =>
        input.indexOf(k) >= 0 ? input.indexOf(k) : Infinity
      )
    );
    constraintPositions.push({ type: "cost", position: pos });
  }

  if (issues.qualityRisk) {
    const pos = Math.min(
      ...issues.qualityRisk.keywords.map((k) =>
        input.indexOf(k) >= 0 ? input.indexOf(k) : Infinity
      )
    );
    constraintPositions.push({ type: "quality", position: pos });
  }

  if (issues.safetyRisk) {
    const pos = Math.min(
      ...issues.safetyRisk.keywords.map((k) =>
        input.indexOf(k) >= 0 ? input.indexOf(k) : Infinity
      )
    );
    // 安全は常に最優先
    constraintPositions.push({ type: "safety", position: -1 });
  }

  if (issues.scopeChange) {
    const pos = Math.min(
      ...issues.scopeChange.keywords.map((k) =>
        input.indexOf(k) >= 0 ? input.indexOf(k) : Infinity
      )
    );
    constraintPositions.push({ type: "scope", position: pos });
  }

  // 位置でソート
  constraintPositions.sort((a, b) => a.position - b.position);

  // デフォルト値
  const primary = constraintPositions[0]?.type || "schedule";
  const secondary = constraintPositions[1]?.type || (primary === "schedule" ? "cost" : "schedule");

  return { primary, secondary };
}

/**
 * 既存のカテゴリマッチング（後方互換性）
 */
function getMatchedCategories(issues: SituationContext["detectedIssues"]): Set<string> {
  const categories = new Set<string>();

  if (issues.scheduleDelay) categories.add("スケジュール");
  if (issues.costOverrun) categories.add("予算");
  if (issues.qualityRisk) categories.add("品質");
  if (issues.safetyRisk) categories.add("安全");
  if (issues.scopeChange) categories.add("契約");
  if (issues.procurementIssue) categories.add("調達");

  return categories;
}

/**
 * ユーザー入力から状況コンテキストを分析
 *
 * @param userInput ユーザーが入力した状況説明
 * @returns 分析された状況コンテキスト
 */
export function analyzeSituationContext(userInput: string): SituationContext {
  const detectedIssues: SituationContext["detectedIssues"] = {
    scheduleDelay: detectKeywordMatch(userInput, SCHEDULE_KEYWORDS),
    costOverrun: detectKeywordMatch(userInput, COST_KEYWORDS),
    qualityRisk: detectKeywordMatch(userInput, QUALITY_KEYWORDS),
    safetyRisk: detectKeywordMatch(userInput, SAFETY_KEYWORDS),
    scopeChange: detectKeywordMatch(userInput, SCOPE_KEYWORDS),
    procurementIssue: detectKeywordMatch(userInput, PROCUREMENT_KEYWORDS),
  };

  const { category: rootCauseCategory, isIdentified: isRootCauseIdentified } =
    detectRootCauseCategory(userInput);

  const constraintRanking = determineConstraintRanking(userInput, detectedIssues);

  const matchedCategories = getMatchedCategories(detectedIssues);

  const isUrgent = detectUrgency(userInput);

  return {
    detectedIssues,
    rootCauseCategory,
    isRootCauseIdentified,
    constraintRanking,
    matchedCategories,
    originalInput: userInput,
    isUrgent,
  };
}
