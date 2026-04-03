/**
 * 視覚状態を一発で計算する純粋関数
 *
 * 設計原則:
 * - 単一の関数で描画状態を決定（段階的な上書きを排除）
 * - 兄弟関係はエッジベースで判定（parentId/childIds に依存しない）
 * - 入力と出力が明確で、テスタブル
 */

import type { DecisionFlowNode, DecisionFlowEdge } from "./coreTypes";
import { deriveSiblingIds, deriveDescendantIds, deriveChildIds } from "./graphRelations";

export type VisualStateInput = {
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  selectedNodeId: string;
  /** 選択時刻（selectedAt用） */
  timestamp?: string;
};

export type VisualStateOutput = {
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  /** デバッグ情報 */
  debug: {
    /** 選択パス上のノードID（過去の選択 + 今回の選択） */
    selectedPathIds: string[];
    siblingIds: string[];
    siblingDescendantIds: string[];
    childIds: string[];
    /** 推奨パス上のノードID（常に表示維持） */
    recommendedPathIds: string[];
  };
};

/**
 * 選択に基づいてノード/エッジの視覚状態を一発で計算
 *
 * 処理順序:
 * 1. 選択パス上のすべてのノードを収集
 * 2. 選択パス上のノードの兄弟をすべて特定（エッジベース）
 * 3. 兄弟の子孫を特定（推奨パスは除外）
 * 4. 選択されたノードの子を特定
 * 5. ノード状態を一括計算（優先順位: selected > recommended path > dimmed > activate locked > keep）
 * 6. エッジ状態を一括計算
 *
 * 仕様:
 * - 選択パス上のノードの兄弟: dimmed（薄く表示）
 * - 選択されたノードの子: 次の選択肢として表示（available/recommended）
 * - 推奨パス: 常に表示維持（兄弟の子孫でもdimmedにしない）
 *
 * @param input 入力データ
 * @returns 更新されたノード/エッジとデバッグ情報
 */
