/**
 * 代替選択肢の展開/折りたたみ
 * - 指定したノードの代替選択肢を展開または折りたたむ
 * - 展開時にdecisionPointsからノード情報を取得して追加
 * - 折りたたみ時にノードを非表示（削除）
 */

import { SessionStore } from "./sessionStore";
import { getTimestamp } from "./utils";
import type { DecisionNavigatorSession, DecisionFlowEdge } from "./types";
import { LAYOUT } from "../../domain/decisionNavigator/layoutConstants";

export type ToggleAlternativesRequest = {
  sessionId: string;
  nodeId: string;
  expand: boolean; // true: 展開, false: 折りたたみ
};

export async function toggleAlternatives(
  request: ToggleAlternativesRequest
): Promise<DecisionNavigatorSession | null> {
  const session = SessionStore.findById(request.sessionId);
  if (!session) {
    return null;
  }

  // 対象ノードを検索
  const targetNode = session.nodes.find((n) => n.id === request.nodeId);
  if (!targetNode) {
    return null;
  }

  // このノードに関連するdecisionPointを検索
  const decisionPoint = session.decisionPoints?.find(
    (dp) => dp.nodeId === request.nodeId
  );

  if (!decisionPoint || decisionPoint.alternatives.length === 0) {
    // 代替選択肢がない場合は何もしない
    return session;
  }

  if (request.expand) {
    // === 展開時 ===
    // decisionPointsから代替選択肢のノード情報を取得してnodesに追加

    const alternativeNodeIds: string[] = [];
    const newNodes = [...session.nodes];
    const newEdges = [...session.edges];

    for (const alt of decisionPoint.alternatives) {
      // 既にノードが存在するかチェック
      const existingNode = newNodes.find((n) => n.id === alt.childNodeId);
      if (existingNode) {
        // 既存ノードのステータスを更新
        existingNode.status = "available";
        alternativeNodeIds.push(alt.childNodeId);
      } else if (alt.nodeData) {
        // nodeDataからノードを追加
        const nodeToAdd = { ...alt.nodeData, status: "available" as const };

        // 位置を計算（親ノードの位置を基準に、代替案は右側に配置）
        const parentY = targetNode.position?.y ?? 0;
        const altIndex = decisionPoint.alternatives.indexOf(alt);
        // lane番号を取得（数値）：nodeDataから取得、なければ連番
        const laneIndex = typeof alt.nodeData.lane === "number" ? alt.nodeData.lane : altIndex + 1;

        nodeToAdd.position = {
          x: LAYOUT.LEFT_X + LAYOUT.LANE_SPACING_X * laneIndex,
          y: parentY - LAYOUT.NODE_SPACING_Y,
        };

        newNodes.push(nodeToAdd);
        alternativeNodeIds.push(alt.childNodeId);

        // エッジも追加
        const newEdge: DecisionFlowEdge = {
          id: alt.edgeId,
          source: request.nodeId,
          target: alt.childNodeId,
          type: "alternative",
        };
        newEdges.push(newEdge);
      }
    }

    // ターゲットノードのalternatives情報とchildIdsを更新
    const updatedNodes = newNodes.map((node) => {
      if (node.id === request.nodeId) {
        const currentChildIds = node.childIds ?? [];
        // 推奨ノードのIDを保持しつつ、代替ノードを追加
        const newChildIds = [...new Set([...currentChildIds, ...alternativeNodeIds])];
        return {
          ...node,
          childIds: newChildIds,
          alternatives: node.alternatives
            ? {
                ...node.alternatives,
                expanded: true,
                visibleCount: alternativeNodeIds.length,
              }
            : undefined,
        };
      }
      return node;
    });

    // セッションを更新
    session.nodes = updatedNodes;
    session.edges = newEdges;
  } else {
    // === 折りたたみ時 ===
    // 代替選択肢のノードとエッジを削除（推奨パスは残す）

    const alternativeNodeIds = decisionPoint.alternatives.map((alt) => alt.childNodeId);
    const alternativeEdgeIds = decisionPoint.alternatives.map((alt) => alt.edgeId);

    // 代替ノードを削除
    const filteredNodes = session.nodes.filter(
      (node) => !alternativeNodeIds.includes(node.id)
    );

    // 代替エッジを削除
    const filteredEdges = session.edges.filter(
      (edge) => !alternativeEdgeIds.includes(edge.id)
    );

    // ターゲットノードのchildIdsから代替ノードを削除
    const updatedNodes = filteredNodes.map((node) => {
      if (node.id === request.nodeId) {
        const currentChildIds = node.childIds ?? [];
        const newChildIds = currentChildIds.filter(
          (id) => !alternativeNodeIds.includes(id)
        );
        return {
          ...node,
          childIds: newChildIds,
          alternatives: node.alternatives
            ? {
                ...node.alternatives,
                expanded: false,
                visibleCount: 0,
              }
            : undefined,
        };
      }
      return node;
    });

    session.nodes = updatedNodes;
    session.edges = filteredEdges;
  }

  session.updatedAt = getTimestamp();
  SessionStore.save(session);

  return session;
}
