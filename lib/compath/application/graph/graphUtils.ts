/**
 * グラフ構築ユーティリティ関数と定数
 */

import { createHash } from "node:crypto";
import type { GraphEdge, GraphNode, GraphNodeStatus } from "../../domain/types";
import { extractJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";

// ===============================
// 定数
// ===============================

export const LEVEL_KEYWORDS: Record<string, string[]> = {
  defect: ["不具合", "障害", "不良", "問題"],
  cause: ["原因", "理由", "要因"],
  countermeasure: ["対策", "対応", "是正", "改善", "処置"],
  case: ["事例", "ケース", "発生", "再現"],
  product: ["品名", "製品", "モデル"],
  component: ["部品", "コンポーネント", "構成"],
  material: ["素材", "材料"],
  function: ["機能", "役割"],
  feature: ["特徴", "特性", "性能"]
};

export const MAX_CANDIDATES = 3;
export const MAX_EDGES_PER_PAIR = 12;

export const NOISE_KEYWORDS = ["報告書", "背景", "目的", "分析", "仮説", "件名", "概要", "決定", "サマリ"];
export const NOISE_HEADINGS = /^(背景|目的|概要|原因分析|仮説|件名|不具合報告書|サマリ)/;
export const NOISE_META = /(本ドキュメント|本報告書|本資料|本書)/;

export const VAGUE_LABELS = [
  "発生している問題",
  "発生している課題",
  "問題",
  "課題",
  "不具合",
  "原因",
  "対策",
  "事例",
  "ストーリー",
  "背景と目的",
  "原因分析",
  "本ドキュメント",
  "本報告書",
  "本資料",
  "サマリ"
];

export const ACTION_VERBS = ["する", "実施", "対応", "改善", "修正", "導入", "設計", "検証", "調整", "見直"];

export const AXIS_LEVEL_GUIDE: Record<string, string> = {
  defect:
    "不具合: 具体的な現象・障害・欠陥（例: 納期遅延、設備故障、品質不良）。報告書名や『発生している問題』のような抽象語は禁止。",
  cause:
    "原因: 発生要因・根本原因（例: 調整遅れ、設計ミス、人員不足、手戻り）。メタ文は除外。",
  countermeasure:
    "対策: 実施/予定の行動（例: 再設計を実施、追加検証を行う、教育を実施）。動詞を含む行動のみ。結果や願望だけなら missing。",
  case:
    "事例: 個別発生例（例: ○○ラインで再発、△△案件で発生）。無ければ missing。",
  product: "品名: 製品名や機種名を短く。背景説明は不要。",
  component: "コンポーネント: 部品や構成要素の名称。",
  material: "素材: 材料や使用素材。",
  function: "機能: 提供する機能や役割。",
  feature: "特徴: 特性・性能・差別化要素。"
};

export const FTA_RULES = [
  "### 解析ルール（厳守）",
  "1. トップ事象（最上位の不具合）を必ず特定すること",
  "   - 文書全体の目的・件名・背景から判断する",
  "   - 数値悪化・遅延・未達・リスク顕在化などを優先する",
  "2. 各要素は以下の4種のノードに分類する",
  "   - 不具合（undesired_state）",
  "   - 原因（cause）",
  "   - 対策（countermeasure）",
  "   - 事例（observed_fact）",
  "3. 日本語表現が曖昧な場合（例：「◯◯の欠落」「◯◯の不足」）は、",
  "   - 文書内での役割",
  "   - 因果の向き",
  "   - 対策が向いている対象",
  "   を根拠に「原因」か「不具合」かを判断すること",
  "4. 原文の表現はできるだけ保持する",
  "   - 意味が変わらない範囲でのみ正規化してよい",
  "   - 解釈や要約を勝手に付加しない",
  "5. 因果関係は必ずエッジとして明示する",
  "   - 「AがBを引き起こす」",
  "   - 「Bを是正するためにCが実施される」",
  "   - 「Aの結果としてDが観測されている」"
].join("\n");

// ===============================
// 型定義
// ===============================

export type BuildGraphResult = {
  graph: import("../../domain/types").GraphResult;
  warnings: string[];
};

export type LlmGraphNode = {
  label: string;
  status?: GraphNodeStatus;
  confidence?: number;
};

// ===============================
// ユーティリティ関数
// ===============================

/**
 * ハッシュキーを生成
 */
export function hashKey(axisId: string, text: string): string {
  const hash = createHash("sha256");
  hash.update(axisId);
  hash.update(text);
  return hash.digest("hex");
}

/**
 * 安定したノードIDを生成
 */
export function stableNodeId(levelId: string, label: string, index: number): string {
  const hash = createHash("sha1");
  hash.update(levelId);
  hash.update(label);
  hash.update(index.toString());
  return `node-${hash.digest("hex").slice(0, 12)}`;
}

/**
 * 安定したエッジIDを生成
 */
export function stableEdgeId(sourceId: string, targetId: string): string {
  const hash = createHash("sha1");
  hash.update(sourceId);
  hash.update(targetId);
  return `edge-${hash.digest("hex").slice(0, 12)}`;
}

/**
 * JSONを抽出
 * @deprecated extractJsonFromLLMResponse を直接使用してください
 */
export function extractJson(raw: string): string {
  return extractJsonFromLLMResponse(raw);
}

/**
 * レベル間のリンクを作成
 */
export function linkLevels(
  previous: GraphNode[],
  current: GraphNode[],
  edges: GraphEdge[]
): void {
  if (previous.length === 0 || current.length === 0) return;

  const prev = [...previous].sort((a, b) => a.label.localeCompare(b.label, "ja"));
  const curr = [...current].sort((a, b) => a.label.localeCompare(b.label, "ja"));

  const pairs = Math.min(prev.length, curr.length);
  for (let i = 0; i < pairs; i++) {
    edges.push({
      id: stableEdgeId(prev[i]!.id, curr[i]!.id),
      source: prev[i]!.id,
      target: curr[i]!.id
    });
  }

  // If counts differ, connect remaining nodes to the nearest paired node
  if (prev.length > curr.length) {
    for (let i = curr.length; i < prev.length; i++) {
      edges.push({
        id: stableEdgeId(prev[i]!.id, curr[curr.length - 1]!.id),
        source: prev[i]!.id,
        target: curr[curr.length - 1]!.id
      });
    }
  } else if (curr.length > prev.length) {
    for (let i = prev.length; i < curr.length; i++) {
      edges.push({
        id: stableEdgeId(prev[prev.length - 1]!.id, curr[i]!.id),
        source: prev[prev.length - 1]!.id,
        target: curr[i]!.id
      });
    }
  }
}

/**
 * ID配列によるレベル間のリンクを作成
 */
export function linkLevelsById(
  previousIds: string[],
  currentIds: string[],
  edges: GraphEdge[]
): void {
  const pairs = Math.min(previousIds.length, currentIds.length);
  for (let i = 0; i < pairs; i++) {
    edges.push({
      id: stableEdgeId(previousIds[i]!, currentIds[i]!),
      source: previousIds[i]!,
      target: currentIds[i]!
    });
  }

  if (previousIds.length > currentIds.length && currentIds.length > 0) {
    for (let i = currentIds.length; i < previousIds.length; i++) {
      edges.push({
        id: stableEdgeId(previousIds[i]!, currentIds[currentIds.length - 1]!),
        source: previousIds[i]!,
        target: currentIds[currentIds.length - 1]!
      });
    }
  } else if (currentIds.length > previousIds.length && previousIds.length > 0) {
    for (let i = previousIds.length; i < currentIds.length; i++) {
      edges.push({
        id: stableEdgeId(previousIds[previousIds.length - 1]!, currentIds[i]!),
        source: previousIds[previousIds.length - 1]!,
        target: currentIds[i]!
      });
    }
  }
}

/**
 * ノードの重複を排除
 */
export function dedupeByLabel(nodes: LlmGraphNode[]): LlmGraphNode[] {
  const seen = new Set<string>();
  const result: LlmGraphNode[] = [];
  nodes.forEach((n) => {
    const key = n.label.trim().toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    result.push(n);
  });
  return result;
}

/**
 * レベルノードを選択
 */
export function chooseLevelNodes(levelLabel: string, candidates: LlmGraphNode[]): LlmGraphNode[] {
  if (candidates.length === 0) {
    return [{ label: `${levelLabel}（未記入）`, status: "missing" }];
  }

  const deduped = dedupeByLabel(candidates).slice(0, MAX_CANDIDATES);
  const present = deduped.filter((n) => n.status !== "missing");
  if (present.length > 0) {
    return present;
  }
  // all missing -> keep only one
  return [deduped[0]!];
}

/**
 * 曖昧なラベルかどうかを判定
 */
export function isVagueLabel(label: string): boolean {
  return VAGUE_LABELS.some((v) => label.trim() === v);
}

/**
 * 行動動詞を含むかどうかを判定
 */
export function hasActionVerb(label: string): boolean {
  return ACTION_VERBS.some((verb) => label.includes(verb));
}

/**
 * 意味のあるラベルかどうかを判定
 */
export function isMeaningfulLabel(label: string): boolean {
  // Require some concreteness: length and presence of kanji/number/latin
  if (label.length < 6) return false;
  if (!/[\p{Script=Han}\dA-Za-z]/u.test(label)) return false;

  // Avoid labels that are just generic category words
  const genericOnly = ["問題", "課題", "不具合", "原因", "対策", "事例"];
  if (genericOnly.includes(label)) return false;

  return true;
}

/**
 * ノードをサニタイズ
 */
export function sanitizeNode(
  levelId: string,
  _levelLabel: string,
  node: LlmGraphNode
): LlmGraphNode | null {
  const label = node.label.trim();

  if (!label || isVagueLabel(label)) {
    return null;
  }

  if (label.length < 6) {
    return null;
  }

  if (NOISE_META.test(label) || NOISE_HEADINGS.test(label)) {
    return null;
  }

  if (levelId === "countermeasure" && !hasActionVerb(label)) {
    return null;
  }

  if (!isMeaningfulLabel(label)) {
    return null;
  }

  return {
    label,
    status: node.status === "missing" ? "missing" : "present"
  };
}

/**
 * 候補として許可されるかどうかを判定
 */
export function isCandidateAllowed(levelId: string, label: string): boolean {
  const trimmed = label.trim();
  if (!trimmed) return false;
  if (isVagueLabel(trimmed)) return false;
  if (!isMeaningfulLabel(trimmed)) return false;
  if (levelId === "countermeasure" && !hasActionVerb(trimmed)) return false;
  return true;
}

/**
 * コンテンツ行かどうかを判定
 */
export function isContentLine(line: string): boolean {
  // Exclude short headings or labels without punctuation
  if (line.length < 15 && !/[、，。・]/.test(line)) {
    return false;
  }

  if (NOISE_HEADINGS.test(line)) {
    return false;
  }

  if (NOISE_META.test(line)) {
    return false;
  }

  // Skip known noisy labels
  if (NOISE_KEYWORDS.some((noise) => line.includes(noise))) {
    return false;
  }

  return true;
}
