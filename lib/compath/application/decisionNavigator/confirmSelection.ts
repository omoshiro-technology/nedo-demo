/**
 * 選択の確定・取り消し
 */

import type {
  DecisionNavigatorSession,
  DecisionChatMessage,
} from "./types";
import { SessionStore } from "./sessionStore";
import { generateConfirmationResponse } from "./chat";
import { generateId, getTimestamp } from "./utils";

export type ConfirmSelectionRequest = {
  summary?: string; // 決定サマリー（ユーザー入力可能）
};

/**
 * 選択を確定し、履歴に記録
 */
export async function confirmSelection(
  sessionId: string,
  request: ConfirmSelectionRequest
): Promise<DecisionNavigatorSession | null> {
  const session = SessionStore.findById(sessionId);
  if (!session || !session.pendingSelection) return null;

  const now = getTimestamp();
  const pending = session.pendingSelection;

  // 履歴に追加
  const newHistory = {
    id: generateId(),
    nodeId: pending.nodeId,
    nodeLabel: pending.nodeLabel,
    level: pending.level,
    selectedAt: pending.selectedAt,
    summary: request.summary || pending.nodeLabel, // サマリー（未入力ならラベルを使用）
    confirmedAt: now,
  };

  // AI応答を生成
  const aiResponse = await generateConfirmationResponse(session, pending.nodeLabel);

  // チャットメッセージを追加
  const aiMessage: DecisionChatMessage = {
    id: generateId(),
    role: "assistant",
    content: aiResponse,
    timestamp: getTimestamp(),
    relatedNodeId: pending.nodeId,
    type: "confirmation",
  };

  const updatedSession: DecisionNavigatorSession = {
    ...session,
    selectionHistory: [...session.selectionHistory, newHistory],
    chatHistory: [...session.chatHistory, aiMessage],
    pendingSelection: undefined, // クリア
    updatedAt: getTimestamp(),
  };

  SessionStore.save(updatedSession);
  return updatedSession;
}

/**
 * 選択を取り消し（1つ前に戻る）
 */
export function undoSelection(sessionId: string): DecisionNavigatorSession | null {
  const session = SessionStore.findById(sessionId);
  if (!session || session.selectionHistory.length <= 1) return null;

  const lastSelection = session.selectionHistory.at(-1);
  if (!lastSelection) return null;

  // 最後の選択を取り消し
  const previousHistory = session.selectionHistory.slice(0, -1);
  const previousNodeId = previousHistory.at(-1)?.nodeId ?? session.nodes[0]?.id;

  // ノードの状態を更新
  const updatedNodes = session.nodes.map((node) => {
    if (node.id === lastSelection.nodeId) {
      return {
        ...node,
        status: "available" as const,
        selectedAt: undefined,
      };
    }
    // 兄弟ノードを available に戻す
    const lastSelectedNode = session.nodes.find(
      (n) => n.id === lastSelection.nodeId
    );
    if (lastSelectedNode && node.parentId === lastSelectedNode.parentId) {
      return {
        ...node,
        status: "available" as const,
      };
    }
    return node;
  });

  // 子ノードを削除（最後に選択したノードの子）
  const lastSelectedNode = session.nodes.find(
    (n) => n.id === lastSelection.nodeId
  );
  const childIds = lastSelectedNode?.childIds ?? [];
  const filteredNodes = updatedNodes.filter((n) => !childIds.includes(n.id));

  // 対応するエッジも削除
  const filteredEdges = session.edges
    .filter(
      (e) => !childIds.includes(e.target) && e.target !== lastSelection.nodeId
    )
    .map((edge) => {
      // 選択されていたエッジを available に戻す
      if (edge.target === lastSelection.nodeId) {
        return { ...edge, type: "available" as const };
      }
      return edge;
    });

  const updatedSession: DecisionNavigatorSession = {
    ...session,
    nodes: filteredNodes,
    edges: filteredEdges,
    currentNodeId: previousNodeId ?? session.nodes[0]?.id ?? "",
    selectionHistory: previousHistory,
    updatedAt: getTimestamp(),
    stats: {
      ...session.stats,
      totalNodes: filteredNodes.length,
      selectedNodes: session.stats.selectedNodes - 1,
    },
  };

  SessionStore.save(updatedSession);
  return updatedSession;
}
