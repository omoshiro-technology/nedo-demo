/**
 * 意思決定ナビゲーター提案検出ロジック
 *
 * チャットの会話から「意思決定支援が必要な場面」を検出し、
 * 意思決定ナビゲーターの起動を提案するかどうかを判定する
 *
 * LLMに判定を任せることで、文脈を理解した精度の高い判定を行う
 */

import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";

/** 意思決定ナビゲーター提案データ */
export type DecisionNavigatorSuggestion = {
  /** 抽出された意思決定の目的 */
  purpose: string;
  /** 現在の状況の要約 */
  currentSituation: string;
  /** なぜ意思決定ナビを提案したかの理由 */
  triggerReason: string;
};

/** 検出結果 */
type DetectionResult = {
  needsDecisionSupport: boolean;
  suggestion?: DecisionNavigatorSuggestion;
};

const DETECTION_PROMPT = `あなたは意思決定支援が必要かどうかを判定するアシスタントです。

以下の会話から、ユーザーが「意思決定支援」を必要としているかを判断してください。

## 判定基準

意思決定支援が有効な場面を検出します。

### 対象とする意思決定（isInScope: true）

**プロジェクト内部の意思決定**のみが対象です：
- スケジュール vs 品質のトレードオフ
- リソース配分の決定（人員の割り当て、優先順位）
- 仕様変更への対応方針
- リスク対応戦略の選択（回避・軽減・転嫁・受容）
- 技術的な選択（アーキテクチャ、ツール選定）
- プロジェクト計画の見直し

### 対象外（isInScope: false）

以下は**対象外**です。これらはPMテンプレートでは適切にサポートできません：
- 取引先・ベンダー・協力会社の選定や評価（「どの会社と契約すべきか」）
- 採用・人事の判断（「この人を採用すべきか」）
- 経営判断（投資判断、事業撤退、新規事業）
- 法的・契約上の判断
- 個人的な相談（キャリア、転職）

### 提案すべき場面（needsDecisionSupport: true）

1. **2つ以上の選択肢で迷っている**
   - 「AかBで迷っている」「どちらを優先すべきか」など

2. **会話が2往復以上あり、状況が明らかになってきた**
   - ユーザーが具体的な制約や状況を説明した

3. **ユーザーが行き詰まっている様子**
   - 「どうすればいいか分からない」「アイデアが浮かばない」

### 提案しない場面（needsDecisionSupport: false）

- 初回の挨拶や雑談のみ
- 純粋な情報収集（「〜とは何ですか？」）
- 手順の確認（「〜のやり方を教えて」）
- 会話が1往復以下

## 判定の例

✅ needsDecisionSupport: true, isInScope: true
- User: 「納期と品質で迷っています。1週間遅れそうです」
  → プロジェクト内部のトレードオフ判断

✅ needsDecisionSupport: true, isInScope: true
- User: 「仕様変更の要望が来ました。受け入れるべきか悩んでいます」
  → プロジェクト内部の仕様変更対応

❌ needsDecisionSupport: true, isInScope: false
- User: 「この会社と契約すべきか判断したい」
  → 取引先選定はPMテンプレートの対象外

❌ needsDecisionSupport: false
- User: 「テスト駆動開発とは何ですか？」
  → 情報収集

## 出力形式

必ず以下のJSON形式で回答してください（他のテキストは含めないこと）：

{
  "needsDecisionSupport": true または false,
  "isInScope": true または false,
  "outOfScopeReason": "対象外の理由（isInScope=falseの場合のみ）",
  "purpose": "意思決定の目的（needsDecisionSupport=true かつ isInScope=true の場合のみ）",
  "currentSituation": "現在の状況の要約（同上）",
  "triggerReason": "なぜ意思決定支援を提案するかの理由（同上）"
}`;

/**
 * 会話から意思決定支援の必要性を検出
 *
 * @param userMessage 最新のユーザーメッセージ
 * @param conversationHistory 直前の会話履歴（最新5件程度）
 * @returns 検出結果（必要な場合は提案データを含む）
 */
export async function detectDecisionNeed(
  userMessage: string,
  conversationHistory: Array<{ role: "user" | "assistant"; content: string }>
): Promise<DetectionResult> {
  // 会話履歴を文字列に変換
  const historyText = conversationHistory
    .slice(-6) // 直近6件まで
    .map((m) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
    .join("\n");

  const userContent = `## 会話履歴
${historyText || "（履歴なし）"}

## 最新のユーザーメッセージ
${userMessage}

上記の会話から意思決定支援が必要かどうかを判定し、JSON形式で回答してください。`;

  try {
    const response = await generateChatCompletion({
      systemPrompt: DETECTION_PROMPT,
      userContent,
      temperature: 0.1, // 判定は一貫性を重視
      maxTokens: 500,
    });

    // JSONをパース
    const parsed = parseJsonResponse(response);

    // 意思決定支援が必要で、かつ対象範囲内の場合のみ提案
    if (parsed.needsDecisionSupport && parsed.isInScope && parsed.purpose) {
      return {
        needsDecisionSupport: true,
        suggestion: {
          purpose: parsed.purpose,
          currentSituation: parsed.currentSituation || "",
          triggerReason: parsed.triggerReason || "",
        },
      };
    }

    // 対象外の場合はログ出力
    if (parsed.needsDecisionSupport && !parsed.isInScope) {
      console.log("[detectDecisionNeed] Out of scope:", parsed.outOfScopeReason);
    }

    return { needsDecisionSupport: false };
  } catch (error) {
    console.error("Decision need detection failed:", error);
    return { needsDecisionSupport: false };
  }
}

/**
 * LLMの応答からJSONをパース
 */
function parseJsonResponse(response: string): {
  needsDecisionSupport: boolean;
  isInScope: boolean;
  outOfScopeReason?: string;
  purpose?: string;
  currentSituation?: string;
  triggerReason?: string;
} {
  try {
    return parseJsonFromLLMResponse(response);
  } catch {
    console.warn("Failed to parse detection response:", response);
    return { needsDecisionSupport: false, isInScope: false };
  }
}
