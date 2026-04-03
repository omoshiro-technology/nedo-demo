import type {
  DecisionDocumentInput,
  DecisionTimelineResult,
  DecisionItem,
} from "../../domain/types";
import { parseDocument } from "../../infrastructure/parsers/documentParser";
import { extractDecisionsFromText } from "./extractDecisions";
import {
  extractDecisionsWithLLM,
  isLLMExtractionAvailable,
} from "./llmExtractDecisions";

/**
 * 複数文書から意思決定タイムラインを構築
 *
 * 抽出方式:
 * 1. LLM抽出（OpenAI APIキーがある場合）: 高精度、多様な表現に対応
 * 2. 正規表現抽出（フォールバック）: APIキーがない場合や、LLM抽出が失敗した場合
 */
export async function buildDecisionTimeline(
  documents: DecisionDocumentInput[]
): Promise<DecisionTimelineResult> {
  const allDecisions: DecisionItem[] = [];
  const processedDocuments: DecisionTimelineResult["processedDocuments"] = [];
  const warnings: string[] = [];
  const extractedTexts: Array<{ fileName: string; text: string }> = [];

  const useLLM = isLLMExtractionAvailable();
  if (!useLLM) {
    warnings.push("LLM抽出が無効です（APIキー未設定）。正規表現による抽出を使用します。");
  }

  for (const doc of documents) {
    try {
      // 文書解析
      const { parsed, warnings: parseWarnings } = await parseDocument({
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        data: doc.data,
      });
      warnings.push(...parseWarnings);

      // 抽出テキストを保存（最大10000文字、会話コンテキスト用）
      extractedTexts.push({
        fileName: doc.fileName,
        text: parsed.fullText.slice(0, 10000),
      });

      // 日付決定（優先順位: 更新日 > 作成日 > 現在日時）
      const documentDate =
        doc.modifiedAt || doc.createdAt || new Date().toISOString();

      // 意思決定抽出（LLM優先、フォールバックとして正規表現）
      let decisions: DecisionItem[] = [];

      if (useLLM) {
        // LLM抽出を試行
        decisions = await extractDecisionsWithLLM(
          parsed.fullText,
          doc.fileName,
          documentDate
        );

        // LLM抽出が失敗した場合は正規表現にフォールバック
        if (decisions.length === 0) {
          decisions = extractDecisionsFromText(
            parsed.fullText,
            doc.fileName,
            documentDate
          );
          if (decisions.length > 0) {
            warnings.push(`${doc.fileName}: LLM抽出結果なし。正規表現抽出を使用。`);
          }
        }
      } else {
        // APIキーがない場合は正規表現のみ
        decisions = extractDecisionsFromText(
          parsed.fullText,
          doc.fileName,
          documentDate
        );
      }

      allDecisions.push(...decisions);
      processedDocuments.push({
        fileName: doc.fileName,
        documentDate,
        decisionCount: decisions.length,
      });

      if (decisions.length === 0) {
        warnings.push(
          `${doc.fileName}: 意思決定パターンが見つかりませんでした。`
        );
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "解析エラー";
      warnings.push(`${doc.fileName}: ${message}`);
    }
  }

  // 日付でソート（古い順）
  allDecisions.sort(
    (a, b) =>
      new Date(a.decisionDate).getTime() - new Date(b.decisionDate).getTime()
  );

  // 時系列範囲計算
  // Note: グローバルフィードフォワードは別APIでオンデマンド生成（初期表示を高速化）
  const dates = allDecisions.map((d) => d.decisionDate).filter(Boolean);
  const timeRange = {
    earliest: dates[0] || new Date().toISOString(),
    latest: dates[dates.length - 1] || new Date().toISOString(),
  };

  return {
    decisions: allDecisions,
    processedDocuments,
    timeRange,
    warnings,
    extractedTexts,
  };
}
