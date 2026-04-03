/**
 * 選択処理のユーティリティ関数
 */

import type { DecisionFlowNode } from "../types";

/**
 * 指定されたノードの子孫ノードIDを再帰的に収集
 */
export function collectDescendantIds(nodeId: string, nodes: DecisionFlowNode[]): string[] {
  const node = nodes.find(n => n.id === nodeId);
  if (!node?.childIds?.length) return [];

  const descendants: string[] = [...node.childIds];
  for (const childId of node.childIds) {
    descendants.push(...collectDescendantIds(childId, nodes));
  }
  return descendants;
}
