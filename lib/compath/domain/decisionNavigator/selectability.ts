/**
 * ノードの選択可能性（isSelectable）を計算するドメインロジック
 *
 * 選択可能な条件:
 * 1. 自分の親が「選択済み」または「推奨パス上」である
 * 2. または、自分が「選択済みノードの兄弟」である（選択の変更）
 * 3. スタートノードの直接の子は常に選択可能
 * 4. 推奨パス上のノードは、先祖が全て選択可能経路にある場合のみ選択可能
 */

import type { DecisionFlowNodeCore } from "./coreTypes";

/**
 * selectability計算に必要なノードの最小インターフェース
 * Application層のDecisionFlowNodeはこれを満たす
 */
type SelectableNode = DecisionFlowNodeCore & {
  isSelectable?: boolean;
};

/**
 * 全ノードの選択可能性（isSelectable）を計算
 * @param nodes 全ノードの配列
 * @returns isSelectableフラグが設定されたノードの配列
 */
export function computeSelectability<T extends SelectableNode>(nodes: T[]): T[] {
  // 推奨パス上のノードを特定
  const recommendedNodeIds = new Set(
    nodes.filter(n => n.status === "recommended" || n.pathRole === "recommended").map(n => n.id)
  );

  // スタートノードを特定
  const startNode = nodes.find(n => n.type === "start");
  const startNodeId = startNode?.id;

  // 推奨パス上のノードで、先祖が全て「選択可能経路」にあるものを計算
  // 選択可能経路 = スタートから現在のノードまで、全て selected または recommended
  const selectableRecommendedIds = new Set<string>();

  // 推奨パスを辿って、選択可能なものを収集
  function isAncestorPathSelectable(nodeId: string, visited: Set<string> = new Set()): boolean {
    if (visited.has(nodeId)) return false;
    visited.add(nodeId);

    const node = nodes.find(n => n.id === nodeId);
    if (!node) return false;

    // スタートノードは常に選択可能経路上
    if (node.type === "start") return true;

    // 親がない場合はスタートと仮定
    if (!node.parentId) return true;

    const parent = nodes.find(n => n.id === node.parentId);
    if (!parent) return false;

    // 親が selected または recommended であること
    const parentIsOnPath = parent.status === "selected" ||
                           parent.status === "recommended" ||
                           parent.type === "start";

    if (!parentIsOnPath) return false;

    // 親の先祖も選択可能経路上であること
    return isAncestorPathSelectable(parent.id, visited);
  }

  // 推奨パス上のノードで選択可能なものを特定
  for (const node of nodes) {
    if (recommendedNodeIds.has(node.id) && isAncestorPathSelectable(node.id)) {
      selectableRecommendedIds.add(node.id);
    }
  }

  return nodes.map(node => {
    const parent = nodes.find(n => n.id === node.parentId);

    // 条件0: Phase 8 - ロック状態のノードは選択不可
    if (node.status === "locked") {
      return { ...node, isSelectable: false };
    }

    // 条件0.5: Phase 8 - 既にisSelectableが明示的に設定されている場合は尊重
    // generateRecommendedPath等で計算済みの場合
    // Phase 8+: available状態のノードはisSelectableをtrueに設定
    if (typeof node.isSelectable === "boolean") {
      return node;
    }

    // 条件0.6: Phase 8+ - available状態のノードは選択可能
    // 判断軸ラベル方式では、available状態のノードは選択可能として生成される
    if (node.status === "available") {
      return { ...node, isSelectable: true };
    }

    // 条件1: スタートノード自体は選択不可（開始点）
    if (node.type === "start") {
      return { ...node, isSelectable: false };
    }

    // 条件2: スタートノードの直接の子は常に選択可能
    if (parent?.type === "start" || node.parentId === startNodeId) {
      return { ...node, isSelectable: true };
    }

    // 条件2.5: Backcasting Canvas - criteriaノードの子（strategy/outcome）は選択可能
    // 判断軸(criteria)の下の選択肢(strategy)は選択可能にする
    if (parent?.level === "criteria" && (node.level === "strategy" || node.level === "outcome")) {
      // 親のcriteriaが選択可能経路上にある場合のみ
      const grandparent = nodes.find(n => n.id === parent.parentId);
      const parentIsSelectable = grandparent?.type === "start" ||
                                  grandparent?.status === "selected" ||
                                  grandparent?.status === "recommended" ||
                                  selectableRecommendedIds.has(parent.id);
      if (parentIsSelectable) {
        return { ...node, isSelectable: true };
      }
    }

    // 条件2.6: Backcasting Canvas - 推奨パス上のノードの兄弟（同じ親を持つノード）は選択可能
    // 推奨パス上のstrategy/outcomeノードと同じ親を持つ兄弟ノードは選択可能にする
    if (parent && (node.level === "strategy" || node.level === "outcome")) {
      // 同じ親を持つ兄弟ノードに推奨パス上のノードがあるか
      const hasSiblingOnRecommendedPath = nodes.some(
        n => n.parentId === node.parentId &&
             n.id !== node.id &&
             (n.status === "recommended" || selectableRecommendedIds.has(n.id))
      );
      if (hasSiblingOnRecommendedPath) {
        return { ...node, isSelectable: true };
      }
    }

    // 条件3: 親が選択済みの場合、子は選択可能
    if (parent?.status === "selected") {
      return { ...node, isSelectable: true };
    }

    // 条件4: 推奨パス上のノードで、選択可能経路上にある場合
    if (selectableRecommendedIds.has(node.id)) {
      return { ...node, isSelectable: true };
    }

    // 条件5: 兄弟に選択済みがある場合（選択変更用）
    const hasSiblingSelected = nodes.some(
      n => n.parentId === node.parentId &&
           n.id !== node.id &&
           n.status === "selected"
    );
    if (hasSiblingSelected && node.status === "dimmed") {
      return { ...node, isSelectable: true };
    }

    // それ以外は選択不可
    return { ...node, isSelectable: false };
  });
}
