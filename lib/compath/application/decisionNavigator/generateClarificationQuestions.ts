/**
 * 確認質問生成
 *
 * 目的から暗黙条件や未認識条件を引き出すための質問を生成する
 */

import { generateId } from "./utils";
import type {
  ClarificationQuestion,
  ClarificationQuestionType,
  ClarificationAnswerType,
  GenerateClarificationQuestionsResponse,
} from "./types";

/** カテゴリ別の確認質問テンプレート */
const CLARIFICATION_QUESTION_TEMPLATES: Record<
  string,
  Array<{
    type: ClarificationQuestionType;
    question: string;
    reason: string;
    keywords: RegExp[];
    answerType: ClarificationAnswerType;
    placeholder?: string;
  }>
> = {
  // 対象の具体化（What）- 記述式
  what: [
    {
      type: "what_clarification",
      question: "具体的に何を対象としていますか？",
      reason: "対象を明確にすることで、適切な選択肢を提示できます",
      keywords: [/決め/i, /選/i, /検討/i],
      answerType: "free_text",
      placeholder: "例: 新製品のパッケージデザイン",
    },
    {
      type: "what_clarification",
      question: "対象の範囲を教えてください",
      reason: "範囲によって検討すべき項目が変わります",
      keywords: [/全体/i, /一部/i, /範囲/i],
      answerType: "free_text",
      placeholder: "例: 製造ラインA〜Cの全体",
    },
  ],
  // 安全性 - はい/いいえ
  safety: [
    {
      type: "unrecognized_condition",
      question: "安全面で守るべき基準はありますか？",
      reason: "安全基準は決定の重要な制約となります",
      keywords: [/設備/i, /作業/i, /工事/i, /機械/i],
      answerType: "yes_no",
    },
    {
      type: "implicit_condition",
      question: "作業員や周辺への安全配慮が必要ですか？",
      reason: "人的安全は最優先事項です",
      keywords: [/人/i, /作業/i, /現場/i],
      answerType: "yes_no",
    },
  ],
  // 法規制 - はい/いいえ
  legal: [
    {
      type: "unrecognized_condition",
      question: "関連する法規制や基準はありますか？",
      reason: "法規制への準拠は必須条件です",
      keywords: [/設備/i, /建築/i, /工事/i, /製造/i],
      answerType: "yes_no",
    },
    {
      type: "implicit_condition",
      question: "許可や届出が必要な作業はありますか？",
      reason: "許認可は計画に影響します",
      keywords: [/工事/i, /設置/i, /変更/i],
      answerType: "yes_no",
    },
  ],
  // コスト - 記述式
  cost: [
    {
      type: "implicit_condition",
      question: "予算の上限があれば教えてください",
      reason: "予算制約は選択肢を絞り込む重要な条件です",
      keywords: [/予算/i, /コスト/i, /費用/i, /金額/i],
      answerType: "free_text",
      placeholder: "例: 100万円以下、特になし",
    },
    {
      type: "what_clarification",
      question: "コストと品質、どちらを優先しますか？",
      reason: "優先順位によって推奨が変わります",
      keywords: [/選/i, /決め/i, /どちら/i],
      answerType: "free_text",
      placeholder: "例: コスト優先、バランス重視",
    },
  ],
  // 時間・納期 - 記述式
  time: [
    {
      type: "implicit_condition",
      question: "納期や期限があれば教えてください",
      reason: "時間制約は選択肢に大きく影響します",
      keywords: [/納期/i, /期限/i, /いつ/i, /スケジュール/i],
      answerType: "free_text",
      placeholder: "例: 3月末まで、急ぎではない",
    },
    {
      type: "scope_clarification",
      question: "この決定はいつまでに必要ですか？",
      reason: "決定の緊急度によってアプローチが変わります",
      keywords: [/決め/i, /判断/i, /検討/i],
      answerType: "free_text",
      placeholder: "例: 今週中、来月のMTGまで",
    },
  ],
  // 関係者 - 記述式
  stakeholder: [
    {
      type: "implicit_condition",
      question: "この決定に関わる関係者は誰ですか？",
      reason: "関係者の合意が必要な場合、プロセスが変わります",
      keywords: [/決め/i, /承認/i, /報告/i],
      answerType: "free_text",
      placeholder: "例: 開発チーム、営業部長",
    },
    {
      type: "unrecognized_condition",
      question: "最終決定権者は誰ですか？",
      reason: "決定プロセスを明確にするために重要です",
      keywords: [/決定/i, /判断/i, /承認/i],
      answerType: "free_text",
      placeholder: "例: 部長、自分で決定可能",
    },
  ],
  // 技術的 - はい/いいえ
  technical: [
    {
      type: "implicit_condition",
      question: "既存のシステムや設備との整合性が必要ですか？",
      reason: "既存環境との互換性は重要な制約です",
      keywords: [/システム/i, /設備/i, /導入/i, /更新/i],
      answerType: "yes_no",
    },
    {
      type: "unrecognized_condition",
      question: "将来の拡張性を考慮する必要がありますか？",
      reason: "長期的な視点が必要な場合があります",
      keywords: [/設計/i, /構築/i, /導入/i],
      answerType: "yes_no",
    },
  ],
};

/** 目的の曖昧さを検出するパターン */
const VAGUE_PURPOSE_PATTERNS = [
  { pattern: /したい$/i, score: 20, element: "具体的な目標" },
  { pattern: /^.{1,10}$/i, score: 30, element: "詳細な説明" },
  { pattern: /どう/i, score: 15, element: "方向性" },
  { pattern: /なんとか/i, score: 25, element: "具体的なアプローチ" },
  { pattern: /良い|いい/i, score: 20, element: "評価基準" },
];

