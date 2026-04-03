/**
 * 聞き出しフロー関連のロジック
 */

import type { ClarificationCategory, ClarificationPhase } from "./types";

/** 聞き出しテンプレートの選択肢 */
export type ClarificationOption = {
  id: string;
  label: string;
  keywords: string[];
  score: number;
};

/** 聞き出しテンプレート */
export const CLARIFICATION_TEMPLATES: Record<ClarificationCategory, {
  question: string;
  options: ClarificationOption[];
}> = {
  problem_area: {
    question: "どの分野の問題か教えてください",
    options: [
      { id: "clarify-schedule", label: "スケジュール・納期の問題", keywords: ["遅延", "工期", "納期", "スケジュール", "期限", "期日"], score: 10 },
      { id: "clarify-cost", label: "コスト・予算の問題", keywords: ["コスト", "予算", "費用", "金額", "超過", "不足"], score: 10 },
      { id: "clarify-quality", label: "品質・不具合の問題", keywords: ["品質", "不具合", "欠陥", "バグ", "エラー", "問題"], score: 10 },
      { id: "clarify-resource", label: "人員・リソースの問題", keywords: ["人員", "リソース", "不足", "人手", "担当者", "チーム"], score: 10 },
      { id: "clarify-communication", label: "コミュニケーション・関係者の問題", keywords: ["連携", "報告", "コミュニケーション", "関係者", "調整"], score: 10 },
    ],
  },
  severity: {
    question: "問題の深刻度を教えてください",
    options: [
      { id: "clarify-critical", label: "重大：すぐに対処が必要", keywords: ["緊急", "重大", "深刻", "危機", "至急"], score: 5 },
      { id: "clarify-moderate", label: "中程度：今週中に対処したい", keywords: ["中程度", "できれば早く", "そろそろ"], score: 5 },
      { id: "clarify-minor", label: "軽微：予防的に検討したい", keywords: ["軽微", "予防", "念のため", "将来的に"], score: 5 },
    ],
  },
  timeline: {
    question: "いつまでに解決したいですか？",
    options: [
      { id: "clarify-immediate", label: "今すぐ（今日中）", keywords: ["今すぐ", "今日", "至急", "緊急"], score: 5 },
      { id: "clarify-this-week", label: "今週中", keywords: ["今週", "数日", "週内"], score: 5 },
      { id: "clarify-this-month", label: "今月中", keywords: ["今月", "月内", "数週間"], score: 5 },
      { id: "clarify-flexible", label: "期限は柔軟", keywords: ["柔軟", "いつでも", "急がない"], score: 5 },
    ],
  },
  stakeholders: {
    question: "主な関係者は誰ですか？",
    options: [
      { id: "clarify-client", label: "発注者・クライアント", keywords: ["発注者", "クライアント", "顧客", "お客様"], score: 5 },
      { id: "clarify-internal", label: "社内関係者", keywords: ["社内", "上司", "チーム", "部門"], score: 5 },
      { id: "clarify-subcontractor", label: "下請け・協力会社", keywords: ["下請け", "協力会社", "外注", "パートナー"], score: 5 },
      { id: "clarify-multiple", label: "複数の関係者", keywords: ["複数", "多数", "関係者全員"], score: 5 },
    ],
  },
};

/** カテゴリごとのキーワードマップ */
const CATEGORY_KEYWORDS: Record<string, { keywords: string[]; score: number }> = {
  // スケジュール関連
  schedule: { keywords: ["納期", "工期", "遅延", "遅れ", "スケジュール", "期限", "期日", "日程", "リリース", "ローンチ"], score: 10 },
  // コスト関連
  cost: { keywords: ["コスト", "予算", "費用", "金額", "超過", "赤字", "黒字", "利益"], score: 10 },
  // 品質関連
  quality: { keywords: ["品質", "不具合", "欠陥", "バグ", "エラー", "障害", "問題点"], score: 10 },
  // リソース関連
  resource: { keywords: ["人員", "人手", "リソース", "不足", "担当者", "要員", "増員"], score: 10 },
  // 仕様変更・スコープ関連（Phase 11追加）
  change: { keywords: ["仕様変更", "要件変更", "スコープ変更", "変更", "追加要件", "要望", "修正依頼", "仕様追加", "機能追加", "スコープ"], score: 10 },
  // 具体的な数値・期間
  numeric: { keywords: ["週間", "ヶ月", "日", "万円", "億", "%", "件"], score: 5 },
};

