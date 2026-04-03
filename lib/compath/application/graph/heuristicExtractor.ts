/**
 * ヒューリスティックによるグラフ抽出（フォールバック）
 */

import type { AxisDefinition, GraphEdge, GraphNode, GraphResult } from "../../domain/types";
import {
  LEVEL_KEYWORDS,
  MAX_CANDIDATES,
  stableNodeId,
  linkLevelsById,
  isCandidateAllowed,
  isContentLine
} from "./graphUtils";

/**
 * ヒューリスティックによるグラフ構築
 */
export function buildGraphHeuristic(axis: AxisDefinition, pages: string[]): GraphResult {
  const nodes: GraphNode[] = [];
  const edges: GraphEdge[] = [];
  let previousNodeIds: string[] = [];

  axis.levels.forEach((level) => {
    const candidates = extractCandidates(level.id, pages).filter((candidate) =>
      isCandidateAllowed(level.id, candidate)
    );
    const currentNodeIds: string[] = [];

    if (candidates.length === 0) {
      const missingNode = createNode(level.id, level.label, `${level.label}（未記入）`, "missing");
      nodes.push(missingNode);
      currentNodeIds.push(missingNode.id);
    } else {
      candidates.forEach((candidate) => {
        const node = createNode(level.id, level.label, candidate, "present");
        nodes.push(node);
        currentNodeIds.push(node.id);
      });
    }

    if (previousNodeIds.length > 0) {
      linkLevelsById(previousNodeIds, currentNodeIds, edges);
    }

    previousNodeIds = currentNodeIds;
  });

  return {
    axisId: axis.id,
    axisLabel: axis.label,
    levels: axis.levels,
    nodes,
    edges
  };
}

/**
 * ノードを作成
 */
function createNode(
  levelId: string,
  levelLabel: string,
  label: string,
  status: GraphNode["status"]
): GraphNode {
  return {
    id: stableNodeId(levelId, label, 0),
    label,
    levelId,
    levelLabel,
    status
  };
}

/**
 * 候補を抽出
 */
function extractCandidates(levelId: string, pages: string[]): string[] {
  const keywords = LEVEL_KEYWORDS[levelId] ?? [];
  if (keywords.length === 0) {
    return [];
  }

  const lines = pages
    .flatMap((page) => page.split(/\n|。/g))
    .map((line) => line.trim())
    .filter((line) => line.length > 6)
    .filter((line) => isContentLine(line));

  const matches = lines.filter((line) => keywords.some((keyword) => line.includes(keyword)));
  const unique = Array.from(new Set(matches));

  return unique.slice(0, MAX_CANDIDATES);
}
