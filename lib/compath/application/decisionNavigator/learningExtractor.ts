/**
 * 学習抽出・昇格サービス
 *
 * 振り返り（Retrospective）から抽出されたLearningを
 * Heuristic（経験則）やDecisionPattern（判断パターン）に昇格
 */

import type { Learning } from "../../domain/decisionNavigator/expertThinking/executionResult";
import type {
  Heuristic,
  DecisionPattern,
} from "../../domain/decisionNavigator/knowledgeBase/types";
import { KnowledgeRepository } from "../../infrastructure/repositories/KnowledgeRepository";
import { inferDomainsFromConditions, generateId, getTimestamp } from "./utils";

// ============================================================
// 定数
// ============================================================

/** 学習がヒューリスティクスに昇格するための確認回数閾値 */
const DEFAULT_CONFIRMATION_THRESHOLD = 3;

/** パターン抽出に必要な最小学習数 */
const MIN_LEARNINGS_FOR_PATTERN = 2;

// ============================================================
// メイン関数
// ============================================================

/**
 * 学習をヒューリスティクスに昇格
 *
 * 確認回数が閾値を超えた学習を経験則として登録
 */
export async function promoteLearningToHeuristic(
  learning: Learning,
  confirmationThreshold: number = DEFAULT_CONFIRMATION_THRESHOLD
): Promise<Heuristic | null> {
  // 確認回数が閾値に達していない場合はスキップ
  if (learning.confirmationCount < confirmationThreshold) {
    return null;
  }

  // カテゴリがheuristicまたはinsightの場合のみ昇格対象
  if (learning.category !== "heuristic" && learning.category !== "insight") {
    return null;
  }

  const now = getTimestamp();

  // Learningの内容からIF/THENルールを構築
  const rule = constructRuleFromLearning(learning);

  const heuristic: Heuristic = {
    id: generateId(),
    rule,
    description: learning.content,
    domain: inferDomainsFromConditions(learning.applicableConditions),
    reliability: {
      score: Math.min(100, learning.confidence + learning.confirmationCount * 5),
      sampleSize: learning.confirmationCount,
    },
    exceptions: [],
    usageStats: {
      timesApplied: 0,
      successRate: 0,
    },
    source: "pattern_extraction",
    createdAt: now,
    updatedAt: now,
    isActive: true,
  };

  // リポジトリに保存
  KnowledgeRepository.saveHeuristic(heuristic);

  // 元の学習を削除（昇格済み）
  KnowledgeRepository.deleteLearning(learning.id);

  return heuristic;
}

/**
 * 類似する学習群からパターンを抽出
 */
export async function extractPatternFromLearnings(
  learnings: Learning[],
  type: "success" | "failure"
): Promise<DecisionPattern | null> {
  // 最低限の学習数がない場合はスキップ
  if (learnings.length < MIN_LEARNINGS_FOR_PATTERN) {
    return null;
  }

  // 指定されたタイプの学習のみフィルタ
  const filteredLearnings = learnings.filter((l) =>
    type === "success"
      ? l.category === "success_pattern"
      : l.category === "failure_pattern"
  );

  if (filteredLearnings.length < MIN_LEARNINGS_FOR_PATTERN) {
    return null;
  }

  const now = getTimestamp();

  // 共通の条件を抽出
  const commonConditions = extractCommonConditions(filteredLearnings);

  // パターン名を生成
  const patternName = generatePatternName_(filteredLearnings, type);

  // 教訓をまとめる
  const lessons = filteredLearnings.map((l) => l.content);

  // 信頼度を計算（学習の平均信頼度 + 学習数ボーナス）
  const avgConfidence =
    filteredLearnings.reduce((sum, l) => sum + l.confidence, 0) /
    filteredLearnings.length;
  const reliability = Math.min(100, avgConfidence + filteredLearnings.length * 2);

  const pattern: DecisionPattern = {
    id: generateId(),
    name: patternName,
    type,
    applicableConditions: commonConditions,
    sequence: [], // 単純なパターンではシーケンスは空
    lessons: lessons.slice(0, 5), // 最大5つ
    recommendations:
      type === "success"
        ? ["この条件では同様のアプローチを検討する"]
        : ["この条件では別のアプローチを検討する"],
    occurrences: filteredLearnings.length,
    reliability,
    firstOccurredAt: now,
    lastOccurredAt: now,
    relatedSessionIds: [],
  };

  // リポジトリに保存
  KnowledgeRepository.savePattern(pattern);

  return pattern;
}

