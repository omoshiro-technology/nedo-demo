import { createHash } from "node:crypto";
import type { DecisionItem, DecisionPatternType } from "../../domain/types";
import { calculateConfidence } from "./calculateConfidence";
import { generateGuidance } from "./generateGuidance";
import { estimateRisks } from "./estimateRisks";
import {
  findSimilarFromHistory,
  addToHistory,
} from "./findSimilarDecisions";
import { calculateImportance } from "./calculateImportance";
import { detectPhaseDelay } from "./detectPhaseDelay";
import { extractChangeDetail } from "./extractChangeDetail";
import { calculatePriorityScore } from "./calculatePriorityScore";

/** 意思決定パターン定義
 * 注意: 「した」と「しました」は別々に指定する必要がある
 * 「した」は「しました」にマッチしないため
 */
const DECISION_PATTERNS: Array<{
  pattern: RegExp;
  type: DecisionPatternType;
}> = [
  // ========== 決定パターン ==========
  {
    pattern: /(.{5,80})(とする|ということにする|と決定(する|した|しました|))。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(のように決定)。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(こととする|こととした|こととしました)。?/g,
    type: "decision",
  },
  // 「〜となった」「〜となりました」
  {
    pattern: /(.{5,80})(となった|となりました)。?/g,
    type: "decision",
  },
  // 「〜に決まった」「〜が決まった」
  {
    pattern: /(.{5,80})(に決まった|が決まった|に決まりました|が決まりました)。?/g,
    type: "decision",
  },

  // ========== 合意パターン ==========
  {
    pattern: /(.{5,80})(で合意(した|しました|する|)|に合意(した|しました|する|))。?/g,
    type: "agreement",
  },
  {
    pattern: /(.{5,80})(で一致(した|しました|する|))。?/g,
    type: "agreement",
  },
  {
    pattern: /(.{5,80})(で了承(した|しました|する|された|されました|))。?/g,
    type: "agreement",
  },
  // 「〜で承認」
  {
    pattern: /(.{5,80})(で承認(した|しました|する|された|されました))。?/g,
    type: "agreement",
  },

  // ========== 確認パターン（議事録でよく使われる表現） ==========
  {
    pattern: /(.{5,80})(が確認(され|でき)ました)。?/g,
    type: "agreement",
  },
  {
    pattern: /(.{5,80})(ことが確認(され|でき)ました)。?/g,
    type: "agreement",
  },
  {
    pattern: /(.{5,80})(について(確認|共有)(され|し)ました)。?/g,
    type: "agreement",
  },
  // 「〜を確認した」
  {
    pattern: /(.{5,80})(を確認(した|しました))。?/g,
    type: "agreement",
  },

  // ========== 変更パターン ==========
  {
    pattern: /(.{5,80})(に変更(する|した|しました|します|))。?/g,
    type: "change",
  },
  {
    pattern: /(.{5,80})(から.{3,30}へ変更)。?/g,
    type: "change",
  },
  {
    pattern: /(.{5,80})(を見直(す|し|した|しました))。?/g,
    type: "change",
  },
  {
    pattern: /(.{5,80})(を修正(する|した|しました|します|))。?/g,
    type: "change",
  },
  // 「〜を更新」
  {
    pattern: /(.{5,80})(を更新(する|した|しました|します))。?/g,
    type: "change",
  },

  // ========== 採用パターン ==========
  {
    pattern: /(.{5,80})(を採用(する|した|しました|します|))。?/g,
    type: "adoption",
  },
  {
    pattern: /(.{5,80})(を導入(する|した|しました|します|))。?/g,
    type: "adoption",
  },
  {
    pattern: /(.{5,80})(を適用(する|した|しました|します|))。?/g,
    type: "adoption",
  },
  // 「〜を選定」「〜を選択」
  {
    pattern: /(.{5,80})(を選定(する|した|しました|します))。?/g,
    type: "adoption",
  },
  {
    pattern: /(.{5,80})(を選択(する|した|しました|します))。?/g,
    type: "adoption",
  },
  // 「〜を使用」
  {
    pattern: /(.{5,80})(を使用(する|した|しました|します))。?/g,
    type: "adoption",
  },

  // ========== 実施・実行パターン（アクションアイテム） ==========
  {
    pattern: /(.{5,80})(を実施(する|した|しました|します))。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(を実行(する|した|しました|します))。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(を準備(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜を行う」「〜を進める」
  {
    pattern: /(.{5,80})(を行(う|った|いました|います))。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(を進め(る|た|ました|ます))。?/g,
    type: "decision",
  },
  // 「〜を対応」
  {
    pattern: /(.{5,80})(を対応(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜を開始」
  {
    pattern: /(.{5,80})(を開始(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜を完了」
  {
    pattern: /(.{5,80})(を完了(する|した|しました|します|させる|させました))。?/g,
    type: "decision",
  },

  // ========== 方針・方向性パターン ==========
  {
    pattern: /(.{5,80})(という方針)。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(の方向性で進める)。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(ことが(重要|必要)である(こと)?が確認)。?/g,
    type: "agreement",
  },
  // 「〜の方向で」
  {
    pattern: /(.{5,80})(の方向で(進める|検討|対応))。?/g,
    type: "decision",
  },

  // ========== 検証・評価パターン ==========
  {
    pattern: /(.{5,80})(を検証(する|した|しました|します))。?/g,
    type: "decision",
  },
  {
    pattern: /(.{5,80})(で評価を実施(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜を検討」
  {
    pattern: /(.{5,80})(を検討(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜を調査」
  {
    pattern: /(.{5,80})(を調査(する|した|しました|します))。?/g,
    type: "decision",
  },

  // ========== 報告・共有パターン ==========
  // 「〜が報告された」
  {
    pattern: /(.{5,80})(が報告(され|でき)ました)。?/g,
    type: "agreement",
  },
  // 「〜を報告」
  {
    pattern: /(.{5,80})(を報告(した|しました))。?/g,
    type: "agreement",
  },
  // 「〜が共有された」
  {
    pattern: /(.{5,80})(が共有(され|でき)ました)。?/g,
    type: "agreement",
  },

  // ========== 依頼・要請パターン ==========
  // 「〜を依頼」
  {
    pattern: /(.{5,80})(を依頼(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜を要請」
  {
    pattern: /(.{5,80})(を要請(する|した|しました|します))。?/g,
    type: "decision",
  },
  // 「〜をお願い」
  {
    pattern: /(.{5,80})(をお願い(する|した|しました|します))。?/g,
    type: "decision",
  },

  // ========== 延期・保留パターン ==========
  // 「〜を延期」
  {
    pattern: /(.{5,80})(を延期(する|した|しました|します))。?/g,
    type: "cancellation",
  },
  // 「〜を保留」
  {
    pattern: /(.{5,80})(を保留(する|した|しました|します|とする))。?/g,
    type: "cancellation",
  },
  // 「〜は次回に持ち越し」
  {
    pattern: /(.{5,80})(は次回(に|へ)?(持ち越し|持越し|送り))。?/g,
    type: "cancellation",
  },

  // ========== 中止・取りやめパターン ==========
  {
    pattern: /(.{5,80})(を中止|を取りやめ|は中止|は取りやめ)。?/g,
    type: "cancellation",
  },
  {
    pattern: /(.{5,80})(を見送(る|り|った|りました))。?/g,
    type: "cancellation",
  },
  // 「〜を取り消し」
  {
    pattern: /(.{5,80})(を取り消(す|し|した|しました))。?/g,
    type: "cancellation",
  },
];

/** ノイズパターン（除外対象） */
const NOISE_PATTERNS = [
  /^(それ|これ|あれ|どれ)/,
  /^(また|なお|ただし|ちなみに)/,
  /^(上記|下記|前記|後記|左記|右記)/,
  /^(以上|以下)/,
  /議事録|会議録|報告書|資料/,
  /^[\s\d\-\.]+$/, // 数字や記号のみ

  // 章立て・箇条書き番号（誤検出防止）
  /^\d+\.\s*.{0,20}$/, // "1. はじめに" "2. チェックリスト"
  /^[①-⑳]/, // 丸数字
  /^[（(][0-9０-９]+[)）]/, // "(1)" "（1）"
  /^第[一二三四五六七八九十百]+[章節項条]/, // "第一章" "第1節"
  /^[■●◆▼▶★☆◎○]/, // 記号で始まる見出し
];

/**
 * テキストから意思決定事項を抽出
 */
export function extractDecisionsFromText(
  text: string,
  fileName: string,
  documentDate: string
): DecisionItem[] {
  const decisions: DecisionItem[] = [];
  const seenContents = new Set<string>();

  for (const { pattern, type } of DECISION_PATTERNS) {
    const regex = new RegExp(pattern.source, pattern.flags);
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      const fullMatch = match[0];
      const content = match[1]?.trim() || fullMatch;

      // 重複チェック（同じ内容は1度だけ）
      const normalized = normalizeContent(content);
      if (seenContents.has(normalized)) continue;
      seenContents.add(normalized);

      // ノイズ除去
      if (!isValidDecision(content)) continue;

      const cleanedContent = cleanContent(content);
      const sourceText = extractContext(text, match.index, 100);

      // 確信度を計算
      const confidenceResult = calculateConfidence(
        type,
        cleanedContent,
        sourceText,
        fileName
      );

      // 重要度を計算
      const importance = calculateImportance(
        cleanedContent,
        sourceText,
        type,
        fileName
      );

      // フェーズ遅延を検出
      const phaseInfo = detectPhaseDelay(
        cleanedContent,
        sourceText,
        fileName,
        type
      );

      // 変更詳細を抽出（changeパターンの場合のみ）
      const changeDetail = extractChangeDetail(cleanedContent, sourceText, type);

      const decisionItem: DecisionItem = {
        id: generateDecisionId(fileName, content),
        content: cleanedContent,
        patternType: type,
        sourceText,
        sourceFileName: fileName,
        decisionDate: documentDate,
        confidence: confidenceResult.confidence,
        status: confidenceResult.status,
        qualityScore: confidenceResult.qualityScore,
        ambiguityFlags:
          confidenceResult.ambiguityFlags.length > 0
            ? confidenceResult.ambiguityFlags
            : undefined,
        // Phase 4.6: 重要度・フェーズ・変更詳細
        importance,
        phaseInfo,
        changeDetail,
      };

      // グレー/提案段階の決定には判断支援情報を付与
      if (confidenceResult.status !== "confirmed") {
        // ガイダンス生成
        decisionItem.guidance = generateGuidance(
          type,
          confidenceResult.status,
          confidenceResult.ambiguityFlags
        );

        // リスク推定
        decisionItem.risks = estimateRisks(
          type,
          confidenceResult.status,
          cleanedContent,
          sourceText
        );

        // 類似事例検索
        const similarDecisions = findSimilarFromHistory(cleanedContent, type, 3);
        if (similarDecisions.length > 0) {
          decisionItem.similarDecisions = similarDecisions;
        }
      }

      // 優先度スコアを計算（すべての情報が揃った後で計算）
      decisionItem.priorityScore = calculatePriorityScore(decisionItem);

      decisions.push(decisionItem);
    }
  }

  // 抽出した決定事項を履歴に追加（将来の類似検索用）
  addToHistory(decisions);

  return decisions;
}

/** コンテンツの正規化（重複チェック用）
 * 日本語の表記揺れを吸収して意味的に同一の決定を検出する
 * 例: 「データ収集すること」と「データ収集する」を同一視
 */
function normalizeContent(content: string): string {
  return content
    .replace(/\s+/g, "")             // 空白除去
    .replace(/[、。]/g, "")          // 句読点除去
    .replace(/こととする$/g, "")     // 名詞化＋決定表現
    .replace(/ものとする$/g, "")
    .replace(/こととした$/g, "")
    .replace(/ものとした$/g, "")
    .replace(/こと$/g, "")           // 名詞化接尾辞
    .replace(/もの$/g, "")
    .replace(/よう$/g, "")
    .replace(/ため$/g, "")
    .toLowerCase();
}

/** 有効な決定事項かどうかの検証 */
function isValidDecision(content: string): boolean {
  // 短すぎる
  if (content.length < 8) return false;

  // 長すぎる（おそらく段落全体をキャプチャしてしまった）
  if (content.length > 100) return false;

  // ノイズパターンに該当
  for (const noise of NOISE_PATTERNS) {
    if (noise.test(content)) return false;
  }

  return true;
}

/** コンテンツのクリーニング */
function cleanContent(content: string): string {
  return content
    .replace(/^[\s、。・]+/, "") // 先頭の句読点等を除去
    .replace(/[\s、。・]+$/, "") // 末尾の句読点等を除去
    .replace(/\s+/g, " ") // 連続空白を単一スペースに
    .trim();
}

/** 前後のコンテキストを抽出 */
function extractContext(
  text: string,
  index: number,
  contextLength: number
): string {
  const start = Math.max(0, index - contextLength);
  const end = Math.min(text.length, index + contextLength * 2);
  return text.slice(start, end).replace(/\s+/g, " ").trim();
}

/** 一意なID生成 */
function generateDecisionId(fileName: string, content: string): string {
  const hash = createHash("sha1");
  hash.update(fileName);
  hash.update(content);
  return `decision-${hash.digest("hex").slice(0, 12)}`;
}

/** パターン種別の日本語ラベル */
export function getPatternTypeLabel(type: DecisionPatternType): string {
  switch (type) {
    case "agreement":
      return "合意";
    case "decision":
      return "決定";
    case "change":
      return "変更";
    case "adoption":
      return "採用";
    case "cancellation":
      return "中止";
    case "other":
      return "その他";
    default:
      return "不明";
  }
}
