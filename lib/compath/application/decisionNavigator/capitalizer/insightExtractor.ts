/**
 * Capitalizer Agent - 自動知見抽出
 *
 * 選択操作から暗黙知を自動的に構造化・蓄積
 * 「使えば使うほど賢くなる」を実現する核心機能
 */

import type { DecisionFlowNode, DecisionNavigatorSession } from "../types";
import type { Learning } from "../../../domain/decisionNavigator/expertThinking/executionResult";
import { KnowledgeRepository } from "../../../infrastructure/repositories/KnowledgeRepository";
import { env } from "../../../config/env";
import { generateChatCompletion } from "../../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../../infrastructure/llm/jsonExtractor";
import { generateId, getTimestamp } from "../utils";

// ============================================================
// 型定義
// ============================================================

/** 抽出された知見 */
export type ExtractedInsight = {
  id: string;
  type: "selection_rationale" | "pattern_recognition" | "risk_awareness" | "heuristic";
  content: string;
  confidence: number;
  context: {
    purpose: string;
    selectedPath: string[];
    nodeLabel: string;
    rationale?: string;
  };
  applicableConditions: string[];
  createdAt: string;
};

/** 自動抽出の結果 */
export type InsightExtractionResult = {
  extracted: ExtractedInsight[];
  savedAsLearning: boolean;
  matchedExistingPatterns: string[];
};

// ============================================================
// メイン関数
// ============================================================

/**
 * 選択操作から知見を自動抽出
 *
 * 以下を自動的に分析:
 * 1. 選択の根拠（なぜこの選択をしたか）
 * 2. パターン認識（過去の類似選択との関連）
 * 3. リスク認識（回避したリスク、受容したリスク）
 */
export async function autoExtractInsightFromSelection(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  rationale?: string
): Promise<InsightExtractionResult> {
  const result: InsightExtractionResult = {
    extracted: [],
    savedAsLearning: false,
    matchedExistingPatterns: [],
  };

  const now = getTimestamp();

  try {
    // 1. コンテキスト情報を収集
    const context = {
      purpose: session.purpose,
      selectedPath: session.selectionHistory.map(h => h.nodeLabel),
      nodeLabel: selectedNode.label,
      rationale,
    };

    // 2. 既存のパターンと照合
    const matchedPatterns = matchExistingPatterns(session, selectedNode);
    result.matchedExistingPatterns = matchedPatterns.map(p => p.name);

    // マッチしたパターンの信頼度を更新
    for (const pattern of matchedPatterns) {
      KnowledgeRepository.incrementPatternOccurrence(pattern.id);
    }

    // 3. 選択理由からの知見抽出
    if (rationale && rationale.trim().length > 10) {
      const rationaleInsight = extractInsightFromRationale(
        rationale,
        context,
        now
      );
      if (rationaleInsight) {
        result.extracted.push(rationaleInsight);
      }
    }

    // 4. リスク戦略からの知見抽出
    if (selectedNode.riskStrategy) {
      const riskInsight = extractInsightFromRiskStrategy(
        selectedNode,
        context,
        now
      );
      if (riskInsight) {
        result.extracted.push(riskInsight);
      }
    }

    // 5. LLMを使った深い知見抽出（APIキーがある場合）
    if (env.openaiApiKey && session.selectionHistory.length >= 2) {
      try {
        const llmInsight = await extractInsightWithLLM(session, selectedNode, rationale);
        if (llmInsight) {
          result.extracted.push(llmInsight);
        }
      } catch (llmError) {
        console.warn("[autoExtractInsightFromSelection] LLM extraction failed:", llmError);
      }
    }

    // 6. 抽出した知見をLearningとして保存
    if (result.extracted.length > 0) {
      const savedCount = saveInsightsAsLearnings(result.extracted);
      result.savedAsLearning = savedCount > 0;
    }

    console.log("[Capitalizer Agent] Insight extraction completed:", {
      extractedCount: result.extracted.length,
      savedAsLearning: result.savedAsLearning,
      matchedPatterns: result.matchedExistingPatterns.length,
    });

  } catch (error) {
    console.error("[Capitalizer Agent] Insight extraction failed:", error);
  }

  return result;
}

