/**
 * 思考戦略の自動検出
 *
 * ユーザーの目的入力から最適な思考戦略を自動判定する
 * 既存の detectSupportMode.ts のパターンを踏襲し、5戦略対応に拡張
 *
 * 判定フロー:
 * 1. キーワードルールで判定（高速・確実）
 * 2. キーワードで判定できない場合、LLMで判定
 * 3. フォールバック: backcast（思考支援のデフォルト）
 */

import type { ThinkingStrategyId } from "../../domain/decisionNavigator/strategies/IThinkingStrategy";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

// ============================================================
// 検出結果型
// ============================================================

export type StrategyDetectionResult = {
  strategy: ThinkingStrategyId;
  confidence: number;       // 0-1
  reason: string;
  matchedKeywords?: string[];
};

// ============================================================
// キーワードルール
// ============================================================

/** フォワード（プロセス支援）を示すキーワード */
const FORWARD_KEYWORDS = [
  "手順", "やり方", "方法", "進め方", "フロー", "ステップ", "流れ",
  "施工", "作業", "実施", "実行", "運用", "操作",
  "どうやって", "どのように", "何から始め", "何をすれば",
];

/** バックキャストを示すキーワード */
const BACKCAST_KEYWORDS = [
  "目標", "ゴール", "達成", "到達", "実現", "あるべき姿",
  "逆算", "バックキャスト",
  "どうなっていたい", "どこに到達", "最終的に",
  // 思考・判断系（既存のthinkingキーワード）
  "根拠", "理由", "なぜ", "判断", "決定", "決め", "選択",
  "比較", "評価", "検討", "妥当性",
  "どちら", "どれ", "悩", "迷",
];

/** 制約ファーストを示すキーワード */
const CONSTRAINT_KEYWORDS = [
  "制約", "制限", "規制", "法規", "基準", "規格", "コンプライアンス",
  "上限", "下限", "範囲内", "許容", "条件",
  "守るべき", "満たす", "適合", "遵守",
  "予算内", "期限内", "スペック",
];

/** リスクファーストを示すキーワード */
const RISK_KEYWORDS = [
  "リスク", "危険", "安全", "事故", "災害", "障害",
  "対策", "予防", "回避", "軽減", "備え",
  "最悪", "万が一", "想定外", "故障", "トラブル",
  "地震", "火災", "漏洩", "被害",
];

/** アナロジーを示すキーワード */
const ANALOGY_KEYWORDS = [
  "過去", "事例", "実績", "前例", "経験", "類似",
  "同じような", "似たような", "他の", "別の",
  "参考", "参照", "ベストプラクティス", "成功例", "失敗例",
  "横展開", "応用", "転用",
];

// ============================================================
// キーワードベース判定
// ============================================================

type StrategyScore = {
  id: ThinkingStrategyId;
  score: number;
  keywords: string[];
};

function scoreKeywords(purpose: string): StrategyScore[] {
  const strategies: { id: ThinkingStrategyId; keywords: string[] }[] = [
    { id: "forward", keywords: FORWARD_KEYWORDS },
    { id: "backcast", keywords: BACKCAST_KEYWORDS },
    { id: "constraint", keywords: CONSTRAINT_KEYWORDS },
    { id: "risk", keywords: RISK_KEYWORDS },
    { id: "analogy", keywords: ANALOGY_KEYWORDS },
  ];

  return strategies.map(({ id, keywords }) => {
    const matched = keywords.filter((kw) => purpose.includes(kw));
    return { id, score: matched.length, keywords: matched };
  });
}

function detectByKeywords(purpose: string): StrategyDetectionResult | null {
  const scores = scoreKeywords(purpose);
  scores.sort((a, b) => b.score - a.score);

  const top = scores[0];
  const second = scores[1];

  // トップが0ならキーワード判定不能
  if (top.score === 0) return null;

  // トップが明確に優勢（2点以上差、または唯一のマッチ）
  if (top.score >= 2 && (second.score === 0 || top.score > second.score + 1)) {
    return {
      strategy: top.id,
      confidence: Math.min(0.9, 0.6 + top.score * 0.1),
      reason: `キーワード検出: ${top.keywords.join(", ")}`,
      matchedKeywords: top.keywords,
    };
  }

  // トップが1点差以内の場合は判定不能
  if (top.score > 0 && second.score === 0) {
    return {
      strategy: top.id,
      confidence: 0.6,
      reason: `キーワード検出（弱）: ${top.keywords.join(", ")}`,
      matchedKeywords: top.keywords,
    };
  }

  return null;
}