/**
 * Phase 6: チャットコンテキストから既に回答済みのカテゴリを検出
 * チャットで言及された制約は、確認質問をスキップする
 */
function extractAnsweredCategories(chatContext?: string): Set<string> {
  if (!chatContext) return new Set();

  const answered = new Set<string>();
  const text = chatContext.toLowerCase();

  // コスト関連の言及があれば cost をスキップ
  if (/\d+[万億]?円|予算.{0,15}(ある|ない|です|以[下内])|コスト.{0,15}(ある|ない|制約|重要)/.test(text)) {
    answered.add("cost");
  }

  // 納期関連の言及があれば time をスキップ
  if (/\d+[日週月年]|納期.{0,15}(ある|ない|です|まで)|期限.{0,15}(ある|ない|です)|いつまで/.test(text)) {
    answered.add("time");
  }

  // 安全関連の言及があれば safety をスキップ
  if (/安全.{0,15}(重要|必要|優先|確保)|危険.{0,15}(ある|ない)|リスク.{0,15}(ある|ない|考慮)/.test(text)) {
    answered.add("safety");
  }

  // 法規制関連の言及があれば legal をスキップ
  if (/法.{0,10}(準拠|遵守|規制)|コンプライアンス|許可.{0,10}(必要|取得)|基準.{0,10}(ある|満たす)/.test(text)) {
    answered.add("legal");
  }

  // 品質関連の言及があれば quality をスキップ
  if (/品質.{0,15}(重要|必要|基準)|精度.{0,15}(必要|確保)|性能.{0,15}(求|必要)/.test(text)) {
    answered.add("quality");
  }

  // 対象の具体化が十分であれば what をスキップ
  // チャットが50文字以上あり、具体的な対象が言及されていれば
  if (text.length > 50 && (/について|に関して|を(対象|検討|決め)/.test(text))) {
    answered.add("what");
  }

  // 関係者が言及されていれば stakeholder をスキップ
  if (/関係者|担当者|チーム|部門|部長|課長|上司|決定権/.test(text)) {
    answered.add("stakeholder");
  }

  // 技術的な言及があれば technical をスキップ
  if (/既存.{0,10}(システム|設備|環境)|互換|拡張性|将来.{0,10}(対応|拡張)/.test(text)) {
    answered.add("technical");
  }

  return answered;
}

/**
 * 目的から確認質問を生成
 */
export async function generateClarificationQuestions(
  purpose: string,
  chatContext?: string
): Promise<GenerateClarificationQuestionsResponse> {
  let questions: ClarificationQuestion[] = [];
  const missingElements: string[] = [];
  let sufficiencyScore = 100;

  // Phase 6: チャットで既に回答済みのカテゴリを検出
  const answeredCategories = extractAnsweredCategories(chatContext);
  console.log("[generateClarificationQuestions] answeredCategories:", Array.from(answeredCategories));

  // チャットで多くの情報が提供されていれば、充足度スコアを上げる
  if (answeredCategories.size > 0) {
    sufficiencyScore += answeredCategories.size * 10;
  }

  // 1. 目的の曖昧さをチェック
  for (const { pattern, score, element } of VAGUE_PURPOSE_PATTERNS) {
    if (pattern.test(purpose)) {
      sufficiencyScore -= score;
      if (!missingElements.includes(element)) {
        missingElements.push(element);
      }
    }
  }

  // 2. カテゴリ別の質問を生成
  const combinedText = `${purpose} ${chatContext || ""}`.toLowerCase();
  const addedCategories = new Set<string>();

  for (const [category, templates] of Object.entries(CLARIFICATION_QUESTION_TEMPLATES)) {
    // Phase 6: 既に回答済みのカテゴリはスキップ
    if (answeredCategories.has(category)) {
      console.log(`[generateClarificationQuestions] Skipping category '${category}' - already answered in chat`);
      continue;
    }

    for (const template of templates) {
      // キーワードマッチをチェック
      const isRelevant = template.keywords.some((kw) => kw.test(combinedText));

      if (isRelevant && !addedCategories.has(`${category}-${template.type}`)) {
        questions.push({
          id: generateId(),
          type: template.type,
          question: template.question,
          category,
          reason: template.reason,
          answerType: template.answerType,
          placeholder: template.placeholder,
          allowFreeText: true,
          priority: template.type === "what_clarification" ? 100 : 50,
        });
        addedCategories.add(`${category}-${template.type}`);
      }
    }
  }

  // 3. 基本的な確認質問を追加（what がまだ回答されていない場合のみ）
  if (sufficiencyScore < 70 && !answeredCategories.has("what")) {
    // 対象の具体化質問を優先
    if (!questions.some((q) => q.type === "what_clarification")) {
      questions.unshift({
        id: generateId(),
        type: "what_clarification",
        question: "この決定で達成したい具体的な成果は何ですか？",
        category: "what",
        reason: "ゴールを明確にすることで適切な選択肢を提示できます",
        answerType: "free_text",
        placeholder: "例: コストを20%削減する、納期を1週間短縮する",
        allowFreeText: true,
        priority: 100,
      });
    }
  }

  // 4. 優先度でソートして最大5件に制限
  questions.sort((a, b) => b.priority - a.priority);
  const limitedQuestions = questions.slice(0, 5);

  console.log(`[generateClarificationQuestions] Generated ${limitedQuestions.length} questions (filtered from ${questions.length})`);

  return {
    questions: limitedQuestions,
    contextSufficiency: {
      score: Math.max(0, Math.min(100, sufficiencyScore)),
      missingElements,
    },
  };
}
