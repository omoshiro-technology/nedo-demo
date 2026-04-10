/**
 * LLMによるグラフ抽出
 */

import type {
  AxisDefinition,
  AxisLevel,
  GraphEdge,
  GraphNode,
  GraphNodeStatus,
  GraphResult
} from "../../domain/types";
import { env } from "../../config/env";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { LRUCache } from "../../infrastructure/cache/LRUCache";
import {
  type LlmGraphNode,
  AXIS_LEVEL_GUIDE,
  FTA_RULES,
  MAX_EDGES_PER_PAIR,
  hashKey,
  stableNodeId,
  stableEdgeId,
  extractJson,
  linkLevels,
  chooseLevelNodes,
  sanitizeNode
} from "./graphUtils";

// LRUキャッシュ: 最大200エントリ、TTL 10分
const NODE_CACHE = new LRUCache<string, LlmGraphNode[]>(200, 10 * 60 * 1000);

/**
 * LLMによるグラフ構築
 */
export async function buildGraphWithLLM(
  axis: AxisDefinition,
  text: string
): Promise<{ graph: GraphResult | null; warnings: string[] }> {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  const warnings: string[] = [];

  let previousLevelNodes: GraphNode[] = [];
  const cacheKey = hashKey(axis.id, text);
  const isFTA = axis.id === "defect-cause-countermeasure-case" || axis.label.includes("不具合");

  for (const level of axis.levels) {
    try {
      const llmNodes = await extractNodesForLevel(level, text, cacheKey, isFTA);
      llmNodes.sort((a, b) => a.label.localeCompare(b.label, "ja"));
      const sanitized = llmNodes
        .map((node) => sanitizeNode(level.id, level.label, node))
        .filter(Boolean) as LlmGraphNode[];

      const levelNodes = chooseLevelNodes(level.label, sanitized);

      const graphNodes = levelNodes.map((node, idx) => ({
        id: stableNodeId(level.id, node.label, idx),
        label: node.label,
        levelId: level.id,
        levelLabel: level.label,
        status: (node.status === "missing" ? "missing" : "present") as GraphNodeStatus,
        confidence: node.confidence
      }));

      nodes.push(...graphNodes);

      // Connect with LLM-guided edges; fallback to simple pairing
      const llmEdges =
        previousLevelNodes.length > 0 && graphNodes.length > 0
          ? await extractEdgesWithLLM(previousLevelNodes, graphNodes, text, isFTA)
          : [];
      if (llmEdges.length > 0) {
        edges.push(...llmEdges);
      } else {
        linkLevels(previousLevelNodes, graphNodes, edges);
      }

      previousLevelNodes = graphNodes;
    } catch (error) {
      const message = error instanceof Error ? error.message : "LLMグラフ抽出に失敗しました。";
      warnings.push(`LLMグラフ抽出に失敗しました: ${message}`);
      // Fallback for this level
      const fallbackNode: GraphNode = {
        id: stableNodeId(level.id, `${level.label}（未記入）`, 0),
        label: `${level.label}（未記入）`,
        levelId: level.id,
        levelLabel: level.label,
        status: "missing" as GraphNodeStatus
      };
      nodes.push(fallbackNode);
      linkLevels(previousLevelNodes, [fallbackNode], edges);
      previousLevelNodes = [fallbackNode];
    }
  }

  if (nodes.length === 0) {
    return { graph: null, warnings: ["LLMグラフ抽出に失敗しました。"] };
  }

  const graph: GraphResult = {
    axisId: axis.id,
    axisLabel: axis.label,
    levels: axis.levels,
    nodes,
    edges
  };

  return { graph, warnings };
}

/**
 * レベルのノードをLLMで抽出
 */