// ============================================================
// LLMベース判定
// ============================================================

const STRATEGY_DETECTION_PROMPT = `あなたはユーザーの質問を分類するアシスタントです。
質問が以下のどの思考戦略に該当するかを判定してください:

1. **forward（フォワード）**: 手順・やり方・方法を知りたい。次に何をすべきか
   例: 「タンク設置の手順を教えて」「どうやって申請すればいい？」

2. **backcast（バックキャスト）**: 目標から逆算して考えたい。判断・選択の支援
   例: 「タンク間距離を決めたい」「AとBどちらを選ぶべき？」

3. **constraint（制約ファースト）**: 制約条件を踏まえて最適解を探したい
   例: 「法規制約の中で最適な配管径を選びたい」「予算内で最善の方法は？」

4. **risk（リスクファースト）**: リスクを起点に対策を考えたい
   例: 「地震リスクに備えたい」「安全対策を検討したい」

5. **analogy（アナロジー）**: 過去の事例を参考にして考えたい
   例: 「過去の類似プロジェクトを参考にしたい」「他社の成功例を参考にしたい」

必ず以下のJSON形式で回答してください:
{
  "strategy": "forward" | "backcast" | "constraint" | "risk" | "analogy",
  "confidence": 0.0〜1.0,
  "reason": "判定理由（日本語で簡潔に）"
}`;

async function detectByLLM(purpose: string): Promise<StrategyDetectionResult> {
  try {
    const content = await generateChatCompletion({
      model: env.anthropicModelDefault,
      systemPrompt: STRATEGY_DETECTION_PROMPT,
      userContent: `質問: ${purpose}`,
      temperature: 0.3,
      maxTokens: 200,
    });

    let parsed: Record<string, unknown>;
    try {
      parsed = parseJsonFromLLMResponse<Record<string, unknown>>(content);
    } catch {
      console.warn("[strategyDetector] LLM応答のJSON抽出失敗:", content);
      return getDefaultResult();
    }

    const validStrategies: ThinkingStrategyId[] = ["forward", "backcast", "constraint", "risk", "analogy"];
    const strategy = validStrategies.includes(parsed.strategy as ThinkingStrategyId)
      ? (parsed.strategy as ThinkingStrategyId)
      : "backcast";

    return {
      strategy,
      confidence: typeof parsed.confidence === "number" ? parsed.confidence : 0.5,
      reason: (typeof parsed.reason === "string" ? parsed.reason : null) || "LLM判定",
    };
  } catch (error) {
    console.error("[strategyDetector] LLM判定エラー:", error);
    return getDefaultResult();
  }
}

function getDefaultResult(): StrategyDetectionResult {
  return {
    strategy: "backcast",
    confidence: 0.5,
    reason: "デフォルト（バックキャスト）",
  };
}

// ============================================================
// メイン判定関数
// ============================================================

/**
 * 思考戦略を自動判定
 *
 * @param purpose ユーザーが入力した目的
 * @param options オプション（LLMスキップ等）
 */
export async function detectStrategy(
  purpose: string,
  options?: { skipLLM?: boolean }
): Promise<StrategyDetectionResult> {
  // Step 1: キーワードルールで判定
  const keywordResult = detectByKeywords(purpose);
  if (keywordResult && keywordResult.confidence >= 0.7) {
    console.log(
      `[strategyDetector] キーワード判定: ${keywordResult.strategy} (${keywordResult.confidence})`
    );
    return keywordResult;
  }

  // Step 2: LLMで判定
  if (!options?.skipLLM) {
    const llmResult = await detectByLLM(purpose);
    console.log(
      `[strategyDetector] LLM判定: ${llmResult.strategy} (${llmResult.confidence})`
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
 */
export function detectStrategySync(purpose: string): StrategyDetectionResult {
  const keywordResult = detectByKeywords(purpose);
  if (keywordResult) {
    return keywordResult;
  }
  return getDefaultResult();
}
