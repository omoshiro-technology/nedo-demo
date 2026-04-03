/**
 * 選択アドバイス生成プロンプト
 *
 * Phase 25: 選択後にその選択の影響度や考慮事項をアドバイスとして生成
 */

// ============================================================
// 型定義
// ============================================================

export type SelectionAdviceContext = {
  /** 意思決定の目的 */
  purpose: string;
  /** 選択された内容（ラベル） */
  selectedOption: string;
  /** 選択された内容の説明 */
  selectedDescription?: string;
  /** 判断軸（問い） */
  criteriaQuestion?: string;
  /** これまでの選択履歴 */
  previousSelections?: Array<{
    question: string;
    selected: string;
  }>;
};

export type SelectionAdviceLLMResponse = {
  /** メインメッセージ（1-2文） */
  message: string;
  /** 影響ポイント（2-3項目） */
  impactPoints: string[];
  /** 考慮事項（1-2項目） */
  considerations: string[];
};

// ============================================================
// プロンプト
// ============================================================

export const SELECTION_ADVICE_SYSTEM_PROMPT = `あなたは意思決定支援AIです。
ユーザーの選択に対して、その選択の影響と考慮すべき点をコンパクトにアドバイスしてください。

応答は必ず以下のJSON形式で返してください：
\`\`\`json
{
  "message": "選択に対する簡潔なコメント（1-2文）",
  "impactPoints": [
    "影響ポイント1（例：コスト面での影響）",
    "影響ポイント2（例：時間軸での影響）"
  ],
  "considerations": [
    "考慮事項1（例：〇〇の確認が必要）"
  ]
}
\`\`\`

注意点：
- 選択を否定せず、その選択の特徴と影響を中立的に伝える
- 「良い/悪い」の評価ではなく「〇〇に影響する」という形式で伝える
- 簡潔に（各項目は30文字以内）
- 日本語で回答`;

export function buildSelectionAdvicePrompt(context: SelectionAdviceContext): string {
  const previousSelectionsText = context.previousSelections?.length
    ? context.previousSelections.map((s, i) => `${i + 1}. ${s.question} → ${s.selected}`).join("\n")
    : "（なし）";

  return `
## 目的
${context.purpose}

## 今回の選択
判断軸: ${context.criteriaQuestion || "（不明）"}
選択: ${context.selectedOption}
${context.selectedDescription ? `説明: ${context.selectedDescription}` : ""}

## これまでの選択
${previousSelectionsText}

## 指示
この選択について、影響度と考慮事項をアドバイスしてください。
選択を肯定も否定もせず、客観的に影響を伝えてください。
`;
}
