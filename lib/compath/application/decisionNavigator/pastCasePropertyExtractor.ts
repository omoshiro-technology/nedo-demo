/**
 * 過去事例DecisionProperty抽出サービス
 *
 * SimilarCase（過去事例）からDecisionPropertyを抽出し、
 * ナレッジベース（Heuristic/DecisionPattern）として蓄積
 *
 * フロー:
 * 1. 過去事例からDecisionPropertyを生成（既存関数を利用）
 * 2. 抽出された情報をHeuristic/DecisionPatternに変換
 * 3. KnowledgeRepositoryに保存
 */

import type { SimilarCase } from "../../domain/types";
import type {
  Heuristic,
  DecisionPattern,
  PatternCondition,
} from "../../domain/decisionNavigator/knowledgeBase/types";
import type { DecisionProperty } from "../../domain/decisionNavigator/expertThinking/types";
import { KnowledgeRepository } from "../../infrastructure/repositories/KnowledgeRepository";
import { generateDecisionPropertyFromPastCase } from "./decisionPropertyGenerator";
import { inferDomainsFromContent, generateId, getTimestamp } from "./utils";

// ============================================================
// 型定義
// ============================================================

/** 抽出結果 */
export type PastCaseExtractionResult = {
  /** 生成されたDecisionProperty */
  property: DecisionProperty;
  /** ナレッジとして保存されたか */
  savedToKnowledge: boolean;
  /** 保存されたナレッジの種類 */
  savedAs?: "heuristic" | "pattern";
  /** 保存されたナレッジのID */
  knowledgeId?: string;
};

/** バッチ抽出結果 */
export type BatchExtractionResult = {
  /** 処理した過去事例数 */
  processedCount: number;
  /** 抽出成功数 */
  extractedCount: number;
  /** ヒューリスティクスとして保存された数 */
  heuristicsCreated: number;
  /** パターンとして保存された数 */
  patternsCreated: number;
  /** 個別の結果 */
  results: PastCaseExtractionResult[];
};

/** 抽出オプション */
export type ExtractionOptions = {
  /** 最小類似度（これ以上の類似度の事例のみ抽出） */
  minSimilarity?: number;
  /** ヒューリスティクス化の閾値（類似度がこれ以上ならヒューリスティクス化） */
  heuristicThreshold?: number;
  /** パターン化の閾値（類似度がこれ以上ならパターン化） */
  patternThreshold?: number;
  /** 重複チェックを行うか */
  checkDuplicates?: boolean;
};

// ============================================================
// 定数
// ============================================================

const DEFAULT_MIN_SIMILARITY = 0.3;
const DEFAULT_HEURISTIC_THRESHOLD = 0.7;
const DEFAULT_PATTERN_THRESHOLD = 0.5;

// ============================================================
// メイン関数
// ============================================================

/**
 * 単一の過去事例からDecisionPropertyを抽出
 *
 * @param pastCase 過去事例
 * @param nodeLabel 関連するノードラベル
 * @param options 抽出オプション
 */
export async function extractPropertyFromPastCase(
  pastCase: SimilarCase,
  nodeLabel: string,
  options: ExtractionOptions = {}
): Promise<PastCaseExtractionResult> {
  const {
    minSimilarity = DEFAULT_MIN_SIMILARITY,
    heuristicThreshold = DEFAULT_HEURISTIC_THRESHOLD,
    patternThreshold = DEFAULT_PATTERN_THRESHOLD,
    checkDuplicates = true,
  } = options;

  // 類似度が閾値未満の場合はスキップ
  if (pastCase.similarity < minSimilarity) {
    const property = generateDecisionPropertyFromPastCase(
      { content: pastCase.content, sourceFileName: pastCase.sourceFileName },
      nodeLabel
    );
    return {
      property,
      savedToKnowledge: false,
    };
  }

  // DecisionPropertyを生成
  const property = generateDecisionPropertyFromPastCase(
    { content: pastCase.content, sourceFileName: pastCase.sourceFileName },
    nodeLabel
  );

  // 類似度に応じてヒューリスティクスまたはパターンとして保存
  if (pastCase.similarity >= heuristicThreshold) {
    // 高類似度: ヒューリスティクスとして保存
    const heuristic = convertPropertyToHeuristic(property, pastCase, nodeLabel);

    if (checkDuplicates && isDuplicateHeuristic(heuristic)) {
      return {
        property,
        savedToKnowledge: false,
      };
    }

    KnowledgeRepository.saveHeuristic(heuristic);
    return {
      property,
      savedToKnowledge: true,
      savedAs: "heuristic",
      knowledgeId: heuristic.id,
    };
  } else if (pastCase.similarity >= patternThreshold) {
    // 中程度の類似度: パターンとして保存
    const pattern = convertCaseToPattern(pastCase, nodeLabel);

    if (checkDuplicates && isDuplicatePattern(pattern)) {
      return {
        property,
        savedToKnowledge: false,
      };
    }

    KnowledgeRepository.savePattern(pattern);
    return {
      property,
      savedToKnowledge: true,
      savedAs: "pattern",
      knowledgeId: pattern.id,
    };
  }

  return {
    property,
    savedToKnowledge: false,
  };
}

