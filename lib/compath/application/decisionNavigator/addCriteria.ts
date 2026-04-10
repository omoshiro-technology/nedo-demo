/**
 * 判断軸追加機能
 *
 * 既存の選択状態を保持したまま、新しい判断軸を右端に追加する。
 * - 既存の軸と重複しない観点をLLMで生成
 * - 結果に影響しない意思決定は追加しない
 */

import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { SessionStore } from "./sessionStore";
import { generateId, getTimestamp } from "./utils";
import { LAYOUT_V2 } from "../../domain/decisionNavigator/layoutConstants";
import {
  createCriteriaNode,
  createOptionNode,
  createExplorationNode,
  createEdge,
} from "../../domain/decisionNavigator/nodeFactories";
import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  DecisionFlowEdge,
  CriteriaLabel,
  ColumnState,
} from "./types";
import {
  ADD_CRITERIA_SYSTEM_PROMPT,
  buildAddCriteriaPrompt,
  type AddCriteriaContext,
  type AddCriteriaLLMResponse,
} from "./llm/addCriteriaPrompt";

// ============================================================
// 型定義
// ============================================================

export type AddCriteriaResult = {
  success: true;
  session: DecisionNavigatorSession;
  addedCriteria: CriteriaLabel;
  addedNodes: DecisionFlowNode[];
} | {
  success: false;
  reason: string;
};

// ============================================================
// メイン関数
// ============================================================

/**
 * セッションに新しい判断軸を追加
 */
export async function addCriteria(sessionId: string): Promise<AddCriteriaResult> {
  const session = await SessionStore.findById(sessionId);
  if (!session) {
    return { success: false, reason: "セッションが見つかりません" };
  }

  // 既存の判断軸情報を収集
  const existingCriteria = (session.criteriaLabels || []).map(c => ({
    question: c.question,
    description: c.description,
  }));

  // 既に選択済みのオプションを収集
  const selectedNodes = session.nodes.filter(n => n.status === "selected");
  const selectedOptions = selectedNodes.map(n => n.label);

  // コンテキストを構築
  const context: AddCriteriaContext = {
    purpose: session.purpose,
    existingCriteria,
    selectedOptions,
    constraints: session.decisionContext?.constraints,
    assumptions: session.decisionContext?.assumptions,
  };

  // LLM呼び出し
  let llmResponse: AddCriteriaLLMResponse;
  try {
    const prompt = buildAddCriteriaPrompt(context);
    const responseText = await generateChatCompletion({
      systemPrompt: ADD_CRITERIA_SYSTEM_PROMPT,
      userContent: prompt,
      maxTokens: 1500,
      temperature: 0.7,
    });

    llmResponse = parseJsonFromLLMResponse(responseText);
  } catch (error) {
    console.error("addCriteria LLM error:", error);
    return { success: false, reason: "AIによる判断軸生成に失敗しました" };
  }

  // 追加の意味がない場合
  if (!llmResponse.isRelevant) {
    return {
      success: false,
      reason: llmResponse.irrelevantReason || "追加すべき判断軸がありません",
    };
  }

  const now = getTimestamp();
  const newRowIndex = session.criteriaLabels?.length || 0;

  // 新しい判断軸ラベルを作成
  const newCriteriaLabel: CriteriaLabel = {
    id: llmResponse.criteria.id || generateId(),
    columnIndex: newRowIndex,
    question: llmResponse.criteria.question,
    description: llmResponse.criteria.description,
    order: newRowIndex + 1,
    orderReason: "ユーザーが追加",
  };

  // 判断軸ノードを作成
  const criteriaBaseY = LAYOUT_V2.START_Y + newRowIndex * LAYOUT_V2.ROW_SPACING;
  const criteriaNode = createCriteriaNode({
    id: newCriteriaLabel.id,
    question: llmResponse.criteria.question,
    description: llmResponse.criteria.description,
    rowIndex: newRowIndex,
    position: { x: LAYOUT_V2.START_X, y: criteriaBaseY },
    veteranInsight: llmResponse.criteria.veteranInsight,
    withNumber: true,
    lane: 0,
  });

  const newNodes: DecisionFlowNode[] = [criteriaNode];
  const newEdges: DecisionFlowEdge[] = [];

  // 選択肢ノードを作成
  const optionCount = llmResponse.options.length;

  llmResponse.options.forEach((option, optionIndex) => {
    const nodeId = option.id || generateId();
    const isRecommended = option.isRecommended ?? false;

    const optionNode = createOptionNode({
      id: nodeId,
      label: option.label,
      description: option.description,
      parentId: newCriteriaLabel.id,
      rowIndex: newRowIndex,
      optionIndex,
      totalOptions: optionCount,
      baseY: criteriaBaseY,
      isRecommended,
      riskStrategy: option.riskStrategy,
      rationale: option.rationale,
      baseX: LAYOUT_V2.START_X,
    });

    newNodes.push(optionNode);

    // 判断軸→選択肢のエッジ
    newEdges.push(createEdge({
      source: newCriteriaLabel.id,
      target: nodeId,
      type: isRecommended ? "selected" : "available",
    }));

    // 推奨ノードに探索ノードを追加
    if (isRecommended) {
      const explorationNode = createExplorationNode({
        parentNodeId: nodeId,
        parentPosition: optionNode.position,
        rowIndex: newRowIndex,
        lane: optionIndex + 2,
      });

      newNodes.push(explorationNode);

      newEdges.push(createEdge({
        source: nodeId,
        target: explorationNode.id,
        type: "available",
      }));
    }
  });

  // ゴールノードの位置を更新
  let maxOptionsInExistingRows = 0;
  for (const criteria of (session.criteriaLabels || [])) {
    const optionsInRow = session.nodes.filter(n => n.parentId === criteria.id).length;
    maxOptionsInExistingRows = Math.max(maxOptionsInExistingRows, optionsInRow);
  }

  const newMaxOptions = Math.max(maxOptionsInExistingRows, llmResponse.options.length);
  const totalRows = newRowIndex + 1;
  const goalX = LAYOUT_V2.START_X + newMaxOptions * LAYOUT_V2.OPTION_SPACING + LAYOUT_V2.GOAL_X_OFFSET;
  const goalY = LAYOUT_V2.START_Y + ((totalRows - 1) * LAYOUT_V2.ROW_SPACING) / 2;

  const updatedNodes = session.nodes.map(node => {
    if (node.type === "outcome" || node.level === "outcome") {
      return { ...node, position: { x: goalX, y: goalY } };
    }
    return node;
  });

  // セッションを更新
  const updatedSession: DecisionNavigatorSession = {
    ...session,
    criteriaLabels: [...(session.criteriaLabels || []), newCriteriaLabel],
    columnStates: [...(session.columnStates || []), "active" as ColumnState],
    totalColumns: (session.totalColumns || 0) + 1,
    nodes: [...updatedNodes, ...newNodes],
    edges: [...session.edges, ...newEdges],
    updatedAt: now,
  };

  await SessionStore.save(updatedSession);

  return {
    success: true,
    session: updatedSession,
    addedCriteria: newCriteriaLabel,
    addedNodes: newNodes,
  };
}
