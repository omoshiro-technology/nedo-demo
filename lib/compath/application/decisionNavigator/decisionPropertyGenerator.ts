/**
 * DecisionProperty生成サービス
 *
 * ノード生成時にLLMを使用してDecisionProperty（熟達者の思考の型）を付与
 * 過去事例からの抽出・マージもサポート
 */

import { env } from "../../config/env";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import type { DecisionFlowNode } from "./types";
import type {
  DecisionProperty,
  DecisionRule,
  DecisionCondition,
  DecisionWeight,
  DecisionRationale,
  DecisionViewpoint,
  DecisionPropertySource,
} from "../../domain/decisionNavigator/expertThinking/types";
import {
  DECISION_PROPERTY_SYSTEM_PROMPT,
  buildDecisionPropertyUserPrompt,
  parseDecisionPropertyResponse,
  type DecisionPropertyPromptContext,
} from "./llm/decisionPropertyPrompt";

// ============================================================
// 型定義
// ============================================================

export type GenerateDecisionPropertyContext = {
  purpose: string;
  selectedPath: string[];
  problemCategory?: string;
  pastCases?: Array<{
    content: string;
    similarity: number;
    sourceFileName?: string;
  }>;
};

// ============================================================
// メイン関数
// ============================================================

/**
 * LLMを使用してDecisionPropertyを生成
 */
export async function generateDecisionProperty(
  node: DecisionFlowNode,
  context: GenerateDecisionPropertyContext
): Promise<DecisionProperty | null> {
  // APIキーがない場合はフォールバック
  if (!env.openaiApiKey) {
    return generateFallbackDecisionProperty(node, context);
  }

  try {
    // 過去事例のサマリーを作成
    const pastCaseSummaries = context.pastCases
      ?.slice(0, 3)
      .map((c) => `${c.content.slice(0, 100)}... (類似度: ${Math.round(c.similarity * 100)}%)`);

    const promptContext: DecisionPropertyPromptContext = {
      purpose: context.purpose,
      selectedPath: context.selectedPath,
      problemCategory: context.problemCategory,
      pastCaseSummaries,
    };

    const userPrompt = buildDecisionPropertyUserPrompt(
      {
        id: node.id,
        label: node.label,
        description: node.description,
        level: node.level,
        riskLevel: node.riskLevel,
        riskStrategy: node.riskStrategy,
      },
      promptContext
    );

    const response = await generateChatCompletion({
      systemPrompt: DECISION_PROPERTY_SYSTEM_PROMPT,
      userContent: userPrompt,
      temperature: 0.5,
      maxTokens: 1024,
    });

    const parsed = parseDecisionPropertyResponse(response);
    if (!parsed) {
      console.warn("[generateDecisionProperty] Failed to parse LLM response, using fallback");
      return generateFallbackDecisionProperty(node, context);
    }

    const now = getTimestamp();

    return {
      id: generateId(),
      rule: convertToDecisionRule(parsed.rule),
      conditions: parsed.conditions.map(convertToDecisionCondition),
      weight: convertToDecisionWeight(parsed.weight),
      rationale: convertToDecisionRationale(parsed.rationale),
      viewpoints: parsed.viewpoints.map(convertToDecisionViewpoint),
      source: "llm_inference" as DecisionPropertySource,
      confidence: parsed.rationale.confidence || 70,
      createdAt: now,
      updatedAt: now,
    };
  } catch (error) {
    console.error("[generateDecisionProperty] Error:", error);
    return generateFallbackDecisionProperty(node, context);
  }
}

/**
 * 過去事例からDecisionPropertyを生成
 */