/**
 * 確認閾値を超えた学習を一括でヒューリスティクス化
 */
export async function promoteAllConfirmedLearnings(
  confirmationThreshold: number = DEFAULT_CONFIRMATION_THRESHOLD
): Promise<Heuristic[]> {
  const confirmedLearnings =
    KnowledgeRepository.findConfirmedLearnings(confirmationThreshold);

  const promotedHeuristics: Heuristic[] = [];

  for (const learning of confirmedLearnings) {
    const heuristic = await promoteLearningToHeuristic(
      learning,
      confirmationThreshold
    );
    if (heuristic) {
      promotedHeuristics.push(heuristic);
    }
  }

  return promotedHeuristics;
}

/**
 * 学習群から成功・失敗パターンを自動抽出
 */
export async function autoExtractPatterns(
  learnings: Learning[]
): Promise<{ success: DecisionPattern[]; failure: DecisionPattern[] }> {
  const successPatterns: DecisionPattern[] = [];
  const failurePatterns: DecisionPattern[] = [];

  // 成功パターンの学習をグループ化
  const successLearnings = learnings.filter(
    (l) => l.category === "success_pattern"
  );
  if (successLearnings.length >= MIN_LEARNINGS_FOR_PATTERN) {
    const pattern = await extractPatternFromLearnings(successLearnings, "success");
    if (pattern) {
      successPatterns.push(pattern);
    }
  }

  // 失敗パターンの学習をグループ化
  const failureLearnings = learnings.filter(
    (l) => l.category === "failure_pattern"
  );
  if (failureLearnings.length >= MIN_LEARNINGS_FOR_PATTERN) {
    const pattern = await extractPatternFromLearnings(failureLearnings, "failure");
    if (pattern) {
      failurePatterns.push(pattern);
    }
  }

  return { success: successPatterns, failure: failurePatterns };
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * Learningの内容からIF/THENルールを構築
 */
function constructRuleFromLearning(learning: Learning): string {
  const conditions = learning.applicableConditions;

  if (conditions.length === 0) {
    return `IF 同様の状況 THEN ${learning.content}`;
  }

  const conditionStr = conditions.slice(0, 2).join(" かつ ");
  return `IF ${conditionStr} THEN ${learning.content}`;
}

/**
 * 学習群から共通条件を抽出
 */
function extractCommonConditions(
  learnings: Learning[]
): Array<{ dimension: string; condition: string }> {
  // 各学習のapplicableConditionsを集計
  const conditionCounts = new Map<string, number>();

  for (const learning of learnings) {
    for (const condition of learning.applicableConditions) {
      const count = conditionCounts.get(condition) || 0;
      conditionCounts.set(condition, count + 1);
    }
  }

  // 半数以上の学習に共通する条件を抽出
  const threshold = learnings.length / 2;
  const commonConditions: Array<{ dimension: string; condition: string }> = [];

  for (const [condition, count] of conditionCounts.entries()) {
    if (count >= threshold) {
      commonConditions.push({
        dimension: "context",
        condition,
      });
    }
  }

  // 共通条件がない場合は一般的な条件を追加
  if (commonConditions.length === 0) {
    commonConditions.push({
      dimension: "general",
      condition: "類似の状況",
    });
  }

  return commonConditions.slice(0, 3); // 最大3つ
}

/**
 * パターン名を生成
 */
function generatePatternName_(
  learnings: Learning[],
  type: "success" | "failure"
): string {
  const prefix = type === "success" ? "成功" : "失敗";

  // 最初の学習の内容から名前を生成
  const firstContent = learnings[0]?.content || "";
  const shortContent =
    firstContent.length > 20 ? `${firstContent.slice(0, 20)}...` : firstContent;

  return `${prefix}パターン: ${shortContent}`;
}
