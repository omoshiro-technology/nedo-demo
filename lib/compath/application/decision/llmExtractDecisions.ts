import type { DecisionItem, DecisionPatternType, ConfidenceLevel } from "../../domain/types";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";
import { createHash } from "node:crypto";
import { generateGuidance } from "./generateGuidance";
import { estimateRisks } from "./estimateRisks";
import { calculateImportance } from "./calculateImportance";
import { calculatePriorityScore } from "./calculatePriorityScore";
import { findSimilarFromHistory, addToHistory } from "./findSimilarDecisions";

/**
 * LLMによる意思決定抽出結果
 */
type LLMDecisionExtraction = {
  decisions: Array<{
    content: string;
    type: DecisionPatternType;
    status: "confirmed" | "gray" | "proposed";
    sourceText: string;
    confidence: number;
    reasoning?: string;
    /** 未確定の理由（grayやproposedの場合） */
    ambiguityReasons?: string[];
  }>;
};

/**
 * LLMを使用して議事録から意思決定を抽出
 *
 * 正規表現よりも柔軟に日本語の多様な表現を理解できる
 */
export async function extractDecisionsWithLLM(
  text: string,
  fileName: string,
  documentDate: string
): Promise<DecisionItem[]> {
  // APIキーがない場合はnullを返す（フォールバック用）
  if (!env.anthropicApiKey) {
    return [];
  }

  // テキストが短すぎる場合はスキップ
  if (text.length < 50) {
    return [];
  }

  // テキストが長すぎる場合は切り詰める（トークン制限対策）
  const maxTextLength = 12000;
  const truncatedText = text.length > maxTextLength
    ? text.slice(0, maxTextLength) + "\n\n...(以下省略)"
    : text;

  const systemPrompt = `あなたは議事録から意思決定事項を抽出するエキスパートです。

与えられた議事録テキストから、以下の種類の意思決定・合意事項を**網羅的に**抽出してください：

1. **decision（決定）**: 「〜とする」「〜に決定」「〜となった」など、明確な決定
2. **agreement（合意）**: 「〜で合意」「〜が確認された」「〜を承認」など、参加者間の合意
3. **change（変更）**: 「〜に変更」「〜を修正」「〜を見直し」など、既存の方針の変更
4. **adoption（採用）**: 「〜を採用」「〜を導入」「〜を選定」など、新しい手法やツールの採用
5. **cancellation（中止・延期）**: 「〜を中止」「〜を延期」「〜を保留」など

## status判定の厳密なルール

### confirmed（確定）の条件 - 以下のいずれかに該当すれば**必ずconfirmed**：
- 過去形・完了形の決定表現：「〜に決定した」「〜を採用した」「〜となった」「〜で合意した」「〜を実施した」
- 方針の宣言：「〜を実施する」「〜とする」「〜で進める」「〜を行う」
- 具体的な内容の確定：金額、日付、期限、担当者、仕様が明記されている
- 報告・確認の完了：「〜が報告された」「〜が確認された」「〜が共有された」

### gray（グレー）の条件 - 以下の**全て**に該当する場合のみgray：
- 「検討」「検討中」「予定（具体的日付なし）」「見込み」「方向で」の表現がある
- **かつ**、具体的な内容（金額、日付、担当者など）が明記されていない
- **かつ**、条件付きの表現（「〜が確認できたら」「〜の承認後」「〜次第」）がある

### proposed（提案）の条件 - 以下の表現がある場合のみproposed：
- 「〜を提案」「〜してはどうか」「〜すべきでは」「〜の案」など、明確に提案であることが分かる表現
- 議論中で結論が出ていないことが明記されている

## 重要な判定ルール

1. **迷ったらconfirmed**: 会議で話された内容は基本的に「決まったこと」として扱う
2. **網羅性を重視**: 意思決定の可能性があるものは全て抽出する。抽出漏れは大きな問題
3. **一貫性を重視**: 同じ表現パターンには同じstatusを付与する

## JSON出力形式

{
  "decisions": [
    {
      "content": "抽出した意思決定の内容（簡潔に要約）",
      "type": "decision|agreement|change|adoption|cancellation",
      "status": "confirmed|gray|proposed",
      "sourceText": "【重要】原文から該当箇所を一字一句そのままコピー（30〜80文字程度）",
      "confidence": 0.8-1.0,
      "reasoning": "なぜこのstatusにしたか（必須）",
      "ambiguityReasons": ["未確定の理由（grayまたはproposedの場合のみ）"]
    }
  ]
}

## sourceTextの重要ルール
- 原文に存在するテキストを**一字一句そのまま**コピー
- 言い換え、要約、語順変更は禁止
- 原文の句読点、スペースもそのまま含める

## 抽出しないもの
- 単なる事実の記載（「〜について説明があった」）
- 背景情報や一般的な説明文
- 既に他で抽出した内容の重複`;

  const userContent = `以下の議事録から意思決定事項を抽出してください：

---
${truncatedText}
---`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      model: env.anthropicModelDefault,
      temperature: 0,  // 決定論的な出力で安定性を確保
      maxTokens: 8192,  // reasoning_tokensを含めるため増加
    });

    // JSONをパース
    const parsed = parseJSONResponse(response);
    if (!parsed || !Array.isArray(parsed.decisions)) {
      console.warn("[LLM Decision Extraction] Invalid response format");
      return [];
    }

    // DecisionItem形式に変換
    const decisions: DecisionItem[] = parsed.decisions.map((d: LLMDecisionExtraction["decisions"][0], index: number) => {
      const patternType = validatePatternType(d.type);
      const status = validateStatus(d.status);

      // sourceTextを検証・修正: LLMが返したテキストが原文に存在するか確認
      let sourceText = d.sourceText || "";
      sourceText = validateAndFixSourceText(sourceText, text);

      // ambiguityFlagsを設定（LLMからの理由、または未設定の場合はデフォルト）
      const ambiguityFlags = status !== "confirmed"
        ? (d.ambiguityReasons && d.ambiguityReasons.length > 0
            ? d.ambiguityReasons
            : ["確定に必要な情報が不足しています"])
        : undefined;

      const decisionItem: DecisionItem = {
        id: generateDecisionId(fileName, d.content, index),
        content: d.content,
        patternType,
        sourceText,
        sourceFileName: fileName,
        decisionDate: documentDate,
        confidence: convertToConfidenceLevel(d.confidence),
        status,
        qualityScore: calculateQualityScore(d),
        ambiguityFlags,
      };

      // 重要度を計算
      decisionItem.importance = calculateImportance(
        d.content,
        sourceText,
        patternType,
        fileName
      );

      // グレー/提案段階の決定には判断支援情報を付与
      if (status !== "confirmed") {
        // ガイダンス生成
        decisionItem.guidance = generateGuidance(
          patternType,
          status,
          ambiguityFlags || []
        );

        // リスク推定
        decisionItem.risks = estimateRisks(
          patternType,
          status,
          d.content,
          sourceText
        );

        // 類似事例検索
        const similarDecisions = findSimilarFromHistory(d.content, patternType, 3);
        if (similarDecisions.length > 0) {
          decisionItem.similarDecisions = similarDecisions;
        }
      }

      // 優先度スコアを計算（すべての情報が揃った後で計算）
      decisionItem.priorityScore = calculatePriorityScore(decisionItem);

      return decisionItem;
    });

    // 抽出した決定事項を履歴に追加（将来の類似検索用）
    addToHistory(decisions);

    if (env.debugLlmLog) {
      console.log(`[LLM Decision Extraction] Extracted ${decisions.length} decisions from ${fileName}`);
    }

    return decisions;
  } catch (error) {
    console.error("[LLM Decision Extraction] Error:", error);
    return [];
  }
}

