/**
 * 目的変換（Purpose to Goal）
 *
 * ユーザーの質問をゴール志向の目的文に変換する
 *
 * 例:
 * - 「コンデミの樹脂量を決めるためにはどのような条件が影響しますか」
 *   → 「コンデミ樹脂量の最適値を決定する」
 *
 * - 「タンク間距離はどれくらい取ればいいですか」
 *   → 「最適なタンク間距離を決定する」
 */

import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

// ============================================================
// 型定義
// ============================================================

export type PurposeToGoalResult = {
  /** 変換後のゴール文 */
  goal: string;
  /** 変換の確信度 (0.0-1.0) */
  confidence: number;
  /** 変換理由（デバッグ用） */
  reason: string;
  /** 元の質問のタイプ */
  questionType: "what" | "how" | "why" | "which" | "amount" | "other";
};

// ============================================================
// パターンマッチング（高速変換）
// ============================================================

/** 質問パターンと変換ルール */
const QUESTION_PATTERNS: Array<{
  regex: RegExp;
  type: PurposeToGoalResult["questionType"];
  transform: (match: RegExpMatchArray) => string;
}> = [
  // 「〜を決める（ため）には どのような条件が影響しますか」パターン
  // → 条件の整理・理解が目的（数値決定ではない）
  {
    regex: /(.+)を決める(?:ため)?(?:に)?(?:は)?.*?(?:条件|要素|因子)(?:が)?(?:影響|関係|必要)/,
    type: "what",
    transform: (m) => `${m[1].trim()}の判断条件を整理する`,
  },
  // 「〜を決めるには何を考慮すべきか」パターン
  {
    regex: /(.+)を決める(?:ため)?(?:に)?(?:は)?.*?(?:考慮|検討)/,
    type: "what",
    transform: (m) => `${m[1].trim()}の検討項目を明確にする`,
  },
  // 「〜を決める（ため）には〜」パターン（条件/要素の言及なし → 決定を目指す）
  {
    regex: /(.+)を決める(?:ため)?(?:に)?(?:は)?/,
    type: "what",
    transform: (m) => `${m[1].trim()}を決定する`,
  },
  // 「〜はどれくらい」パターン
  {
    regex: /(.+)(?:は|を)どれくらい(?:取れば|すれば|にすれば)?/,
    type: "amount",
    transform: (m) => `最適な${m[1].trim()}を決定する`,
  },
  // 「〜はいくつ」パターン
  {
    regex: /(.+)(?:は|を)いくつ(?:にすれば|すれば)?/,
    type: "amount",
    transform: (m) => `${m[1].trim()}の数量を決定する`,
  },
  // 「どちらを選ぶ」パターン
  {
    regex: /(.+)(?:と|か)(.+)(?:どちら|どっち)(?:を|が)?(?:選|いい|良い)/,
    type: "which",
    transform: (m) => `${m[1].trim()}と${m[2].trim()}のどちらを採用するか決定する`,
  },
  // 「〜の選定」パターン
  {
    regex: /(.+)(?:の|を)(?:選定|選択|決定)/,
    type: "what",
    transform: (m) => `${m[1].trim()}を選定する`,
  },
  // 「〜はどうすれば」パターン
  {
    regex: /(.+)(?:は)?どう(?:すれば|したら|やれば)/,
    type: "how",
    transform: (m) => `${m[1].trim()}の方針を決定する`,
  },
];

/**
 * パターンマッチングでゴールに変換
 */
function transformByPattern(purpose: string): PurposeToGoalResult | null {
  for (const pattern of QUESTION_PATTERNS) {
    const match = purpose.match(pattern.regex);
    if (match) {
      const goal = pattern.transform(match);
      return {
        goal,
        confidence: 0.8,
        reason: `パターンマッチ: ${pattern.type}`,
        questionType: pattern.type,
      };
    }
  }
  return null;
}

// ============================================================
// LLMベース変換
// ============================================================

const GOAL_CONVERSION_SYSTEM_PROMPT = `あなたはユーザーの質問を「ゴール志向の目的文」に変換するアシスタントです。

## 重要：ユーザーの真の意図を読み取る

ユーザーが「どのような条件が影響しますか」「何を考慮すべきですか」と聞いている場合、
それは「数値を決定したい」のではなく「判断に必要な条件を整理・理解したい」という意図です。

- 「〜を決めるためにはどのような条件が影響しますか」
  → 意図: 条件の整理・理解（数値決定ではない）
  → 目的: 「〜の判断条件を整理する」

- 「〜を決めるには何を考慮すべきですか」
  → 意図: 検討項目の明確化
  → 目的: 「〜の検討項目を明確にする」

## 変換ルール

1. **質問の意図を正確に反映する**
   - 条件・要素を聞いている → 「〜の判断条件を整理する」「〜の影響要因を明確にする」
   - 数値・量を聞いている → 「〜を決定する」
   - 選択を聞いている → 「〜を選定する」

2. **最大20文字程度**に簡潔にまとめる
   - 冗長な説明は削除
   - 核心のアクションのみ残す

3. **動詞で終わる**
   - 「〜を整理する」「〜を明確にする」「〜を決定する」「〜を選定する」など

## 出力形式

必ず以下のJSON形式で回答してください:
{
  "goal": "変換後のゴール文（20文字程度、動詞で終わる）",
  "confidence": 0.0〜1.0の確信度,
  "questionType": "what" | "how" | "why" | "which" | "amount" | "other"
}

## 例

入力: 「コンデミの樹脂量を決めるためにはどのような条件が影響しますか」
出力: {"goal": "コンデミ樹脂量の判断条件を整理する", "confidence": 0.9, "questionType": "what"}

入力: 「タンク間距離はどれくらい取ればいいですか」
出力: {"goal": "タンク間距離を決定する", "confidence": 0.9, "questionType": "amount"}

入力: 「設備選定で考慮すべき点は何ですか」
出力: {"goal": "設備選定の検討項目を明確にする", "confidence": 0.9, "questionType": "what"}

入力: 「AポンプとBポンプどちらを選べばいいですか」
出力: {"goal": "ポンプの機種を選定する", "confidence": 0.9, "questionType": "which"}

入力: 「設備更新の計画を立てたい」
出力: {"goal": "設備更新計画を策定する", "confidence": 0.85, "questionType": "what"}`;

