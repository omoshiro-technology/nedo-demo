/**
 * 過去事例教訓抽出（Lesson Extractor）
 *
 * Sentinel Agent の核心機能
 * - 類似過去事例から見落としパターンを抽出
 * - 成功/失敗要因を分析して警告を生成
 * - 製造業特化の教訓データベースを構築
 */

import { env } from "../../config/env";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import type { DecisionFlowNode } from "./types";
import type {
  OverlookedWarningDetail,
} from "../../domain/decisionNavigator/expertThinking/expertInsight";
import type { DecisionViewpoint } from "../../domain/decisionNavigator/expertThinking/types";

// ============================================================
// 型定義
// ============================================================

/** 類似過去事例 */
export type SimilarCase = {
  id: string;
  content: string;
  similarity: number;
  sourceFileName?: string;
  outcome?: "success" | "failure" | "unknown";
  lessons?: string[];
};

/** 見落としパターン */
export type OverlookedPattern = {
  id: string;
  viewpoint: string;
  description: string;
  frequency: number; // 過去何回見落とされたか
  consequences: string[];
  preventionTips: string[];
  relatedCases: string[]; // 関連する過去事例ID
};

/** 教訓抽出結果 */
export type LessonExtractionResult = {
  overlookedPatterns: OverlookedPattern[];
  successFactors: string[];
  failureFactors: string[];
  warnings: OverlookedWarningDetail[];
};

// ============================================================
// メイン関数
// ============================================================

/**
 * 過去事例から教訓を抽出
 */
export async function extractLessonsFromPastCases(
  pastCases: SimilarCase[],
  currentNode: DecisionFlowNode,
  context?: {
    purpose?: string;
    selectedPath?: string[];
  }
): Promise<LessonExtractionResult> {
  const now = getTimestamp();

  // 過去事例がない場合はデフォルト値を返す
  if (pastCases.length === 0) {
    return {
      overlookedPatterns: [],
      successFactors: [],
      failureFactors: [],
      warnings: [],
    };
  }

  // LLMが使えない場合はルールベースで抽出
  if (!env.anthropicApiKey) {
    return extractLessonsRuleBased(pastCases, currentNode, now);
  }

  // LLMを使用して教訓を抽出
  try {
    return await extractLessonsWithLLM(pastCases, currentNode, context, now);
  } catch (error) {
    console.warn("[extractLessonsFromPastCases] LLM extraction failed:", error);
    return extractLessonsRuleBased(pastCases, currentNode, now);
  }
}

// ============================================================
// LLMベースの教訓抽出
// ============================================================

const LESSON_EXTRACTION_PROMPT = `あなたは製造業のベテランエンジニアです。
過去の類似事例を分析し、若手エンジニアが見落としやすいポイントを抽出してください。

## 出力形式
以下のJSON形式で出力してください。

{
  "overlookedPatterns": [
    {
      "viewpoint": "見落とされた観点名",
      "description": "具体的な説明",
      "consequences": ["見落とした場合の結果1", "結果2"],
      "preventionTips": ["防止のためのアドバイス1", "アドバイス2"]
    }
  ],
  "successFactors": ["成功要因1", "成功要因2"],
  "failureFactors": ["失敗要因1", "失敗要因2"]
}

## 分析の観点
- QCDES（品質・コスト・納期・環境・安全）の観点
- 製造業特有の落とし穴（保全性、作業標準、法規制等）
- 若手が経験不足で見落としがちなポイント
- ベテランなら事前に気づく「兆候」

## ガイドライン
- 具体的で実行可能なアドバイスを
- 3-5個の見落としパターンを抽出
- 成功/失敗要因はそれぞれ2-4個
`;