/**
 * 複数の過去事例からバッチ抽出
 *
 * @param pastCases 過去事例の配列
 * @param nodeLabel 関連するノードラベル
 * @param options 抽出オプション
 */
export async function extractPropertiesFromPastCases(
  pastCases: SimilarCase[],
  nodeLabel: string,
  options: ExtractionOptions = {}
): Promise<BatchExtractionResult> {
  const results: PastCaseExtractionResult[] = [];
  let heuristicsCreated = 0;
  let patternsCreated = 0;

  for (const pastCase of pastCases) {
    const result = await extractPropertyFromPastCase(pastCase, nodeLabel, options);
    results.push(result);

    if (result.savedToKnowledge) {
      if (result.savedAs === "heuristic") {
        heuristicsCreated++;
      } else if (result.savedAs === "pattern") {
        patternsCreated++;
      }
    }
  }

  return {
    processedCount: pastCases.length,
    extractedCount: results.filter((r) => r.savedToKnowledge).length,
    heuristicsCreated,
    patternsCreated,
    results,
  };
}

/**
 * セッション終了時に過去事例からナレッジを抽出・保存
 *
 * 選択された過去事例（採用されたもの）のみを対象とする
 */
export async function extractKnowledgeFromSessionPastCases(
  selectedPastCases: Array<{
    pastCase: SimilarCase;
    nodeLabel: string;
    wasAdopted: boolean;
  }>,
  options: ExtractionOptions = {}
): Promise<BatchExtractionResult> {
  // 採用された事例のみを抽出対象とする
  const adoptedCases = selectedPastCases.filter((c) => c.wasAdopted);

  const results: PastCaseExtractionResult[] = [];
  let heuristicsCreated = 0;
  let patternsCreated = 0;

  for (const { pastCase, nodeLabel } of adoptedCases) {
    // 採用された事例は類似度を上げて保存しやすくする
    const adjustedCase: SimilarCase = {
      ...pastCase,
      similarity: Math.min(1, pastCase.similarity + 0.1), // 採用ボーナス
    };

    const result = await extractPropertyFromPastCase(adjustedCase, nodeLabel, options);
    results.push(result);

    if (result.savedToKnowledge) {
      if (result.savedAs === "heuristic") {
        heuristicsCreated++;
      } else if (result.savedAs === "pattern") {
        patternsCreated++;
      }
    }
  }

  return {
    processedCount: adoptedCases.length,
    extractedCount: results.filter((r) => r.savedToKnowledge).length,
    heuristicsCreated,
    patternsCreated,
    results,
  };
}

// ============================================================
// 変換関数
// ============================================================

/**
 * DecisionPropertyをHeuristicに変換
 */
