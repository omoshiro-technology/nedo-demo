/**
 * GraphView ユーティリティ関数
 */

import type { Node, Edge } from "reactflow";
import type { AxisNodeData, MissingPoolItem, Level } from "./types";
import { LEVEL_SPACING, COLUMN_OFFSET, NODE_SPACING } from "./constants";

/**
 * ラベルからキーワードを抽出
 */
export function makeKeyword(label: string): string {
  if (!label) return "";

  const tokens = label
    .split(/[\s　、。/／,，;；:：\|｜]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  const pick =
    tokens.find((t) => t.length <= 24 && t.length >= 2) ||
    tokens.reduce((longest, t) => (t.length > longest.length ? t : longest), tokens[0] ?? label);

  const maxLen = 28;
  return pick.length > maxLen ? `${pick.slice(0, maxLen)}…` : pick;
}

/**
 * X座標から最も近いレベルを検索
 */
export function findNearestLevel(
  x: number,
  levels: Level[]
): { level: Level; index: number } {
  const positions = levels.map((_, idx) => idx * LEVEL_SPACING + COLUMN_OFFSET);
  let nearestIdx = 0;
  let minDist = Number.POSITIVE_INFINITY;
  positions.forEach((pos, idx) => {
    const dist = Math.abs(pos - x);
    if (dist < minDist) {
      minDist = dist;
      nearestIdx = idx;
    }
  });
  return { level: levels[nearestIdx]!, index: nearestIdx };
}

/**
 * プレースホルダーノードを挿入（レベル間のギャップを埋める）
 */
export function insertPlaceholders(
  nodes: Node<AxisNodeData>[],
  edges: Edge[],
  levels: Level[],
  levelIndex: Map<string, number>
): { nodes: Node<AxisNodeData>[]; edges: Edge[] } {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const augmentedNodes: Node<AxisNodeData>[] = [...nodes];
  const augmentedEdges: Edge[] = [];

  edges.forEach((edge) => {
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return;

    const srcIdx = levelIndex.get((src.data as AxisNodeData).levelId ?? src.data.levelLabel) ?? 0;
    const tgtIdx = levelIndex.get((tgt.data as AxisNodeData).levelId ?? tgt.data.levelLabel) ?? 0;
    const gap = Math.abs(tgtIdx - srcIdx);

    if (gap <= 1) {
      augmentedEdges.push(edge);
      return;
    }

    const missingLevels =
      srcIdx < tgtIdx ? levels.slice(srcIdx + 1, tgtIdx) : levels.slice(tgtIdx + 1, srcIdx).reverse();
    let prevId = edge.source;
    missingLevels.forEach((lvl, idx) => {
      const t = (idx + 1) / (missingLevels.length + 1);
      const y =
        src.position.y + t * ((tgt.position?.y ?? src.position.y) - (src.position?.y ?? tgt.position?.y ?? 0));
      const x = (levelIndex.get(lvl.id) ?? 0) * LEVEL_SPACING + COLUMN_OFFSET;
      const placeholder: Node<AxisNodeData> = {
        id: `placeholder-${edge.id}-${lvl.id}-${idx}`,
        type: "axisNode",
        position: { x, y },
        data: {
          label: `${lvl.label} を追加`,
          fullLabel: `${lvl.label} を追加`,
          levelLabel: lvl.label,
          levelId: lvl.id,
          status: "missing",
          isPlaceholder: true
        },
        draggable: true,
        selectable: true
      };
      augmentedNodes.push(placeholder);

      augmentedEdges.push({
        ...edge,
        id: `bridge-${edge.id}-${idx}-a`,
        source: prevId,
        target: placeholder.id,
        style: { ...edge.style, stroke: "#d4483d" }
      });
      prevId = placeholder.id;
    });

    augmentedEdges.push({
      ...edge,
      id: `bridge-${edge.id}-tail`,
      source: prevId,
      target: edge.target,
      style: { ...edge.style, stroke: "#d4483d" }
    });
  });

  return { nodes: augmentedNodes, edges: augmentedEdges };
}

/**
 * エッジのレベルギャップを計算
 */
export function getLevelGap(
  edge: Edge,
  nodes: Node<AxisNodeData>[],
  order: Map<string, number>,
  levels: Level[]
): { gap: number; missingLevels: Level[] } {
  const src = nodes.find((n) => n.id === edge.source);
  const tgt = nodes.find((n) => n.id === edge.target);
  if (!src || !tgt) return { gap: 0, missingLevels: [] };
  const srcIdx = order.get((src.data as AxisNodeData).levelLabel) ?? 0;
  const tgtIdx = order.get((tgt.data as AxisNodeData).levelLabel) ?? 0;
  const gap = Math.abs(tgtIdx - srcIdx);
  if (gap <= 1) return { gap, missingLevels: [] };
  const low = Math.min(srcIdx, tgtIdx);
  const high = Math.max(srcIdx, tgtIdx);
  const missingLevels = levels.slice(low + 1, high);
  return { gap, missingLevels };
}

/**
 * チャット用のコンテキストを構築
 */
export function buildChatContext(
  axisLabel: string,
  nodes: Node<AxisNodeData>[],
  edges: Edge[],
  missingPool: MissingPoolItem[],
  summary?: string
) {
  const labelMap = new Map<string, string>();
  nodes.forEach((n) => labelMap.set(n.id, (n.data as AxisNodeData).fullLabel));

  return {
    axisLabel,
    nodes: nodes.map((n) => ({
      label: (n.data as AxisNodeData).fullLabel,
      levelLabel: (n.data as AxisNodeData).levelLabel,
      status: (n.data as AxisNodeData).status,
      isPlaceholder: (n.data as AxisNodeData).isPlaceholder
    })),
    edges: edges.map((e) => ({
      sourceLabel: labelMap.get(e.source) ?? e.source,
      targetLabel: labelMap.get(e.target) ?? e.target
    })),
    summary:
      summary?.trim() ||
      (missingPool.length > 0 ? `未配置ノード: ${missingPool.slice(0, 5).map((m) => m.label).join(", ")}` : "")
  };
}

/**
 * AIレスポンスからノード候補を解析
 */
export function parseNodeCandidates(
  content: string,
  levels: Level[]
): { facts: { levelLabel: string; label: string }[]; speculative: { levelLabel: string; label: string }[] } {
  const lines = content.split("\n").map((l) => l.trim());
  const facts: { levelLabel: string; label: string }[] = [];
  const speculative: { levelLabel: string; label: string }[] = [];
  let currentSection: "facts" | "speculative" = "facts";

  lines.forEach((line) => {
    if (/^\(推測\)/.test(line) || /^推測[:：]?/i.test(line)) {
      currentSection = "speculative";
      return;
    }
    const match = line.match(/^-\s*([^\:：]+)[:：]\s*(.+?)(?:\s*[—-]\s*(.+))?$/);
    if (!match) return;
    const levelLabel = match[1]?.trim();
    const labelRaw = match[2]?.replace(/^・/, "").trim();
    if (!levelLabel || !labelRaw) return;
    if (!levels.some((l) => l.label === levelLabel)) return;
    // ノイズ除外
    if (labelRaw.length < 4) return;
    if (/(のみ|限定|定義|ありません|無し|ない|未定義|不明)/.test(labelRaw)) return;
    if (/現状は/.test(labelRaw)) return;
    const label = labelRaw.replace(/\s+/g, " ");
    if (currentSection === "speculative") {
      speculative.push({ levelLabel, label });
    } else {
      facts.push({ levelLabel, label });
    }
  });
  return {
    facts: facts.slice(0, 3),
    speculative: speculative.slice(0, 3)
  };
}

/**
 * 推測セクションを分離
 */
export function splitSpeculativeSection(content: string): {
  factsText: string;
  speculativeText: string;
  hasSpeculative: boolean;
} {
  const lines = content.split(/\r?\n/);
  const idx = lines.findIndex((line) => {
    const t = line.trim();
    return t === "(推測)" || t === "[推測]" || /^推測[:：]?$/u.test(t);
  });
  if (idx === -1) {
    return { factsText: content.trim(), speculativeText: "", hasSpeculative: false };
  }
  const factsText = lines.slice(0, idx).join("\n").trim();
  const speculativeText = lines.slice(idx + 1).join("\n").trim();
  return { factsText, speculativeText, hasSpeculative: true };
}

/**
 * チャットからノードを追加
 */
export function addNodeFromCandidate(
  levelLabel: string,
  label: string,
  levels: Level[],
  nodesState: Node<AxisNodeData>[],
  setNodesState: React.Dispatch<React.SetStateAction<Node<AxisNodeData>[]>>,
  setMissingPool: React.Dispatch<React.SetStateAction<MissingPoolItem[]>>,
  levelOrder: Map<string, number>,
  chatSource?: "fact" | "speculative"
): void {
  const level = levels.find((l) => l.label === levelLabel);
  if (!level) return;
  const levelNodes = nodesState.filter((n) => (n.data as AxisNodeData).levelLabel === levelLabel);
  const maxY = levelNodes.length > 0 ? Math.max(...levelNodes.map((n) => n.position.y)) + NODE_SPACING : 0;
  const x = (levelOrder.get(level.label) ?? 0) * LEVEL_SPACING + COLUMN_OFFSET;
  const newNode: Node<AxisNodeData> = {
    id: `chat-${Date.now()}`,
    type: "axisNode",
    position: { x, y: maxY },
    data: {
      label: makeKeyword(label),
      fullLabel: label,
      levelLabel,
      levelId: level.id,
      status: "present",
      chatSource
    }
  };
  setNodesState((nds) => [...nds, newNode]);
  setMissingPool((pool) => pool.filter((p) => !(p.levelLabel === levelLabel && p.label === label)));
}
