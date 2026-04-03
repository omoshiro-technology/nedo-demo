/**
 * グラフ関係性を導出する純粋関数群
 *
 * エッジをソース・オブ・トゥルースとして兄弟/子/子孫関係を計算
 * parentId や childIds に依存せず、エッジの source/target のみを使用
 */

import type { DecisionFlowEdge } from "./coreTypes";

/**
 * エッジから兄弟ノードIDを導出
 * 兄弟 = 同じ source を持つエッジの他の target
 *
 * @param nodeId 対象ノードID
 * @param edges 全エッジ
 * @returns 兄弟ノードIDのSet
 */
export function deriveSiblingIds(
  nodeId: string,
  edges: DecisionFlowEdge[]
): Set<string> {
  // 1. nodeId へのエッジを見つける
  const incomingEdge = edges.find(e => e.target === nodeId);
  if (!incomingEdge) return new Set();

  // 2. 同じ source を持つ他のエッジの target が兄弟
  const siblingIds = new Set<string>();
  for (const edge of edges) {
    if (edge.source === incomingEdge.source && edge.target !== nodeId) {
      siblingIds.add(edge.target);
    }
  }
  return siblingIds;
}

/**
 * エッジから子ノードIDを導出
 *
 * @param nodeId 対象ノードID
 * @param edges 全エッジ
 * @returns 子ノードIDの配列
 */
export function deriveChildIds(
  nodeId: string,
  edges: DecisionFlowEdge[]
): string[] {
  return edges
    .filter(e => e.source === nodeId)
    .map(e => e.target);
}

/**
 * ノードの子孫IDを収集（再帰的にエッジを辿る）
 *
 * @param nodeId 起点ノードID
 * @param edges 全エッジ
 * @param visited 訪問済みノード（循環防止）
 * @returns 子孫ノードIDのSet（起点ノード自身は含まない）
 */
export function deriveDescendantIds(
  nodeId: string,
  edges: DecisionFlowEdge[],
  visited: Set<string> = new Set()
): Set<string> {
  const result = new Set<string>();

  const children = deriveChildIds(nodeId, edges);
  for (const childId of children) {
    if (visited.has(childId)) continue;
    visited.add(childId);

    result.add(childId);

    // 子の子孫も収集
    const grandchildren = deriveDescendantIds(childId, edges, visited);
    grandchildren.forEach(id => result.add(id));
  }

  return result;
}

/**
 * エッジから親ノードIDを導出
 *
 * @param nodeId 対象ノードID
 * @param edges 全エッジ
 * @returns 親ノードID（なければ undefined）
 */
export function deriveParentId(
  nodeId: string,
  edges: DecisionFlowEdge[]
): string | undefined {
  const incomingEdge = edges.find(e => e.target === nodeId);
  return incomingEdge?.source;
}