function convertPropertyToHeuristic(
  property: DecisionProperty,
  pastCase: SimilarCase,
  nodeLabel: string
): Heuristic {
  const now = getTimestamp();

  // ドメインを推定
  const domains = inferDomainsFromContent(pastCase.content, nodeLabel);

  // 信頼度を計算（類似度と事例の状態から）
  const reliabilityScore = calculateReliabilityScore(pastCase);

  return {
    id: generateId(),
    rule: property.rule.type === "if_then"
      ? `IF ${property.rule.condition} THEN ${property.rule.thenAction}`
      : `${property.rule.condition} → ${property.rule.thenAction}`,
    description: `過去事例「${pastCase.sourceFileName}」から抽出: ${pastCase.content.slice(0, 100)}...`,
    domain: domains,
    reliability: {
      score: reliabilityScore,
      sampleSize: 1,
      lastConfirmedAt: now,
    },
    exceptions: [],
    usageStats: {
      timesApplied: 0,
      successRate: pastCase.status === "confirmed" ? 100 : 50,
    },
    source: "pattern_extraction",
    createdAt: now,
    updatedAt: now,
    isActive: true,
    tags: [pastCase.patternType, nodeLabel.slice(0, 20)],
  };
}

/**
 * SimilarCaseをDecisionPatternに変換
 */
function convertCaseToPattern(
  pastCase: SimilarCase,
  nodeLabel: string
): DecisionPattern {
  const now = getTimestamp();

  // パターンタイプを判定（confirmed=成功、それ以外=失敗）
  const patternType: "success" | "failure" =
    pastCase.status === "confirmed" ? "success" : "failure";

  // 条件を抽出
  const conditions = extractConditionsFromCase(pastCase, nodeLabel);

  return {
    id: generateId(),
    name: `${patternType === "success" ? "成功" : "失敗"}事例: ${nodeLabel}`,
    type: patternType,
    applicableConditions: conditions,
    sequence: [],
    lessons: [
      pastCase.adoptedConclusion || pastCase.content.slice(0, 200),
    ],
    recommendations: patternType === "success"
      ? ["同様の状況ではこのアプローチを検討する"]
      : ["同様の状況では別のアプローチを検討する"],
    occurrences: 1,
    reliability: Math.round(pastCase.similarity * 100),
    firstOccurredAt: pastCase.decisionDate || now,
    lastOccurredAt: now,
    relatedSessionIds: [],
    tags: [pastCase.patternType, pastCase.sourceFileName],
  };
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 信頼度スコアを計算
 */
function calculateReliabilityScore(pastCase: SimilarCase): number {
  let score = Math.round(pastCase.similarity * 100);

  // 確定状態ならボーナス
  if (pastCase.status === "confirmed") {
    score += 10;
  }

  // 採用された結論があればボーナス
  if (pastCase.adoptedConclusion) {
    score += 5;
  }

  return Math.min(100, score);
}

/**
 * 過去事例から条件を抽出
 */
function extractConditionsFromCase(
  pastCase: SimilarCase,
  nodeLabel: string
): PatternCondition[] {
  const conditions: PatternCondition[] = [];

  // ノードラベルを条件として追加
  conditions.push({
    dimension: "context",
    condition: nodeLabel,
  });

  // パターンタイプを条件として追加
  conditions.push({
    dimension: "pattern_type",
    condition: pastCase.patternType,
  });

  return conditions;
}

/**
 * 重複ヒューリスティクスのチェック
 */
function isDuplicateHeuristic(newHeuristic: Heuristic): boolean {
  const existingHeuristics = KnowledgeRepository.getAllHeuristics();

  // ルールの類似性で判定（簡易的な重複チェック）
  for (const existing of existingHeuristics) {
    if (calculateTextSimilarity(existing.rule, newHeuristic.rule) > 0.8) {
      return true;
    }
  }

  return false;
}

/**
 * 重複パターンのチェック
 */
function isDuplicatePattern(newPattern: DecisionPattern): boolean {
  const existingPatterns = KnowledgeRepository.getAllPatterns();

  // パターン名と教訓の類似性で判定
  for (const existing of existingPatterns) {
    if (
      existing.type === newPattern.type &&
      existing.lessons.some((lesson) =>
        newPattern.lessons.some(
          (newLesson) => calculateTextSimilarity(lesson, newLesson) > 0.8
        )
      )
    ) {
      // 重複と判定した場合は発生回数をインクリメント
      KnowledgeRepository.incrementPatternOccurrence(existing.id);
      return true;
    }
  }

  return false;
}

/**
 * テキストの類似度を計算（簡易的なJaccard係数）
 */
function calculateTextSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}