async function extractLessonsWithLLM(
  pastCases: SimilarCase[],
  currentNode: DecisionFlowNode,
  context: { purpose?: string; selectedPath?: string[] } | undefined,
  now: string
): Promise<LessonExtractionResult> {
  // 過去事例のサマリーを作成
  const caseSummaries = pastCases.slice(0, 5).map((c, i) => {
    const outcomeLabel = c.outcome === "success" ? "✓ 成功" :
                         c.outcome === "failure" ? "✗ 失敗" : "？ 不明";
    return `【事例${i + 1}】${outcomeLabel} (類似度: ${Math.round(c.similarity * 100)}%)
${c.content.slice(0, 300)}...
${c.lessons ? `教訓: ${c.lessons.join(", ")}` : ""}`;
  }).join("\n\n");

  const userContent = `
## 現在の検討内容
${currentNode.label}${currentNode.description ? `: ${currentNode.description}` : ""}

${context?.purpose ? `## 目的\n${context.purpose}` : ""}

${context?.selectedPath?.length ? `## これまでの選択\n${context.selectedPath.join(" → ")}` : ""}

## 類似過去事例
${caseSummaries}

これらの過去事例から、現在の検討で見落としやすいポイントを抽出してください。
`;

  const response = await generateChatCompletion({
    systemPrompt: LESSON_EXTRACTION_PROMPT,
    userContent,
    temperature: 0.5,
    maxTokens: 1024,
  });

  // JSONをパース
  let parsed: {
    overlookedPatterns?: Array<{
      viewpoint: string;
      description: string;
      consequences?: string[];
      preventionTips?: string[];
    }>;
    successFactors?: string[];
    failureFactors?: string[];
  };
  try {
    parsed = parseJsonFromLLMResponse(response);
  } catch {
    return extractLessonsRuleBased(pastCases, currentNode, now);
  }

  // 見落としパターンをOverlookedWarningDetailに変換
  const warnings: OverlookedWarningDetail[] = [];
  const patterns: OverlookedPattern[] = [];

  for (const pattern of parsed.overlookedPatterns || []) {
    const patternId = generateId();

    patterns.push({
      id: patternId,
      viewpoint: pattern.viewpoint,
      description: pattern.description,
      frequency: 1, // LLMから抽出した場合は初期値
      consequences: pattern.consequences || [],
      preventionTips: pattern.preventionTips || [],
      relatedCases: pastCases.map((c) => c.id),
    });

    // 警告を生成
    const viewpoint: DecisionViewpoint = {
      name: pattern.viewpoint,
      category: "value",
      perspective: pattern.description,
      evaluation: { score: 0, comment: "過去事例からの警告" },
      isOftenOverlooked: true,
      overlookedRisk: pattern.description,
      checkpoints: pattern.preventionTips || [],
    };

    warnings.push({
      id: generateId(),
      viewpoint,
      warning: `【過去事例からの警告】${pattern.description}`,
      potentialConsequences: pattern.consequences || [],
      checklist: (pattern.preventionTips || []).map((tip) => ({
        item: tip,
        isChecked: false,
        importance: "high",
      })),
      triggeredByNodeId: currentNode.id,
      createdAt: now,
    });
  }

  return {
    overlookedPatterns: patterns,
    successFactors: parsed.successFactors || [],
    failureFactors: parsed.failureFactors || [],
    warnings,
  };
}

// ============================================================
// ルールベースの教訓抽出（フォールバック）
// ============================================================

function extractLessonsRuleBased(
  pastCases: SimilarCase[],
  currentNode: DecisionFlowNode,
  now: string
): LessonExtractionResult {
  const warnings: OverlookedWarningDetail[] = [];
  const patterns: OverlookedPattern[] = [];

  // 失敗事例から教訓を抽出
  const failureCases = pastCases.filter((c) => c.outcome === "failure");
  const successCases = pastCases.filter((c) => c.outcome === "success");

  // 失敗事例がある場合の警告
  if (failureCases.length > 0) {
    const viewpoint: DecisionViewpoint = {
      name: "過去の失敗事例",
      category: "risk",
      perspective: "類似の状況で失敗した事例があります",
      evaluation: { score: -50, comment: "要注意" },
      isOftenOverlooked: true,
      overlookedRisk: "過去に同様の状況で失敗した実績があります",
      checkpoints: [
        "過去の失敗原因を確認したか？",
        "同じ轍を踏まないための対策は？",
      ],
    };

    warnings.push({
      id: generateId(),
      viewpoint,
      warning: `類似の状況で${failureCases.length}件の失敗事例があります。過去の教訓を活かしましょう。`,
      potentialConsequences: [
        "過去と同じ失敗を繰り返す可能性があります",
        "事前に対策を講じることで回避できます",
      ],
      checklist: failureCases.slice(0, 3).map((c) => ({
        item: `失敗事例「${c.sourceFileName || "不明"}」の教訓を確認`,
        isChecked: false,
        importance: "high",
      })),
      triggeredByNodeId: currentNode.id,
      createdAt: now,
    });

    patterns.push({
      id: generateId(),
      viewpoint: "過去の失敗パターン",
      description: "類似状況での失敗事例が存在",
      frequency: failureCases.length,
      consequences: ["同様の失敗を繰り返すリスク"],
      preventionTips: ["過去事例の詳細を確認", "対策を事前に検討"],
      relatedCases: failureCases.map((c) => c.id),
    });
  }

  // 成功要因・失敗要因の抽出
  const successFactors = successCases.length > 0
    ? [
        "類似事例で成功実績あり",
        `${successCases.length}件の成功パターンを参考にできます`,
      ]
    : [];

  const failureFactors = failureCases.length > 0
    ? [
        "類似事例で失敗実績あり",
        `${failureCases.length}件の失敗事例に注意が必要`,
      ]
    : [];

  return {
    overlookedPatterns: patterns,
    successFactors,
    failureFactors,
    warnings,
  };
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * 過去事例の成功/失敗を判定（キーワードベース）
 */
export function inferCaseOutcome(
  content: string
): "success" | "failure" | "unknown" {
  const successKeywords = ["成功", "達成", "完了", "改善", "効果", "解決"];
  const failureKeywords = ["失敗", "問題", "課題", "不具合", "事故", "トラブル", "遅延", "中止"];

  const successScore = successKeywords.filter((k) => content.includes(k)).length;
  const failureScore = failureKeywords.filter((k) => content.includes(k)).length;

  if (successScore > failureScore) return "success";
  if (failureScore > successScore) return "failure";
  return "unknown";
}

/**
 * 過去事例からの警告を現在のノードに適用可能か判定
 */
export function isWarningApplicable(
  warning: OverlookedWarningDetail,
  currentNode: DecisionFlowNode,
  purpose: string
): boolean {
  // シンプルなキーワードマッチング
  const warningKeywords = warning.warning.split(/\s+/).filter((w) => w.length >= 2);
  const nodeKeywords = `${currentNode.label} ${currentNode.description || ""} ${purpose}`
    .split(/\s+/)
    .filter((w) => w.length >= 2);

  const matchCount = warningKeywords.filter((wk) =>
    nodeKeywords.some((nk) => nk.includes(wk) || wk.includes(nk))
  ).length;

  // 20%以上のキーワードがマッチすれば適用可能
  return matchCount / warningKeywords.length >= 0.2;
}