async function extractNodesForLevel(
  level: AxisLevel,
  text: string,
  cacheKey: string,
  isFTA: boolean
): Promise<LlmGraphNode[]> {
  const memoKey = `${level.id}:${cacheKey}`;
  const cached = NODE_CACHE.get(memoKey);
  if (cached) return cached;

  const prompt = [
    `ドキュメントから「${level.label}」に該当する具体的な項目を最大3つ抽出してください。`,
    "短い名詞句で返し、抽象語（問題/課題/不具合/原因/対策/事例など）やメタ文は使わない。結果や願望のみは除外。",
    "対策レベルは動詞を含む行動句のみ。例: 再設計を実施、追加検証を行う、教育を実施。",
    "事例レベルは具体的な発生例のみ。無ければ missing。",
    isFTA ? FTA_RULES : "",
    "返却は必ず JSON のみ: { \"nodes\": [ { \"label\": \"...\", \"status\": \"present\" | \"missing\", \"confidence\": 0-100 } ] }",
    "confidenceは抽出の確信度。文書に明確に記載されている=90-100、文脈から推測=50-89、不確かな推測=0-49",
    "",
    "参考ガイド:",
    level.guide ?? AXIS_LEVEL_GUIDE[level.id] ?? level.label,
    "",
    "本文（ここに無い事実は作らない）:",
    text.slice(0, 6000)
  ].join("\n");

  const raw = await generateChatCompletion({
    systemPrompt:
      "あなたは日本語の情報抽出ツールです。指定されたJSONのみを返してください。余計な文字やコードブロックを含めないでください。",
    userContent: prompt,
    model: env.anthropicModelDefault,
    temperature: 0,
    maxTokens: 600
  });

  const jsonString = extractJson(raw);
  const parsed = JSON.parse(jsonString) as { nodes?: Array<{ label: string; status?: GraphNodeStatus; confidence?: number }> };
  const result = parsed.nodes ?? [];
  NODE_CACHE.set(memoKey, result);
  return result;
}

/**
 * LLMでエッジを抽出
 */
async function extractEdgesWithLLM(
  previous: GraphNode[],
  current: GraphNode[],
  text: string,
  isFTA: boolean
): Promise<GraphEdge[]> {
  if (previous.length === 0 || current.length === 0) return [];

  const prevList = previous.map((n) => `- ${n.id}: ${n.label}`).join("\n");
  const currList = current.map((n) => `- ${n.id}: ${n.label}`).join("\n");

  const prompt = [
    "以下のノード同士を、内容的に因果や参照関係が強いものだけで接続してください。",
    "必ず previous→current の向きのみ。無関係な組み合わせは作らないでください。",
    `最大エッジ数: ${MAX_EDGES_PER_PAIR}`,
    isFTA ? FTA_RULES : "",
    "",
    "出力は JSON のみ: { \"edges\": [ { \"source\": \"prevId\", \"target\": \"currId\", \"label\": \"任意の短い理由\" } ] }",
    "",
    "previousレベルのノード:",
    prevList || "(なし)",
    "",
    "currentレベルのノード:",
    currList || "(なし)",
    "",
    "本文（ここに無い事実は作らない）:",
    text.slice(0, 4000)
  ].join("\n");

  try {
    const raw = await generateChatCompletion({
      systemPrompt:
        "あなたは日本語の関係抽出ツールです。指定されたJSONのみを返し、不要な文字やコードブロックは含めないでください。",
      userContent: prompt,
      model: env.anthropicModelDefault,
      temperature: 0,
      maxTokens: 400
    });

    const jsonString = extractJson(raw);
    const parsed = JSON.parse(jsonString) as { edges?: Array<{ source: string; target: string; label?: string }> };
    const items = parsed.edges ?? [];

    const validIds = new Set([...previous.map((p) => p.id), ...current.map((c) => c.id)]);
    const edges: GraphEdge[] = [];
    for (const item of items.slice(0, MAX_EDGES_PER_PAIR)) {
      if (!item?.source || !item?.target) continue;
      if (!validIds.has(item.source) || !validIds.has(item.target)) continue;
      if (!previous.find((p) => p.id === item.source)) continue;
      if (!current.find((c) => c.id === item.target)) continue;
      edges.push({
        id: stableEdgeId(item.source, item.target),
        source: item.source,
        target: item.target,
        label: typeof item.label === "string" ? item.label.slice(0, 60) : undefined
      });
    }

    return edges;
  } catch (_error) {
    return [];
  }
}
