/**
 * 3セット情報収集
 *
 * LLMへのオプション生成時に必要な3つの情報を収集:
 * 1. 条件: ユーザー入力から暗黙条件を抽出
 * 2. 事例: 類似の過去案件を検索
 * 3. 推論: 目的と選択パスから優先事項を推論
 * 4. ナレッジ: 蓄積されたヒューリスティクス・パターンを検索（Phase 7）
 */

import { getTimestamp } from "../utils";
import type { SimilarCase } from "../../../domain/types";
import type { DecisionNavigatorSession, DecisionFlowNode } from "../types";
import type { ConditionOption } from "../thinkingBox/types";
import type { Heuristic, DecisionPattern } from "../../../domain/decisionNavigator/knowledgeBase/types";
import { extractConditionsFromPurpose } from "../conditionExtractor";
import { KnowledgeRepository } from "../../../infrastructure/repositories/KnowledgeRepository";
import { AnalysisHistoryRepository } from "../../../infrastructure/repositories/AnalysisHistoryRepository";

// ============================================================
// 型定義
// ============================================================

/** 3セットデータの型（Phase 7: ナレッジ拡張） */
export type ThreeSetData = {
  conditions: ConditionOption[];
  pastCases: SimilarCase[];
  inferredPriorities: string[];
  // Phase 7: 蓄積されたナレッジ
  knowledge?: {
    heuristics: Heuristic[];
    successPatterns: DecisionPattern[];
    failurePatterns: DecisionPattern[];
  };
};

// ============================================================
// メイン関数
// ============================================================

/**
 * 3セット情報を収集
 *
 * @public 外部からも利用可能（recordSelectionから呼び出し）
 */
export async function collectThreeSetData(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): Promise<ThreeSetData> {
  // 選択パスを取得
  const selectionPath = session.selectionHistory.map(s => s.nodeLabel);
  const currentSelection = selectedNode.label;

  // 1. 条件の抽出
  const conditions = extractConditionsFromContext(session, selectedNode);

  // 2. 過去事例の検索（目的 + 選択パスをクエリに含める）
  const queryParts = [session.purpose, ...selectionPath, currentSelection];
  const pastCases = await searchSimilarCasesFromHistory(queryParts.join(" "));

  // 3. 優先事項の推論
  const inferredPriorities = inferPrioritiesFromContext(session, selectedNode, conditions);

  // 4. Phase 7: 蓄積されたナレッジを検索
  const knowledge = collectKnowledgeForContext(session, selectedNode, conditions);

  return {
    conditions,
    pastCases,
    inferredPriorities,
    knowledge,
  };
}

// ============================================================
// 過去事例検索
// ============================================================

/**
 * 過去の分析履歴から類似事例を検索
 */