/**
 * LLMでゴールに変換
 */
async function transformByLLM(purpose: string): Promise<PurposeToGoalResult> {
  try {
    const content = await generateChatCompletion({
      model: env.anthropicModelDefault,
      systemPrompt: GOAL_CONVERSION_SYSTEM_PROMPT,
      userContent: `ユーザーの質問: ${purpose}`,
      temperature: 0.3,
      maxTokens: 200,
    });

    // JSON抽出
    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonFromLLMResponse<Record<string, unknown>>(content);
    } catch {
      console.warn("[purposeToGoal] LLM応答のJSON抽出失敗:", content);
      return getDefaultResult(purpose);
    }

    return {
      goal: (typeof parsed.goal === "string" ? parsed.goal : null) || purpose,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reason: "LLM変換",
      questionType: (typeof parsed.questionType === "string" ? parsed.questionType as PurposeToGoalResult["questionType"] : null) || "other",
    };
  } catch (error) {
    console.error("[purposeToGoal] LLM変換エラー:", error);
    return getDefaultResult(purpose);
  }
}

/**
 * デフォルト結果（変換なし）
 */
function getDefaultResult(purpose: string): PurposeToGoalResult {
  // 疑問符・句読点を削除して簡潔にする
  let goal = purpose
    .replace(/[？?。、]/g, "")
    .replace(/ですか$/g, "")
    .replace(/ますか$/g, "")
    .trim();

  // 30文字を超える場合は切り詰め
  if (goal.length > 30) {
    goal = goal.slice(0, 27) + "...";
  }

  return {
    goal,
    confidence: 0.3,
    reason: "変換なし（フォールバック）",
    questionType: "other",
  };
}

// ============================================================
// メイン関数
// ============================================================

/**
 * ユーザーの質問をゴール志向の目的文に変換
 *
 * @param purpose ユーザーの入力（質問形式でも可）
 * @param options オプション
 * @returns 変換結果
 */
export async function purposeToGoal(
  purpose: string,
  options?: { skipLLM?: boolean }
): Promise<PurposeToGoalResult> {
  // 既にゴール形式（動詞で終わる）の場合はそのまま返す
  if (purpose.endsWith("する") || purpose.endsWith("決定する") || purpose.endsWith("選定する")) {
    return {
      goal: purpose,
      confidence: 1.0,
      reason: "既にゴール形式",
      questionType: "other",
    };
  }

  // Step 1: LLMで変換（オプションでスキップ可能）
  // 正確な意図理解のため、パターンマッチより優先
  if (!options?.skipLLM) {
    const llmResult = await transformByLLM(purpose);
    console.log(`[purposeToGoal] LLM変換: "${purpose}" → "${llmResult.goal}" (confidence: ${llmResult.confidence})`);

    // LLMが高確度（>= 0.7）なら採用
    if (llmResult.confidence >= 0.7) {
      return llmResult;
    }

    // LLMが低確度の場合はパターンマッチも試す
    console.log(`[purposeToGoal] LLM低確度のためパターンマッチも試行`);
  }

  // Step 2: パターンマッチングで変換（LLMフォールバック用）
  const patternResult = transformByPattern(purpose);
  if (patternResult) {
    console.log(`[purposeToGoal] パターン変換: "${purpose}" → "${patternResult.goal}"`);
    return patternResult;
  }

  // Step 3: フォールバック
  return getDefaultResult(purpose);
}

/**
 * 同期版（パターンマッチのみ、LLMなし）
 */
export function purposeToGoalSync(purpose: string): PurposeToGoalResult {
  // 既にゴール形式の場合
  if (purpose.endsWith("する") || purpose.endsWith("決定する") || purpose.endsWith("選定する")) {
    return {
      goal: purpose,
      confidence: 1.0,
      reason: "既にゴール形式",
      questionType: "other",
    };
  }

  // パターンマッチング
  const patternResult = transformByPattern(purpose);
  if (patternResult) {
    return patternResult;
  }

  // フォールバック
  return getDefaultResult(purpose);
}