// ============================================================
// パターンマッチング
// ============================================================

/**
 * 既存のパターンと照合
 */
function matchExistingPatterns(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
) {
  // キーワードを収集
  const keywords = [
    session.purpose,
    selectedNode.label,
    selectedNode.description ?? "",
    selectedNode.riskStrategy ?? "",
  ].join(" ").split(/\s+/).filter(w => w.length >= 2);

  // パターンを検索
  return KnowledgeRepository.findMatchingPatterns(keywords);
}

// ============================================================
// 知見抽出ロジック
// ============================================================

/**
 * 選択理由から知見を抽出
 */
function extractInsightFromRationale(
  rationale: string,
  context: ExtractedInsight["context"],
  now: string
): ExtractedInsight | null {
  // 単純すぎる選択理由は知見として保存しない
  if (rationale.length < 15) {
    return null;
  }

  // 選択理由のパターンを分析
  const patterns = analyzeRationalePattern(rationale);

  return {
    id: generateId(),
    type: patterns.type,
    content: patterns.normalizedContent,
    confidence: patterns.confidence,
    context,
    applicableConditions: patterns.applicableConditions,
    createdAt: now,
  };
}

/**
 * 選択理由のパターンを分析
 */
function analyzeRationalePattern(rationale: string): {
  type: ExtractedInsight["type"];
  normalizedContent: string;
  confidence: number;
  applicableConditions: string[];
} {
  const text = rationale.toLowerCase();

  // リスク回避パターン
  if (text.includes("安全") || text.includes("リスク") || text.includes("危険")) {
    return {
      type: "risk_awareness",
      normalizedContent: `安全性を優先: ${rationale}`,
      confidence: 80,
      applicableConditions: ["安全性が重要な場合", "リスク回避が必要な場合"],
    };
  }

  // コスト重視パターン
  if (text.includes("コスト") || text.includes("予算") || text.includes("費用")) {
    return {
      type: "selection_rationale",
      normalizedContent: `コスト効率を考慮: ${rationale}`,
      confidence: 75,
      applicableConditions: ["予算制約がある場合", "コスト最適化が必要な場合"],
    };
  }

  // 納期重視パターン
  if (text.includes("納期") || text.includes("期限") || text.includes("スケジュール")) {
    return {
      type: "selection_rationale",
      normalizedContent: `納期を優先: ${rationale}`,
      confidence: 75,
      applicableConditions: ["納期が厳しい場合", "時間制約がある場合"],
    };
  }

  // 品質重視パターン
  if (text.includes("品質") || text.includes("精度") || text.includes("性能")) {
    return {
      type: "selection_rationale",
      normalizedContent: `品質を重視: ${rationale}`,
      confidence: 75,
      applicableConditions: ["高品質が要求される場合"],
    };
  }

  // デフォルト
  return {
    type: "selection_rationale",
    normalizedContent: rationale,
    confidence: 60,
    applicableConditions: ["同様の状況の場合"],
  };
}

/**
 * リスク戦略から知見を抽出
 */
function extractInsightFromRiskStrategy(
  node: DecisionFlowNode,
  context: ExtractedInsight["context"],
  now: string
): ExtractedInsight | null {
  if (!node.riskStrategy) return null;

  const strategyDescriptions: Record<string, { content: string; conditions: string[] }> = {
    avoid: {
      content: `リスク回避戦略を選択: ${node.label} - リスクを発生させない選択をした`,
      conditions: ["リスク許容度が低い場合", "安全性最優先の場合"],
    },
    mitigate: {
      content: `リスク軽減戦略を選択: ${node.label} - リスクを受け入れつつ影響を最小化`,
      conditions: ["リスクと便益のバランスが必要な場合"],
    },
    transfer: {
      content: `リスク移転戦略を選択: ${node.label} - リスクを外部に転嫁`,
      conditions: ["専門性が必要な場合", "保険や外注が有効な場合"],
    },
    accept: {
      content: `リスク受容戦略を選択: ${node.label} - 許容範囲のリスクとして受け入れ`,
      conditions: ["リスクが許容範囲内の場合", "対策コストが高すぎる場合"],
    },
  };

  const strategyInfo = strategyDescriptions[node.riskStrategy];
  if (!strategyInfo) return null;

  return {
    id: generateId(),
    type: "risk_awareness",
    content: strategyInfo.content,
    confidence: 70,
    context,
    applicableConditions: strategyInfo.conditions,
    createdAt: now,
  };
}

