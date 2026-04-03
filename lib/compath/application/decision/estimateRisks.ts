import type {
  DecisionPatternType,
  DecisionRisk,
  DecisionStatus,
} from "../../domain/types";

/**
 * パターン種別ごとの影響範囲テンプレート
 */
const PATTERN_AFFECTED_AREAS: Record<DecisionPatternType, string[]> = {
  decision: ["プロジェクト計画", "関連タスク"],
  agreement: ["関係者間の調整", "後続作業"],
  change: ["既存プロセス", "関連ドキュメント", "影響を受けるシステム"],
  adoption: ["導入対象領域", "運用プロセス", "教育・トレーニング"],
  cancellation: ["代替計画", "リソース配分", "関係者への影響"],
  other: ["関連プロセス"],
};

/**
 * 遅延リスクキーワード
 */
const HIGH_DELAY_KEYWORDS = [
  "納期",
  "期限",
  "締め切り",
  "デッドライン",
  "急ぎ",
  "至急",
  "緊急",
  "重要",
  "クリティカル",
  "ブロッカー",
];

const MEDIUM_DELAY_KEYWORDS = [
  "スケジュール",
  "計画",
  "予定",
  "マイルストーン",
  "フェーズ",
];

/**
 * 影響範囲キーワード
 */
const AREA_KEYWORDS: Record<string, string[]> = {
  製造工程: ["製造", "生産", "工程", "ライン", "組立"],
  品質管理: ["品質", "検査", "テスト", "QA", "QC"],
  設計: ["設計", "仕様", "図面", "CAD"],
  調達: ["調達", "購買", "発注", "サプライヤー", "部品"],
  納期: ["納期", "出荷", "デリバリー", "納品"],
  コスト: ["コスト", "予算", "費用", "価格"],
  安全: ["安全", "セーフティ", "リスク", "危険"],
  顧客: ["顧客", "クライアント", "お客様", "ユーザー"],
};

/**
 * 遅延リスクを判定
 */
function assessDelayRisk(
  content: string,
  status: DecisionStatus
): "high" | "medium" | "low" {
  const lowerContent = content.toLowerCase();

  // proposedステータスは基本的に高リスク
  if (status === "proposed") {
    return "high";
  }

  // 高リスクキーワードのチェック
  for (const keyword of HIGH_DELAY_KEYWORDS) {
    if (content.includes(keyword) || lowerContent.includes(keyword.toLowerCase())) {
      return status === "gray" ? "high" : "medium";
    }
  }

  // 中リスクキーワードのチェック
  for (const keyword of MEDIUM_DELAY_KEYWORDS) {
    if (content.includes(keyword) || lowerContent.includes(keyword.toLowerCase())) {
      return "medium";
    }
  }

  // grayステータスはデフォルトで中リスク
  if (status === "gray") {
    return "medium";
  }

  return "low";
}

/**
 * 影響範囲を特定
 */
function identifyAffectedAreas(
  content: string,
  sourceText: string,
  patternType: DecisionPatternType
): string[] {
  const text = content + " " + sourceText;
  const areas: string[] = [];

  // キーワードベースで影響範囲を検出
  for (const [area, keywords] of Object.entries(AREA_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword)) {
        areas.push(area);
        break;
      }
    }
  }

  // パターン固有の影響範囲を追加
  const patternAreas = PATTERN_AFFECTED_AREAS[patternType] || [];

  // 重複を除去
  const uniqueAreas = [...new Set([...areas, ...patternAreas])];

  // 最大5件に制限
  return uniqueAreas.slice(0, 5);
}

/**
 * 推定影響を生成
 */
function generateEstimatedImpact(
  patternType: DecisionPatternType,
  status: DecisionStatus,
  delayRisk: "high" | "medium" | "low",
  affectedAreas: string[]
): string {
  const areasText =
    affectedAreas.length > 0 ? affectedAreas.join("、") : "関連プロセス";

  if (status === "proposed") {
    switch (patternType) {
      case "decision":
        return `この決定が確定しない場合、${areasText}の進行が停滞する可能性があります`;
      case "agreement":
        return `合意が得られない場合、${areasText}の調整が必要になる可能性があります`;
      case "change":
        return `変更が確定しない場合、${areasText}に混乱が生じる可能性があります`;
      case "adoption":
        return `採用が確定しない場合、${areasText}の計画見直しが必要になる可能性があります`;
      case "cancellation":
        return `中止が確定しない場合、${areasText}のリソースが無駄になる可能性があります`;
      default:
        return `この決定が確定しない場合、${areasText}に影響が出る可能性があります`;
    }
  }

  if (status === "gray") {
    if (delayRisk === "high") {
      return `グレー状態が続くと、${areasText}に重大な遅延が発生する可能性があります。早急な確定が推奨されます`;
    }
    if (delayRisk === "medium") {
      return `グレー状態が続くと、${areasText}のスケジュールに影響が出る可能性があります`;
    }
    return `${areasText}への影響は限定的ですが、早めの確定が望ましいです`;
  }

  // confirmed の場合
  return `${areasText}への影響は管理されています`;
}

/**
 * 決定事項のリスクを推定
 */
export function estimateRisks(
  patternType: DecisionPatternType,
  status: DecisionStatus,
  content: string,
  sourceText: string
): DecisionRisk | undefined {
  // confirmed（確定）の場合はリスク情報不要
  if (status === "confirmed") {
    return undefined;
  }

  const delayRisk = assessDelayRisk(content, status);
  const affectedAreas = identifyAffectedAreas(content, sourceText, patternType);
  const estimatedImpact = generateEstimatedImpact(
    patternType,
    status,
    delayRisk,
    affectedAreas
  );

  return {
    delayRisk,
    affectedAreas,
    estimatedImpact,
  };
}
