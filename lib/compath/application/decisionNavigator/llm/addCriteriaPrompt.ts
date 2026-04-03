/**
 * 判断軸追加プロンプト
 *
 * 既存の判断軸を踏まえて、追加で検討すべき新しい観点を1つ提案する。
 * - 既存の軸と重複しない
 * - 目的達成に具体的な影響を与える
 * - 結果に影響しない意思決定は提案しない
 */

export type AddCriteriaContext = {
  purpose: string;
  existingCriteria: Array<{
    question: string;
    description?: string;
  }>;
  selectedOptions: string[];
  constraints?: string[];
  assumptions?: string[];
};

export type AddCriteriaLLMResponse = {
  criteria: {
    id: string;
    question: string;
    description: string;
    veteranInsight: string;
  };
  options: Array<{
    id: string;
    label: string;
    description: string;
    rationale: string;
    isRecommended: boolean;
    riskStrategy: "avoid" | "mitigate" | "transfer" | "accept";
  }>;
  recommendation: {
    optionId: string;
    reason: string;
  };
  isRelevant: boolean;
  irrelevantReason?: string;
};

export const ADD_CRITERIA_SYSTEM_PROMPT = `あなたは意思決定支援AIです。
ユーザーが既に検討している判断軸に加えて、目的達成のために追加で検討すべき観点を1つ提案してください。

## 【最重要】結果に影響しない意思決定は提案しない

追加する判断軸は、目的達成に**具体的な影響**を与えるものでなければなりません。

### ✅ 追加すべき判断軸の例
- 既存の軸では考慮されていないリスク観点
- トレードオフの優先順位を変える可能性がある観点
- 具体的な設計値や方針に影響を与える判断基準

### ❌ 追加すべきでない判断軸の例
- 既存の軸で既にカバーされている観点
- 目的達成に影響を与えない形式的な確認事項
- 既に選択済みの内容と矛盾する観点

## 判断軸の形式

判断軸は「ベテランの思考パターン」を問う形式にする:
- 「〇〇と△△、どちらを優先？」
- 「〇〇をどの程度重視するか？」
- 「〇〇のリスクをどう扱うか？」

## 選択肢の形式

各判断軸には2〜4個の選択肢を用意:
- 具体的な方針や値を含める
- 「〇〇優先」のような抽象的な表現は避ける
- 各選択肢になぜそれを選ぶ/選ばないかの理由（rationale）を付ける

## 出力形式（JSONのみ）`;

export function buildAddCriteriaPrompt(context: AddCriteriaContext): string {
  const existingCriteriaList = context.existingCriteria
    .map((c, i) => `${i + 1}. ${c.question}${c.description ? ` - ${c.description}` : ""}`)
    .join("\n");

  const selectedOptionsList = context.selectedOptions.length > 0
    ? context.selectedOptions.map(o => `- ${o}`).join("\n")
    : "（まだ選択なし）";

  const constraintsList = context.constraints?.length
    ? context.constraints.map(c => `- ${c}`).join("\n")
    : "（なし）";

  const assumptionsList = context.assumptions?.length
    ? context.assumptions.map(a => `- ${a}`).join("\n")
    : "（なし）";

  return `## ユーザーの目的
${context.purpose}

## 既に検討中の判断軸（これらと重複しないこと）
${existingCriteriaList}

## 既に選択済みの内容
${selectedOptionsList}

## 制約条件
${constraintsList}

## 前提条件
${assumptionsList}

## 要件
1. 既存の判断軸と**重複しない**新しい観点を1つ提案
2. 目的達成に**具体的な影響**を与える判断軸のみ
3. 結果に影響しない意思決定は提案しない
4. 選択肢は2〜4個、各選択肢に理由（rationale）を付ける
5. 1つの選択肢を推奨として指定

## 出力形式（JSONのみ）
\`\`\`json
{
  "criteria": {
    "id": "c${context.existingCriteria.length + 1}",
    "question": "判断軸の問い（〇〇と△△、どちらを優先？）",
    "description": "この判断軸が目的達成に重要な理由",
    "veteranInsight": "私の経験では..."
  },
  "options": [
    {
      "id": "c${context.existingCriteria.length + 1}-s1",
      "label": "選択肢1（具体的な方針）",
      "description": "この選択肢の説明",
      "rationale": "なぜこれを選ぶ/選ばないか",
      "isRecommended": true,
      "riskStrategy": "mitigate"
    },
    {
      "id": "c${context.existingCriteria.length + 1}-s2",
      "label": "選択肢2（具体的な方針）",
      "description": "この選択肢の説明",
      "rationale": "なぜこれを選ぶ/選ばないか",
      "isRecommended": false,
      "riskStrategy": "accept"
    }
  ],
  "recommendation": {
    "optionId": "c${context.existingCriteria.length + 1}-s1",
    "reason": "この選択肢を推奨する理由"
  },
  "isRelevant": true,
  "irrelevantReason": null
}
\`\`\`

## 追加の意味がない場合
目的達成に追加で検討すべき観点がない場合は、以下の形式で返答:
\`\`\`json
{
  "isRelevant": false,
  "irrelevantReason": "既存の判断軸で十分に検討されているため、追加の観点は不要です"
}
\`\`\`

JSONのみ出力してください。`;
}
