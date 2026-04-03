/**
 * 関連判断軸推定プロンプト
 *
 * Phase 21: 放射状展開UI - AI誘導エッジ生成
 *
 * ユーザーが選択した内容を踏まえて、次に検討すべき判断軸を推定する。
 * - 選択内容と論理的に関連が深い判断軸を優先
 * - 残りの未選択判断軸から最大2つを選択
 * - エッジで接続することで自然な意思決定フローを誘導
 */

export type RelatedCriteriaContext = {
  purpose: string;
  selectedOption: {
    criteriaId: string;
    criteriaQuestion: string;
    label: string;
    description?: string;
  };
  remainingCriteria: Array<{
    id: string;
    question: string;
    description?: string;
  }>;
  previousSelections?: Array<{
    criteriaQuestion: string;
    selectedLabel: string;
  }>;
};

export type RelatedCriteriaLLMResponse = {
  relatedCriteriaIds: string[];
  reasons: string[];
  confidence: number; // 0-100
};

export const RELATED_CRITERIA_SYSTEM_PROMPT = `あなたは意思決定支援AIです。
ユーザーが選択した内容を踏まえ、次に考えるべき判断軸を提案してください。

## 関連性判定の基準

以下の観点で関連性を判定:

1. **論理的依存関係**: この選択によって、次の判断軸の選択肢が絞られる・影響を受ける
2. **リスク連鎖**: この選択で生じるリスクを軽減・管理するために検討すべき判断軸
3. **相乗効果**: この選択と組み合わせることで効果が高まる判断軸
4. **トレードオフ**: この選択とのトレードオフを調整するために検討すべき判断軸

## 選択基準

- 最も関連性が高い判断軸を**最大2つ**まで選択
- 関連性が低い場合は1つだけ、または0個でも可
- 関連性の理由を簡潔に説明

## 出力形式（JSONのみ）`;

export function buildRelatedCriteriaPrompt(context: RelatedCriteriaContext): string {
  const remainingList = context.remainingCriteria
    .map((c, i) => `${i + 1}. [${c.id}] ${c.question}${c.description ? ` - ${c.description}` : ""}`)
    .join("\n");

  const previousSelectionsList = context.previousSelections?.length
    ? context.previousSelections
        .map(s => `- ${s.criteriaQuestion}: ${s.selectedLabel}`)
        .join("\n")
    : "（なし）";

  return `## 目的
${context.purpose}

## 今選択した内容
判断軸: ${context.selectedOption.criteriaQuestion}
選択: ${context.selectedOption.label}
${context.selectedOption.description ? `説明: ${context.selectedOption.description}` : ""}

## これまでの選択
${previousSelectionsList}

## 残りの判断軸（この中から関連性の高いものを選ぶ）
${remainingList}

## 指示
この選択内容を踏まえて、次に検討すべき判断軸を最大2つ選んでください。
選択した内容と論理的に関連が深いものを優先してください。
関連性が低い場合は選ばなくても構いません。

## 出力形式（JSONのみ）
\`\`\`json
{
  "relatedCriteriaIds": ["criteria-id-1", "criteria-id-2"],
  "reasons": [
    "この判断軸は〇〇の観点で関連（1つ目の理由）",
    "この判断軸は△△の影響を受ける（2つ目の理由）"
  ],
  "confidence": 75
}
\`\`\`

関連する判断軸がない場合:
\`\`\`json
{
  "relatedCriteriaIds": [],
  "reasons": [],
  "confidence": 0
}
\`\`\`

JSONのみ出力してください。`;
}

/**
 * フォールバック用: 最も近い未選択判断軸を返す
 */
export function getDefaultRelatedCriteria(
  remainingCriteria: Array<{ id: string }>
): RelatedCriteriaLLMResponse {
  // 単純に最初の未選択判断軸を返す
  const ids = remainingCriteria.slice(0, 1).map(c => c.id);
  return {
    relatedCriteriaIds: ids,
    reasons: ids.length > 0 ? ["順番に検討"] : [],
    confidence: 30,
  };
}
