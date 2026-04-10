/**
 * 選択の記録
 * - LLM統合: context更新・終了判定・clarification処理
 */

import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  DecisionFlowEdge,
  DecisionChatMessage,
  RecordSelectionRequest,
  GenerateOptionsResponse,
  PendingSelection,
  ClarificationState,
  GoalState,
  ColumnState,
  RadialOption,
} from "./types";
import { SessionStore } from "./sessionStore";
import { sessionRepository } from "./sessionRepository";
import { generateNextOptions, generateNextOptionsWithLLM, collectThreeSetData } from "./generateOptions";
import { generateRationalePresets } from "../../domain/decisionNavigator/rationalePresets";
import { computeSelectability } from "../../domain/decisionNavigator/selectability";
import { LAYOUT } from "../../domain/decisionNavigator/layoutConstants";
import { updateContextWithSelection, getOrCreateContext } from "./contextBuilder";
import { env } from "../../config/env";
import { debugLog } from "../../infrastructure/logger";
import { getPrefetchedOptions, startPrefetch } from "./prefetch";
import { generateId, getTimestamp } from "./utils";

// 分割されたモジュールからインポート
import { collectDescendantIds } from "./selection/utils";
import type { RiskDetail } from "./types";
import type { RiskStrategy, RiskLevel } from "./types";

// Phase 7: DecisionProperty生成
import { generateDecisionProperty, type GenerateDecisionPropertyContext } from "./decisionPropertyGenerator";

// Phase 9: Capitalizer Agent - 自動知見抽出
import { autoExtractInsightFromSelection } from "./capitalizer/insightExtractor";

// 分割されたモジュールからインポート
import { generateSelectionAdviceAsync } from "./selectionAdvice";
import { generateRiskDetailFromStrategy } from "./selectionAdvice";

// 視覚状態計算（純粋関数）
import { deriveVisualState } from "../../domain/decisionNavigator/visualState";

import { handleClarificationSelection } from "./selection/handleClarificationSelection";

// Phase 3: 目的達成判定
import { inferGoalDefinition } from "./goalDefinition";
import { evaluateGoalCompletion } from "./goalEvaluation";
import { generateFollowupMessage } from "./followups";

// Phase Strategy: 思考戦略によるゴール距離計算
import { getStrategyOrUndefined } from "../../domain/decisionNavigator/strategies/strategyRegistry";

// Re-export split modules for backward compatibility
export { confirmSelection, undoSelection } from "./confirmSelection";
export type { ConfirmSelectionRequest } from "./confirmSelection";


/** 3セット情報（条件・事例・推論） */
export type ThreeSetInfo = {
  conditions: Array<{
    id: string;
    label: string;
    category: string;
    description: string;
    confidence?: number;
  }>;
  pastCases: Array<{
    id: string;
    sourceFileName: string;
    content: string;
    similarity: number;
  }>;
  inferredPriorities: string[];
};

export type RecordSelectionResult = {
  session: DecisionNavigatorSession;
  nextOptions: GenerateOptionsResponse;
  /** Phase 5改: 3セット情報（思考支援の経過） */
  threeSetInfo?: ThreeSetInfo;
  /** Phase 25: 選択に対するAIアドバイスメッセージ */
  selectionAdvice?: {
    message: string;
    impactPoints?: string[];
    considerations?: string[];
  };
};

/**
 * 選択を記録し、次の選択肢を生成（pendingSelectionに設定、履歴には未記録）
 */
