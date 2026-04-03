import type { AnalysisResult, DocumentInput, GraphResult, GraphNode } from "../domain/types";
import { classifyDocumentType } from "./analysis/classifyDocumentType";
import { proposeAxes } from "./analysis/proposeAxes";
import { summarizeText } from "./analysis/summarizeText";
import { buildGraph } from "./graph/buildGraph";
import { parseDocument } from "../infrastructure/parsers/documentParser";

export async function analyzeDocument(input: DocumentInput): Promise<AnalysisResult> {
  const { parsed, warnings: parseWarnings } = await parseDocument(input);
  const text = parsed.fullText;
  const summaryResult = await summarizeText(text);
  const documentType = classifyDocumentType(text);
  const axes = await proposeAxes(text, documentType);

  let graphs: GraphResult[] = [];
  let graphWarnings: string[] = [];

  if (axes.length === 1 && axes[0]?.id === "free-mode") {
    graphs = [buildFreeModeGraph(parsed.fullText)];
  } else {
    const graphResults = await Promise.all(
      axes.map((axis) => buildGraph(axis, parsed.pages, text))
    );
    graphs = graphResults.map((result) => result.graph);
    graphWarnings = graphResults.flatMap((g) => g.warnings);
  }

  const warnings = Array.from(
    new Set([
      ...parseWarnings,
      ...summaryResult.warnings,
      ...graphWarnings,
      ...(axes.length === 1 && axes[0]?.id === "free-mode"
        ? ["既存の構造化軸に適合しないため、フリーモードで名詞・動詞を列挙しました。"]
        : [])
    ])
  );

  if (axes.length === 0 && !warnings.includes("適切な構造化軸を判定できませんでした。")) {
    warnings.push("適切な構造化軸を判定できませんでした。");
  }

  if (!text && !warnings.includes("テキストを抽出できませんでした。")) {
    warnings.push("テキストを抽出できませんでした。");
  }

  return {
    summary: summaryResult.summary,
    documentType,
    axes,
    graphs,
    meta: {
      fileName: input.fileName,
      mimeType: input.mimeType,
      pageCount: parsed.pages.length,
      textLength: text.length
    },
    warnings,
    fullText: text // 原文テキストを含める
  };
}

function buildFreeModeGraph(text: string): GraphResult {
  const levels = [
    { id: "noun", label: "名詞" },
    { id: "verb", label: "動詞" }
  ];

  const { nouns, verbs } = extractNounsAndVerbs(text);

  const nodes: GraphNode[] = [
    ...nouns.map((label, idx) => ({
      id: `noun-${idx}`,
      label,
      levelId: "noun",
      levelLabel: "名詞",
      status: "missing" as const
    })),
    ...verbs.map((label, idx) => ({
      id: `verb-${idx}`,
      label,
      levelId: "verb",
      levelLabel: "動詞",
      status: "missing" as const
    }))
  ];

  return {
    axisId: "free-mode",
    axisLabel: "フリーモード",
    levels,
    nodes,
    edges: []
  };
}

function extractNounsAndVerbs(text: string): { nouns: string[]; verbs: string[] } {
  const nouns: string[] = [];
  const verbs: string[] = [];
  const seen = new Set<string>();

  const tokens = segmentJapanese(text);

  for (const token of tokens) {
    if (!token || token.length < 2) continue;
    if (!/[一-龠ぁ-んァ-ンA-Za-z]/.test(token)) continue;
    const normalized = token.trim();
    if (seen.has(normalized)) continue;

    if (looksLikeVerb(normalized)) {
      verbs.push(normalized);
    } else {
      nouns.push(normalized);
    }
    seen.add(normalized);
  }

  return { nouns, verbs };
}

function segmentJapanese(text: string): string[] {
  try {
    const segmenter = new Intl.Segmenter("ja", { granularity: "word" });
    return Array.from(segmenter.segment(text), (s) => s.segment.trim()).filter(Boolean);
  } catch (_err) {
    // Fallback: split by punctuation/whitespace
    return text
      .split(/[\s\n\r\t、。．，・；：\(\)\[\]{}「」『』【】<>＜＞\/\\]+/)
      .map((t) => t.trim())
      .filter(Boolean);
  }
}

function looksLikeVerb(token: string): boolean {
  // 簡易判定: する/した/して/され/させ/できる/なる/〜ます などの終端、および一般的な動詞語尾を含める
  return /(する|した|して|され|させ|できる|出来る|なる|なった|なり|ている|ていた|します|しました|される|しない|行う|実施|対応|改善|導入|検証|調整|見直)/.test(
    token
  );
}
