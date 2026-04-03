/**
 * 支援モード判定
 *
 * ユーザーの入力から「プロセス支援」か「思考支援」かを自動判定する
 *
 * Phase 2: 2モード分離アーキテクチャ
 */

import type { SupportMode, SupportModeDetectionResult } from "./types";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

// ============================================================
// キーワードルール（高速・確実な判定）
// ============================================================

/** プロセス支援を示すキーワード */
const PROCESS_KEYWORDS = [
  // 手順・方法
  "手順",
  "やり方",
  "方法",
  "進め方",
  "フロー",
  "ステップ",
  "流れ",
  // 作業・実行
  "施工",
  "作業",
  "実施",
  "実行",
  "運用",
  "操作",
  // how系の問い
  "どうやって",
  "どのように",
  "何から始め",
  "何をすれば",
];

/** 思考支援を示すキーワード */
const THINKING_KEYWORDS = [
  // 根拠・理由
  "根拠",
  "理由",
  "なぜ",
  "どうして",
  // 判断・決定
  "判断",
  "決定",
  "決め",
  "選択",
  "選ぶ",
  "選び",
  // 比較・評価
  "比較",
  "評価",
  "検討",
  "妥当性",
  "適切",
  // which系の問い
  "どちら",
  "どれ",
  "どっち",
  // 悩み・迷い
  "悩",
  "迷",
  "わからない",
  "分からない",
  // 距離・数値関連（技術的判断）
  "距離",
  "間隔",
  "寸法",
  "基準",
  "規格",
];

// ============================================================
// キーワードベース判定
// ============================================================

/**
 * キーワードルールでモードを判定
 */
function detectByKeywords(purpose: string): SupportModeDetectionResult | null {
  const processMatches = PROCESS_KEYWORDS.filter((kw) => purpose.includes(kw));
  const thinkingMatches = THINKING_KEYWORDS.filter((kw) =>
    purpose.includes(kw)
  );

  const processScore = processMatches.length;
  const thinkingScore = thinkingMatches.length;

  // スコア差が明確な場合のみ判定
  if (processScore > 0 && thinkingScore === 0) {
    return {
      mode: "process",
      confidence: Math.min(0.9, 0.6 + processScore * 0.1),
      reason: `プロセス支援キーワード検出: ${processMatches.join(", ")}`,
      matchedKeywords: processMatches,
    };
  }

  if (thinkingScore > 0 && processScore === 0) {
    return {
      mode: "thinking",
      confidence: Math.min(0.9, 0.6 + thinkingScore * 0.1),
      reason: `思考支援キーワード検出: ${thinkingMatches.join(", ")}`,
      matchedKeywords: thinkingMatches,
    };
  }

  // 両方あるが差が明確な場合
  if (processScore > thinkingScore + 1) {
    return {
      mode: "process",
      confidence: 0.7,
      reason: `プロセス支援優勢 (${processScore} vs ${thinkingScore})`,
      matchedKeywords: processMatches,
    };
  }

  if (thinkingScore > processScore + 1) {
    return {
      mode: "thinking",
      confidence: 0.7,
      reason: `思考支援優勢 (${thinkingScore} vs ${processScore})`,
      matchedKeywords: thinkingMatches,
    };
  }

  // 判定不能
  return null;
}

// ============================================================
// LLMベース判定
// ============================================================

const MODE_DETECTION_SYSTEM_PROMPT = `あなたはユーザーの質問を分類するアシスタントです。
質問が以下のどちらに該当するかを判定してください:

1. **process（プロセス支援）**: 「次に何をするべきか」を知りたい
   - 手順・やり方・方法を尋ねている
   - 作業の進め方を知りたい
   - 具体的なステップを求めている
   例: 「タンク設置の手順がわからない」「どうやって申請すればいい？」

2. **thinking（思考支援）**: 「どう考えるべきか」を知りたい
   - 判断基準・根拠を求めている
   - 選択肢の比較・評価をしたい
   - 悩みの整理・意思決定の支援を求めている
   例: 「タンク間距離の根拠がわからない」「AとBどちらを選ぶべき？」

必ず以下のJSON形式で回答してください:
{
  "mode": "process" または "thinking",
  "confidence": 0.0〜1.0の確信度,
  "reason": "判定理由（日本語で簡潔に）"
}`;

/**
 * LLMでモードを判定
 */
async function detectByLLM(
  purpose: string
): Promise<SupportModeDetectionResult> {
  try {
    const content = await generateChatCompletion({
      model: env.openaiModelDefault,
      systemPrompt: MODE_DETECTION_SYSTEM_PROMPT,
      userContent: `質問: ${purpose}`,
      temperature: 0.3,
      maxTokens: 200,
    });

    // JSON抽出
    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonFromLLMResponse<Record<string, unknown>>(content);
    } catch {
      console.warn("[detectSupportMode] LLM応答のJSON抽出失敗:", content);
      return getDefaultResult();
    }

    return {
      mode: parsed.mode === "process" ? "process" : "thinking",
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reason: (typeof parsed.reason === "string" ? parsed.reason : null) || "LLM判定",
    };
  } catch (error) {
    console.error("[detectSupportMode] LLM判定エラー:", error);
    return getDefaultResult();
  }
}

/**
 * デフォルト結果（思考支援）
 */
function getDefaultResult(): SupportModeDetectionResult {
  return {
    mode: "thinking",
    confidence: 0.5,
    reason: "デフォルト（思考支援）",
  };
}

// ============================================================
// メイン判定関数
// ============================================================

/**
 * 支援モードを自動判定
 *
 * 判定フロー:
 * 1. キーワードルールで判定（高速・確実）
 * 2. キーワードで判定できない場合、LLMで判定
 * 3. 確信度が低い場合（< 0.7）は将来的にユーザーに確認
 */
export async function detectSupportMode(
  purpose: string,
  options?: { skipLLM?: boolean }
): Promise<SupportModeDetectionResult> {
  // Step 1: キーワードルールで判定
  const keywordResult = detectByKeywords(purpose);
  if (keywordResult && keywordResult.confidence >= 0.7) {
    console.log(
      `[detectSupportMode] キーワード判定: ${keywordResult.mode} (${keywordResult.confidence})`
    );
    return keywordResult;
  }

  // Step 2: LLMで判定（オプションでスキップ可能）
  if (!options?.skipLLM) {
    const llmResult = await detectByLLM(purpose);
    console.log(
      `[detectSupportMode] LLM判定: ${llmResult.mode} (${llmResult.confidence})`
    );
    return llmResult;
  }

  // Step 3: フォールバック
  if (keywordResult) {
    return keywordResult;
  }

  return getDefaultResult();
}

/**
 * 同期版（キーワードのみ、LLMなし）
 * セッション作成時の高速判定用
 */
export function detectSupportModeSync(purpose: string): SupportModeDetectionResult {
  const keywordResult = detectByKeywords(purpose);
  if (keywordResult) {
    return keywordResult;
  }
  return getDefaultResult();
}
