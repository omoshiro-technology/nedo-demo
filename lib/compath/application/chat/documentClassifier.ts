/**
 * ドキュメントジャンル判定サービス
 *
 * ファイル内容からドキュメントのジャンルを分類し、
 * 適切なエージェントを提案する
 */

import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

// =============================================================================
// 型定義
// =============================================================================

/** ドキュメントジャンル */
export type DocumentGenre =
  | "meeting_minutes" // 議事録
  | "technical_paper" // 論文・技術文書
  | "instruction_manual" // 指示書・マニュアル
  | "report" // 報告書
  | "specification" // 仕様書
  | "unknown"; // 不明

/** エージェントタイプ */
export type AgentType = "knowledge_extraction" | "unified_analysis";

/** 分類結果 */
export type ClassificationResult = {
  genre: DocumentGenre;
  confidence: number;
  indicators: string[];
  suggestedAgent: AgentType;
};

// =============================================================================
// ジャンル→エージェントマッピング
// =============================================================================

const GENRE_TO_AGENT: Record<DocumentGenre, AgentType> = {
  meeting_minutes: "unified_analysis", // 意思決定タイムライン抽出
  technical_paper: "knowledge_extraction", // 知識グラフ構築
  instruction_manual: "knowledge_extraction", // 構造化情報抽出
  report: "unified_analysis", // 要点・決定事項抽出
  specification: "knowledge_extraction", // 要件・仕様の構造化
  unknown: "knowledge_extraction", // デフォルト
};

// =============================================================================
// フォールバック用キーワードルール
// =============================================================================

type KeywordRule = {
  genre: DocumentGenre;
  keywords: string[];
  weight: number;
};

const KEYWORD_RULES: KeywordRule[] = [
  {
    genre: "meeting_minutes",
    keywords: [
      "議事録",
      "議事",
      "会議",
      "ミーティング",
      "meeting",
      "minutes",
      "出席者",
      "参加者",
      "決定事項",
      "アクションアイテム",
      "次回予定",
    ],
    weight: 1.0,
  },
  {
    genre: "specification",
    keywords: [
      "仕様書",
      "仕様",
      "spec",
      "specification",
      "要件",
      "requirement",
      "機能要件",
      "非機能要件",
      "インターフェース",
      "API",
    ],
    weight: 1.0,
  },
  {
    genre: "technical_paper",
    keywords: [
      "論文",
      "paper",
      "研究",
      "考察",
      "結論",
      "参考文献",
      "abstract",
      "introduction",
      "methodology",
      "結果",
      "実験",
    ],
    weight: 1.0,
  },
  {
    genre: "instruction_manual",
    keywords: [
      "マニュアル",
      "手順書",
      "操作手順",
      "手順",
      "manual",
      "instruction",
      "guide",
      "ガイド",
      "注意事項",
      "使い方",
    ],
    weight: 1.0,
  },
  {
    genre: "report",
    keywords: [
      "報告書",
      "報告",
      "レポート",
      "report",
      "調査結果",
      "分析結果",
      "進捗",
      "実績",
      "評価",
    ],
    weight: 0.8,
  },
];

// =============================================================================
// LLMプロンプト
// =============================================================================

const CLASSIFICATION_SYSTEM_PROMPT = `あなたはドキュメント分類の専門家です。
与えられたドキュメントの内容を分析し、以下のジャンルに分類してください。

## 分類カテゴリ
- meeting_minutes: 議事録（会議の記録、決定事項、アクションアイテムを含む）
- technical_paper: 論文・技術文書（研究、分析、考察を含む学術的・技術的な文書）
- instruction_manual: 指示書・マニュアル（操作手順、作業手順、ガイドライン）
- report: 報告書（進捗報告、調査報告、分析報告など）
- specification: 仕様書（要件定義、機能仕様、システム仕様など）
- unknown: 上記に該当しない場合

## 判定基準
1. ドキュメントの構造（見出し、セクション構成）
2. 使用されている用語やフレーズ
3. 文書の目的・意図
4. ファイル名からの推測

## 出力形式
必ず以下のJSON形式で回答してください（他の文章は不要）:
{
  "genre": "ジャンル名",
  "confidence": 0.0〜1.0の確信度,
  "indicators": ["判定根拠1", "判定根拠2", ...]
}`;

function buildUserPrompt(
  filePreview: string,
  fileName: string,
  userMessage: string
): string {
  return `## ファイル名
${fileName}

## ユーザーの意図
${userMessage || "(特に指定なし)"}

## ドキュメント内容（先頭部分）
${filePreview}`;
}

// =============================================================================
// キーワードベースのフォールバック分類
// =============================================================================

