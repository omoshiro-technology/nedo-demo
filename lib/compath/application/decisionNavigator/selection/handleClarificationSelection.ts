/**
 * 聞き出しノードの選択処理
 */

import { generateId } from "../utils";
import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  DecisionFlowEdge,
  DecisionChatMessage,
  RecordSelectionRequest,
  GenerateOptionsResponse,
} from "../types";
import { SessionStore } from "../sessionStore";
import { generateInitialOptions } from "../generateOptions";
import {
  CLARIFICATION_TEMPLATES,
  updateClarificationPhase,
  extractKeywordsFromPhase,
} from "../clarification";
import { generateRationalePresets } from "../../../domain/decisionNavigator/rationalePresets";
import { CLARIFICATION_LAYOUT } from "../../../domain/decisionNavigator/layoutConstants";

export type ClarificationSelectionResult = {
  session: DecisionNavigatorSession;
  nextOptions: GenerateOptionsResponse;
};

/**
 * 聞き出しノードが選択された場合の処理
 */
export async function handleClarificationSelection(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  request: RecordSelectionRequest,
  now: string
): Promise<ClarificationSelectionResult> {
  const phase = session.clarificationPhase!;

  // 選択されたオプションのIDを特定（ノードIDから抽出）
  const template = CLARIFICATION_TEMPLATES[phase.currentCategory];
  const nodeIndex = session.nodes
    .filter((n) => n.type === "clarification")
    .findIndex((n) => n.id === selectedNode.id);
  const selectedOptionId = template.options[nodeIndex]?.id ?? "";

  // フェーズを更新
  const updatedPhase = updateClarificationPhase(
    phase,
    selectedOptionId,
    phase.completedCategories.length === 0
      ? ["problem_area", "severity"] // 初回は問題領域と深刻度
      : ["severity"] // 2回目以降
  );

  // ノードの状態を更新
  const updatedNodes = session.nodes.map((node) => {
    if (node.id === selectedNode.id) {
      return { ...node, status: "selected" as const, selectedAt: now };
    }
    if (node.parentId === selectedNode.parentId && node.id !== selectedNode.id) {
      return { ...node, status: "dimmed" as const };
    }
    return node;
  });

  // エッジの状態を更新
  const updatedEdges = session.edges.map((edge) => {
    if (edge.target === selectedNode.id) {
      return { ...edge, type: "selected" as const };
    }
    const selectedEdge = session.edges.find((e) => e.target === selectedNode.id);
    if (selectedEdge && edge.source === selectedEdge.source && edge.target !== selectedNode.id) {
      return { ...edge, type: "dimmed" as const };
    }
    return edge;
  });

  // 聞き出しが完了したかどうか
  if (!updatedPhase.isActive) {
    // 蓄積したキーワードを抽出
    const collectedKeywords = extractKeywordsFromPhase(updatedPhase);

    // 本来の選択肢を生成
    const enrichedPurpose = `${session.purpose} （${collectedKeywords.join("、")}）`;
    const initialOptions = await generateInitialOptions(enrichedPurpose, "");

    // 選択肢ノードを作成
    const optionCount = initialOptions.options.length;
    const parentX = selectedNode.position?.x ?? 0;
    const parentY = selectedNode.position?.y ?? 0;

    const optionNodes: DecisionFlowNode[] = initialOptions.options.map((option, index) => {
      const centerOffset = ((optionCount - 1) / 2) * CLARIFICATION_LAYOUT.NODE_SPACING_X;
      const hasPastCase = option.relatedPastCases.length > 0;

      // 選択理由プリセットを動的生成
      const rationalePresets = generateRationalePresets({
        riskStrategy: option.riskStrategy,
        riskCategories: option.riskCategories,
        hasPastCase,
        isRecommended: option.isRecommended,
      });

      return {
        id: `node-${session.id}-option-${Date.now()}-${index}`,
        type: "decision" as const,
        level: "strategy" as const,
        label: option.label,
        description: option.description,
        confidence: option.confidence,
        riskLevel: option.riskLevel,
        riskStrategy: option.riskStrategy,
        riskCategories: option.riskCategories,
        hasPastCase,
        pastCaseCount: option.relatedPastCases.length,
        pastCases: option.relatedPastCases,
        isRecommended: option.isRecommended,
        recommendationReason: option.recommendationReason,
        rationalePresets, // 動的生成されたプリセット
        status: "available" as const,
        position: {
          x: index * CLARIFICATION_LAYOUT.NODE_SPACING_X - centerOffset + parentX,
          y: parentY - CLARIFICATION_LAYOUT.NODE_SPACING_Y,
        },
        parentId: selectedNode.id,
        createdAt: now,
        source: option.source,
      };
    });

    // エッジを作成
    const newEdges: DecisionFlowEdge[] = optionNodes.map((node) => ({
      id: `edge-${selectedNode.id}-${node.id}`,
      source: selectedNode.id,
      target: node.id,
      type: "available" as const,
      isRecommended: node.isRecommended,
    }));

    // 選択されたノードに子IDを追加
    const finalNodes = updatedNodes.map((node) => {
      if (node.id === selectedNode.id) {
        return { ...node, childIds: optionNodes.map((n) => n.id), isExpanded: true };
      }
      return node;
    });

    // チャットメッセージを追加
    const aiMessage: DecisionChatMessage = {
      id: generateId(),
      role: "assistant",
      content: `ありがとうございます。「${selectedNode.label}」ですね。\n\n状況が把握できました。それでは、具体的な選択肢を検討していきましょう。`,
      timestamp: now,
      type: "text",
    };

    const updatedSession: DecisionNavigatorSession = {
      ...session,
      nodes: [...finalNodes, ...optionNodes],
      edges: [...updatedEdges, ...newEdges],
      currentNodeId: selectedNode.id,
      chatHistory: [...session.chatHistory, aiMessage],
      clarificationPhase: undefined, // 聞き出しフェーズ終了
      updatedAt: now,
      stats: {
        totalNodes: finalNodes.length + optionNodes.length,
        selectedNodes: session.stats.selectedNodes + 1,
        pastCasesUsed: optionNodes.filter((n) => n.hasPastCase).length,
      },
    };

    await SessionStore.save(updatedSession);

    return {
      session: updatedSession,
      nextOptions: initialOptions,
    };
  }

  // まだ聞き出しが続く場合は次の聞き出し選択肢を生成
  const nextTemplate = CLARIFICATION_TEMPLATES[updatedPhase.currentCategory];
  const parentX = selectedNode.position?.x ?? 0;
  const parentY = selectedNode.position?.y ?? 0;

  const clarificationNodes: DecisionFlowNode[] = nextTemplate.options.map((option, index) => {
    const optionCount = nextTemplate.options.length;
    const centerOffset = ((optionCount - 1) / 2) * CLARIFICATION_LAYOUT.NODE_SPACING_X;
    return {
      id: `node-clarify-${session.id}-${Date.now()}-${index}`,
      type: "clarification" as const,
      level: "strategy" as const,
      label: option.label,
      description: undefined,
      confidence: undefined,
      riskLevel: undefined,
      hasPastCase: false,
      pastCaseCount: 0,
      pastCases: [],
      isRecommended: false,
      status: "available" as const,
      position: {
        x: index * CLARIFICATION_LAYOUT.NODE_SPACING_X - centerOffset + parentX,
        y: parentY - CLARIFICATION_LAYOUT.NODE_SPACING_Y,
      },
      parentId: selectedNode.id,
      createdAt: now,
      source: "ai_generated" as const,
    };
  });

  // エッジを作成
  const newEdges: DecisionFlowEdge[] = clarificationNodes.map((node) => ({
    id: `edge-${selectedNode.id}-${node.id}`,
    source: selectedNode.id,
    target: node.id,
    type: "available" as const,
  }));

  // 選択されたノードに子IDを追加
  const finalNodes = updatedNodes.map((node) => {
    if (node.id === selectedNode.id) {
      return { ...node, childIds: clarificationNodes.map((n) => n.id), isExpanded: true };
    }
    return node;
  });

  // チャットメッセージを追加
  const aiMessage: DecisionChatMessage = {
    id: generateId(),
    role: "assistant",
    content: `「${selectedNode.label}」ですね。\n\n${nextTemplate.question}`,
    timestamp: now,
    type: "text",
  };

  const updatedSession: DecisionNavigatorSession = {
    ...session,
    nodes: [...finalNodes, ...clarificationNodes],
    edges: [...updatedEdges, ...newEdges],
    currentNodeId: selectedNode.id,
    chatHistory: [...session.chatHistory, aiMessage],
    clarificationPhase: updatedPhase,
    updatedAt: now,
    stats: {
      totalNodes: finalNodes.length + clarificationNodes.length,
      selectedNodes: session.stats.selectedNodes + 1,
      pastCasesUsed: 0,
    },
  };

  await SessionStore.save(updatedSession);

  return {
    session: updatedSession,
    nextOptions: { options: [], warnings: ["聞き出しフェーズ継続中"] },
  };
}
