import type { ImportanceCategory, ImportanceInfo } from "../../domain/types";

/**
 * カテゴリ別の重要キーワードと重み
 */
const IMPORTANCE_KEYWORDS: Record<
  ImportanceCategory,
  Array<{ keyword: string; weight: number }>
> = {
  budget: [
    { keyword: "予算", weight: 20 },
    { keyword: "コスト", weight: 18 },
    { keyword: "費用", weight: 15 },
    { keyword: "価格", weight: 15 },
    { keyword: "金額", weight: 15 },
    { keyword: "見積", weight: 12 },
    { keyword: "原価", weight: 15 },
    { keyword: "利益", weight: 18 },
    { keyword: "赤字", weight: 25 },
    { keyword: "追加費用", weight: 20 },
    { keyword: "増額", weight: 18 },
    { keyword: "減額", weight: 15 },
  ],
  schedule: [
    { keyword: "納期", weight: 25 },
    { keyword: "工期", weight: 25 },
    { keyword: "期限", weight: 20 },
    { keyword: "スケジュール", weight: 18 },
    { keyword: "マイルストーン", weight: 18 },
    { keyword: "遅延", weight: 25 },
    { keyword: "遅れ", weight: 22 },
    { keyword: "前倒し", weight: 15 },
    { keyword: "期日", weight: 18 },
    { keyword: "竣工", weight: 25 },
    { keyword: "完了日", weight: 20 },
    { keyword: "引渡し", weight: 22 },
    { keyword: "着工", weight: 20 },
  ],
  spec: [
    { keyword: "仕様", weight: 18 },
    { keyword: "設計", weight: 15 },
    { keyword: "図面", weight: 15 },
    { keyword: "構造", weight: 20 },
    { keyword: "性能", weight: 18 },
    { keyword: "機能", weight: 12 },
    { keyword: "材料", weight: 15 },
    { keyword: "寸法", weight: 12 },
    { keyword: "規格", weight: 15 },
    { keyword: "基準", weight: 15 },
  ],
  quality: [
    { keyword: "品質", weight: 20 },
    { keyword: "検査", weight: 18 },
    { keyword: "不良", weight: 22 },
    { keyword: "欠陥", weight: 25 },
    { keyword: "手直し", weight: 20 },
    { keyword: "やり直し", weight: 22 },
    { keyword: "是正", weight: 18 },
    { keyword: "クレーム", weight: 25 },
    { keyword: "保証", weight: 18 },
  ],
  safety: [
    { keyword: "安全", weight: 25 },
    { keyword: "危険", weight: 25 },
    { keyword: "事故", weight: 30 },
    { keyword: "災害", weight: 30 },
    { keyword: "リスク", weight: 20 },
    { keyword: "対策", weight: 15 },
    { keyword: "法令", weight: 20 },
    { keyword: "規制", weight: 18 },
    { keyword: "コンプライアンス", weight: 20 },
  ],
  contract: [
    { keyword: "契約", weight: 22 },
    { keyword: "発注", weight: 18 },
    { keyword: "受注", weight: 18 },
    { keyword: "合意書", weight: 20 },
    { keyword: "覚書", weight: 18 },
    { keyword: "変更契約", weight: 22 },
    { keyword: "追加発注", weight: 20 },
    { keyword: "クライアント", weight: 15 },
    { keyword: "顧客", weight: 15 },
    { keyword: "施主", weight: 18 },
  ],
  organization: [
    { keyword: "体制", weight: 15 },
    { keyword: "担当", weight: 10 },
    { keyword: "責任者", weight: 18 },
    { keyword: "部長", weight: 20 },
    { keyword: "課長", weight: 15 },
    { keyword: "プロジェクトマネージャー", weight: 20 },
    { keyword: "PM", weight: 18 },
    { keyword: "決裁", weight: 22 },
    { keyword: "承認", weight: 18 },
  ],
  other: [],
};

/**
 * パターン種別による基本重要度
 */
const PATTERN_BASE_IMPORTANCE: Record<string, number> = {
  decision: 15,
  agreement: 15,
  change: 20, // 変更は影響が大きいことが多い
  adoption: 12,
  cancellation: 18, // 中止も影響が大きい
  other: 5,
};

/**
 * ファイル名からの重要度ボーナス
 */
function getFileNameBonus(fileName: string): number {
  const lowerName = fileName.toLowerCase();

  // 重要な文書タイプ
  if (
    lowerName.includes("契約") ||
    lowerName.includes("contract")
  ) {
    return 15;
  }
  if (
    lowerName.includes("仕様") ||
    lowerName.includes("spec")
  ) {
    return 12;
  }
  if (
    lowerName.includes("設計") ||
    lowerName.includes("design")
  ) {
    return 10;
  }
  if (
    lowerName.includes("議事録") ||
    lowerName.includes("minutes")
  ) {
    return 8;
  }

  return 0;
}

/**
 * 重要度を計算
 */
export function calculateImportance(
  content: string,
  sourceText: string,
  patternType: string,
  sourceFileName: string
): ImportanceInfo {
  const text = content + " " + sourceText;
  const detectedKeywords: string[] = [];
  const categories: ImportanceCategory[] = [];
  let totalScore = 0;

  // パターン基本スコア
  totalScore += PATTERN_BASE_IMPORTANCE[patternType] || 5;

  // キーワードマッチング
  for (const [category, keywords] of Object.entries(IMPORTANCE_KEYWORDS)) {
    let categoryMatched = false;

    for (const { keyword, weight } of keywords) {
      if (text.includes(keyword)) {
        totalScore += weight;
        if (!detectedKeywords.includes(keyword)) {
          detectedKeywords.push(keyword);
        }
        categoryMatched = true;
      }
    }

    if (categoryMatched && category !== "other") {
      categories.push(category as ImportanceCategory);
    }
  }

  // ファイル名ボーナス
  totalScore += getFileNameBonus(sourceFileName);

  // 複数カテゴリにまたがる場合はボーナス（影響範囲が広い）
  if (categories.length >= 3) {
    totalScore += 15;
  } else if (categories.length >= 2) {
    totalScore += 8;
  }

  // スコアを0-100に正規化
  const normalizedScore = Math.min(100, Math.max(0, totalScore));

  // レベル判定
  let level: "critical" | "high" | "medium" | "low";
  if (normalizedScore >= 70) {
    level = "critical";
  } else if (normalizedScore >= 50) {
    level = "high";
  } else if (normalizedScore >= 30) {
    level = "medium";
  } else {
    level = "low";
  }

  return {
    score: normalizedScore,
    level,
    categories: categories.length > 0 ? categories : ["other"],
    detectedKeywords,
  };
}
