import type {
  DecisionItem,
  DecisionPatternType,
  DecisionStatus,
  SimilarDecision,
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
function extractKeywords(text: string): string[] {
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
 * 過去の決定事項から類似事例を検索
 *
 * @param targetContent 検索対象の決定内容
 * @param targetPatternType 検索対象のパターン種別
 * @param historicalDecisions 過去の決定事項一覧
 * @param limit 返却する最大件数
 * @returns 類似度順にソートされた類似事例
 */
export function findSimilarDecisions(
  targetContent: string,
  targetPatternType: DecisionPatternType,
  historicalDecisions: DecisionItem[],
  limit: number = 3
): SimilarDecision[] {
  if (historicalDecisions.length === 0) {
    return [];
  }

  const targetKeywords = extractKeywords(targetContent);

  if (targetKeywords.length === 0) {
    return [];
  }

  const similarities: Array<{
    decision: DecisionItem;
    similarity: number;
  }> = [];

  for (const decision of historicalDecisions) {
    // 同じ決定は除外
    if (decision.content === targetContent) {
      continue;
    }

    const decisionKeywords = extractKeywords(decision.content);
    let similarity = calculateJaccardSimilarity(targetKeywords, decisionKeywords);

    // パターン種別ボーナス
    similarity += getPatternBonus(targetPatternType, decision.patternType);

    // 確定済みの決定にボーナス（参考になる可能性が高い）
    if (decision.status === "confirmed") {
      similarity += 5;
    }

    // 類似度が20%以上のものだけ候補に
    if (similarity >= 20) {
      similarities.push({
        decision,
        similarity: Math.min(100, Math.round(similarity)),
      });
    }
  }

  // 類似度降順でソート
  similarities.sort((a, b) => b.similarity - a.similarity);

  // 上位N件を返却
  return similarities.slice(0, limit).map(({ decision, similarity }) => ({
    content: decision.content,
    patternType: decision.patternType,
    status: decision.status,
    sourceFileName: decision.sourceFileName,
    decisionDate: decision.decisionDate,
    similarity,
  }));
}

/**
 * インメモリストア（簡易版）
 * 将来的にはデータベースに置き換え
 */
let historicalDecisionsStore: DecisionItem[] = [];

/**
 * 履歴に決定事項を追加
 */
export function addToHistory(decisions: DecisionItem[]): void {
  historicalDecisionsStore = [...historicalDecisionsStore, ...decisions];
  // 最大1000件に制限
  if (historicalDecisionsStore.length > 1000) {
    historicalDecisionsStore = historicalDecisionsStore.slice(-1000);
  }
}

/**
 * 履歴から類似事例を検索
 */
export function findSimilarFromHistory(
  targetContent: string,
  targetPatternType: DecisionPatternType,
  limit: number = 3
): SimilarDecision[] {
  return findSimilarDecisions(
    targetContent,
    targetPatternType,
    historicalDecisionsStore,
    limit
  );
}

/**
 * 履歴をクリア（テスト用）
 */
export function clearHistory(): void {
  historicalDecisionsStore = [];
}

/**
 * 現在の履歴件数を取得（デバッグ用）
 */
export function getHistoryCount(): number {
  return historicalDecisionsStore.length;
}
