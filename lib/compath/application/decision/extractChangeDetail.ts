import type { ChangeDetail } from "../../domain/types";

/**
 * 変更パターン（「AからBへ」「AをBに」などを抽出）
 */
const CHANGE_PATTERNS: RegExp[] = [
  // 「AからBへ変更」「AからBに変更」
  /(.{2,30})から(.{2,30})[へに]変更/u,
  // 「AをBに変更」「AをBへ変更」
  /(.{2,30})を(.{2,30})[にへ]変更/u,
  // 「AからBとする」
  /(.{2,30})から(.{2,30})とする/u,
  // 「AではなくBとする」
  /(.{2,30})ではなく(.{2,30})とする/u,
  // 「Aを廃止しBを採用」
  /(.{2,30})を廃止し(.{2,30})を採用/u,
  // 「AからBへ見直し」
  /(.{2,30})から(.{2,30})[へに]見直/u,
];

/**
 * 変更種類を推定するキーワード
 */
const CHANGE_TYPE_KEYWORDS: Record<
  ChangeDetail["changeType"],
  string[]
> = {
  specification: [
    "仕様",
    "設計",
    "構造",
    "材料",
    "寸法",
    "規格",
    "性能",
    "機能",
    "図面",
  ],
  schedule: [
    "納期",
    "工期",
    "期限",
    "スケジュール",
    "日程",
    "期日",
    "完了日",
    "開始日",
  ],
  budget: [
    "予算",
    "コスト",
    "費用",
    "価格",
    "金額",
    "見積",
    "原価",
  ],
  scope: [
    "範囲",
    "スコープ",
    "対象",
    "追加",
    "削除",
    "除外",
    "含める",
    "除く",
  ],
  other: [],
};

/**
 * 影響度を推定するキーワード
 */
const HIGH_IMPACT_KEYWORDS = [
  "全面",
  "大幅",
  "抜本",
  "根本",
  "基本",
  "主要",
  "重要",
  "クリティカル",
  "致命的",
  "安全",
  "法令",
  "契約",
];

const MEDIUM_IMPACT_KEYWORDS = [
  "一部",
  "部分",
  "軽微",
  "微調整",
  "微修正",
];

/**
 * 変更種類を推定
 */
function estimateChangeType(
  content: string,
  sourceText: string
): ChangeDetail["changeType"] {
  const text = content + " " + sourceText;

  for (const [type, keywords] of Object.entries(CHANGE_TYPE_KEYWORDS)) {
    if (type === "other") continue;
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        return type as ChangeDetail["changeType"];
      }
    }
  }

  return "other";
}

/**
 * 影響度を推定
 */
function estimateImpactLevel(
  content: string,
  sourceText: string,
  changeType: ChangeDetail["changeType"]
): ChangeDetail["impactLevel"] {
  const text = content + " " + sourceText;

  // 高影響キーワードチェック
  for (const keyword of HIGH_IMPACT_KEYWORDS) {
    if (text.includes(keyword)) {
      return "high";
    }
  }

  // 低影響キーワードチェック
  for (const keyword of MEDIUM_IMPACT_KEYWORDS) {
    if (text.includes(keyword)) {
      return "low";
    }
  }

  // 変更種類による基本影響度
  switch (changeType) {
    case "budget":
    case "schedule":
      return "high";
    case "specification":
      return "medium";
    case "scope":
      return "medium";
    default:
      return "low";
  }
}

/**
 * 変更詳細を抽出
 */
export function extractChangeDetail(
  content: string,
  sourceText: string,
  patternType: string
): ChangeDetail | undefined {
  // changeパターン以外は処理しない
  if (patternType !== "change") {
    return undefined;
  }

  const text = content + " " + sourceText;
  let before: string | undefined;
  let after: string = content;

  // 変更パターンから前後を抽出
  for (const pattern of CHANGE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      before = match[1]?.trim();
      after = match[2]?.trim() || content;
      break;
    }
  }

  // 変更種類と影響度を推定
  const changeType = estimateChangeType(content, sourceText);
  const impactLevel = estimateImpactLevel(content, sourceText, changeType);

  return {
    before,
    after,
    changeType,
    impactLevel,
  };
}

/**
 * 変更種類の日本語ラベル
 */
export const CHANGE_TYPE_LABELS: Record<ChangeDetail["changeType"], string> = {
  specification: "仕様変更",
  schedule: "スケジュール変更",
  budget: "予算変更",
  scope: "スコープ変更",
  other: "その他の変更",
};