export function deriveVisualState(input: VisualStateInput): VisualStateOutput {
  const { nodes, edges, selectedNodeId, timestamp } = input;

  // 0. 推奨パス上のノードIDを収集（これらはdimmedにしない）
  // isRecommendedフラグを使用（pathRoleは選択時にselectedに上書きされるため信頼できない）
  const recommendedPathIds = new Set<string>();
  for (const node of nodes) {
    // isRecommendedフラグが最も信頼できる（生成時に設定され、変更されない）
    if (node.isRecommended === true) {
      recommendedPathIds.add(node.id);
    }
  }

  // 0.5. 推奨パス上のノードの兄弟を収集（これらも選択可能な代替選択肢としてdimmedにしない）
  // LLMが初期生成時に推奨パスと一緒に生成した代替選択肢
  // 注意: 兄弟自身は表示するが、その子孫はlockedのまま
  const recommendedPathSiblingIds = new Set<string>();
  for (const recommendedId of recommendedPathIds) {
    const siblings = deriveSiblingIds(recommendedId, edges);
    for (const siblingId of siblings) {
      // 推奨パス上のノード自身は除外
      if (!recommendedPathIds.has(siblingId)) {
        recommendedPathSiblingIds.add(siblingId);
      }
    }
  }

  // 0.6. 推奨パスの兄弟の子孫を収集（これらはdimmed/lockedにする）
  // 兄弟自身は表示するが、その子孫は親（兄弟）が選択されるまで非表示
  const recommendedPathSiblingDescendantIds = new Set<string>();
  for (const siblingId of recommendedPathSiblingIds) {
    const descendants = deriveDescendantIds(siblingId, edges);
    for (const id of descendants) {
      // 推奨パス上のノードは除外
      if (!recommendedPathIds.has(id)) {
        recommendedPathSiblingDescendantIds.add(id);
      }
    }
  }

  // 0.7. 今回選択されたノードのdepth（列インデックス）を取得
  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const selectedNodeDepth = selectedNode?.depth;

  // 1. 選択パス上のすべてのノードを収集（過去に選択されたノード + 今回選択するノード）
  // Phase 8+: 同じ列（depth）での選択変更時は、前の選択を除外する
  const selectedPathIds = new Set<string>();
  selectedPathIds.add(selectedNodeId); // 今回選択するノード

  // Phase 8+: 同じ列で前に選択されていたノードを特定（選択解除対象）
  let previousSelectionInSameColumn: string | undefined;

  for (const node of nodes) {
    // 既に選択済みのノード（status === "selected"）
    if (node.status === "selected") {
      // Phase 8+: 今回選択するノード自体はスキップ（再クリックの場合）
      if (node.id === selectedNodeId) {
        continue;
      }
      // Phase 8+: 同じ列（depth）のノードは選択パスから除外（選択変更）
      if (selectedNodeDepth !== undefined && node.depth === selectedNodeDepth) {
        // 同じ列の前の選択を記録して除外
        previousSelectionInSameColumn = node.id;
        continue;
      }
      selectedPathIds.add(node.id);
    }
  }

  // 2. 選択パス上のすべてのノードの兄弟を収集（エッジベース）
  // 推奨パス上のノードと、推奨パス上のノードの兄弟は除外
  const siblingIds = new Set<string>();
  for (const selectedId of selectedPathIds) {
    const siblingsOfSelected = deriveSiblingIds(selectedId, edges);
    for (const id of siblingsOfSelected) {
      // 推奨パス上のノード、推奨パスの兄弟、選択パス上のノードは除外
      if (!recommendedPathIds.has(id) && !recommendedPathSiblingIds.has(id) && !selectedPathIds.has(id)) {
        siblingIds.add(id);
      }
    }
  }

  // 3. 兄弟の子孫を特定（推奨パス上のノードと推奨パスの兄弟は除外）
  const siblingDescendantIds = new Set<string>();
  for (const siblingId of siblingIds) {
    const descendants = deriveDescendantIds(siblingId, edges);
    for (const id of descendants) {
      // 推奨パス上のノードと推奨パスの兄弟は除外
      if (!recommendedPathIds.has(id) && !recommendedPathSiblingIds.has(id)) {
        siblingDescendantIds.add(id);
      }
    }
  }

  // 4. 選択されたノードの子を特定（エッジベース）
  const childIds = deriveChildIds(selectedNodeId, edges);

  // デバッグ情報
  console.log("[deriveVisualState] Calculated relations:", {
    selectedNodeId,
    selectedNodeDepth,
    previousSelectionInSameColumn,
    selectedPathIds: Array.from(selectedPathIds),
    recommendedPathIds: Array.from(recommendedPathIds),
    recommendedPathSiblingIds: Array.from(recommendedPathSiblingIds),
    recommendedPathSiblingDescendantIds: Array.from(recommendedPathSiblingDescendantIds),
    siblingIds: Array.from(siblingIds),
    siblingDescendantIds: Array.from(siblingDescendantIds),
    childIds,
  });

  // 5. ノード状態を一括計算
  // 新しいロジック:
  // - 選択パス上のノード（selected）はそのまま
  // - 推奨パス上のノード（isRecommended=true）はそのまま
  // - 選択されたノードの子は活性化
  // - それ以外（選択パス上にもない、推奨パス上にもない）はdimmed
  const updatedNodes = nodes.map(node => {
    // 5.0 Phase 8+: 同じ列の前の選択 → dimmed（選択変更）
    if (previousSelectionInSameColumn && node.id === previousSelectionInSameColumn) {
      return {
        ...node,
        status: "dimmed" as const,
        pathRole: undefined,
        selectedAt: undefined,
      };
    }

    // 5.1 選択されたノード → selected
    if (node.id === selectedNodeId) {
      return {
        ...node,
        status: "selected" as const,
        pathRole: "selected" as const,
        selectedAt: timestamp,
      };
    }

    // 5.2 既に選択済みのノード（選択パス上）→ 状態維持
    if (selectedPathIds.has(node.id)) {
      return node;
    }

    // 5.3 推奨パス上のノード → 状態維持（dimmedにしない）
    if (recommendedPathIds.has(node.id)) {
      return node;
    }

    // 5.3.5 推奨パス上のノードの兄弟（LLM生成時の代替選択肢）→ 状態維持
    // これらは選択可能な代替選択肢としてdimmedにしない
    if (recommendedPathSiblingIds.has(node.id)) {
      return node;
    }

    // 5.3.6 推奨パスの兄弟の子孫 → dimmed（兄弟が選択されるまで非表示）
    // 兄弟自身は表示するが、その子孫は親が選択されてから表示
    if (recommendedPathSiblingDescendantIds.has(node.id)) {
      return {
        ...node,
        status: "dimmed" as const,
      };
    }

    // 5.4 選択されたノードの子で locked → 活性化
    if (childIds.includes(node.id) && node.status === "locked") {
      const newStatus = node.pathRole === "recommended" ? "recommended" : "available";
      return {
        ...node,
        status: newStatus as typeof node.status,
      };
    }

    // 5.5 選択されたノードの子で dimmed → 再活性化
    if (childIds.includes(node.id) && node.status === "dimmed") {
      const newStatus = node.pathRole === "recommended" ? "recommended" : "available";
      return {
        ...node,
        status: newStatus as typeof node.status,
      };
    }

    // 5.6 選択されたノードの子で available → 状態維持
    if (childIds.includes(node.id)) {
      return node;
    }

    // 5.7 兄弟ノードまたは兄弟の子孫 → dimmed
    if (siblingIds.has(node.id) || siblingDescendantIds.has(node.id)) {
      return {
        ...node,
        status: "dimmed" as const,
      };
    }

    // 5.8 選択パスにも推奨パスにも属さないノードで、
    // available/lockedステータスのもの → dimmed
    // これにより、選択されていない分岐の子孫もdimmedになる
    if (node.status === "available" || node.status === "locked") {
      // このノードが選択パスまたは推奨パスの直接の子孫かどうかを確認
      // エッジを辿って、選択パスまたは推奨パス上のノードに接続されているか
      const parentEdge = edges.find(e => e.target === node.id);
      if (parentEdge) {
        const parentId = parentEdge.source;
        // 親が選択パス上か推奨パス上かをチェック
        if (!selectedPathIds.has(parentId) && !recommendedPathIds.has(parentId)) {
          // 親が選択パスにも推奨パスにもない → dimmed
          return {
            ...node,
            status: "dimmed" as const,
          };
        }
      }
    }

    // 5.9 その他は変更なし
    return node;
  });

  // 6. エッジ状態を一括計算
  // 推奨パス上のエッジ（source または target が推奨パス）は維持
  const updatedEdges = edges.map(edge => {
    // 6.0 Phase 8+: 同じ列の前の選択へのエッジ → dimmed（選択変更）
    if (previousSelectionInSameColumn && edge.target === previousSelectionInSameColumn) {
      return {
        ...edge,
        type: "dimmed" as const,
      };
    }

    // 6.1 選択されたノードへのエッジ → selected
    if (edge.target === selectedNodeId) {
      return {
        ...edge,
        type: "selected" as const,
      };
    }

    // 6.2 選択パス上のノードへのエッジ → selected（過去の選択も含む）
    if (selectedPathIds.has(edge.target) && edge.target !== selectedNodeId) {
      // 既にselectedになっているはず
      return {
        ...edge,
        type: "selected" as const,
      };
    }

    // 6.3 推奨パス上のエッジ → 維持（dimmedにしない）
    // 推奨パスに関連するエッジ（source または target が推奨パス上）は現状維持
    if (recommendedPathIds.has(edge.target) || recommendedPathIds.has(edge.source)) {
      return edge;
    }

    // 6.4 兄弟ノードへのエッジ → dimmed
    if (siblingIds.has(edge.target)) {
      return {
        ...edge,
        type: "dimmed" as const,
      };
    }

    // 6.5 兄弟の子孫へのエッジ → dimmed
    if (siblingDescendantIds.has(edge.target) || siblingDescendantIds.has(edge.source)) {
      return {
        ...edge,
        type: "dimmed" as const,
      };
    }

    // 6.6 選択されたノードの子へのエッジで locked → 活性化
    if (childIds.includes(edge.target)) {
      const childNode = updatedNodes.find(n => n.id === edge.target);
      if (childNode && (childNode.status === "recommended" || childNode.status === "available")) {
        const newType = childNode.pathRole === "recommended" ? "recommended" : "available";
        return {
          ...edge,
          type: newType as typeof edge.type,
        };
      }
    }

    // 6.7 その他は変更なし
    return edge;
  });

  return {
    nodes: updatedNodes,
    edges: updatedEdges,
    debug: {
      selectedPathIds: Array.from(selectedPathIds),
      siblingIds: Array.from(siblingIds),
      siblingDescendantIds: Array.from(siblingDescendantIds),
      childIds,
      recommendedPathIds: Array.from(recommendedPathIds),
    },
  };
}