export function generateDecisionPropertyFromPastCase(
  pastCase: { content: string; sourceFileName?: string },
  nodeLabel: string
): DecisionProperty {
  const now = getTimestamp();

  // 過去事例から簡易的なプロパティを抽出
  return {
    id: generateId(),
    rule: {
      type: "if_then",
      condition: `類似状況（${nodeLabel}）`,
      thenAction: "過去の成功パターンに従う",
    },
    conditions: [
      {
        description: pastCase.content.slice(0, 200),
        scope: "situational",
        certainty: "assumed",
        domain: "過去事例",
      },
    ],
    weight: {
      score: 60,
      basis: "experience",
      rationale: "過去の実績に基づく",
      affectedFactors: ["過去の実績"],
    },
    rationale: {
      primary: `過去に類似の事例（${pastCase.sourceFileName || "不明"}）で成功した実績がある`,
      secondary: [],
      source: "past_case",
      confidence: 65,
    },
    viewpoints: [
      {
        name: "実績",
        category: "value",
        perspective: "過去の成功事例に基づく選択",
        evaluation: { score: 50, comment: "過去実績あり" },
        isOftenOverlooked: false,
      },
    ],
    source: "past_case",
    confidence: 65,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 複数のDecisionPropertyをマージ
 */
export function mergeDecisionProperties(
  llmGenerated: DecisionProperty,
  pastCaseBased: DecisionProperty[]
): DecisionProperty {
  if (pastCaseBased.length === 0) {
    return llmGenerated;
  }

  const now = getTimestamp();

  // 観点をマージ（重複を除去）
  const viewpointNames = new Set(llmGenerated.viewpoints.map((v) => v.name));
  const mergedViewpoints = [...llmGenerated.viewpoints];

  for (const pastProp of pastCaseBased) {
    for (const viewpoint of pastProp.viewpoints) {
      if (!viewpointNames.has(viewpoint.name)) {
        mergedViewpoints.push({
          ...viewpoint,
          perspective: `【過去事例】${viewpoint.perspective}`,
        });
        viewpointNames.add(viewpoint.name);
      }
    }
  }

  // 条件をマージ
  const mergedConditions = [
    ...llmGenerated.conditions,
    ...pastCaseBased.flatMap((p) =>
      p.conditions.map((c) => ({
        ...c,
        description: `【過去事例】${c.description}`,
      }))
    ),
  ];

  // rationale.secondaryに過去事例の情報を追加
  const pastCaseReasons = pastCaseBased
    .map((p) => p.rationale.primary)
    .filter(Boolean);

  return {
    ...llmGenerated,
    conditions: mergedConditions.slice(0, 5), // 最大5つ
    viewpoints: mergedViewpoints.slice(0, 7), // 最大7つ
    rationale: {
      ...llmGenerated.rationale,
      secondary: [
        ...(llmGenerated.rationale.secondary ?? []),
        ...pastCaseReasons,
      ].slice(0, 5),
    },
    // 過去事例があれば信頼度を上げる
    confidence: Math.min(100, llmGenerated.confidence + pastCaseBased.length * 5),
    updatedAt: now,
  };
}

// ============================================================
// フォールバック（APIキーなし・エラー時）
// ============================================================

function generateFallbackDecisionProperty(
  node: DecisionFlowNode,
  context: GenerateDecisionPropertyContext
): DecisionProperty {
  const now = getTimestamp();

  // ノードのリスク戦略に基づいてviewpointsを生成
  const viewpoints: DecisionViewpoint[] = [
    {
      name: "品質",
      category: "qcdes",
      qcdesType: "quality",
      perspective: "品質への影響を検討",
      evaluation: { score: 0, comment: "未評価" },
      isOftenOverlooked: false,
    },
    {
      name: "コスト",
      category: "qcdes",
      qcdesType: "cost",
      perspective: "コストへの影響を検討",
      evaluation: { score: 0, comment: "未評価" },
      isOftenOverlooked: false,
    },
    {
      name: "安全性",
      category: "qcdes",
      qcdesType: "safety",
      perspective: "安全性の観点からの検討が必要",
      evaluation: { score: 0, comment: "未評価" },
      isOftenOverlooked: true,
      overlookedRisk: "安全性を軽視すると重大な問題につながる可能性",
      checkpoints: ["安全上のリスクはないか？", "緊急時の対応は考慮されているか？"],
    },
  ];

  return {
    id: generateId(),
    rule: {
      type: "if_then",
      condition: `${node.label}が適切な場合`,
      thenAction: "この選択肢を採用する",
    },
    conditions: [
      {
        description: context.purpose,
        scope: "situational",
        certainty: "assumed",
        domain: "状況",
      },
    ],
    weight: {
      score: 50,
      basis: "experience",
      rationale: "分析に基づく判断",
      affectedFactors: [],
    },
    rationale: {
      primary: `${node.label}は現在の状況に適している`,
      secondary: [],
      source: "analysis",
      confidence: 50,
    },
    viewpoints,
    source: "llm_inference",
    confidence: 50,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// 型変換ヘルパー
// ============================================================

function convertToDecisionRule(parsed: {
  type: string;
  condition: string;
  thenAction: string;
  elseAction?: string;
}): DecisionRule {
  return {
    type: (parsed.type as DecisionRule["type"]) || "if_then",
    condition: parsed.condition || "",
    thenAction: parsed.thenAction || "",
    elseAction: parsed.elseAction,
  };
}

function convertToDecisionCondition(parsed: {
  dimension: string;
  description: string;
  scope: string;
  certainty: string;
}): DecisionCondition {
  return {
    description: parsed.description || "",
    scope: (parsed.scope as DecisionCondition["scope"]) || "situational",
    certainty: (parsed.certainty as DecisionCondition["certainty"]) || "assumed",
    domain: parsed.dimension || undefined,
  };
}

function convertToDecisionWeight(parsed: {
  score: number;
  basis: string;
  affectedFactors: string[];
}): DecisionWeight {
  // basisの値をWeightBasisにマッピング
  const basisMapping: Record<string, DecisionWeight["basis"]> = {
    regulation: "regulation",
    safety: "safety",
    cost: "cost",
    experience: "experience",
    preference: "preference",
    risk: "risk",
    analysis: "experience", // analysisはexperienceにフォールバック
  };
  const mappedBasis = basisMapping[parsed.basis] || "experience";

  return {
    score: parsed.score || 50,
    basis: mappedBasis,
    rationale: `${parsed.basis}に基づく判断`,
    affectedFactors: parsed.affectedFactors || [],
  };
}

function convertToDecisionRationale(parsed: {
  primary: string;
  secondary: string[];
  source: string;
  confidence: number;
}): DecisionRationale {
  return {
    primary: parsed.primary || "",
    secondary: parsed.secondary || [],
    source: (parsed.source as DecisionRationale["source"]) || "analysis",
    confidence: parsed.confidence || 50,
  };
}

function convertToDecisionViewpoint(parsed: {
  name: string;
  category: string;
  qcdesType?: string;
  perspective: string;
  evaluation: { score: number; comment: string };
  isOftenOverlooked: boolean;
  overlookedRisk?: string;
  checkpoints?: string[];
}): DecisionViewpoint {
  return {
    name: parsed.name || "",
    category: (parsed.category as DecisionViewpoint["category"]) || "value",
    qcdesType: parsed.qcdesType as DecisionViewpoint["qcdesType"],
    perspective: parsed.perspective || "",
    evaluation: parsed.evaluation || { score: 0, comment: "" },
    isOftenOverlooked: parsed.isOftenOverlooked || false,
    overlookedRisk: parsed.overlookedRisk,
    checkpoints: parsed.checkpoints,
  };
}
