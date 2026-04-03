/**
 * チャット履歴から前提条件を自動抽出するユーティリティ
 *
 * Phase 6: ユーザーがチャットで言及した制約を検出し、詳細も抽出する
 */

import type { ExtractedPrecondition } from "../../decisionNavigator/PreconditionModal";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export function extractPreconditionsFromChat(
  purpose: string,
  chatHistory?: ChatMessage[]
): ExtractedPrecondition[] {
  // デフォルトの制約カテゴリ
  const defaultConditions: ExtractedPrecondition[] = [
    { id: "condition-safety", label: "安全性の確保", category: "safety", description: "人命や設備の安全を優先する", isSelected: false },
    { id: "condition-legal", label: "法規制への準拠", category: "legal", description: "関連法規や規制を遵守する", isSelected: false },
    { id: "condition-cost", label: "コスト制約", category: "cost", description: "予算やコストに制約がある", isSelected: false },
    { id: "condition-time", label: "納期・期限", category: "time", description: "時間的な制約がある", isSelected: false },
    { id: "condition-quality", label: "品質要件", category: "quality", description: "品質基準を満たす必要がある", isSelected: false },
  ];

  // チャット履歴からユーザーの発言を結合
  const chatText = chatHistory
    ?.filter((m) => m.role === "user")
    .map((m) => m.content)
    .join(" ") ?? "";

  const combinedText = `${purpose} ${chatText}`;

  // 制約パターンのマッチング（具体的な値も抽出）
  const patterns: Array<{
    category: string;
    regex: RegExp;
    extractDetail?: RegExp;
  }> = [
    {
      category: "cost",
      regex: /(\d+[万億]?円|予算|コスト|費用|金額)/i,
      extractDetail: /(\d+[万億]?円(?:以[下内])?)/i,
    },
    {
      category: "time",
      regex: /(\d+[日週月年]|納期|期限|いつまで|スケジュール)/i,
      extractDetail: /(\d+[日週月年](?:以[下内])?)/i,
    },
    {
      category: "safety",
      regex: /(安全|危険|リスク|事故|怪我)/i,
    },
    {
      category: "quality",
      regex: /(品質|精度|性能|基準|要件)/i,
    },
    {
      category: "legal",
      regex: /(法|規制|基準|コンプライアンス|許可|届出)/i,
    },
  ];

  return defaultConditions.map((cond) => {
    const pattern = patterns.find((p) => p.category === cond.category);
    if (!pattern) return cond;

    const isRelevant = pattern.regex.test(combinedText);
    let detail: string | undefined;

    // 詳細値を抽出（あれば）
    if (isRelevant && pattern.extractDetail) {
      const detailMatch = pattern.extractDetail.exec(combinedText);
      if (detailMatch) {
        detail = detailMatch[1];
      }
    }

    return {
      ...cond,
      isSelected: isRelevant,
      detail,
    };
  });
}
