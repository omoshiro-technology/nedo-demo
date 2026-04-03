import { env } from "../../config/env";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";

const SENTENCE_SPLIT = /(?<=[。！？\n])/u;

const ISSUE_KEYWORDS = ["課題", "問題", "リスク", "遅れ", "障害", "懸念", "不足", "欠落"];
const CAUSE_KEYWORDS = ["原因", "要因", "背景", "影響"];
const ACTION_KEYWORDS = ["対応", "対策", "実施", "決定", "改善", "処置", "提案", "予定", "合意"];

export type SummarizeResult = {
  summary: string;
  warnings: string[];
};

export async function summarizeText(text: string): Promise<SummarizeResult> {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) {
    return {
      summary: "テキストを抽出できなかったため、要約を生成できませんでした。",
      warnings: []
    };
  }

  if (env.openaiApiKey) {
    const llmResult = await summarizeWithLLM(cleaned);
    if (llmResult.summary) {
      return llmResult;
    }
    return {
      summary: summarizeFallback(cleaned),
      warnings: ["LLM要約に失敗したためローカル要約にフォールバックしました。"]
    };
  }

  return {
    summary: summarizeFallback(cleaned),
    warnings: ["OPENAI_API_KEY が設定されていないためローカル要約にフォールバックしました。"]
  };
}

function pickOverview(sentences: string[]): string {
  const candidate =
    sentences.find((s) => s.length >= 20 && !startsWithNoise(s)) ||
    sentences.slice(0, 2).join("。");

  return candidate;
}

function pickByKeywords(sentences: string[], keywords: string[], limit = 3): string {
  const scored = sentences
    .map((sentence) => ({
      sentence,
      score: scoreSentence(sentence, keywords)
    }))
    .filter((item) => item.score > 0)
    .sort((a, b) => b.score - a.score || a.sentence.length - b.sentence.length);

  return scored.slice(0, limit).map((item) => item.sentence).join("。");
}

function scoreSentence(sentence: string, keywords: string[]): number {
  const lowered = sentence;
  const matches = keywords.reduce((total, keyword) => {
    const count = lowered.split(keyword).length - 1;
    return total + count;
  }, 0);

  // Slightly favor longer informative sentences
  return matches * 2 + Math.min(3, Math.floor(sentence.length / 30));
}

function startsWithNoise(sentence: string): boolean {
  return /^(背景|目的|概要|件名|サマリ)/.test(sentence);
}

async function summarizeWithLLM(text: string): Promise<SummarizeResult> {
  try {
    const prompt = [
      "以下の日本語ドキュメントを読み、3つの観点で箇条書きのMarkdown要約を返してください。",
      "1) 概要: 主要なテーマや出来事を1〜2行で。",
      "2) 問題・課題: 具体的な課題、リスク、遅れ、障害などを列挙。",
      "3) 対応・決定: 取られた対応・決定・提案・予定などを列挙。",
      "出力は必ず以下の形式で、不要な前置き・後置きは入れないでください。",
      "- 概要: ...",
      "- 問題・課題: ...",
      "- 対応・決定: ...",
      "",
      "本文:",
      text.slice(0, 6000) // limit prompt size
    ].join("\n");

    const summary = await generateChatCompletion({
      systemPrompt:
        "あなたは日本語のドキュメント要約者です。簡潔で具体的に、箇条書きで返してください。不要な説明は書かないでください。",
      userContent: prompt,
      model: env.openaiModelSummary,
      temperature: 0,
      maxTokens: 512
    });

    return { summary, warnings: [] };
  } catch (error) {
    const message = error instanceof Error ? error.message : "LLM要約に失敗しました。";
    return {
      summary: summarizeFallback(text),
      warnings: [`LLM要約に失敗しローカル要約にフォールバックしました: ${message}`]
    };
  }
}

function summarizeFallback(text: string): string {
  const sentences = text
    .split(SENTENCE_SPLIT)
    .map((sentence) => sentence.trim().replace(/[。！？]$/u, ""))
    .filter((sentence) => sentence.length > 6);

  if (sentences.length === 0) {
    return text.slice(0, 140);
  }

  const overview = pickOverview(sentences);
  const issues = pickByKeywords(sentences, [...ISSUE_KEYWORDS, ...CAUSE_KEYWORDS], 3);
  const actions = pickByKeywords(sentences, ACTION_KEYWORDS, 3);

  return [
    `- 概要: ${overview}`,
    `- 問題・課題: ${issues || "明示的な課題の記述なし"}`,
    `- 対応・決定: ${actions || "対応・決定の記述なし"}`
  ].join("\n");
}
