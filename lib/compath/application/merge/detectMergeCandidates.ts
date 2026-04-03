import type { GraphNode, MergeCandidate, AnalysisHistory } from "../../domain/types";

/**
 * キーワード抽出用のストップワード
 */
const STOP_WORDS = new Set([
  "こと", "もの", "ため", "よう", "これ", "それ", "あれ",
  "この", "その", "あの", "について", "において", "として",
  "における", "に対して", "に関して", "に基づき", "および",
  "また", "なお", "ただし", "ただ", "場合", "とき", "ところ",
  "など", "ほか", "上記", "下記", "以上", "以下", "予定",
  "必要", "可能", "対応", "実施", "確認", "検討", "報告"
]);

/**
 * テキストからキーワードを抽出
 */
function extractKeywords(text: string): string[] {
  const patterns = [
    /[\u4e00-\u9faf]{2,}/g, // 漢字2文字以上
    /[\u30a0-\u30ff]{3,}/g, // カタカナ3文字以上
    /[A-Za-z]{3,}/g        // 英字3文字以上
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
function calculateJaccardSimilarity(keywords1: string[], keywords2: string[]): number {
  const set1 = new Set(keywords1);
  const set2 = new Set(keywords2);

  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);

  if (union.size === 0) return 0;

  return (intersection.size / union.size) * 100;
}

/**
 * ノードペアの情報
 */
type NodePair = {
  sourceNode: GraphNode;
  sourceDocumentId: string;
  sourceFileName: string;
  targetNode: GraphNode;
  targetDocumentId: string;
  targetFileName: string;
  levelId: string;
  jaccardSimilarity: number;
};

/**
 * マージ候補を検出するオプション
 */
export type DetectMergeCandidatesOptions = {
  /** 最小Jaccard類似度（プレフィルタ用） */
  minJaccardSimilarity?: number;
  /** 最終的な類似度閾値 */
  similarityThreshold?: number;
  /** 最大候補数 */
  maxCandidates?: number;
};

/**
 * 複数の分析履歴からマージ候補を検出
 *
 * アルゴリズム:
 * 1. 同一levelIdのノードを文書間でペアリング
 * 2. キーワード類似度でプレフィルタ（Jaccard > minJaccardSimilarity）
 * 3. 類似度スコアを計算
 * 4. 閾値以上をマージ候補として返却
 */
export function detectMergeCandidates(
  histories: AnalysisHistory[],
  options: DetectMergeCandidatesOptions = {}
): MergeCandidate[] {
  const {
    minJaccardSimilarity = 30,
    similarityThreshold = 50,
    maxCandidates = 100
  } = options;

  if (histories.length < 2) {
    return [];
  }

  const candidates: MergeCandidate[] = [];
  const processedPairs = new Set<string>();

  // 各文書ペアを処理
  for (let i = 0; i < histories.length; i++) {
    for (let j = i + 1; j < histories.length; j++) {
      const historyA = histories[i];
      const historyB = histories[j];

      // 各軸を処理
      for (const graphA of historyA.result.graphs) {
        const graphB = historyB.result.graphs.find(
          (g) => g.axisId === graphA.axisId
        );
        if (!graphB) continue;

        // 同じレベルのノードペアを探す
        const nodePairs = findMatchingNodePairs(
          graphA.nodes,
          historyA.id,
          historyA.fileName,
          graphB.nodes,
          historyB.id,
          historyB.fileName
        );

        // Jaccard類似度でフィルタ
        const filteredPairs = nodePairs.filter(
          (pair) => pair.jaccardSimilarity >= minJaccardSimilarity
        );

        // 候補を生成
        for (const pair of filteredPairs) {
          const pairKey = [pair.sourceNode.id, pair.targetNode.id].sort().join("-");
          if (processedPairs.has(pairKey)) continue;
          processedPairs.add(pairKey);

          // 類似度スコアを計算（Jaccardベース）
          const similarityScore = Math.round(pair.jaccardSimilarity);

          if (similarityScore < similarityThreshold) continue;

          // マージ後のラベル案を生成
          const mergedLabel = generateMergedLabel(
            pair.sourceNode.label,
            pair.targetNode.label
          );

          candidates.push({
            id: `merge-${Date.now()}-${candidates.length}`,
            sourceNodeId: pair.sourceNode.id,
            targetNodeId: pair.targetNode.id,
            sourceDocumentId: pair.sourceDocumentId,
            targetDocumentId: pair.targetDocumentId,
            similarityScore,
            similarityReason: generateSimilarityReason(pair),
            status: "pending",
            mergedLabel
          });

          if (candidates.length >= maxCandidates) {
            return candidates;
          }
        }
      }
    }
  }

  // スコアの高い順にソート
  candidates.sort((a, b) => b.similarityScore - a.similarityScore);

  return candidates;
}

/**
 * 同じレベルのノードペアを探す
 */
function findMatchingNodePairs(
  nodesA: GraphNode[],
  documentIdA: string,
  fileNameA: string,
  nodesB: GraphNode[],
  documentIdB: string,
  fileNameB: string
): NodePair[] {
  const pairs: NodePair[] = [];

  // presentのノードのみを対象
  const presentNodesA = nodesA.filter((n) => n.status === "present");
  const presentNodesB = nodesB.filter((n) => n.status === "present");

  for (const nodeA of presentNodesA) {
    const keywordsA = extractKeywords(nodeA.label);

    for (const nodeB of presentNodesB) {
      // 同じレベルのノードのみ
      if (nodeA.levelId !== nodeB.levelId) continue;

      // ラベルが10文字未満は類似度判定の対象外
      if (nodeA.label.length < 10 || nodeB.label.length < 10) continue;

      const keywordsB = extractKeywords(nodeB.label);
      const jaccardSimilarity = calculateJaccardSimilarity(keywordsA, keywordsB);

      pairs.push({
        sourceNode: nodeA,
        sourceDocumentId: documentIdA,
        sourceFileName: fileNameA,
        targetNode: nodeB,
        targetDocumentId: documentIdB,
        targetFileName: fileNameB,
        levelId: nodeA.levelId,
        jaccardSimilarity
      });
    }
  }

  return pairs;
}

/**
 * 類似理由を生成
 */
function generateSimilarityReason(pair: NodePair): string {
  const keywordsA = extractKeywords(pair.sourceNode.label);
  const keywordsB = extractKeywords(pair.targetNode.label);
  const common = keywordsA.filter((k) => keywordsB.includes(k));

  if (common.length === 0) {
    return `同じ${pair.sourceNode.levelLabel}カテゴリの類似事象`;
  }

  const topKeywords = common.slice(0, 3).join("、");
  return `共通キーワード: ${topKeywords}`;
}

/**
 * マージ後のラベル案を生成
 */
function generateMergedLabel(labelA: string, labelB: string): string {
  // 短い方をベースにする
  const base = labelA.length <= labelB.length ? labelA : labelB;
  return base;
}