/**
 * LLMが返したsourceTextを検証し、原文に存在しない場合は修正を試みる
 * @param sourceText LLMが返したsourceText
 * @param originalText 原文テキスト
 * @returns 原文に存在するテキスト、または空文字列
 */
function validateAndFixSourceText(sourceText: string, originalText: string): string {
  if (!sourceText || sourceText.length < 10) {
    return "";
  }

  // 1. 完全一致チェック
  if (originalText.includes(sourceText)) {
    return sourceText;
  }

  // 2. 空白を正規化して検索
  const normalizedOriginal = originalText.replace(/\s+/g, " ");
  const normalizedSource = sourceText.replace(/\s+/g, " ");
  if (normalizedOriginal.includes(normalizedSource)) {
    // 原文から該当部分を抽出（空白正規化前の位置を推定）
    const searchStart = normalizedSource.slice(0, Math.min(30, normalizedSource.length));
    const startIndex = originalText.indexOf(searchStart);
    if (startIndex !== -1) {
      // 元のテキストから適切な長さを抽出
      const endIndex = Math.min(originalText.length, startIndex + sourceText.length + 20);
      const extracted = originalText.slice(startIndex, endIndex);
      // 文末を整える（句点や改行で区切る）
      const match = extracted.match(/^(.+?[。、！？\n])/);
      if (match && match[1].length >= 20) {
        return match[1].trim();
      }
      return extracted.trim();
    }
  }

  // 3. sourceTextの最初の20文字で部分一致検索
  const shortSearch = sourceText.slice(0, Math.min(25, sourceText.length));
  const shortIndex = originalText.indexOf(shortSearch);
  if (shortIndex !== -1) {
    // マッチした位置から適切な長さを抽出
    const endIndex = Math.min(originalText.length, shortIndex + sourceText.length + 10);
    const extracted = originalText.slice(shortIndex, endIndex);
    return extracted.trim();
  }

  // 4. 単語単位で検索（最初の数単語）
  const words = sourceText.split(/\s+/).slice(0, 5).join(" ");
  if (words.length >= 10) {
    const wordIndex = originalText.indexOf(words);
    if (wordIndex !== -1) {
      const endIndex = Math.min(originalText.length, wordIndex + sourceText.length + 10);
      return originalText.slice(wordIndex, endIndex).trim();
    }
  }

  // 見つからない場合は空文字列を返す（ハイライトしない）
  if (env.debugLlmLog) {
    console.warn("[LLM Decision Extraction] sourceText not found in original:", {
      sourceText: sourceText.slice(0, 50),
    });
  }
  return "";
}

