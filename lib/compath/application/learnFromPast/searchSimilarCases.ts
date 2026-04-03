import type {
  DecisionItem,
  DecisionPatternType,
  SimilarCase,
  ImportanceCategory,
} from "../../domain/types";

/**
 * キーワード抽出用のストップワード
 */
const STOP_WORDS = new Set([
  "こと",
  "もの",
  "ため",
  "よう",
  "これ",
  "それ",
  "あれ",
  "この",
  "その",
  "あの",
  "について",
  "において",
  "として",
  "における",
  "に対して",
  "に関して",
  "に基づき",
  "および",
  "また",
  "なお",
  "ただし",
  "ただ",
  "場合",
  "とき",
  "ところ",
  "など",
  "ほか",
  "上記",
  "下記",
  "以上",
  "以下",
  "予定",
  "必要",
  "可能",
  "対応",
  "実施",
  "確認",
  "検討",
  "報告",
]);

/**
 * テキストからキーワードを抽出
 */
export function extractKeywords(text: string): string[] {
  // 日本語の単語分割（簡易版: 漢字・カタカナの連続を抽出）
  const patterns = [
    /[\u4e00-\u9faf]{2,}/g, // 漢字2文字以上
    /[\u30a0-\u30ff]{3,}/g, // カタカナ3文字以上
    /[A-Za-z]{3,}/g, // 英字3文字以上
  ];

  const keywords: string[] = [];

  for (const pattern of patterns) {
    const matches = text.match(pattern) || [];
    for (const match of matches) {
      if (!STOP_WORDS.has(match)) {
        keywords.push(match);
      }
    }
  }

  return [...new Set(keywords)];
}

/**
 * Jaccard類似度を計算
 */
function calculateJaccardSimilarity(
  keywords1: string[],
  keywords2: string[]
): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  return (intersection.size / union.size) * 100;
}

/**
 * パターン種別の類似度ボーナス
 */
function getPatternBonus(type1: DecisionPatternType, type2: DecisionPatternType): number {
  if (type1 === type2) return 15;

  // 関連するパターン同士にもボーナス
  const relatedPatterns: Record<DecisionPatternType, DecisionPatternType[]> = {
    decision: ["agreement"],
    agreement: ["decision"],
    change: ["adoption"],
    adoption: ["change"],
    cancellation: [],
    other: [],
  };

  if (relatedPatterns[type1]?.includes(type2)) {
    return 8;
  }

  return 0;
}

/**
 * カテゴリから日本語の観点を生成
 */
function categoriesToPerspectives(categories: ImportanceCategory[]): string[] {
  const categoryLabels: Record<ImportanceCategory, string> = {
    budget: "予算",
    schedule: "スケジュール",
    spec: "仕様",
    quality: "品質",
    safety: "安全",
    contract: "契約",
    organization: "組織",
    other: "その他",
  };

  return categories.map((cat) => categoryLabels[cat] || cat);
}

/**
 * 採用された結論を抽出
 */
function extractAdoptedConclusion(decision: DecisionItem): string | undefined {
  // guidance.requiredActionsの1つ目があれば採用
  if (decision.guidance?.requiredActions?.length) {
    return decision.guidance.requiredActions[0];
  }
  // なければ、決定内容自体を返す
  return undefined;
}

/**
 * ユーザーの状況説明から類似事例を検索
 *
 * @param userSituation ユーザーが入力した状況説明
 * @param historicalDecisions 過去の決定事項一覧
 * @param limit 返却する最大件数
 * @param minSimilarity 最小類似度
 * @returns 類似度順にソートされた類似事例
 */
export function searchSimilarCases(
  userSituation: string,
  historicalDecisions: DecisionItem[],
  limit: number = 5,
  minSimilarity: number = 20
): SimilarCase[] {
  if (historicalDecisions.length === 0) {
    return [];
  }

  const userKeywords = extractKeywords(userSituation);

  if (userKeywords.length === 0) {
    return [];
  }

  const similarities: Array<{
    decision: DecisionItem;
    similarity: number;
  }> = [];

  for (const decision of historicalDecisions) {
    // 決定内容 + 原文テキストからキーワード抽出
    const decisionText = `${decision.content} ${decision.sourceText}`;
    const decisionKeywords = extractKeywords(decisionText);

    let similarity = calculateJaccardSimilarity(userKeywords, decisionKeywords);

    // 確定済みの決定にボーナス（参考になる可能性が高い）
    if (decision.status === "confirmed") {
      similarity += 10;
    }

    // 重要度が高いものにボーナス
    if (decision.importance?.level === "critical") {
      similarity += 8;
    } else if (decision.importance?.level === "high") {
      similarity += 5;
    }

    // 類似度が閾値以上のものだけ候補に
    if (similarity >= minSimilarity) {
      similarities.push({
        decision,
        similarity: Math.min(100, Math.round(similarity)),
      });
    }
  }

  // 類似度降順でソート
  similarities.sort((a, b) => b.similarity - a.similarity);

  // 上位N件をSimilarCase形式に変換して返却
  return similarities.slice(0, limit).map(({ decision, similarity }) => ({
    id: decision.id,
    content: decision.content,
    similarity,
    patternType: decision.patternType,
    status: decision.status,
    sourceFileName: decision.sourceFileName,
    decisionDate: decision.decisionDate,
    adoptedConclusion: extractAdoptedConclusion(decision),
    perspectives: decision.importance?.categories
      ? categoriesToPerspectives(decision.importance.categories)
      : undefined,
  }));
}

/**
 * パターン種別を推定（ユーザー入力から）
 * 将来的にはLLMを使って精度を上げる
 */
export function inferPatternType(userSituation: string): DecisionPatternType | null {
  const patterns: Array<{ regex: RegExp; type: DecisionPatternType }> = [
    { regex: /変更|修正|見直し/, type: "change" },
    { regex: /採用|導入|適用/, type: "adoption" },
    { regex: /中止|取りやめ|見送り/, type: "cancellation" },
    { regex: /決定|決める|決まる/, type: "decision" },
    { regex: /合意|了承|一致/, type: "agreement" },
  ];

  for (const { regex, type } of patterns) {
    if (regex.test(userSituation)) {
      return type;
    }
  }

  return null;
}