function classifyByKeywords(
  text: string,
  fileName: string
): ClassificationResult {
  const normalizedText = (text + " " + fileName).toLowerCase();

  const scores: Array<{ genre: DocumentGenre; score: number; matches: string[] }> = [];

  for (const rule of KEYWORD_RULES) {
    const matches: string[] = [];
    let score = 0;

    for (const keyword of rule.keywords) {
      const lowerKeyword = keyword.toLowerCase();
      if (normalizedText.includes(lowerKeyword)) {
        matches.push(keyword);
        score += rule.weight;
      }
    }

    if (score > 0) {
      scores.push({ genre: rule.genre, score, matches });
    }
  }

  // スコアでソート
  scores.sort((a, b) => b.score - a.score);

  if (scores.length === 0 || scores[0].score === 0) {
    return {
      genre: "unknown",
      confidence: 0.3,
      indicators: ["キーワードマッチなし（フォールバック判定）"],
      suggestedAgent: GENRE_TO_AGENT.unknown,
    };
  }

  const best = scores[0];
  // 確信度はマッチ数に基づいて計算（最大0.8）
  const confidence = Math.min(0.8, 0.4 + best.matches.length * 0.1);

  return {
    genre: best.genre,
    confidence,
    indicators: [
      `キーワードマッチ: ${best.matches.join(", ")}`,
      "（フォールバック判定）",
    ],
    suggestedAgent: GENRE_TO_AGENT[best.genre],
  };
}

// =============================================================================
// LLMレスポンスのパース
// =============================================================================

type LLMClassificationResponse = {
  genre: string;
  confidence: number;
  indicators: string[];
};

function parseLLMResponse(response: string): LLMClassificationResponse | null {
  try {
    const parsed = parseJsonFromLLMResponse<Record<string, unknown>>(response);

    // 必須フィールドの検証
    if (!parsed.genre || typeof parsed.confidence !== "number" || !Array.isArray(parsed.indicators)) {
      console.warn("[DocumentClassifier] LLM response missing required fields");
      return null;
    }

    return parsed as LLMClassificationResponse;
  } catch (error) {
    console.warn("[DocumentClassifier] Failed to parse LLM response:", error);
    return null;
  }
}

function isValidGenre(genre: string): genre is DocumentGenre {
  return [
    "meeting_minutes",
    "technical_paper",
    "instruction_manual",
    "report",
    "specification",
    "unknown",
  ].includes(genre);
}

// =============================================================================
// メイン関数
// =============================================================================

/**
 * ドキュメントを分類
 *
 * @param filePreview ファイルの先頭テキスト（2000文字程度推奨）
 * @param fileName ファイル名
 * @param userMessage ユーザーのメッセージ（意図を理解するため）
 * @returns 分類結果
 */
export async function classifyDocument(
  filePreview: string,
  fileName: string,
  userMessage: string
): Promise<ClassificationResult> {
  // APIキーがない場合はフォールバック
  if (!env.openaiApiKey) {
    console.log("[DocumentClassifier] No API key, using keyword-based fallback");
    return classifyByKeywords(filePreview, fileName);
  }

  try {
    // プレビューテキストを2000文字に制限
    const truncatedPreview = filePreview.slice(0, 2000);

    const response = await generateChatCompletion({
      systemPrompt: CLASSIFICATION_SYSTEM_PROMPT,
      userContent: buildUserPrompt(truncatedPreview, fileName, userMessage),
      model: env.openaiModelFast, // 高速レスポンス用モデルを使用
      temperature: 0.1, // 一貫性のために低めの温度
      maxTokens: 256,
    });

    const parsed = parseLLMResponse(response);

    if (!parsed) {
      console.log("[DocumentClassifier] Failed to parse LLM response, using fallback");
      return classifyByKeywords(filePreview, fileName);
    }

    // ジャンルの検証
    const genre: DocumentGenre = isValidGenre(parsed.genre) ? parsed.genre : "unknown";

    return {
      genre,
      confidence: Math.max(0, Math.min(1, parsed.confidence)),
      indicators: parsed.indicators,
      suggestedAgent: GENRE_TO_AGENT[genre],
    };
  } catch (error) {
    console.error("[DocumentClassifier] LLM classification failed:", error);
    // エラー時はフォールバック
    return classifyByKeywords(filePreview, fileName);
  }
}

/**
 * ジャンルからエージェントタイプを取得（外部から利用可能）
 */
export function getAgentForGenre(genre: DocumentGenre): AgentType {
  return GENRE_TO_AGENT[genre];
}

/**
 * キーワードベースのみで分類（テスト用・明示的にフォールバックを使用したい場合）
 */
export function classifyDocumentByKeywords(
  filePreview: string,
  fileName: string
): ClassificationResult {
  return classifyByKeywords(filePreview, fileName);
}