// ============================================================
// LLMベースの知見抽出
// ============================================================

const INSIGHT_EXTRACTION_PROMPT = `あなたは製造業のナレッジマネジメント専門家です。
意思決定の履歴から、将来の意思決定に役立つ「経験則」を抽出してください。

## 出力形式
以下のJSON形式で出力してください:

{
  "insight": "抽出した経験則（IF〜THEN形式推奨）",
  "confidence": 0-100の数値,
  "applicableConditions": ["この経験則が適用できる条件1", "条件2"]
}

## ガイドライン
- 具体的で実行可能な経験則を抽出
- 一般化しすぎず、適用条件を明確に
- 製造業特有の観点（QCDES）を考慮
`;

/**
 * LLMを使って深い知見を抽出
 */
async function extractInsightWithLLM(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  rationale?: string
): Promise<ExtractedInsight | null> {
  const selectionPath = session.selectionHistory
    .slice(-5) // 最新5件
    .map((h, i) => `${i + 1}. ${h.nodeLabel}`)
    .join("\n");

  const userContent = `
## 目的
${session.purpose}

## 選択履歴
${selectionPath}

## 今回の選択
- ラベル: ${selectedNode.label}
- 説明: ${selectedNode.description || "なし"}
- リスク戦略: ${selectedNode.riskStrategy || "なし"}
- 選択理由: ${rationale || "なし"}

この意思決定プロセスから、将来役立つ経験則を1つ抽出してください。
`;

  const response = await generateChatCompletion({
    systemPrompt: INSIGHT_EXTRACTION_PROMPT,
    userContent,
    temperature: 0.3,
    maxTokens: 512,
  });

  // JSONをパース
  let parsed: {
    insight?: string;
    confidence?: number;
    applicableConditions?: string[];
  };
  try {
    parsed = parseJsonFromLLMResponse(response);
  } catch {
    return null;
  }

  if (!parsed.insight) return null;

  return {
    id: generateId(),
    type: "heuristic",
    content: parsed.insight,
    confidence: parsed.confidence ?? 70,
    context: {
      purpose: session.purpose,
      selectedPath: session.selectionHistory.map(h => h.nodeLabel),
      nodeLabel: selectedNode.label,
      rationale,
    },
    applicableConditions: parsed.applicableConditions ?? [],
    createdAt: getTimestamp(),
  };
}

// ============================================================
// 永続化
// ============================================================

/**
 * 抽出した知見をLearningとして保存
 */
function saveInsightsAsLearnings(insights: ExtractedInsight[]): number {
  let savedCount = 0;

  for (const insight of insights) {
    // 信頼度が低い知見は保存しない
    if (insight.confidence < 50) {
      continue;
    }

    const learning: Learning = {
      id: insight.id,
      category: insight.type === "heuristic" ? "heuristic" : "insight",
      content: insight.content,
      applicableConditions: insight.applicableConditions,
      confidence: insight.confidence,
      confirmationCount: 1, // 初回
      futureImpact: {
        shouldConsider: true,
        suggestedWeight: insight.confidence / 100,
        context: insight.context.purpose,
      },
      createdAt: insight.createdAt,
    };

    KnowledgeRepository.saveLearning(learning);
    savedCount++;
  }

  return savedCount;
}
