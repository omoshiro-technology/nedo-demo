import { AXIS_DEFINITIONS } from "../../domain/axes";
import type { AxisDefinition, AxisLevel, AxisProposal, DocumentTypeLabel } from "../../domain/types";
import { env } from "../../config/env";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";

const MIN_LLM_AXIS_SCORE = 0.35;
const MIN_ACCEPTED_SCORE = 0.35;

export async function proposeAxes(
  text: string,
  documentType: DocumentTypeLabel
): Promise<AxisProposal[]> {
  const cleaned = text.replace(/\s+/g, " ").trim();

  // APIキーがない場合はフリーモードにフォールバック
  if (!env.anthropicApiKey) {
    console.warn("[proposeAxes] ANTHROPIC_API_KEY未設定のためフリーモードで動作します");
    return [makeFreeModeProposal()];
  }

  // 優先: 既存軸のLLMスコアリング
  const llmResult = await proposeAxesWithLLM(cleaned, documentType);
  if (llmResult.length > 0 && llmResult[0].score >= MIN_ACCEPTED_SCORE) {
    return llmResult;
  }

  // 既存軸が適合しない場合に動的軸を提案
  const dynamic = await proposeDynamicAxis(cleaned, documentType);
  if (dynamic.length > 0 && dynamic[0].score >= MIN_ACCEPTED_SCORE) {
    return dynamic;
  }

  // 全く適合しない場合はフリーモード軸を返す
  return [makeFreeModeProposal()];
}

async function proposeAxesWithLLM(
  text: string,
  documentType: DocumentTypeLabel
): Promise<AxisProposal[]> {
  if (!text) return [];

  try {
    const axesDescription = AXIS_DEFINITIONS.map((axis) => {
      const levels = axis.levels.map((l) => l.label).join(" / ");
      return `- id:${axis.id}, label:${axis.label}, levels:${levels}`;
    }).join("\n");

    const userContent = [
      "以下の日本語ドキュメントに対して、どの分析軸が最も適切かを評価してください。",
      `文書タイプ: ${documentType}`,
      "候補軸:",
      axesDescription,
      "",
      "出力フォーマット(JSON配列):",
      `[{"id":"軸ID","label":"軸ラベル","score":0から1の数値","rationale":"短い根拠"}]`,
      "scoreは0〜1の範囲で、適合度が高いほど1に近づけてください。",
      "上位の軸から並べ替えてください。不要な説明文は返さないでください。",
      "",
      "本文(先頭6000文字まで):",
      text.slice(0, 6000)
    ].join("\n");

    const completion = await generateChatCompletion({
      systemPrompt:
        "あなたは文書の内容に最適な分析軸を選定するアシスタントです。与えられた候補軸の中から適合度を0〜1でスコアリングし、JSONのみで返してください。",
      userContent,
      model: env.anthropicModelDefault,
      temperature: 0,
      maxTokens: 256
    });

    const parsed = parseJsonArray(completion);
    const proposals = parsed
      .map((item) => normalizeProposal(item, AXIS_DEFINITIONS))
      .filter((p): p is AxisProposal => Boolean(p))
      .filter((p) => p.score >= MIN_LLM_AXIS_SCORE);

    return proposals.sort((a, b) => b.score - a.score);
  } catch (_error) {
    return [];
  }
}

/** LLMから返されるスコアリング結果の1アイテム */
type LLMAxisScoreItem = {
  id?: string;
  label?: string;
  score?: number;
  rationale?: string;
  levels?: Array<{ id?: string; label?: string; guide?: string }>;
};

function parseJsonArray(text: string): LLMAxisScoreItem[] {
  const match = text.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    return JSON.parse(match[0]) as LLMAxisScoreItem[];
  } catch {
    return [];
  }
}

function normalizeProposal(item: LLMAxisScoreItem, axes: AxisDefinition[]): AxisProposal | null {
  if (!item || typeof item.id !== "string") return null;
  const axis = axes.find((a) => a.id === item.id);
  if (!axis) return null;

  const rawScore = typeof item.score === "number" ? item.score : 0;
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(1, rawScore)) : 0;
  const rationale = typeof item.rationale === "string" ? item.rationale : "LLM選定";

  return {
    ...axis,
    score,
    rationale
  };
}

async function proposeDynamicAxis(
  text: string,
  documentType: DocumentTypeLabel
): Promise<AxisProposal[]> {
  if (!text) return [];
  try {
    const userContent = [
      "既存軸が適合しない場合に、文書を3〜4段階で構造化する最適な軸を1つ考案してください。",
      `文書タイプ: ${documentType}`,
      "",
      "出力フォーマット(JSON配列、1件のみ):",
      `[{"id":"auto-1","label":"軸ラベル","levels":[{"id":"lvl1","label":"レベル1","guide":"抽出の観点を短く"}],"score":0.0,"rationale":"短い根拠"}]`,
      "制約:",
      "- levelsは3〜4件。labelは12文字以内で簡潔に。",
      "- guideはそのレベルで抽出すべき内容を短く具体的に。",
      "- id, level.id は英数字とハイフンのみ。",
      "不要な説明文は返さず、必ずJSONのみ。",
      "",
      "本文(先頭6000文字まで):",
      text.slice(0, 6000)
    ].join("\n");

    const completion = await generateChatCompletion({
      systemPrompt:
        "あなたは文書構造化の設計者です。与えられた文書に最適な軸を1つ設計し、JSONのみ返してください。",
      userContent,
      model: env.anthropicModelDefault,
      temperature: 0,
      maxTokens: 320
    });

    const parsed = parseJsonArray(completion);
    const proposals = parsed
      .map((item) => normalizeDynamicProposal(item))
      .filter((p): p is AxisProposal => Boolean(p))
      .filter((p) => p.score >= MIN_LLM_AXIS_SCORE);

    return proposals.sort((a, b) => b.score - a.score).slice(0, 1);
  } catch (_error) {
    return [];
  }
}

function normalizeDynamicProposal(item: LLMAxisScoreItem): AxisProposal | null {
  if (!item || typeof item.label !== "string" || !Array.isArray(item.levels)) return null;

  const axisLabel = item.label.trim() || "自動生成軸";
  const axisId = sanitizeId(item.id || axisLabel) || "auto-axis";
  const rawLevels = item.levels.slice(0, 4);
  const levels: AxisLevel[] = rawLevels
    .map((lvl, idx: number) => {
      const label =
        typeof lvl.label === "string" && lvl.label.trim().length > 0 ? lvl.label.trim() : `レベル${idx + 1}`;
      const guide = typeof lvl.guide === "string" ? lvl.guide.trim() : undefined;
      const id = sanitizeId(lvl.id || label) || `lvl-${idx + 1}`;
      return { id, label, guide };
    })
    .filter((lvl) => lvl.label);

  if (levels.length < 3) return null;

  const rawScore = typeof item.score === "number" ? item.score : 0.7;
  const score = Number.isFinite(rawScore) ? Math.max(0, Math.min(1, rawScore)) : 0.7;
  const rationale = typeof item.rationale === "string" ? item.rationale : "LLM自動生成軸";

  return {
    id: axisId,
    label: axisLabel,
    levels,
    score,
    rationale
  };
}

function sanitizeId(raw: string): string {
  const slug = raw
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return slug || "auto";
}

function makeFreeModeProposal(): AxisProposal {
  return {
    id: "free-mode",
    label: "フリーモード",
    levels: [
      { id: "noun", label: "名詞" },
      { id: "verb", label: "動詞" }
    ],
    score: 1,
    rationale: "既存軸に適合せず。名詞と動詞を並べて自由編集してください。"
  };
}
