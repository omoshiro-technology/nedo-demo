/**
 * DecisionProperty生成用LLMプロンプト
 *
 * ノードの判断プロパティ（熟達者の思考の型）を構造化するためのプロンプト
 */

import type { DecisionFlowNode } from "../types";
import { parseJsonFromLLMResponse } from "../../../infrastructure/llm/jsonExtractor";

// ============================================================
// システムプロンプト
// ============================================================

export const DECISION_PROPERTY_SYSTEM_PROMPT = `あなたは熟達した意思決定の専門家です。
与えられた選択肢について、「熟達者の思考の型」を構造化してください。

## 出力形式
以下のJSON形式で出力してください。

{
  "rule": {
    "type": "if_then" | "if_else" | "switch" | "threshold",
    "condition": "この選択が適用される条件（例：予算が100万円以上の場合）",
    "thenAction": "条件が満たされた場合の行動",
    "elseAction": "条件が満たされない場合の行動（if_elseの場合のみ）"
  },
  "conditions": [
    {
      "dimension": "状況の次元（例：予算、時間、リソース）",
      "description": "この選択が適用される具体的な状況",
      "scope": "always" | "situational" | "exceptional",
      "certainty": "verified" | "assumed" | "uncertain"
    }
  ],
  "weight": {
    "score": 0-100,
    "basis": "regulation" | "safety" | "cost" | "experience" | "preference" | "risk",
    "affectedFactors": ["影響を受ける要因1", "要因2"]
  },
  "rationale": {
    "primary": "主要な理由（1文）",
    "secondary": ["副次的な理由1", "理由2"],
    "source": "regulation" | "standard" | "experience" | "analysis" | "intuition" | "past_case",
    "confidence": 0-100
  },
  "viewpoints": [
    {
      "name": "観点の名前（例：品質、コスト、安全性）",
      "category": "qcdes" | "stakeholder" | "temporal" | "risk" | "value",
      "qcdesType": "quality" | "cost" | "delivery" | "environment" | "safety",
      "perspective": "この観点からの評価（1文）",
      "evaluation": {
        "score": -100〜+100,
        "comment": "評価コメント"
      },
      "isOftenOverlooked": true | false,
      "overlookedRisk": "見落とした場合のリスク（isOftenOverlookedがtrueの場合）",
      "checkpoints": ["確認すべきポイント1", "ポイント2"]
    }
  ]
}

## ガイドライン
1. **rule**: この選択が「いつ」「どんな条件で」適用されるかを明確にする
2. **conditions**: 選択が有効な状況を具体的に記述する
3. **weight**: この判断の重要度と根拠を示す
4. **rationale**: なぜこの選択が推奨されるのか、根拠を明確にする
5. **viewpoints**: 最低3つ、最大5つの観点から評価する
   - 必ず「見落としやすい観点」を1つ以上含める（isOftenOverlooked: true）
   - QCDES（品質・コスト・納期・環境・安全）の観点を含める

## 見落としやすい観点の例
- 安全性（特に緊急時の対応）
- 環境への影響
- 長期的なコスト
- ステークホルダーの合意
- スケーラビリティ`;

// ============================================================
// ユーザープロンプト構築
// ============================================================

export type DecisionPropertyPromptContext = {
  purpose: string;
  selectedPath: string[];
  problemCategory?: string;
  pastCaseSummaries?: string[];
};

export function buildDecisionPropertyUserPrompt(
  node: Pick<DecisionFlowNode, "id" | "label" | "description" | "level" | "riskLevel" | "riskStrategy">,
  context: DecisionPropertyPromptContext
): string {
  const parts: string[] = [];

  parts.push("## 分析対象の選択肢");
  parts.push(`- **ラベル**: ${node.label}`);
  if (node.description) {
    parts.push(`- **説明**: ${node.description}`);
  }
  if (node.level) {
    parts.push(`- **レベル**: ${node.level}`);
  }
  if (node.riskLevel) {
    parts.push(`- **リスクレベル**: ${node.riskLevel}`);
  }
  if (node.riskStrategy) {
    parts.push(`- **リスク戦略**: ${node.riskStrategy}`);
  }

  parts.push("");
  parts.push("## コンテキスト");
  parts.push(`- **目的**: ${context.purpose}`);

  if (context.selectedPath.length > 0) {
    parts.push(`- **これまでの選択**: ${context.selectedPath.join(" → ")}`);
  }

  if (context.problemCategory) {
    parts.push(`- **問題カテゴリ**: ${context.problemCategory}`);
  }

  if (context.pastCaseSummaries && context.pastCaseSummaries.length > 0) {
    parts.push("");
    parts.push("## 参考: 類似過去事例");
    for (const summary of context.pastCaseSummaries.slice(0, 3)) {
      parts.push(`- ${summary}`);
    }
  }

  parts.push("");
  parts.push("この選択肢について、熟達者の「思考の型」を構造化してください。");

  return parts.join("\n");
}

// ============================================================
// レスポンスパース
// ============================================================

export type ParsedDecisionPropertyResponse = {
  rule: {
    type: "if_then" | "if_else" | "switch" | "threshold";
    condition: string;
    thenAction: string;
    elseAction?: string;
  };
  conditions: Array<{
    dimension: string;
    description: string;
    scope: "always" | "situational" | "exceptional";
    certainty: "verified" | "assumed" | "uncertain";
  }>;
  weight: {
    score: number;
    basis: string;
    affectedFactors: string[];
  };
  rationale: {
    primary: string;
    secondary: string[];
    source: string;
    confidence: number;
  };
  viewpoints: Array<{
    name: string;
    category: string;
    qcdesType?: string;
    perspective: string;
    evaluation: { score: number; comment: string };
    isOftenOverlooked: boolean;
    overlookedRisk?: string;
    checkpoints?: string[];
  }>;
};

export function parseDecisionPropertyResponse(
  response: string
): ParsedDecisionPropertyResponse | null {
  try {
    // JSONブロックを抽出
    const parsed = parseJsonFromLLMResponse<Record<string, unknown>>(response);

    // 必須フィールドの検証
    if (!parsed.rule || !parsed.conditions || !parsed.weight || !parsed.rationale || !parsed.viewpoints) {
      console.warn("[parseDecisionPropertyResponse] Missing required fields");
      return null;
    }

    return parsed as ParsedDecisionPropertyResponse;
  } catch (error) {
    console.error("[parseDecisionPropertyResponse] Parse error:", error);
    return null;
  }
}