export async function recordSelection(
  sessionId: string,
  request: RecordSelectionRequest
): Promise<RecordSelectionResult | null> {
  const session = await SessionStore.findById(sessionId);
  if (!session) return null;

  const now = getTimestamp();

  // ============================================================
  // Phase 22: 放射状展開からの選択処理
  // criteriaNode (level: "criteria") が選択され、optionIdが指定された場合
  // 選択されたオプションを新しいノードとして作成し、判断軸ノードの横に配置
  // ============================================================
  if (request.optionId) {
    const criteriaNode = session.nodes.find((n) => n.id === request.nodeId);
    if (!criteriaNode || criteriaNode.level !== "criteria") {
      console.error("[recordSelection] Phase 22: Invalid criteria node for radial selection:", request.nodeId);
      return null;
    }

    // radialOptionsから選択されたオプションを取得
    const radialOptions = (criteriaNode as typeof criteriaNode & { radialOptions?: import("./types").RadialOption[] }).radialOptions ?? [];
    const selectedOption = radialOptions.find(opt => opt.id === request.optionId);
    if (!selectedOption) {
      console.error("[recordSelection] Phase 22: Option not found:", request.optionId);
      return null;
    }

    debugLog("recordSelection", "Phase 22: Processing radial option selection:", {
      criteriaId: criteriaNode.id,
      optionId: request.optionId,
      optionLabel: selectedOption.label,
    });

    // 選択されたオプションを新しいノードとして作成
    const optionNodeId = request.optionId; // optionIdをそのままノードIDとして使用
    const criteriaRowIndex = criteriaNode.depth ?? 0;

    // 新しいノードの作成（判断軸ノードの右側に配置）
    const newOptionNode: DecisionFlowNode = {
      id: optionNodeId,
      type: "action",
      level: "strategy",
      label: selectedOption.label,
      description: selectedOption.description,
      confidence: 70,
      riskLevel: "medium",
      riskStrategy: selectedOption.riskStrategy,
      status: "selected",
      pathRole: "selected",
      isRecommended: selectedOption.isRecommended,
      isSelectable: false, // 選択済みなので選択不可
      lane: 1, // 判断軸ノードの右側
      depth: criteriaRowIndex,
      position: {
        // 判断軸ノードの右側に配置
        x: criteriaNode.position.x + 250, // OPTION_SPACING
        y: criteriaNode.position.y,
      },
      parentId: criteriaNode.id,
      createdAt: now,
      selectedAt: now,
      source: "ai_generated",
    };

    // 既存のノードを更新（同じcriteriaの以前の選択を削除）
    const updatedNodes = session.nodes.filter(n => {
      // 同じcriteriaの以前の選択ノードを削除
      if (n.parentId === criteriaNode.id && n.level === "strategy") {
        return false;
      }
      return true;
    });

    // 新しい選択ノードを追加
    updatedNodes.push(newOptionNode);

    // 判断軸ノードから選択ノードへのエッジを作成
    const newEdgeId = `edge-${criteriaNode.id}-${optionNodeId}`;
    const updatedEdges = session.edges.filter(e => {
      // 同じcriteriaからの以前のselectedエッジを削除
      if (e.source === criteriaNode.id && e.type === "selected") {
        return false;
      }
      return true;
    });

    const newEdge: DecisionFlowEdge = {
      id: newEdgeId,
      source: criteriaNode.id,
      target: optionNodeId,
      type: "selected",
      isRecommended: selectedOption.isRecommended,
      rationale: request.rationale,
    };
    updatedEdges.push(newEdge);

    // 列の状態を更新
    const updatedColumnStates = session.columnStates ? [...session.columnStates] : [];
    if (criteriaRowIndex < updatedColumnStates.length) {
      updatedColumnStates[criteriaRowIndex] = "completed";
    }

    // 全列完了チェック（元の列のみ）
    const totalColumns = session.criteriaLabels?.length ?? 0;
    const origLabels = (session.criteriaLabels ?? []).filter(c => c.orderReason !== "探索により追加");
    const allColumnsCompleted = origLabels.length > 0 &&
      origLabels.every(c => updatedColumnStates[c.columnIndex] === "completed");

    if (allColumnsCompleted && totalColumns > 0) {
      debugLog("recordSelection", "Phase 22: All criteria completed - Goal achieved!");
      // ゴールノードを確定状態に
      const outcomeNode = updatedNodes.find(n => n.level === "outcome");
      if (outcomeNode) {
        outcomeNode.status = "selected";
        outcomeNode.pathRole = "selected";
        outcomeNode.selectedAt = now;
      }

      // 目的達成フロー
      const goalDefinition = session.goalDefinition ?? inferGoalDefinition(session.purpose);
      const goalState: GoalState = {
        status: "achieved",
        decisionValue: selectedOption.label,
        decidedAt: now,
        reason: "all criteria columns completed",
      };
      const followupMessage = generateFollowupMessage(
        goalDefinition.target,
        selectedOption.label
      );
      const completionChatMessage: DecisionChatMessage = {
        id: generateId(),
        role: "assistant",
        content: `✅ **目的達成**\n\n${followupMessage}`,
        timestamp: now,
        relatedNodeId: optionNodeId,
        type: "confirmation",
      };
      const pendingSelection: PendingSelection = {
        nodeId: optionNodeId,
        nodeLabel: selectedOption.label,
        level: "strategy",
        selectedAt: now,
        rationale: request.rationale,
      };
      const completedSession: DecisionNavigatorSession = {
        ...session,
        nodes: computeSelectability(updatedNodes),
        edges: updatedEdges,
        currentNodeId: optionNodeId,
        pendingSelection,
        columnStates: updatedColumnStates,
        goalDefinition,
        goalState,
        chatHistory: [...session.chatHistory, completionChatMessage],
        updatedAt: now,
        stats: {
          totalNodes: updatedNodes.length,
          selectedNodes: session.stats.selectedNodes + 1,
          pastCasesUsed: session.stats.pastCasesUsed,
        },
      };
      await SessionStore.save(completedSession);
      await sessionRepository.save(completedSession);
      return {
        session: completedSession,
        nextOptions: { options: [] },
      };
    }

    // pendingSelectionを設定
    const pendingSelection: PendingSelection = {
      nodeId: optionNodeId,
      nodeLabel: selectedOption.label,
      level: "strategy",
      selectedAt: now,
      rationale: request.rationale,
    };

    // Phase Strategy: 思考戦略によるゴール距離を再計算
    const nodesForGoal = computeSelectability(updatedNodes);
    let phase22GoalDistance = session.strategyGoalDistance;
    if (session.thinkingStrategy) {
      const strategy = getStrategyOrUndefined(session.thinkingStrategy);
      if (strategy) {
        try {
          phase22GoalDistance = strategy.calculateGoalDistance({
            id: session.id,
            purpose: session.purpose,
            nodes: nodesForGoal.map(n => ({
              id: n.id,
              type: n.type ?? "decision",
              status: n.status ?? "available",
              level: n.level,
              parentId: n.parentId,
            })),
            selectionHistory: session.selectionHistory.map(h => ({
              nodeId: h.nodeId,
              nodeLabel: h.nodeLabel,
              level: h.level,
            })),
          });
        } catch (goalErr) {
          console.warn("[recordSelection] Phase 22: Strategy goal distance calculation failed:", goalErr);
        }
      }
    }

    // セッションを更新
    const updatedSession: DecisionNavigatorSession = {
      ...session,
      nodes: nodesForGoal,
      edges: updatedEdges,
      currentNodeId: optionNodeId,
      pendingSelection,
      columnStates: updatedColumnStates,
      strategyGoalDistance: phase22GoalDistance,
      updatedAt: now,
      stats: {
        totalNodes: updatedNodes.length,
        selectedNodes: session.stats.selectedNodes + 1,
        pastCasesUsed: session.stats.pastCasesUsed,
      },
    };

    await SessionStore.save(updatedSession);
    await sessionRepository.save(updatedSession);

    return {
      session: updatedSession,
      nextOptions: { options: [] }, // Phase 22モードでは動的生成なし
    };
  }

  // ============================================================
  // 通常の選択処理（従来のロジック）
  // ============================================================
  const selectedNode = session.nodes.find((n) => n.id === request.nodeId);
  if (!selectedNode) return null;

  // 聞き出しフェーズの場合は特別な処理
  if (session.clarificationPhase?.isActive && selectedNode.type === "clarification") {
    return handleClarificationSelection(session, selectedNode, request, now);
  }

  // 同じ親を持つ兄弟で、すでに選択済み（selected）のノードを探す
  // 注意: 推奨パス（recommended）は常に残すため、削除対象から除外
  const siblingSelectedNode = session.nodes.find(
    n => n.parentId === selectedNode.parentId &&
         n.id !== request.nodeId &&
         n.status === "selected" // recommendedは除外（推奨パスは常に残す）
  );

  // 前の「ユーザー選択」の子孫ノードIDを収集（削除対象）
  // 推奨パスの子孫は削除しない
  let nodesToRemove: string[] = [];
  if (siblingSelectedNode) {
    // 推奨パス上のノードを除外して子孫を収集
    const allDescendants = collectDescendantIds(siblingSelectedNode.id, session.nodes);
    nodesToRemove = allDescendants.filter(id => {
      const node = session.nodes.find(n => n.id === id);
      return node?.pathRole !== "recommended"; // 推奨パスは削除しない
    });
  }

  // ============================================================
  // 視覚状態の計算
  // Phase 8モード: deriveVisualStateをスキップし、シンプルな状態更新のみ
  // 旧モード: 純粋関数で一発計算（段階的な上書きを排除）
  // ============================================================

  // 前の選択の子孫を削除したノード/エッジを準備
  const filteredNodes = session.nodes.filter(node => !nodesToRemove.includes(node.id));
  const filteredEdges = session.edges.filter(edge => !nodesToRemove.includes(edge.target));

  // Phase 8モードかどうかを判定（判断軸ラベルが存在する場合）
  const isPhase8Mode = session.criteriaLabels && session.criteriaLabels.length > 0;

  let updatedNodes: DecisionFlowNode[];
  let updatedEdges: DecisionFlowEdge[];

  if (isPhase8Mode) {
    // Phase 8: deriveVisualStateをスキップ
    // 事前生成済みの選択肢のみ使用するため、兄弟ノードをdimmedにする必要がない
    debugLog("recordSelection", "Phase 8 mode: Skipping deriveVisualState");

    // 選択されたノードの列（depth）を取得
    const selectedNodeDepth = selectedNode.depth;

    // シンプルなノード状態更新
    updatedNodes = filteredNodes.map(node => {
      // 今回選択されたノード → selected
      if (node.id === request.nodeId) {
        return {
          ...node,
          status: "selected" as const,
          pathRole: "selected" as const,
          selectedAt: now,
        };
      }

      // 同じ判断軸（parentId）の他のstrategyノード → dimmed（非表示ではなく薄く）
      // Note: depthだけでは探索で追加された別判断軸のノードも巻き込むため、parentIdで絞る
      if (selectedNodeDepth !== undefined && node.depth === selectedNodeDepth && node.level === "strategy" && node.parentId === selectedNode.parentId) {
        if (node.id !== request.nodeId) {
          return {
            ...node,
            status: "dimmed" as const,
            pathRole: node.isRecommended ? "recommended" as const : undefined,
            selectedAt: undefined,
          };
        }
      }

      // 既に選択済みの他の列のノード → 状態維持
      if (node.status === "selected") {
        return node;
      }

      // その他のノード → 状態維持（dimmedにしない）
      return node;
    });

    // シンプルなエッジ状態更新
    updatedEdges = filteredEdges.map(edge => {
      // 選択されたノードへのエッジ → selected
      if (edge.target === request.nodeId) {
        return {
          ...edge,
          type: "selected" as const,
        };
      }

      // 同じ判断軸の兄弟エッジ → dimmed（selectedだったものもavailableだったものも）
      const targetNode = filteredNodes.find(n => n.id === edge.target);
      if (selectedNodeDepth !== undefined &&
          targetNode?.depth === selectedNodeDepth &&
          targetNode?.level === "strategy" &&
          targetNode?.parentId === selectedNode.parentId &&
          edge.target !== request.nodeId) {
        return { ...edge, type: "dimmed" as const };
      }

      // その他は維持
      return edge;
    });
  } else {
    // 旧モード: 純粋関数で視覚状態を一発計算
    const result = deriveVisualState({
      nodes: filteredNodes,
      edges: filteredEdges,
      selectedNodeId: request.nodeId,
      timestamp: now,
    });
    updatedNodes = result.nodes;
    updatedEdges = result.edges;
    debugLog("recordSelection", "deriveVisualState debug:", result.debug);
  }

  // ============================================================
  // Phase 8: 判断軸ラベル化 - 列ロック解除ロジック + エッジ生成
  // ============================================================
  let updatedColumnStates = session.columnStates ? [...session.columnStates] : [];
  let updatedCurrentColumnIndex = session.currentColumnIndex ?? 0;

  // 選択されたノードの列インデックスを取得
  // depth は 0-indexed（depth=0 が列0 に対応）
  const selectedNodeColumnIndex = selectedNode.depth ?? -1;

  console.log("[DN-DEBUG] === recordSelection column state START ===");
  console.log("[DN-DEBUG] selectedNode:", { id: selectedNode.id, label: selectedNode.label, depth: selectedNode.depth, level: selectedNode.level, parentId: selectedNode.parentId });
  console.log("[DN-DEBUG] selectedNodeColumnIndex:", selectedNodeColumnIndex);
  console.log("[DN-DEBUG] BEFORE columnStates:", JSON.stringify(updatedColumnStates));
  console.log("[DN-DEBUG] BEFORE currentColumnIndex:", updatedCurrentColumnIndex);
  console.log("[DN-DEBUG] criteriaLabels count:", session.criteriaLabels?.length ?? 0);
  console.log("[DN-DEBUG] criteriaLabels:", session.criteriaLabels?.map((c, i) => `[${i}] ${c.id} "${c.question}"`));

  // 判断軸ラベルが存在し、選択されたノードが有効な列に属している場合
  if (session.criteriaLabels && session.criteriaLabels.length > 0 && selectedNodeColumnIndex >= 0) {
    // 現在の列を完了状態に
    if (selectedNodeColumnIndex < updatedColumnStates.length) {
      updatedColumnStates[selectedNodeColumnIndex] = "completed";
      console.log("[DN-DEBUG] Marked column", selectedNodeColumnIndex, "as completed");
    } else {
      console.log("[DN-DEBUG] WARNING: selectedNodeColumnIndex", selectedNodeColumnIndex, "out of bounds for columnStates length", updatedColumnStates.length);
    }

    // 段階的開示: 列完了時に次のlocked列をアンロック
    const totalColumns = session.criteriaLabels.length;

    // 次のlocked列を1つアンロック
    const nextLockedIndex = updatedColumnStates.findIndex(s => s === "locked");
    if (nextLockedIndex >= 0) {
      updatedColumnStates[nextLockedIndex] = "active";
      console.log("[DN-DEBUG] Unlocked column", nextLockedIndex, "(was locked → active)");
    } else {
      console.log("[DN-DEBUG] No locked columns to unlock");
    }

    console.log("[DN-DEBUG] AFTER unlock columnStates:", JSON.stringify(updatedColumnStates));

    // 進捗インジケータ用にcurrentColumnIndexを更新
    // 最初の未完了（active）列に自動ナビゲート
    // 探索で追加された列が完了しても、元の未完了列に戻れるようにする
    const firstActiveIndex = updatedColumnStates.findIndex(s => s === "active");
    if (firstActiveIndex >= 0) {
      updatedCurrentColumnIndex = firstActiveIndex;
      console.log("[DN-DEBUG] Navigated to first active column:", firstActiveIndex);
    } else {
      // 全てcompletedまたはlockedの場合: 次のlocked列またはそのまま
      const nextColumnIndex = selectedNodeColumnIndex + 1;
      if (nextColumnIndex < totalColumns && nextColumnIndex > updatedCurrentColumnIndex) {
        updatedCurrentColumnIndex = nextColumnIndex;
        console.log("[DN-DEBUG] No active columns, advanced to next:", nextColumnIndex);
      } else {
        console.log("[DN-DEBUG] No active columns, staying at:", updatedCurrentColumnIndex);
      }
    }

    console.log("[DN-DEBUG] FINAL columnStates:", JSON.stringify(updatedColumnStates));
    console.log("[DN-DEBUG] FINAL currentColumnIndex:", updatedCurrentColumnIndex);
    console.log("[DN-DEBUG] completed:", updatedColumnStates.filter(s => s === "completed").length,
      "active:", updatedColumnStates.filter(s => s === "active").length,
      "locked:", updatedColumnStates.filter(s => s === "locked").length,
      "total:", totalColumns);

    // ゴール達成判定: 元の列（探索で追加されたもの以外）が全て完了していればOK
    const criteriaLabels = session.criteriaLabels ?? [];
    const originalColumnIndices = criteriaLabels
      .map((c, i) => ({ label: c, index: i }))
      .filter(({ label }) => label.orderReason !== "探索により追加")
      .map(({ index }) => index);
    const allOriginalCompleted = originalColumnIndices.length > 0 &&
      originalColumnIndices.every(i => updatedColumnStates[i] === "completed");

    console.log("[DN-DEBUG] Goal check: originalColumns:", originalColumnIndices.length,
      "completedOriginals:", originalColumnIndices.filter(i => updatedColumnStates[i] === "completed").length,
      "allOriginalCompleted:", allOriginalCompleted);

    if (allOriginalCompleted) {
      console.log("[DN-DEBUG] Goal achieved! All original columns completed.");

      // 残りの探索列も完了扱いにする（UI整合性のため）
      for (let i = 0; i < updatedColumnStates.length; i++) {
        if (updatedColumnStates[i] !== "completed") {
          updatedColumnStates[i] = "completed";
        }
      }

      // ゴールノード（outcome）を確定状態に変更（dimmed → selected）
      const outcomeNode = updatedNodes.find(n => n.level === "outcome");
      console.log("[DN-DEBUG] outcomeNode found:", !!outcomeNode);
      if (outcomeNode) {
        // ゴールノードを選択済み状態に（薄い色から通常色へ）
        outcomeNode.status = "selected";
        outcomeNode.pathRole = "selected";
        outcomeNode.selectedAt = now;

        // 最後に選択されたノードからゴールへのエッジを生成
        // 元の列の最後で選択されたノードを使用
        const lastOriginalIndex = originalColumnIndices[originalColumnIndices.length - 1];
        const lastColumnSelectedNode = updatedNodes.find(
          n => n.depth === lastOriginalIndex && n.status === "selected" && n.level === "strategy"
        );

        const sourceNodeId = lastColumnSelectedNode?.id ?? request.nodeId; // フォールバックとして現在のノード
        const lastSelectedEdgeId = `edge-${sourceNodeId}-${outcomeNode.id}`;

        debugLog("recordSelection", "Phase 18: Finding last column selected node:", {
          lastOriginalIndex,
          lastColumnSelectedNodeId: lastColumnSelectedNode?.id,
          sourceNodeId,
        });

        // 既存のエッジを検索して更新、なければ新規作成
        const existingEdgeIndex = updatedEdges.findIndex(e => e.target === outcomeNode.id);
        if (existingEdgeIndex >= 0) {
          // 既存のエッジを実線に更新
          updatedEdges[existingEdgeIndex] = {
            ...updatedEdges[existingEdgeIndex],
            source: sourceNodeId, // 最終列で選択されたノードから
            type: "selected", // 実線（確定）
          };
          debugLog("recordSelection", "Updated existing outcome edge to selected:", updatedEdges[existingEdgeIndex].id);
        } else if (!updatedEdges.find(e => e.id === lastSelectedEdgeId)) {
          updatedEdges.push({
            id: lastSelectedEdgeId,
            source: sourceNodeId,
            target: outcomeNode.id,
            type: "selected", // 実線（確定）
            isRecommended: lastColumnSelectedNode?.isRecommended ?? true,
          });
          debugLog("recordSelection", "Created new outcome edge:", lastSelectedEdgeId);
        }
      }
    }

    // Phase 21: 行ベースレイアウトでのエッジ生成
    // - スタートノードは廃止
    // - エッジは選択確定後に動的生成（ゴールへの接続のみ）
    // - 行間のエッジは生成しない（順不同で選択可能なため）

    const currentRowDepth = selectedNode.depth ?? 0;

    // Phase 21: 選択変更に伴うエッジ削除
    // 同じ判断軸（parentId）の非選択ノードに関連する「selected」エッジをすべて削除
    // Note: depthだけでは探索で追加された別判断軸のノードも巻き込むため、parentIdで絞る
    const currentRowNonSelectedNodes = updatedNodes.filter(
      n => n.depth === currentRowDepth && n.id !== request.nodeId && n.level === "strategy" && n.parentId === selectedNode.parentId
    );

    // ゴールノードを取得（エッジ削除判定用）
    const goalNode = updatedNodes.find(n => n.level === "outcome");
    const goalNodeId = goalNode?.id;

    for (const nonSelectedNode of currentRowNonSelectedNodes) {
      // この非選択ノードへの入力エッジを削除（selected タイプのもの）
      let incomingEdgeIdx = updatedEdges.findIndex(
        e => e.target === nonSelectedNode.id && e.type === "selected"
      );
      while (incomingEdgeIdx >= 0) {
        debugLog("recordSelection", "Phase 21: Removing old incoming edge to non-selected node:", {
          edgeId: updatedEdges[incomingEdgeIdx].id,
          target: nonSelectedNode.id,
        });
        updatedEdges.splice(incomingEdgeIdx, 1);
        incomingEdgeIdx = updatedEdges.findIndex(
          e => e.target === nonSelectedNode.id && e.type === "selected"
        );
      }

      // この非選択ノードからの出力エッジを削除（ゴールへのエッジも含む）
      let outgoingEdgeIdx = updatedEdges.findIndex(
        e => e.source === nonSelectedNode.id && (e.type === "selected" || e.target === goalNodeId)
      );
      while (outgoingEdgeIdx >= 0) {
        debugLog("recordSelection", "Phase 21: Removing old outgoing edge from non-selected node:", {
          edgeId: updatedEdges[outgoingEdgeIdx].id,
          source: nonSelectedNode.id,
          target: updatedEdges[outgoingEdgeIdx].target,
        });
        updatedEdges.splice(outgoingEdgeIdx, 1);
        outgoingEdgeIdx = updatedEdges.findIndex(
          e => e.source === nonSelectedNode.id && (e.type === "selected" || e.target === goalNodeId)
        );
      }
    }

    // Phase 21: 行ベースレイアウトでのエッジ生成
    // - 行間のエッジは生成しない（順不同で選択可能）
    // - ゴールへのエッジのみ、全行完了時に生成（上記 allColumnsCompleted で対応済み）
    debugLog("recordSelection", "Phase 21: Row-based layout - no inter-row edges needed");

    // 各行の選択済みノードをマップで取得（depth=rowIndex → node）
    const selectedNodeByRow = new Map<number, typeof updatedNodes[0]>();
    for (const node of updatedNodes) {
      if (node.status === "selected" && node.level === "strategy" && node.depth !== undefined) {
        selectedNodeByRow.set(node.depth, node);
      }
    }

    debugLog("recordSelection", "Phase 21: Selected nodes by row:",
      Array.from(selectedNodeByRow.entries()).map(([row, node]) => ({ row, id: node.id })));

    // AI誘導エッジ生成は廃止
    // 段階的開示（locked → active → completed）で次の判断軸を制御するため、
    // 枝を横断するguideエッジは不要（認知負荷の原因になる）

    debugLog("recordSelection", "Phase 21 row state update:", {
      selectedNodeRowIndex: selectedNodeColumnIndex,
      updatedRowStates: updatedColumnStates,
      updatedCurrentRowIndex: updatedCurrentColumnIndex,
      allRowsCompleted: allOriginalCompleted,
    });

    // 最終的なエッジ状態をログ出力
    debugLog("recordSelection", "Phase 21: Final edge states:",
      updatedEdges.map(e => ({ id: e.id, type: e.type, source: e.source, target: e.target }))
    );
  }

  // 選択理由をエッジに保存
  const edgeToSelected = updatedEdges.find(e => e.target === request.nodeId);
  if (edgeToSelected) {
    const edgeIndex = updatedEdges.findIndex(e => e.id === edgeToSelected.id);
    if (edgeIndex !== -1) {
      updatedEdges[edgeIndex] = { ...edgeToSelected, rationale: request.rationale };
    }
  }

  // pendingSelection を設定（履歴には未記録）
  const pendingSelection: PendingSelection = {
    nodeId: request.nodeId,
    nodeLabel: selectedNode.label,
    level: selectedNode.level,
    selectedAt: now,
    rationale: request.rationale,
  };

  // 子ノードの存在チェック（新規生成判定用）
  const hasExistingChildren = updatedEdges.some(e => e.source === request.nodeId);

  let newNodes: DecisionFlowNode[] = [];
  let newEdges: DecisionFlowEdge[] = [];
  let nextOptions: GenerateOptionsResponse = { options: [] };
  let llmTermination = false;
  let llmTerminationReason: string | undefined;
  let clarificationState: ClarificationState | undefined;

  // LLM統合: DecisionContextを更新
  const context = getOrCreateContext(session);
  const updatedContext = updateContextWithSelection(context, selectedNode);

  // ============================================================
  // Phase 3: 目的達成判定（LLM呼び出し前の短絡処理）
  // ============================================================
  const goalDefinition = session.goalDefinition ?? inferGoalDefinition(session.purpose);
  const goalEvaluation = evaluateGoalCompletion(goalDefinition, selectedNode);

  debugLog("recordSelection", "Goal evaluation:", {
    purpose: session.purpose,
    goalType: goalDefinition.type,
    goalTarget: goalDefinition.target,
    selectedLabel: selectedNode.label,
    evaluationStatus: goalEvaluation.status,
    decisionValue: goalEvaluation.decisionValue,
  });

  // 全列完了チェック（Phase 8モードの場合、元の列のみ）
  const origCriteriaForCheck = (session.criteriaLabels ?? []).filter(c => c.orderReason !== "探索により追加");
  const isAllColumnsCompleted = isPhase8Mode
    && origCriteriaForCheck.length > 0
    && origCriteriaForCheck.every(c => updatedColumnStates[c.columnIndex] === "completed");

  // 目的達成している場合はLLMをスキップして終了
  if (goalEvaluation.status === "achieved" || isAllColumnsCompleted) {
    debugLog("recordSelection", "Goal achieved! Skipping LLM generation.", {
      goalEvalStatus: goalEvaluation.status,
      allColumnsCompleted: isAllColumnsCompleted,
    });

    // ゴール状態を更新
    const goalState: GoalState = {
      status: "achieved",
      decisionValue: goalEvaluation.decisionValue ?? selectedNode.label,
      decidedAt: now,
      reason: goalEvaluation.reason ?? "all criteria columns completed",
    };

    // フォローアップメッセージを生成
    const followupMessage = generateFollowupMessage(
      goalDefinition.target,
      goalEvaluation.decisionValue ?? selectedNode.label
    );

    // チャットに完了メッセージを追加
    const completionChatMessage: DecisionChatMessage = {
      id: generateId(),
      role: "assistant",
      content: `✅ **目的達成**\n\n${followupMessage}`,
      timestamp: now,
      relatedNodeId: request.nodeId,
      type: "confirmation",
    };

    // セッションを更新（選択肢生成なしで終了）
    const completedSession: DecisionNavigatorSession = {
      ...session,
      nodes: computeSelectability([...updatedNodes]),
      edges: updatedEdges,
      currentNodeId: request.nodeId,
      pendingSelection,
      decisionContext: updatedContext,
      goalDefinition,
      goalState,
      chatHistory: [...session.chatHistory, completionChatMessage],
      updatedAt: now,
      stats: {
        totalNodes: updatedNodes.length,
        selectedNodes: session.stats.selectedNodes + 1,
        pastCasesUsed: session.stats.pastCasesUsed,
      },
    };

    await SessionStore.save(completedSession);
    await sessionRepository.save(completedSession);

    return {
      session: completedSession,
      nextOptions: { options: [] }, // 選択肢なし（目的達成）
    };
  }

  // 子ノードが存在しない場合のみ新しい選択肢を生成
  // Phase 9: 判断軸ラベル方式（Phase 8）のセッションでは動的生成をスキップ
  // Note: isPhase8Mode は上部（視覚状態計算セクション）で宣言済み

  if (isPhase8Mode) {
    // Phase 8/22: 判断軸ラベル方式 - 事前生成済み選択肢のみ使用
    // 動的候補生成はスキップし、探索ノードを追加
    debugLog("recordSelection", "Phase 8/22 mode: Processing selection");

    // Phase 24/28改改: 探索階層の計算
    // 「親が探索で追加されたか」だけでなく、「このブランチ内での探索回数」で判定
    // これにより、並列な判断軸が互いに独立して深掘りできる
    let explorationDepth = 0;
    {
      let currentNodeId: string | undefined = request.nodeId;
      const criteriaLabels = session.criteriaLabels ?? [];
      while (currentNodeId) {
        const node = updatedNodes.find(n => n.id === currentNodeId);
        if (!node) break;

        // このノードの親の判断軸が探索で追加されたものかチェック
        if (node.level === "strategy" && node.parentId) {
          const criteriaLabel = criteriaLabels.find(c => c.id === node.parentId);
          if (criteriaLabel?.orderReason === "探索により追加") {
            explorationDepth++;
          }
        }

        currentNodeId = node.parentId;
      }
    }
    const MAX_EXPLORATION_DEPTH = 2; // 探索2回までは継続可能
    const isAtMaxExplorationDepth = explorationDepth >= MAX_EXPLORATION_DEPTH;

    const parentCriteriaNode = updatedNodes.find(n => n.id === selectedNode.parentId);
    const parentCriteriaLabel = session.criteriaLabels?.find(c => c.id === selectedNode.parentId);

    debugLog("recordSelection", "Phase 24/28: Exploration depth check:", {
      parentCriteriaId: parentCriteriaNode?.id,
      parentCriteriaLabelOrderReason: parentCriteriaLabel?.orderReason,
      explorationDepth,
      isAtMaxExplorationDepth,
    });

    // Phase 22: 探索ノードを選択されたノードの右側に追加
    // ユーザーがクリックすると判断軸追加APIを呼び出す
    const explorationNodeId = `exploration-${request.nodeId}`;

    // Phase 24修正: 選択変更時のノード削除ロジック
    // 削除すべきは「同じ親（判断軸）の他の選択肢から派生したノード」のみ
    // 今選択したノードから派生したノードは削除しない

    // 探索で追加されたノードを再帰的に収集
    function collectDescendants(nodeIds: string[], allNodes: DecisionFlowNode[]): string[] {
      const result = new Set<string>(nodeIds);
      const toProcess = [...nodeIds];

      while (toProcess.length > 0) {
        const currentId = toProcess.pop()!;
        // このノードを親に持つノードを探す
        for (const node of allNodes) {
          if (node.parentId === currentId && !result.has(node.id)) {
            result.add(node.id);
            toProcess.push(node.id);
          }
        }
      }

      return Array.from(result);
    }

    // 同じ判断軸（親）の他の選択肢を特定
    const siblingNodes = updatedNodes.filter(n =>
      n.parentId === selectedNode.parentId && // 同じ親
      n.id !== selectedNode.id && // 自分以外
      n.level === "strategy" // 選択肢ノード
    );

    // 兄弟ノードから派生したノードを削除対象として収集
    const nodesToRemoveSet = new Set<string>();
    for (const sibling of siblingNodes) {
      // 兄弟ノードの探索ノード
      const siblingExplorationId = `exploration-${sibling.id}`;
      if (updatedNodes.some(n => n.id === siblingExplorationId)) {
        nodesToRemoveSet.add(siblingExplorationId);
      }

      // 兄弟ノードから派生した子孫（探索で追加された判断軸と選択肢）
      const siblingDescendants = collectDescendants([sibling.id], updatedNodes);
      for (const id of siblingDescendants) {
        if (id !== sibling.id) { // 兄弟ノード自体は削除しない
          nodesToRemoveSet.add(id);
        }
      }
    }

    // 今選択したノードの既存の探索ノードのみ削除（新しいものを追加するため）
    const currentExplorationId = `exploration-${request.nodeId}`;
    if (updatedNodes.some(n => n.id === currentExplorationId)) {
      nodesToRemoveSet.add(currentExplorationId);
    }

    updatedNodes = updatedNodes.filter(n => !nodesToRemoveSet.has(n.id));
    updatedEdges = updatedEdges.filter(e =>
      !nodesToRemoveSet.has(e.source) && !nodesToRemoveSet.has(e.target)
    );

    // Phase 24: 2階層目の探索（探索で追加された判断軸）の場合
    // 探索ノードを追加せず、直接ゴールに接続
    if (isAtMaxExplorationDepth) {
      debugLog("recordSelection", "Phase 24/28: Max exploration depth reached - connecting directly to goal");

      // ゴールノードを探す
      const goalNode = updatedNodes.find(n => n.level === "outcome");
      if (goalNode) {
        // 選択されたノードからゴールへのエッジを追加
        const edgeToGoalId = `edge-${request.nodeId}-${goalNode.id}`;
        if (!updatedEdges.some(e => e.id === edgeToGoalId)) {
          newEdges.push({
            id: edgeToGoalId,
            source: request.nodeId,
            target: goalNode.id,
            type: "selected",
            sourceHandle: "right",
            targetHandle: "left",
          });
          debugLog("recordSelection", "Phase 24: Added edge to goal:", edgeToGoalId);
        }
      } else {
        console.warn("[recordSelection] Phase 24: Goal node not found!");
      }
      // 探索ノードは追加しない
    } else {
      // 通常の探索（1階層目）: 探索ノードを作成
      // Phase 26: 理由が設定された場合のみ表示（available）、それ以外は非表示（hidden）
      const explorationNodeStatus = request.rationale ? "available" : "hidden";
      const explorationNode: DecisionFlowNode = {
        id: explorationNodeId,
        type: "action", // 通常のアクションノードとして表示
        level: "strategy",
        label: "＋ 新しい観点を追加",
        description: "AIが新しい判断軸を提案します",
        status: explorationNodeStatus as "available" | "hidden",
        pathRole: undefined,
        isRecommended: false,
        isSelectable: true,
        isExplorationNode: true, // 探索ノードフラグ
        lane: 2, // 選択されたノードの右
        depth: selectedNode.depth,
        position: {
          x: selectedNode.position.x + 300, // 選択されたノードの右側
          y: selectedNode.position.y,
        },
        parentId: request.nodeId, // 選択されたノードが親
        createdAt: now,
        source: "ai_generated", // システムノードだがAI生成として扱う
      };

      newNodes.push(explorationNode);

      // 選択されたノードから探索ノードへのエッジ
      newEdges.push({
        id: `edge-${request.nodeId}-${explorationNodeId}`,
        source: request.nodeId,
        target: explorationNodeId,
        type: "available",
        sourceHandle: "right",
        targetHandle: "left",
      });

      debugLog("recordSelection", "Phase 22: Exploration node added:", {
        explorationNodeId,
        position: explorationNode.position,
      });
    }
  } else if (!hasExistingChildren) {
    // 旧来の動的生成方式（Phase 8以前のセッション用）
    // デバッグログ
    debugLog("recordSelection", "LLM check:", {
      hasApiKey: !!env.anthropicApiKey,
      generationMode: session.generationMode,
      selectedNodeLevel: selectedNode.level,
    });

    // LLM統合: LLMで次の選択肢を動的生成（APIキーがある場合）
    // Note: generationMode が "llm" または "fallback" の場合はLLMを試みる
    // "template" の場合のみテンプレートを使用（APIキーがない場合）
    if (env.anthropicApiKey && session.generationMode !== "template") {
      // プリフェッチキャッシュを確認
      const cachedOptions = getPrefetchedOptions(session.id, request.nodeId);
      if (cachedOptions && cachedOptions.options.length > 0) {
        debugLog("recordSelection", "Using prefetched options");
        nextOptions = cachedOptions;
      } else {
        // キャッシュがない場合はLLMで生成
        try {
          const llmResult = await generateNextOptionsWithLLM(session, selectedNode);

          // 終了判定
          if (llmResult.shouldTerminate) {
            llmTermination = true;
            llmTerminationReason = llmResult.terminationReason;
          }

          // clarification質問が必要な場合
          if (llmResult.needsClarification && llmResult.clarificationQuestions?.length) {
            clarificationState = {
              isActive: true,
              questions: llmResult.clarificationQuestions,
              answers: [],
              sourceNodeId: selectedNode.id,
            };
          }

          // LLMオプションをGeneratedOptionに変換
          nextOptions = {
            options: llmResult.options.map((opt) => ({
              label: opt.label,
              description: opt.description,
              confidence: 100 - opt.risk.score,
              riskLevel: opt.risk.level,
              riskStrategy: opt.riskStrategy,
              // Phase 6: LLMオプションにriskDetailを自動生成
              riskDetail: generateRiskDetailFromStrategy(
                opt.riskStrategy,
                opt.risk.level,
                opt.label,
                opt.description
              ),
              riskCategories: [],
              relatedPastCases: [],
              source: "ai_generated" as const,
              isRecommended: llmResult.recommendation?.id === opt.id,
              recommendationReason: llmResult.recommendation?.id === opt.id
                ? llmResult.recommendation.reason
                : undefined,
            })),
          };
        } catch (error) {
          console.error("[recordSelection] LLM generation failed, falling back:", error);
          // フォールバック: テンプレートベースの生成
        }
      }
    }

    // LLM生成が失敗した場合、またはLLMモードでない場合はテンプレートを使用
    if (nextOptions.options.length === 0 && !llmTermination) {
      debugLog("recordSelection", "Using template-based generation (LLM not available or failed)");
      const tempHistory = {
        id: generateId(),
        nodeId: request.nodeId,
        nodeLabel: selectedNode.label,
        level: selectedNode.level,
        selectedAt: now,
        rationale: request.rationale,
      };
      // Phase 5改改改: 選択ノード情報と前提条件を渡す
      // Phase 6: 選択履歴を渡して既存選択肢の重複を防止
      nextOptions = await generateNextOptions(
        session.purpose,
        [...session.selectionHistory, tempHistory],
        request.nodeId,
        selectedNode.level,
        {
          label: selectedNode.label,
          riskStrategy: selectedNode.riskStrategy,
          rationale: request.rationale,
        },
        session.preconditions
      );

      // テンプレートフォールバック時に警告を追加
      if (nextOptions.options.length > 0 && !nextOptions.warnings) {
        nextOptions.warnings = [];
      }
      if (nextOptions.options.length > 0 && env.anthropicApiKey && session.generationMode !== "template") {
        nextOptions.warnings?.push("AI生成に失敗したため、テンプレートベースの選択肢を表示しています。");
      }
    }

    // 基準となる座標を計算
    // 推奨（index=0）は親の真上（X座標を継承）、代替（index>0）は右方向に配置
    const parentX = selectedNode.position?.x ?? 0;
    const parentY = selectedNode.position?.y ?? 0;
    const targetY = parentY - LAYOUT.NODE_SPACING_Y; // 上方向に配置

    // Phase 7: followupレベルは終端なので、終端ノードを追加
    // また、選択肢が空の場合も終端ノードを生成（LLMが選択肢を返さない場合など）
    const shouldCreateTerminal = selectedNode.level === "followup" || nextOptions.options.length === 0;

    if (shouldCreateTerminal) {
      // 終端ノードを生成
      const terminalNode: DecisionFlowNode = {
        id: `node-${generateId()}`,
        type: "terminal",
        level: selectedNode.level === "followup" ? "followup" : selectedNode.level,
        label: "終了",
        description: nextOptions.options.length === 0
          ? "これ以上の選択肢がありません。意思決定フローが完了しました。"
          : "意思決定フローの終了",
        status: "selected" as const,
        isTerminal: true,
        position: {
          x: parentX,
          y: targetY,
        },
        parentId: request.nodeId,
        createdAt: now,
      };
      newNodes = [terminalNode];
    } else {
      newNodes = nextOptions.options.map((option, index) => {
        // 推奨（index=0）は親の真上、代替（index>0）は右方向に配置
        const nodeX = parentX + index * LAYOUT.LANE_SPACING_X;
        // lane値を設定（0=推奨位置、1,2,3...=代替位置）
        const lane = index;

        const hasPastCase = option.relatedPastCases.length > 0;

        // 選択理由プリセットを動的生成
        const rationalePresets = generateRationalePresets({
          riskStrategy: option.riskStrategy,
          riskCategories: option.riskCategories,
          hasPastCase,
          isRecommended: option.isRecommended,
        });

        // Phase 7: 動的レベル遷移
        const nextLevel = ((): import("./types").DecisionLevel => {
          switch (selectedNode.level) {
            case "strategy": return "tactic";
            case "tactic": return "action";
            case "action": return "sub-action";
            case "sub-action": return "followup";
            // followupは上で除外済みなのでここには来ない
            default: return "action";
          }
        })();

        return {
          id: `node-${generateId()}`,
          type: selectedNode.level === "strategy" ? "decision" : "action",
          level: nextLevel,
          label: option.label,
          description: option.description,
          confidence: option.confidence,
          riskLevel: option.riskLevel,
          riskStrategy: option.riskStrategy,
          riskCategories: option.riskCategories,
          riskDetail: option.riskDetail, // Phase 6: リスク詳細情報
          hasPastCase,
          pastCaseCount: option.relatedPastCases.length,
          pastCases: option.relatedPastCases,
          isRecommended: option.isRecommended,
          recommendationReason: option.recommendationReason,
          structuredRationale: option.structuredRationale, // Phase 10: 構造化された推奨根拠
          rationalePresets, // 動的生成されたプリセット
          status: "available" as const,
          lane, // 配置レーン（0=推奨、1,2,3...=代替）
          depth: (selectedNode.depth ?? 0) + 1, // Phase 7: 深さを設定（MAX_DEPTH判定用）
          position: {
            x: nodeX, // 推奨は親の真上、代替は右方向
            y: targetY, // 上方向（負のy）
          },
          parentId: request.nodeId,
          createdAt: now,
          source: option.source,
        };
      });
    }

    // Phase 7: DecisionPropertyをバックグラウンドで生成（レスポンスをブロックしない）
    // 生成完了後にSessionStoreを更新するため、クライアントは次回取得時に反映される
    if (newNodes.length > 0 && env.anthropicApiKey) {
      const propertyContext: GenerateDecisionPropertyContext = {
        purpose: session.purpose,
        selectedPath: session.selectionHistory.map((h) => h.nodeLabel),
        problemCategory: session.problemCategory?.primary,
        pastCases: nextOptions.options[0]?.relatedPastCases?.map((c) => ({
          content: c.content,
          similarity: c.similarity,
          sourceFileName: c.sourceFileName,
        })),
      };

      // 推奨ノード（最初の1つ）のみDecisionPropertyを生成
      const recommendedNode = newNodes.find((n) => n.isRecommended) ?? newNodes[0];
      if (recommendedNode) {
        // バックグラウンドで実行（awaitしない）- レスポンス速度を優先
        generateDecisionProperty(recommendedNode, propertyContext)
          .then(async (property) => {
            if (property) {
              // SessionStoreから最新のセッションを取得して更新
              await SessionStore.update(session.id, (currentSession) => ({
                ...currentSession,
                nodes: currentSession.nodes.map((n) =>
                  n.id === recommendedNode.id ? { ...n, decisionProperty: property } : n
                ),
              }));
            }
          })
          .catch((propError) => {
            console.warn("[recordSelection] DecisionProperty generation failed:", propError);
          });
      }
    }

    // 新しいエッジを追加（推奨ノードへのエッジに推奨フラグを設定）
    newEdges = newNodes.map((node) => ({
      id: `edge-${request.nodeId}-${node.id}`,
      source: request.nodeId,
      target: node.id,
      type: "available" as const,
      isRecommended: node.isRecommended,
    }));
  }

  // 選択されたノードに子IDを追加（新しい子がある場合のみ更新）
  const finalNodes = updatedNodes.map((node) => {
    if (node.id === request.nodeId && newNodes.length > 0) {
      return {
        ...node,
        childIds: newNodes.map((n) => n.id),
        isExpanded: true,
      };
    }
    return node;
  });

  // 全ノードの選択可能性を計算
  const allNodes = [...finalNodes, ...newNodes];
  const nodesWithSelectability = computeSelectability(allNodes);

  // 終了判定メッセージをチャットに追加
  const chatHistory = [...session.chatHistory];
  if (llmTermination && llmTerminationReason) {
    chatHistory.push({
      id: generateId(),
      role: "assistant",
      content: `⚠️ **重要な決定ポイント**\n\n${llmTerminationReason}\n\nこの選択は慎重に検討してください。`,
      timestamp: now,
      relatedNodeId: request.nodeId,
      type: "confirmation",
    });
  }

  // Phase Strategy: 思考戦略によるゴール距離計算
  let strategyGoalDistance = session.strategyGoalDistance;
  if (session.thinkingStrategy) {
    const strategy = getStrategyOrUndefined(session.thinkingStrategy);
    if (strategy) {
      try {
        strategyGoalDistance = strategy.calculateGoalDistance({
          id: session.id,
          purpose: session.purpose,
          nodes: nodesWithSelectability.map(n => ({
            id: n.id,
            type: n.type ?? "decision",
            status: n.status ?? "available",
            level: n.level,
            parentId: n.parentId,
          })),
          selectionHistory: session.selectionHistory.map(h => ({
            nodeId: h.nodeId,
            nodeLabel: h.nodeLabel,
            level: h.level,
          })),
        });
        debugLog("recordSelection", "Strategy goal distance:", strategyGoalDistance);
      } catch (goalErr) {
        console.warn("[recordSelection] Strategy goal distance calculation failed:", goalErr);
      }
    }
  }

  // セッションを更新（履歴には追加しない、pendingSelectionに設定）
  const updatedSession: DecisionNavigatorSession = {
    ...session,
    nodes: nodesWithSelectability,
    edges: [...updatedEdges, ...newEdges],
    currentNodeId: request.nodeId,
    pendingSelection, // 確定待ちの選択
    // LLM統合: コンテキストを更新
    decisionContext: updatedContext,
    // LLM統合: clarification状態を設定
    clarificationState: clarificationState ?? session.clarificationState,
    // Phase 8: 判断軸ラベル化 - 列状態を更新
    columnStates: updatedColumnStates.length > 0 ? updatedColumnStates : session.columnStates,
    currentColumnIndex: updatedCurrentColumnIndex,
    // Phase Strategy: ゴール距離
    strategyGoalDistance,
    chatHistory,
    updatedAt: now,
    stats: {
      totalNodes: nodesWithSelectability.length,
      selectedNodes: session.stats.selectedNodes + 1,
      pastCasesUsed:
        session.stats.pastCasesUsed +
        newNodes.filter((n) => n.hasPastCase).length,
    },
  };

  await SessionStore.save(updatedSession);
  await sessionRepository.save(updatedSession);

  // Phase 9: Capitalizer Agent - 選択から知見を自動抽出（バックグラウンドで実行）
  autoExtractInsightFromSelection(session, selectedNode, request.rationale)
    .then((insightResult) => {
      if (insightResult.extracted.length > 0) {
        debugLog("Capitalizer Agent", "Auto-extracted insights:", {
          count: insightResult.extracted.length,
          savedAsLearning: insightResult.savedAsLearning,
          matchedPatterns: insightResult.matchedExistingPatterns,
        });
      }
    })
    .catch((insightError) => {
      console.warn("[Capitalizer Agent] Insight extraction failed:", insightError);
    });

  // 新しいノードがある場合、その次の選択肢をバックグラウンドでプリフェッチ
  if (newNodes.length > 0) {
    startPrefetch(updatedSession);
  }

  // Phase 5改: 3セット情報を収集（思考支援の経過を可視化）
  let threeSetInfo: ThreeSetInfo | undefined;
  try {
    const threeSetData = await collectThreeSetData(updatedSession, selectedNode);
    threeSetInfo = {
      conditions: threeSetData.conditions.map((c) => ({
        id: c.id,
        label: c.label,
        category: c.category,
        description: c.description,
        confidence: c.confidence,
      })),
      pastCases: threeSetData.pastCases.map((pc) => ({
        id: pc.id,
        sourceFileName: pc.sourceFileName,
        content: pc.content,
        similarity: pc.similarity,
      })),
      inferredPriorities: threeSetData.inferredPriorities,
    };
    debugLog("recordSelection", "Collected threeSetInfo:", {
      conditionsCount: threeSetInfo.conditions.length,
      pastCasesCount: threeSetInfo.pastCases.length,
      prioritiesCount: threeSetInfo.inferredPriorities.length,
    });
  } catch (error) {
    console.error("[recordSelection] Failed to collect threeSetInfo:", error);
  }

  // Phase 25改: 選択アドバイス生成（バックグラウンドで非同期実行 - レスポンスをブロックしない）
  // 即座にレスポンスを返し、アドバイスは非同期で生成してチャットに追加
  generateSelectionAdviceAsync(updatedSession, selectedNode)
    .catch((adviceError) => {
      console.warn("[recordSelection] Failed to generate selection advice:", adviceError);
    });

  return {
    session: updatedSession,
    nextOptions,
    threeSetInfo,
    // selectionAdviceは削除（非同期で生成するため）
  };
}