/**
 * LLMレスポンスからJSONをパース
 * コードブロックで囲まれている場合も対応
 */
function parseJSONResponse(response: string): LLMDecisionExtraction | null {
  try {
    return parseJsonFromLLMResponse<LLMDecisionExtraction>(response);
  } catch {
    // JSONとして解析できない場合
    console.warn("[LLM Decision Extraction] Failed to parse JSON response");
    return null;
  }
}

/**
 * パターンタイプの検証
 */
function validatePatternType(type: string): DecisionPatternType {
  const validTypes: DecisionPatternType[] = [
    "decision", "agreement", "change", "adoption", "cancellation", "other"
  ];
  return validTypes.includes(type as DecisionPatternType)
    ? (type as DecisionPatternType)
    : "other";
}

/**
 * ステータスの検証
 */
function validateStatus(status: string): "confirmed" | "gray" | "proposed" {
  const validStatuses = ["confirmed", "gray", "proposed"];
  return validStatuses.includes(status)
    ? (status as "confirmed" | "gray" | "proposed")
    : "gray";
}

/**
 * 数値の信頼度をConfidenceLevelに変換
 */
function convertToConfidenceLevel(confidence: number | undefined): ConfidenceLevel {
  const value = confidence ?? 0.8;
  if (value >= 0.8) return "high";
  if (value >= 0.5) return "medium";
  return "low";
}

/**
 * 品質スコアの計算
 */
function calculateQualityScore(d: LLMDecisionExtraction["decisions"][0]): number {
  let score = d.confidence || 0.8;

  // confirmedは高スコア
  if (d.status === "confirmed") score += 0.1;
  // 理由がある場合は信頼性が高い
  if (d.reasoning) score += 0.05;
  // 原文がある場合
  if (d.sourceText && d.sourceText.length > 10) score += 0.05;

  return Math.min(1, score);
}

/**
 * 一意なID生成
 */
function generateDecisionId(fileName: string, content: string, index: number): string {
  const hash = createHash("sha1");
  hash.update(fileName);
  hash.update(content);
  hash.update(index.toString());
  return `decision-llm-${hash.digest("hex").slice(0, 12)}`;
}

/**
 * LLM抽出が利用可能かどうかを確認
 */
export function isLLMExtractionAvailable(): boolean {
  return !!env.anthropicApiKey;
}
