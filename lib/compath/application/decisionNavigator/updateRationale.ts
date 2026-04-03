/**
 * 選択済み/推奨ノードの理由（rationale）を更新する
 * - 子孫ノードを削除せずに理由のみを更新
 */

import { SessionStore } from "./sessionStore";
import { getTimestamp } from "./utils";
import type { DecisionNavigatorSession } from "./types";

export interface UpdateRationaleRequest {
  sessionId: string;
  nodeId: string;
  rationale?: string;
}

/**
 * 選択済み/推奨ノードの理由を更新
 */
export async function updateRationale(
  request: UpdateRationaleRequest
): Promise<DecisionNavigatorSession> {
  const session = await SessionStore.findById(request.sessionId);
  if (!session) {
    throw new Error("セッションが見つかりません");
  }

  // 対象ノードの存在と状態を確認
  const targetNode = session.nodes.find((n) => n.id === request.nodeId);
  if (!targetNode) {
    throw new Error("ノードが見つかりません");
  }

  // 選択済み または 推奨パス上のノードのみ更新可能
  if (targetNode.status !== "selected" && targetNode.status !== "recommended") {
    throw new Error("選択済みまたは推奨パス上のノードではありません");
  }

  const now = getTimestamp();

  // ノードのステータスを更新（理由を設定した時点で確定とみなす）
  let updatedNodes = session.nodes.map((node) => {
    if (node.id === request.nodeId && node.status === "recommended") {
      return {
        ...node,
        status: "selected" as const, // 確定
        selectedAt: now,
      };
    }
    return node;
  });

  // Phase 26: 理由が設定された場合、関連する探索ノードを表示
  // ただし、2階層目（探索で追加された判断軸）の場合は表示しない
  const explorationNodeId = `exploration-${request.nodeId}`;
  // explorationDepthは動的に追加されるプロパティ
  const targetNodeExplorationDepth = (targetNode as { explorationDepth?: number }).explorationDepth ?? 0;
  const isAtMaxExplorationDepth = targetNodeExplorationDepth >= 1;

  if (request.rationale && !isAtMaxExplorationDepth) {
    // 関連する探索ノードのstatusをavailableに更新（1階層目のみ）
    updatedNodes = updatedNodes.map((node) => {
      if (node.id === explorationNodeId && node.status === "hidden") {
        return {
          ...node,
          status: "available" as const,
        };
      }
      return node;
    });
  }

  // エッジの rationale を更新
  // 理由を設定した時点で「ユーザーが確定した」とみなし、エッジタイプを selected に変更
  const updatedEdges = session.edges.map((edge) => {
    if (edge.target === request.nodeId && (edge.type === "selected" || edge.type === "recommended")) {
      return {
        ...edge,
        type: "selected" as const, // 確定したので実線にする
        rationale: request.rationale,
      };
    }
    return edge;
  });

  // セッションを更新
  session.nodes = updatedNodes;
  session.edges = updatedEdges;
  session.updatedAt = now;

  // 保存
  await SessionStore.save(session);

  return session;
}
