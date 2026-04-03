import type { DocumentTypeLabel } from "../../domain/types";

type DocumentTypeRule = {
  label: DocumentTypeLabel;
  keywords: string[];
};

const RULES: DocumentTypeRule[] = [
  {
    label: "不具合報告書",
    keywords: ["不具合", "障害", "不良", "原因", "対策", "再発防止"]
  },
  {
    label: "日報",
    keywords: ["日報", "作業内容", "進捗", "今日の", "明日の予定"]
  },
  {
    label: "調査報告書",
    keywords: ["調査", "分析", "検証", "結果", "報告"]
  },
  {
    label: "論文",
    keywords: ["目的", "手法", "結果", "考察", "参考文献"]
  },
  {
    label: "製品仕様",
    keywords: ["仕様", "機能", "性能", "構成", "品名"]
  }
];

export function classifyDocumentType(text: string): DocumentTypeLabel {
  const scores = RULES.map((rule) => ({
    label: rule.label,
    score: countMatches(text, rule.keywords)
  }));

  const best = scores.sort((a, b) => b.score - a.score)[0];
  if (!best || best.score === 0) {
    return "不明";
  }

  return best.label;
}

function countMatches(text: string, keywords: string[]): number {
  const normalized = text.replace(/\s+/g, "");
  return keywords.reduce((total, keyword) => {
    const matches = normalized.split(keyword).length - 1;
    return total + Math.max(matches, 0);
  }, 0);
}