/** 文脈の充足度分析結果 */
export type ContextSufficiency = {
  isSufficient: boolean;
  matchedKeywords: string[];
  matchedCategories: string[];
  score: number;
  missingInfo: ClarificationCategory[];
};

/** 充足度閾値 */
const SUFFICIENCY_THRESHOLD = 15;

/**
 * 入力テキストの文脈充足度を分析
 */
export function analyzeContextSufficiency(purpose: string): ContextSufficiency {
  const matchedKeywords: string[] = [];
  const matchedCategories: string[] = [];
  let score = 0;

  const normalizedPurpose = purpose.toLowerCase();

  // カテゴリキーワードのマッチング
  for (const [category, { keywords, score: categoryScore }] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (normalizedPurpose.includes(keyword.toLowerCase())) {
        if (!matchedKeywords.includes(keyword)) {
          matchedKeywords.push(keyword);
          score += categoryScore;
        }
        if (!matchedCategories.includes(category)) {
          matchedCategories.push(category);
        }
      }
    }
  }

  // 数値パターンのマッチング（「3週間」「100万円」など）
  const numericPatterns = [
    /\d+\s*(週間|ヶ月|か月|カ月|日間|日|時間)/g,
    /\d+\s*(万円|億円|円)/g,
    /\d+\s*%/g,
    /\d+\s*件/g,
  ];

  for (const pattern of numericPatterns) {
    const matches = purpose.match(pattern);
    if (matches) {
      for (const match of matches) {
        if (!matchedKeywords.includes(match)) {
          matchedKeywords.push(match);
          score += 5;
        }
      }
    }
  }

  // 不足している情報を特定
  const missingInfo: ClarificationCategory[] = [];

  // 問題領域が不明確
  const hasProblemArea = matchedCategories.some(c => ["schedule", "cost", "quality", "resource", "change"].includes(c));
  if (!hasProblemArea) {
    missingInfo.push("problem_area");
  }

  // 深刻度が不明確（スコアが低い場合）
  if (score < 10) {
    missingInfo.push("severity");
  }

  return {
    isSufficient: score >= SUFFICIENCY_THRESHOLD,
    matchedKeywords,
    matchedCategories,
    score,
    missingInfo,
  };
}

/**
 * 聞き出しフェーズの初期状態を生成
 */
export function createClarificationPhase(missingInfo: ClarificationCategory[]): ClarificationPhase {
  const firstCategory = missingInfo[0] ?? "problem_area";

  return {
    isActive: true,
    currentCategory: firstCategory,
    completedCategories: [],
    collectedContext: [],
    accumulatedScore: 0,
  };
}

/**
 * 聞き出し選択後にフェーズを更新
 */
export function updateClarificationPhase(
  phase: ClarificationPhase,
  selectedOptionId: string,
  missingInfo: ClarificationCategory[]
): ClarificationPhase {
  const currentTemplate = CLARIFICATION_TEMPLATES[phase.currentCategory];
  const selectedOption = currentTemplate.options.find(o => o.id === selectedOptionId);

  if (!selectedOption) {
    return phase;
  }

  const newCollectedContext = [
    ...phase.collectedContext,
    {
      category: phase.currentCategory,
      selectedOptionId,
      keywords: selectedOption.keywords,
    },
  ];

  const newCompletedCategories = [...phase.completedCategories, phase.currentCategory];
  const newScore = phase.accumulatedScore + selectedOption.score;

  // 次のカテゴリを決定
  const remainingCategories = missingInfo.filter(c => !newCompletedCategories.includes(c));

  // 十分なスコアに達したか、すべてのカテゴリを完了した場合
  if (newScore >= SUFFICIENCY_THRESHOLD || remainingCategories.length === 0) {
    return {
      isActive: false,
      currentCategory: phase.currentCategory,
      completedCategories: newCompletedCategories,
      collectedContext: newCollectedContext,
      accumulatedScore: newScore,
    };
  }

  // 次のカテゴリへ
  return {
    isActive: true,
    currentCategory: remainingCategories[0],
    completedCategories: newCompletedCategories,
    collectedContext: newCollectedContext,
    accumulatedScore: newScore,
  };
}

/**
 * 蓄積した文脈からキーワードを抽出
 */
export function extractKeywordsFromPhase(phase: ClarificationPhase): string[] {
  return phase.collectedContext.flatMap(c => c.keywords);
}
