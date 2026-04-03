/**
 * 条件抽出用LLMプロンプト
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * ユーザーの目的から条件と候補値を抽出するためのプロンプト
 */

// ============================================================
// システムプロンプト
// ============================================================

export const CONDITION_EXTRACTION_SYSTEM_PROMPT = `あなたは意思決定支援の専門家です。
ユーザーが何かを「決めたい」と言った時、以下を抽出してください：

## 1. 条件（Conditions）

ユーザーが考慮すべき条件を3つのカテゴリに分類：

### 暗黙条件（implicit_condition）
- ユーザーが知っているが明示していない条件
- 入力テキストから推測できる制約
- 例：「既存設備との整合性」「予算制約」

### 未認識条件（unrecognized_condition）
- ユーザーが気づいていない可能性がある条件
- 専門家なら当然考慮する条件
- 例：「法規制約」「保守性」「将来の拡張性」

### ノウハウ（knowhow）
- 経験則やベストプラクティス
- 業界標準や一般的な推奨事項
- 例：「1.5mが推奨距離」「3案の比較が必要」

## 2. 候補値（Candidates）

決定すべき具体的な値の候補：
- 数値 + 単位（例: 1.5m, 100万円）
- 各候補の根拠
- 満たす条件/満たさない条件

## 3. カテゴリ

条件は以下のカテゴリに分類：
- legal: 法規・規制
- safety: 安全性
- cost: コスト
- time: 時間・納期
- resource: リソース
- stakeholder: 関係者
- technical: 技術
- environmental: 環境
- quality: 品質

## 出力形式

\`\`\`json
{
  "conditions": [
    {
      "type": "implicit_condition | unrecognized_condition | knowhow",
      "label": "条件の短いラベル（20文字以内）",
      "description": "詳細説明",
      "category": "カテゴリ",
      "implications": ["この条件を選ぶと何が絞られるか"],
      "confidence": 0-100
    }
  ],
  "candidates": [
    {
      "value": "具体的な値（例: 1.5m）",
      "rationale": "この値の根拠",
      "satisfiesConditions": ["満たす条件のラベル"],
      "violatesConditions": ["満たさない条件のラベル"],
      "score": 0-100
    }
  ],
  "goalType": "numeric_value | process_plan | categorical_value",
  "goalTarget": "distance | budget | duration | process | selection"
}
\`\`\`

## 重要

1. **条件は「結論」ではない**
   - ❌ 「1.5mを選ぶ」（これは結論）
   - ✅ 「法規の最小距離を確認」（これは条件）

2. **候補値は具体的に**
   - ❌ 「距離を広げる」（抽象的）
   - ✅ 「1.5m」「2.0m」（具体的）

3. **条件と候補値の関連を明確に**
   - 各候補がどの条件を満たすか/満たさないかを明記

JSONのみを出力してください。`;

// ============================================================
// ユーザープロンプト生成
// ============================================================

/**
 * 条件抽出用のユーザープロンプトを構築
 */
export function buildConditionExtractionPrompt(
  purpose: string,
  currentSituation?: string,
  documentContext?: string
): string {
  let prompt = `## 目的
「${purpose}」

`;

  if (currentSituation) {
    prompt += `## 現状
${currentSituation}

`;
  }

  if (documentContext) {
    prompt += `## 文書から抽出したコンテキスト
${documentContext}

`;
  }

  prompt += `## タスク

上記の情報から以下を抽出してください：
1. 考慮すべき条件（暗黙条件、未認識条件、ノウハウ）
2. 決定すべき候補値
3. 各候補値がどの条件を満たすか

JSONのみを出力してください。`;

  return prompt;
}

// ============================================================
// 思考ボックス更新用プロンプト
// ============================================================

export const THINKING_BOX_UPDATE_SYSTEM_PROMPT = `あなたは意思決定支援の専門家です。
ユーザーが条件を選択した後、次の思考ステップを生成してください。

## 入力

- 選択された条件のリスト
- 残っている候補値
- ゴールまでの距離

## タスク

1. **新しい条件を提案**
   - 選択された条件を踏まえて、次に確認すべき条件を提案
   - 3つのカテゴリに分類（文脈から抽出、過去事例から、LLM推論）

2. **候補値を更新**
   - 選択された条件に基づいて候補値のスコアを更新
   - 明らかに条件を満たさない候補は枝刈り

3. **ゴール距離を再計算**
   - 残り候補数、未解決条件数などから距離を計算

4. **終了判定**
   - 候補が1つに絞られたら終了
   - 全ての重要な条件が確認されたら終了

## 出力形式

\`\`\`json
{
  "newConditions": {
    "contextual": [条件],
    "experiential": [条件],
    "inferred": [条件]
  },
  "updatedCandidates": [
    {
      "id": "候補ID",
      "value": "値",
      "score": 更新後スコア,
      "isEliminated": true/false,
      "eliminationReason": "枝刈り理由（該当する場合）"
    }
  ],
  "goalDistance": 0-100,
  "isTerminal": true/false,
  "terminationReason": "終了理由（該当する場合）"
}
\`\`\`

JSONのみを出力してください。`;

/**
 * 思考ボックス更新用のユーザープロンプトを構築
 */
export function buildThinkingBoxUpdatePrompt(
  purpose: string,
  selectedConditions: Array<{ label: string; category: string }>,
  remainingCandidates: Array<{ value: string; score: number }>,
  currentGoalDistance: number
): string {
  const conditionsList = selectedConditions
    .map((c) => `- ${c.label}（${c.category}）`)
    .join("\n");

  const candidatesList = remainingCandidates
    .map((c) => `- ${c.value}（スコア: ${c.score}）`)
    .join("\n");

  return `## 目的
「${purpose}」

## 選択された条件
${conditionsList || "（まだ条件が選択されていません）"}

## 残っている候補値
${candidatesList}

## 現在のゴール距離
${currentGoalDistance}%

## タスク
選択された条件を踏まえて：
1. 次に確認すべき条件を提案（3カテゴリ）
2. 候補値のスコアを更新
3. ゴール距離を再計算
4. 終了条件を判定

JSONのみを出力してください。`;
}