async function searchSimilarCasesFromHistory(query: string): Promise<SimilarCase[]> {
  // 履歴サマリーを取得
  const summaries = AnalysisHistoryRepository.findAll();
  if (summaries.length === 0) return [];

  // クエリをキーワードに分割
  const keywords = query
    .split(/[\s、。・]+/)
    .filter((k) => k.length > 1)
    .slice(0, 10);

  if (keywords.length === 0) return [];

  // キーワードマッチングで類似事例を検索
  const results: SimilarCase[] = [];
  for (const summary of summaries.slice(0, 10)) {
    // 最新10件を対象
    // 完全な履歴を取得
    const fullHistory = AnalysisHistoryRepository.findById(summary.id);
    if (!fullHistory) continue;

    const historyText = fullHistory.result.summary || "";
    let matchCount = 0;
    for (const keyword of keywords) {
      if (historyText.includes(keyword) || summary.fileName.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      results.push({
        id: summary.id,
        content: historyText.slice(0, 100) || summary.fileName,
        similarity: Math.min(100, matchCount * 20),
        patternType: "decision",
        status: "confirmed",
        sourceFileName: summary.fileName,
        decisionDate: summary.analyzedAt,
        adoptedConclusion: undefined,
        perspectives: [],
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

// ============================================================
// ナレッジ収集（Phase 7）
// ============================================================

/**
 * コンテキストに関連するナレッジを収集
 *
 * KnowledgeRepositoryからヒューリスティクス・パターンを検索し、
 * 選択肢生成の参考情報として返す
 */
function collectKnowledgeForContext(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  conditions: ConditionOption[]
): ThreeSetData["knowledge"] {
  // 条件からドメインを抽出
  const domains = extractDomainsFromConditions(conditions);

  // 目的と選択パスからキーワードを抽出
  const keywords = extractKeywordsForKnowledge(session, selectedNode);

  // ヒューリスティクスを検索（ドメイン + キーワード）
  const heuristicsByDomain = KnowledgeRepository.findHeuristicsByDomain(domains);
  const heuristicsByKeywords = KnowledgeRepository.findHeuristicsByKeywords(keywords);

  // 重複を排除してマージ
  const heuristicIds = new Set<string>();
  const heuristics: Heuristic[] = [];
  for (const h of [...heuristicsByDomain, ...heuristicsByKeywords]) {
    if (!heuristicIds.has(h.id)) {
      heuristicIds.add(h.id);
      heuristics.push(h);
    }
  }

  // 信頼度でソートして上位5件に制限
  const sortedHeuristics = heuristics
    .sort((a, b) => b.reliability.score - a.reliability.score)
    .slice(0, 5);

  // 成功・失敗パターンを取得
  const successPatterns = KnowledgeRepository.findSuccessPatterns(3);
  const failurePatterns = KnowledgeRepository.findFailurePatterns(3);

  // ナレッジがない場合はundefinedを返す
  if (sortedHeuristics.length === 0 && successPatterns.length === 0 && failurePatterns.length === 0) {
    return undefined;
  }

  console.log("[collectKnowledgeForContext] Found knowledge:");
  console.log("  - Heuristics:", sortedHeuristics.length);
  console.log("  - Success patterns:", successPatterns.length);
  console.log("  - Failure patterns:", failurePatterns.length);

  return {
    heuristics: sortedHeuristics,
    successPatterns,
    failurePatterns,
  };
}

/**
 * 条件からドメイン（領域）を抽出
 */
function extractDomainsFromConditions(conditions: ConditionOption[]): string[] {
  const categoryToDomain: Record<string, string> = {
    safety: "technical",
    legal: "organizational",
    cost: "strategic",
    time: "organizational",
    quality: "technical",
    technical: "technical",
    other: "general",
  };

  const domains = new Set<string>();
  for (const condition of conditions) {
    const domain = categoryToDomain[condition.category] ?? "general";
    domains.add(domain);
  }

  return Array.from(domains);
}

/**
 * セッションからナレッジ検索用キーワードを抽出
 */
function extractKeywordsForKnowledge(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): string[] {
  const keywords: string[] = [];

  // 目的からキーワードを抽出
  const purposeWords = session.purpose
    .split(/[\s、。・]+/)
    .filter(w => w.length > 1)
    .slice(0, 5);
  keywords.push(...purposeWords);

  // 選択パスからキーワードを抽出
  for (const selection of session.selectionHistory.slice(-3)) {
    const words = selection.nodeLabel
      .split(/[\s、。・]+/)
      .filter(w => w.length > 1);
    keywords.push(...words);
  }

  // 現在のノードからキーワードを抽出
  const nodeWords = selectedNode.label
    .split(/[\s、。・]+/)
    .filter(w => w.length > 1);
  keywords.push(...nodeWords);

  // 重複を排除して返す
  return [...new Set(keywords)].slice(0, 10);
}

// ============================================================
// 条件抽出
// ============================================================

/**
 * セッションコンテキストから条件を抽出
 */
function extractConditionsFromContext(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): ConditionOption[] {
  // 基本条件を目的から抽出
  const baseConditions = extractConditionsFromPurpose(
    session.purpose,
    undefined, // currentSituation は DecisionNavigatorSession にないので undefined
    session.documentSource?.extractedContext
  );

  // 選択履歴から追加条件を抽出
  const selectionConditions = extractConditionsFromSelections(session);

  // 現在の選択から条件を追加
  const currentConditions = extractConditionsFromCurrentSelection(selectedNode);

  // 重複を排除して統合
  const allConditions = [...baseConditions, ...selectionConditions, ...currentConditions];
  const uniqueConditions = deduplicateConditions(allConditions);

  return uniqueConditions;
}

/**
 * 選択履歴から条件を抽出
 */
function extractConditionsFromSelections(
  session: DecisionNavigatorSession
): ConditionOption[] {
  const conditions: ConditionOption[] = [];
  const now = getTimestamp();

  for (const selection of session.selectionHistory) {
    // 選択ラベルから条件パターンを検出
    const label = selection.nodeLabel.toLowerCase();

    // 優先順位の選択
    if (label.includes("優先") || label.includes("重視")) {
      conditions.push({
        id: `sel-${selection.nodeId}`,
        type: "implicit_condition",
        label: `選択: ${selection.nodeLabel}`,
        description: `ユーザーが「${selection.nodeLabel}」を選択したことで確定した優先事項`,
        category: inferCategoryFromLabel(label),
        implications: [],
        narrowsOptions: [],
        source: "user_context",
        confidence: 90,
        isSelected: true,
        createdAt: now,
      });
    }

    // 方向性の選択
    if (label.includes("広げる") || label.includes("縮める") ||
        label.includes("増やす") || label.includes("減らす")) {
      conditions.push({
        id: `sel-${selection.nodeId}`,
        type: "implicit_condition",
        label: `方向性: ${selection.nodeLabel}`,
        description: `「${selection.nodeLabel}」という方向性が選択されました`,
        category: "other",
        implications: [],
        narrowsOptions: [],
        source: "user_context",
        confidence: 85,
        isSelected: true,
        createdAt: now,
      });
    }
  }

  return conditions;
}

/**
 * 現在の選択から条件を抽出
 */
function extractConditionsFromCurrentSelection(
  selectedNode: DecisionFlowNode
): ConditionOption[] {
  const conditions: ConditionOption[] = [];
  const now = getTimestamp();
  const label = selectedNode.label.toLowerCase();

  // 具体的な数値が含まれる場合
  const numericMatch = selectedNode.label.match(/(\d+(?:\.\d+)?)\s*(mm|cm|m|km|円|万円|%|日|週|月)/i);
  if (numericMatch) {
    conditions.push({
      id: `cur-numeric`,
      type: "implicit_condition",
      label: `決定値: ${numericMatch[0]}`,
      description: `具体的な値「${numericMatch[0]}」が選択されました`,
      category: inferCategoryFromUnit(numericMatch[2]),
      implications: [],
      narrowsOptions: [],
      source: "user_context",
      confidence: 95,
      isSelected: true,
      createdAt: now,
    });
  }

  // カテゴリに関連する選択
  if (label.includes("安全") || label.includes("リスク")) {
    conditions.push({
      id: `cur-safety`,
      type: "implicit_condition",
      label: "安全性を考慮",
      description: "安全性に関する選択がされました",
      category: "safety",
      implications: [],
      narrowsOptions: [],
      source: "user_context",
      confidence: 80,
      isSelected: true,
      createdAt: now,
    });
  }

  if (label.includes("コスト") || label.includes("費用") || label.includes("予算")) {
    conditions.push({
      id: `cur-cost`,
      type: "implicit_condition",
      label: "コストを考慮",
      description: "コストに関する選択がされました",
      category: "cost",
      implications: [],
      narrowsOptions: [],
      source: "user_context",
      confidence: 80,
      isSelected: true,
      createdAt: now,
    });
  }

  if (label.includes("法規") || label.includes("基準") || label.includes("規制")) {
    conditions.push({
      id: `cur-legal`,
      type: "implicit_condition",
      label: "法規制約を考慮",
      description: "法規に関する選択がされました",
      category: "legal",
      implications: [],
      narrowsOptions: [],
      source: "user_context",
      confidence: 85,
      isSelected: true,
      createdAt: now,
    });
  }

  return conditions;
}

// ============================================================
// 優先事項推論
// ============================================================

/**
 * コンテキストから優先事項を推論
 */
function inferPrioritiesFromContext(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  conditions: ConditionOption[]
): string[] {
  const priorities: string[] = [];

  // 条件カテゴリから優先事項を推論
  const categories = new Set(conditions.map(c => c.category));

  if (categories.has("legal")) {
    priorities.push("法規基準を満たすことが必須");
  }

  if (categories.has("safety")) {
    priorities.push("安全性を確保する選択を優先");
  }

  if (categories.has("cost")) {
    priorities.push("コスト効率を考慮した選択");
  }

  // 目的から追加の優先事項を推論
  const purpose = session.purpose.toLowerCase();

  if (purpose.includes("距離") || purpose.includes("間隔")) {
    if (!priorities.some(p => p.includes("法規"))) {
      priorities.push("設備間の適切な距離を確保");
    }
    priorities.push("保守点検時のアクセス性を確保");
  }

  if (purpose.includes("予算") || purpose.includes("費用")) {
    priorities.push("予算内での最適な選択");
    priorities.push("ランニングコストも考慮");
  }

  // 選択パスから追加の優先事項を推論
  const selectionLabels = session.selectionHistory.map(s => s.nodeLabel.toLowerCase());

  if (selectionLabels.some(l => l.includes("広げる"))) {
    priorities.push("余裕を持った設定を検討");
  }

  if (selectionLabels.some(l => l.includes("縮める") || l.includes("最小"))) {
    priorities.push("最小限の設定で効率化");
  }

  // デフォルトの優先事項
  if (priorities.length === 0) {
    priorities.push("バランスの取れた選択を推奨");
  }

  return priorities;
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * ラベルからカテゴリを推論
 */
function inferCategoryFromLabel(label: string): ConditionOption["category"] {
  if (label.includes("安全") || label.includes("リスク")) return "safety";
  if (label.includes("コスト") || label.includes("費用") || label.includes("予算")) return "cost";
  if (label.includes("法規") || label.includes("基準") || label.includes("規制")) return "legal";
  if (label.includes("納期") || label.includes("期間") || label.includes("スケジュール")) return "time";
  if (label.includes("品質") || label.includes("精度")) return "quality";
  if (label.includes("技術") || label.includes("仕様")) return "technical";
  return "other";
}

/**
 * 単位からカテゴリを推論
 */
function inferCategoryFromUnit(unit: string): ConditionOption["category"] {
  const lowerUnit = unit.toLowerCase();
  if (["mm", "cm", "m", "km"].includes(lowerUnit)) return "technical";
  if (["円", "万円"].includes(lowerUnit)) return "cost";
  if (["%"].includes(lowerUnit)) return "other";
  if (["日", "週", "月"].includes(lowerUnit)) return "time";
  return "other";
}

/**
 * 条件の重複を排除
 */
function deduplicateConditions(conditions: ConditionOption[]): ConditionOption[] {
  const seen = new Map<string, ConditionOption>();

  for (const condition of conditions) {
    // ラベルとカテゴリの組み合わせで重複判定
    const key = `${condition.category}:${condition.label}`;
    const existing = seen.get(key);

    // confidence が undefined の場合は 0 として扱う
    const conditionConfidence = condition.confidence ?? 0;
    const existingConfidence = existing?.confidence ?? 0;

    if (!existing || conditionConfidence > existingConfidence) {
      seen.set(key, condition);
    }
  }

  return Array.from(seen.values());
}
