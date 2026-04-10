"use client"
/**
 * 意思決定ナビゲーターパネル
 *
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 * チャット画面のサイドパネルとして表示される意思決定ナビゲーター
 * 三列レイアウト（特殊事情・過去事例・LLM推奨）で条件を提示
 */

import { useState, useCallback, useEffect, useRef } from "react";
import { ReactFlowProvider, type Viewport } from "reactflow";

import { FlowChart } from "../decisionNavigator/FlowChart";
import { DecisionNavigatorChat } from "../decisionNavigator/DecisionNavigatorChat";
import { NodePopover } from "../decisionNavigator/NodePopover";
import { ThreeColumnLayout } from "../decisionNavigator/ThreeColumnLayout";
import { ThinkingBoxView } from "../decisionNavigator/ThinkingBoxView";
import { GoalCompass } from "../decisionNavigator/GoalCompass";
// StrategyGoalCompass は QuestionPanel のカバレッジマップに置き換え済み
import { QuestionPanel } from "../decisionNavigator/QuestionPanel";
// ThreeSetDisplay は削除済み - 思考支援情報はAIチャットで通知するように変更
import { ConditionSetupModal } from "../decisionNavigator/ConditionSetupModal";
import { PreconditionModal } from "../decisionNavigator/PreconditionModal";
import { PreconditionSummary } from "../decisionNavigator/PreconditionSummary";
import { SentinelWarningModal } from "../decisionNavigator/sentinel/SentinelWarningModal";
import { RouteRiskSummary } from "../decisionNavigator/sentinel/RouteRiskSummary";
// Phase 27: 意思決定履歴可視化
import { DecisionJourneyView } from "../decisionNavigator/DecisionJourneyView";
// 俯瞰ビュー
import { DecisionLandscapeView } from "../decisionNavigator/DecisionLandscapeView";
// Phase 9: 上下分割レイアウト用コンポーネント
import { ConditionPanel } from "../decisionNavigator/ConditionPanel";
import { PastCasePanel } from "../decisionNavigator/PastCasePanel";
import type {
  DecisionFlowNode,
  ConditionOption,
  DecisionNavigatorCloseResult,
  OverlookedWarning,
  ThinkingStrategyId,
} from "../../types/decisionNavigator";
import * as api from "../../api/decisionNavigator";
import type { KnowledgeTransferConditions } from "../../types/chat";
import { useDecisionNavigatorSession } from "./hooks/useDecisionNavigatorSession";

/** チャットメッセージの型 */
type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type DecisionNavigatorPanelProps = {
  /** 初期目的（チャットから抽出） */
  initialPurpose?: string;
  /** 初期状況（チャットから抽出） */
  initialSituation?: string;
  /** チャット履歴（Phase 6: 前提条件抽出用） */
  chatHistory?: ChatMessage[];
  /** パネルを閉じる（終了結果付き） */
  onClose: (result: DecisionNavigatorCloseResult) => void;
  /** Phase 5 UIを使用するか（デフォルト: true） */
  usePhase5UI?: boolean;
  /** 前提条件モーダルをスキップするか（技術伝承デモ等で既に確認済みの場合） */
  skipPreconditionModal?: boolean;
  /** 過去事例パネルをスキップするか（過去事例を参照せずに進む場合） */
  skipPastCasePanel?: boolean;
  /** 事前収集した条件（KnowledgeTransferQuestionCardで収集した条件） */
  preCollectedConditions?: KnowledgeTransferConditions;
};

export function DecisionNavigatorPanel({
  initialPurpose,
  initialSituation,
  chatHistory,           // Phase 6: チャット履歴を追加
  onClose,
  usePhase5UI = false,  // Phase 5 UIはデフォルトでオフ、従来のFlowChart UIを使用
  skipPreconditionModal = false, // 技術伝承デモ等で既に確認済みの場合はスキップ
  skipPastCasePanel = false, // 過去事例を参照せずに進む場合はパネルを非表示
  preCollectedConditions, // 事前収集した条件
}: DecisionNavigatorPanelProps) {
  // === セッション管理（カスタムフックに委譲） ===
  const {
    session,
    setSession,
    isLoading,
    setIsLoading,
    error,
    setError,
    // Phase 5 state
    initialLayout,
    thinkingBox,
    setThinkingBox,
    goalCompass,
    setGoalCompass,
    isPhase5Active,
    setIsPhase5Active,
    isTerminal,
    setIsTerminal,
    finalDecision,
    setFinalDecision,
    // Precondition state
    isPreconditionModalOpen,
    setIsPreconditionModalOpen,
    extractedPreconditions,
    confirmedPreconditions,
    additionalPreconditionContext,
    clarificationQuestions,
    isLoadingQuestions,
    // Simulation conditions / past cases
    simulationConditions,
    allAvailableConditions,
    pastCases,
    isConditionsLoading,
    // Handlers
    handlePreconditionConfirm,
    handlePreconditionClose,
    handleStartSession,
    handleConditionChange,
    handleDetailedSettingsChange,
  } = useDecisionNavigatorSession({
    initialPurpose,
    initialSituation,
    chatHistory,
    usePhase5UI,
    skipPreconditionModal,
    preCollectedConditions,
  });

  // === 従来UI状態（Phase 5が無効な場合のフォールバック用） ===
  const [pendingNodeForRationale, setPendingNodeForRationale] =
    useState<DecisionFlowNode | null>(null);
  const [popoverPosition, setPopoverPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [initialClickPosition, setInitialClickPosition] = useState<{
    x: number;
    y: number;
  } | null>(null);
  const [initialViewport, setInitialViewport] = useState<Viewport | null>(null);
  const [isEditingRationale, setIsEditingRationale] = useState(false);
  const [existingRationale, setExistingRationale] = useState<
    string | undefined
  >(undefined);
  const [loadingEdgeTarget, setLoadingEdgeTarget] = useState<string | null>(
    null
  );
  const [isChatProcessing, setIsChatProcessing] = useState(false);

  // 条件設定モーダルの状態
  const [isConditionModalOpen, setIsConditionModalOpen] = useState(false);
  const [pendingStartNodeSelection, setPendingStartNodeSelection] = useState<{
    nodeId: string;
    purpose: string;
  } | null>(null);

  // Phase X: 見落とし警告の状態
  const [overlookedWarnings, setOverlookedWarnings] = useState<OverlookedWarning[]>([]);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<string>>(new Set());
  const [isSentinelLoading, setIsSentinelLoading] = useState(false);
  const [isWarningModalOpen, setIsWarningModalOpen] = useState(false);

  // ルート完了時のリスクサマリー状態
  const [isRouteRiskSummaryOpen, setIsRouteRiskSummaryOpen] = useState(false);
  const [isRouteTerminal, setIsRouteTerminal] = useState(false);

  // Phase 27: 判断履歴表示状態
  const [isJourneyViewOpen, setIsJourneyViewOpen] = useState(false);

  // スプリッター用の状態
  const [chatWidth, setChatWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const resizeRef = useRef<{ startX: number; startWidth: number } | null>(null);

  // 垂直スプリッター用の状態（過去事例パネルと条件パネルの間）
  const [pastCaseHeight, setPastCaseHeight] = useState(160);
  const [isVerticalResizing, setIsVerticalResizing] = useState(false);
  const verticalResizeRef = useRef<{ startY: number; startHeight: number } | null>(null);

  // 判断軸追加中の状態
  const [isAddingCriteria, setIsAddingCriteria] = useState(false);

  // Phase 22: 探索中のノードID
  const [exploringNodeId, setExploringNodeId] = useState<string | null>(null);

  // 深さ優先探索: 自動探索中の状態
  const [isAutoExploring, setIsAutoExploring] = useState(false);
  const skipAutoExploreRef = useRef(false);

  // Phase Strategy: 戦略切り替え中の状態
  const [isSwitchingStrategy, setIsSwitchingStrategy] = useState(false);

  // シアターモード（全画面表示）
  const [isTheaterMode, setIsTheaterMode] = useState(false);

  // 俯瞰ビュー切り替え
  const [viewMode, setViewMode] = useState<"flowchart" | "landscape">("flowchart");

  // 左パネルタブ切り替え（質問 / AIチャット）
  const [leftPanelTab, setLeftPanelTab] = useState<"question" | "chat">("question");

  /** ノード情報をテキストエクスポート */
  const handleExportNodes = useCallback(() => {
    if (!session) return;
    const lines: string[] = [];
    lines.push(`# 意思決定ナビゲーター エクスポート`);
    lines.push(`目的: ${session.purpose}`);
    lines.push(`戦略: ${session.thinkingStrategy ?? "未設定"}`);
    lines.push(`作成: ${session.createdAt}`);
    lines.push(`更新: ${session.updatedAt}`);
    lines.push(`ノード数: ${session.nodes.length}  エッジ数: ${session.edges.length}`);
    lines.push(``);

    // 判断軸ラベル
    if (session.criteriaLabels && session.criteriaLabels.length > 0) {
      lines.push(`## 判断軸`);
      session.criteriaLabels.forEach((cl, i) => {
        lines.push(`${i + 1}. [${cl.id}] ${cl.question}${cl.isPreSelected ? ` (事前選択: ${cl.preSelectedValue})` : ""}`);
      });
      lines.push(``);
    }

    // ノード一覧
    lines.push(`## ノード一覧`);
    const sortedNodes = [...session.nodes].sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));
    for (const node of sortedNodes) {
      const indent = "  ".repeat(node.depth ?? 0);
      const statusIcon = node.status === "selected" ? "✅" : node.status === "rejected" ? "❌" : "⬜";
      lines.push(`${indent}${statusIcon} [${node.id}]`);
      lines.push(`${indent}  type=${node.type} level=${node.level} status=${node.status}`);
      lines.push(`${indent}  label: ${node.label}`);
      if (node.description) lines.push(`${indent}  desc: ${node.description}`);
      if (node.parentId) lines.push(`${indent}  parent: ${node.parentId}`);
      if (node.isRecommended) lines.push(`${indent}  ⭐ 推奨`);
      if (node.riskLevel) lines.push(`${indent}  risk: ${node.riskLevel}`);
      if (node.selectedAt) lines.push(`${indent}  selectedAt: ${node.selectedAt}`);
      if (node.rationale) lines.push(`${indent}  rationale: ${node.rationale}`);
    }
    lines.push(``);

    // エッジ一覧
    lines.push(`## エッジ一覧`);
    for (const edge of session.edges) {
      lines.push(`  ${edge.source} → ${edge.target} (type=${edge.type}${edge.isRecommended ? ", 推奨" : ""})`);
    }
    lines.push(``);

    // 選択履歴
    if (session.selectionHistory && session.selectionHistory.length > 0) {
      lines.push(`## 選択履歴`);
      session.selectionHistory.forEach((h, i) => {
        lines.push(`${i + 1}. nodeId=${h.nodeId} at=${h.selectedAt}`);
        if (h.rationale) lines.push(`   理由: ${h.rationale}`);
      });
      lines.push(``);
    }

    // 列状態
    if (session.columnStates && session.columnStates.length > 0) {
      lines.push(`## 列状態`);
      lines.push(`  currentColumn=${session.currentColumnIndex ?? "未設定"}`);
      session.columnStates.forEach((state, i) => {
        lines.push(`  col${i}: ${state}`);
      });
    }

    const text = lines.join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `decision-export-${session.id.slice(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [session]);

  /** 戦略名の日本語マップ */
  const STRATEGY_LABELS: Record<ThinkingStrategyId, string> = {
    forward: "フォワード",
    backcast: "バックキャスト",
    constraint: "制約ファースト",
    risk: "リスクファースト",
    analogy: "アナロジー",
  };

  /** 思考戦略を切り替え */
  const handleSwitchStrategy = useCallback(
    async (newStrategy: ThinkingStrategyId) => {
      if (!session || isSwitchingStrategy) return;
      if (session.thinkingStrategy === newStrategy) return;

      setIsSwitchingStrategy(true);
      try {
        const result = await api.switchStrategy(session.id, newStrategy);
        setSession(result.session);
      } catch (err) {
        console.error("[DecisionNavigatorPanel] Strategy switch failed:", err);
        setError(err instanceof Error ? err.message : "戦略の切り替えに失敗しました");
      } finally {
        setIsSwitchingStrategy(false);
      }
    },
    [session, isSwitchingStrategy, setSession, setError]
  );

  // === 終端ノード検出：ルート完了時にリスクサマリーを自動表示 ===
  useEffect(() => {
    if (!session) return;

    // 終端ノードがあるかチェック
    const terminalNode = session.nodes.find((n) => n.type === "terminal" || n.isTerminal);
    if (terminalNode && !isRouteTerminal) {
      setIsRouteTerminal(true);
      // 終端到達時にリスクサマリーモーダルを自動表示
      setIsRouteRiskSummaryOpen(true);
    }
  }, [session, isRouteTerminal]);

  // === Phase 5: 条件選択ハンドラ ===
  const handleSelectCondition = useCallback(
    async (condition: ConditionOption) => {
      if (!thinkingBox) return;

      setIsLoading(true);
      setError(null);

      try {
        const result = await api.selectCondition(thinkingBox.id, condition.id);
        setThinkingBox(result.thinkingBox);
        setGoalCompass(result.goalCompass);
        setIsTerminal(result.isTerminal);

        if (result.finalDecision) {
          setFinalDecision(result.finalDecision);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "条件の選択に失敗しました");
      } finally {
        setIsLoading(false);
      }
    },
    [thinkingBox, setIsLoading, setError, setThinkingBox, setGoalCompass, setIsTerminal, setFinalDecision]
  );

  // === 従来UI: ノードクリック ===
  const handleNodeClick = useCallback(
    async (
      nodeId: string,
      screenPosition: { x: number; y: number },
      viewport: Viewport
    ) => {
      if (!session) return;

      const clickedNode = session.nodes.find((n) => n.id === nodeId);
      if (!clickedNode) return;

      // 終端ノードをクリックした場合はリスクサマリーを表示
      if (clickedNode.type === "terminal" || clickedNode.isTerminal) {
        setIsRouteRiskSummaryOpen(true);
        return;
      }

      setInitialClickPosition(screenPosition);
      setInitialViewport(viewport);

      if (clickedNode.status === "recommended") {
        const existingEdge = session.edges.find(
          (e) => e.target === nodeId && e.type === "recommended"
        );
        setPendingNodeForRationale(clickedNode);
        setPopoverPosition(screenPosition);
        setIsEditingRationale(true);
        setExistingRationale(existingEdge?.rationale);
        return;
      }

      if (
        clickedNode.status === "available" ||
        clickedNode.status === "dimmed"
      ) {
        setPendingNodeForRationale(clickedNode);
        setPopoverPosition(screenPosition);
        setIsEditingRationale(false);
        setExistingRationale(undefined);
        return;
      }

      if (clickedNode.status === "selected") {
        const existingEdge = session.edges.find(
          (e) => e.target === nodeId && e.type === "selected"
        );
        setPendingNodeForRationale(clickedNode);
        setPopoverPosition(screenPosition);
        setIsEditingRationale(true);
        setExistingRationale(existingEdge?.rationale);
      }
    },
    [session]
  );

  // === 従来UI: ポップオーバーで選択確定 ===
  const handlePopoverSelect = useCallback(
    async (nodeId: string, rationale?: string) => {
      if (!session) return;

      const selectedNode = session.nodes.find((n) => n.id === nodeId);

      // スタートノードの場合は条件設定モーダルを表示
      if (selectedNode?.type === "start") {
        setPendingNodeForRationale(null);
        setPopoverPosition(null);
        setPendingStartNodeSelection({
          nodeId,
          purpose: session.purpose,
        });
        setIsConditionModalOpen(true);
        return;
      }

      setPendingNodeForRationale(null);
      setPopoverPosition(null);

      // Phase 8モードかどうかを判定（判断軸ラベルが存在する場合）
      const isPhase8Mode = session.criteriaLabels && session.criteriaLabels.length > 0;

      // Phase 8モードではローディング表示をスキップ（事前生成済みの選択肢のみ使用）
      if (!isPhase8Mode) {
        setLoadingEdgeTarget(nodeId);
      }
      setError(null);

      try {
        const result = await api.recordSelection(session.id, nodeId, rationale);

        console.log("[DN-DEBUG-FE] recordSelection returned:", {
          columnStates: result.session.columnStates,
          currentColumnIndex: result.session.currentColumnIndex,
          criteriaLabelsCount: result.session.criteriaLabels?.length,
        });

        // Phase 8モード: 深さ優先探索を自動発火
        if (isPhase8Mode) {
          const explorationNodeId = `exploration-${nodeId}`;
          const explorationNode = result.session.nodes.find(
            (n) => n.id === explorationNodeId && n.isExplorationNode
          );

          console.log("[DN-DEBUG-FE] explorationNode found:", !!explorationNode, explorationNode ? { id: explorationNode.id, status: explorationNode.status } : null);

          if (explorationNode) {
            // React 18バッチング: 3つの状態更新が1レンダーにまとまる
            setIsAutoExploring(true);
            setExploringNodeId(explorationNodeId);
            setSession(result.session);
            // → QuestionPanelは「深掘り生成中...」を表示（CriteriaSelectorのフラッシュなし）

            skipAutoExploreRef.current = false;
            try {
              const exploreResult = await api.exploreNext(session.id, explorationNodeId);
              console.log("[DN-DEBUG-FE] exploreNext result:", {
                success: exploreResult.success,
                columnStates: exploreResult.success ? exploreResult.session.columnStates : null,
                currentColumnIndex: exploreResult.success ? exploreResult.session.currentColumnIndex : null,
                reason: !exploreResult.success ? exploreResult.reason : null,
              });
              if (!skipAutoExploreRef.current && exploreResult.success && exploreResult.session) {
                setSession(exploreResult.session);
                // → バックエンドがcurrentColumnIndexを深さ優先の新criteriaに設定済み
                // → QuestionPanelは自動的に深さ優先の質問を表示
              }
            } catch (err) {
              console.error("[DN-DEBUG-FE] exploreNext FAILED:", err);
            } finally {
              if (!skipAutoExploreRef.current) {
                setIsAutoExploring(false);
                setExploringNodeId(null);
              }
            }
          } else {
            // 探索ノードなし（最大深度到達等）→ CriteriaSelectorが自然に表示される
            console.log("[DN-DEBUG-FE] No exploration node, setting session directly");
            setSession(result.session);
          }
        } else {
          // 【即座にノードを画面に反映】（非Phase8モード）
          setSession(result.session);
        }

        // ノード追加完了後すぐにローディングをクリア
        if (!isPhase8Mode) {
          setLoadingEdgeTarget(null);
        }

        // Phase 8モードではSentinel Agentをスキップ（事前生成済みの情報のみ使用）
        if (!isPhase8Mode) {
          // Phase X: ノード選択時に見落とし警告を取得（Sentinel Agent）
          // ノード表示をブロックしないよう、非同期で実行
          setIsSentinelLoading(true);
          api.generateInsights(session.id, nodeId, "on_node_selection")
            .then((insightsResponse) => {
              if (insightsResponse.overlookedWarnings && insightsResponse.overlookedWarnings.length > 0) {
                // 既に表示済み/非表示済みでない警告のみ追加
                const newWarnings = insightsResponse.overlookedWarnings.filter(
                  (w: OverlookedWarning) => !dismissedWarnings.has(w.viewpoint)
                );
                if (newWarnings.length > 0) {
                  setOverlookedWarnings(newWarnings);
                  // 新しい警告があればモーダルを自動で開く
                  setIsWarningModalOpen(true);
                }
              }
            })
            .catch((insightErr) => {
              console.warn("Sentinel Agent: インサイト取得エラー:", insightErr);
              // インサイト取得の失敗は選択処理に影響しない
            })
            .finally(() => {
              setIsSentinelLoading(false);
            });
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "選択に失敗しました");
        if (!isPhase8Mode) {
          setLoadingEdgeTarget(null);
        }
      }
    },
    [session, dismissedWarnings, setError, setSession]
  );

  // === 条件設定モーダルの確定 ===
  const handleConditionModalConfirm = useCallback(
    async (
      selectedConditions: Array<{
        id: string;
        label: string;
        category: string;
        description: string;
      }>,
      additionalInput?: string
    ) => {
      if (!session || !pendingStartNodeSelection) return;

      // Phase 8モードかどうかを判定
      const isPhase8Mode = session.criteriaLabels && session.criteriaLabels.length > 0;

      setIsConditionModalOpen(false);
      // Phase 8モードではローディング表示をスキップ
      if (!isPhase8Mode) {
        setLoadingEdgeTarget(pendingStartNodeSelection.nodeId);
      }
      setError(null);

      try {
        // 条件付きで選択を記録
        const result = await api.recordSelection(
          session.id,
          pendingStartNodeSelection.nodeId,
          additionalInput, // 追加の状況説明をrationaleとして渡す
          selectedConditions // 選択された条件を追加データとして渡す
        );
        setSession(result.session);
        // 思考支援情報はAIチャットで通知するため、ここでは設定しない
      } catch (err) {
        setError(err instanceof Error ? err.message : "選択に失敗しました");
      } finally {
        if (!isPhase8Mode) {
          setLoadingEdgeTarget(null);
        }
        setPendingStartNodeSelection(null);
      }
    },
    [session, pendingStartNodeSelection, setError, setSession]
  );

  // === 条件設定モーダルのキャンセル ===
  const handleConditionModalCancel = useCallback(() => {
    setIsConditionModalOpen(false);
    setPendingStartNodeSelection(null);
  }, []);

  // === 従来UI: ポップオーバーを閉じる ===
  const handleClosePopover = useCallback(() => {
    setPendingNodeForRationale(null);
    setPopoverPosition(null);
    setInitialClickPosition(null);
    setInitialViewport(null);
    setIsEditingRationale(false);
    setExistingRationale(undefined);
  }, []);

  // === パネルを閉じる（終了結果付き） ===
  const handleClosePanel = useCallback(() => {
    // セッションがない場合はキャンセル
    if (!session) {
      onClose({ reason: "cancelled" });
      return;
    }

    // Phase 5で最終決定がある場合は完了
    if (isTerminal && finalDecision) {
      onClose({
        reason: "completed",
        sessionId: session.id,
        purpose: session.purpose,
        finalDecision,
        selectionHistory: session.selectionHistory,
      });
      return;
    }

    // 従来UIでselectedノードがあり、選択が完了している場合
    const selectedNodes = session.nodes.filter(n => n.status === "selected");
    const hasOutcomeSelected = selectedNodes.some(n => n.type === "outcome");

    if (hasOutcomeSelected) {
      // アウトカムが選択されている = 完了
      const lastOutcome = selectedNodes.find(n => n.type === "outcome");
      onClose({
        reason: "completed",
        sessionId: session.id,
        purpose: session.purpose,
        finalDecision: lastOutcome ? {
          value: lastOutcome.label,
          rationale: session.edges.find(e => e.target === lastOutcome.id)?.rationale || "",
          satisfiedConditions: [],
        } : undefined,
        selectionHistory: session.selectionHistory,
      });
      return;
    }

    // それ以外は途中終了
    const lastSelected = selectedNodes[selectedNodes.length - 1];
    onClose({
      reason: "in_progress",
      sessionId: session.id,
      purpose: session.purpose,
      progress: {
        selectedNodes: selectedNodes.length,
        totalNodes: session.nodes.length,
        lastSelectedNode: lastSelected?.label,
      },
      selectionHistory: session.selectionHistory,
    });
  }, [session, isTerminal, finalDecision, onClose]);

  // === 深さ優先探索: スキップハンドラー ===
  const handleSkipDepthFirst = useCallback(() => {
    skipAutoExploreRef.current = true;
    setIsAutoExploring(false);
    setExploringNodeId(null);
  }, []);

  // === 従来UI: ビューポート変更時のポップオーバー位置更新 ===
  const handleViewportChange = useCallback(
    (viewport: Viewport) => {
      if (initialClickPosition && initialViewport) {
        const deltaX = viewport.x - initialViewport.x;
        const deltaY = viewport.y - initialViewport.y;
        setPopoverPosition({
          x: initialClickPosition.x + deltaX,
          y: initialClickPosition.y + deltaY,
        });
      }
    },
    [initialClickPosition, initialViewport]
  );

  // === 従来UI: 理由更新 ===
  const handleUpdateRationale = useCallback(
    async (nodeId: string, rationale?: string) => {
      if (!session) return;

      setPendingNodeForRationale(null);
      setPopoverPosition(null);

      try {
        const updatedSession = await api.updateNodeRationale(
          session.id,
          nodeId,
          rationale
        );
        setSession(updatedSession);
      } catch (err) {
        setError(err instanceof Error ? err.message : "更新に失敗しました");
      }
    },
    [session, setSession, setError]
  );

  // === 質問パネル: 次の判断軸を選択 ===
  const handleSelectNextCriteria = useCallback((criteriaId: string) => {
    if (!session) return;
    const idx = session.criteriaLabels?.findIndex(c => c.id === criteriaId);
    if (idx === undefined || idx < 0) return;
    setSession(prev => prev ? { ...prev, currentColumnIndex: idx } : prev);
  }, [session, setSession]);

  // === スプリッターのドラッグ（水平） ===
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    resizeRef.current = {
      startX: e.clientX,
      startWidth: chatWidth,
    };
  }, [chatWidth]);

  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!resizeRef.current) return;
      // 左パネル: 右にドラッグすると広くなる
      const delta = e.clientX - resizeRef.current.startX;
      const newWidth = Math.max(280, Math.min(600, resizeRef.current.startWidth + delta));
      setChatWidth(newWidth);
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      resizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  // === 垂直スプリッターのドラッグ（過去事例パネルと条件パネルの間） ===
  const handleVerticalResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsVerticalResizing(true);
    verticalResizeRef.current = {
      startY: e.clientY,
      startHeight: pastCaseHeight,
    };
  }, [pastCaseHeight]);

  useEffect(() => {
    if (!isVerticalResizing) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!verticalResizeRef.current) return;
      // 下にドラッグすると高くなる
      const delta = e.clientY - verticalResizeRef.current.startY;
      const newHeight = Math.max(80, Math.min(400, verticalResizeRef.current.startHeight + delta));
      setPastCaseHeight(newHeight);
    };

    const handleMouseUp = () => {
      setIsVerticalResizing(false);
      verticalResizeRef.current = null;
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isVerticalResizing]);

  // === Phase X: 見落とし警告を非表示にする ===
  const handleDismissWarning = useCallback((viewpoint: string) => {
    setDismissedWarnings((prev) => new Set(prev).add(viewpoint));
    setOverlookedWarnings((prev) => prev.filter((w) => w.viewpoint !== viewpoint));
  }, []);

  // === 判断軸追加ハンドラー ===
  const handleAddCriteria = useCallback(async () => {
    if (!session) return;

    setIsAddingCriteria(true);
    setError(null);

    try {
      const result = await api.addCriteria(session.id);

      if (!result.success) {
        // 追加すべき判断軸がない場合はエラーではなくinfoとして表示
        console.info("[AddCriteria]", result.reason);
        // TODO: トースト通知を表示（現在はコンソールのみ）
        // toast.info(result.reason || 'これ以上追加すべき判断軸はありません');
        return;
      }

      // セッションを更新
      if (result.session) {
        setSession(result.session);
        // 追加された新しい判断軸ノードにズーム
        // setFocusNodeId(addedNode.id); // 今後実装する場合
      }
    } catch (err) {
      console.error("[AddCriteria] エラー:", err);
      setError(err instanceof Error ? err.message : "判断軸の追加に失敗しました");
    } finally {
      setIsAddingCriteria(false);
    }
  }, [session, setError, setSession]);

  // === Phase 22: 探索ノードクリック時のハンドラー ===
  const handleExploreNext = useCallback(async (explorationNodeId: string) => {
    if (!session) return;

    // 探索中状態に切り替え（ノードのラベルが「探索中...」に変わる）
    setExploringNodeId(explorationNodeId);
    setError(null);

    try {
      const result = await api.exploreNext(session.id, explorationNodeId);

      if (!result.success) {
        console.info("[ExploreNext]", result.reason);
        // TODO: トースト通知を表示
        return;
      }

      // セッションを更新
      if (result.session) {
        setSession(result.session);
      }
    } catch (err) {
      console.error("[ExploreNext] エラー:", err);
      setError(err instanceof Error ? err.message : "探索に失敗しました");
    } finally {
      // 探索完了
      setExploringNodeId(null);
    }
  }, [session, setError, setSession]);

  // === 俯瞰ビュー: criteriaクリックでフローチャートに復帰 ===
  const handleLandscapeCriteriaClick = useCallback((criteriaId: string) => {
    setViewMode("flowchart");
  }, []);

  // === チャットメッセージ送信 ===
  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!session) return;

      const optimisticUserMessage = {
        id: `temp-${Date.now()}`,
        role: "user" as const,
        content: message,
        timestamp: new Date().toISOString(),
        type: "text" as const,
      };

      setSession((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          chatHistory: [...prev.chatHistory, optimisticUserMessage],
        };
      });

      setIsChatProcessing(true);
      setError(null);

      try {
        const updatedSession = await api.sendChatMessage(session.id, message);
        setSession(updatedSession);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : "メッセージ送信に失敗しました"
        );
        setSession((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            chatHistory: prev.chatHistory.filter(
              (m) => m.id !== optimisticUserMessage.id
            ),
          };
        });
      } finally {
        setIsChatProcessing(false);
      }
    },
    [session, setSession, setError]
  );

  // === レンダリング ===
  return (
    <div className={`dn-panel${isTheaterMode ? " dn-panel--theater" : ""}`}>
      {/* ヘッダー（1行に統合: 目的 + 思考戦略 + アクションボタン） */}
      <div className="dn-panel__header">
        <div className="dn-panel__title">
          {session ? (
            <span className="dn-panel__purpose-inline" title={session.purpose}>
              目的: {session.purpose}
            </span>
          ) : (
            <span>意思決定ナビ</span>
          )}
          {/* 思考戦略セレクタ（インライン） */}
          {session?.thinkingStrategy && (
            <>
              <select
                className="dn-panel__strategy-select"
                value={session.thinkingStrategy}
                onChange={(e) => handleSwitchStrategy(e.target.value as ThinkingStrategyId)}
                disabled={isSwitchingStrategy}
                title="思考戦略"
              >
                {(Object.keys(STRATEGY_LABELS) as ThinkingStrategyId[]).map((id) => (
                  <option key={id} value={id}>
                    {STRATEGY_LABELS[id]}
                  </option>
                ))}
              </select>
              {isSwitchingStrategy && (
                <span className="dn-panel__strategy-loading">...</span>
              )}
            </>
          )}
          {/* Phase 27: 判断パスボタン */}
          {session && (() => {
            const selectedCount = session.nodes.filter(n => n.status === "selected" && n.type !== "start").length;
            return selectedCount > 0 ? (
              <button
                type="button"
                className="dn-panel__journey-btn"
                onClick={() => setIsJourneyViewOpen(true)}
                title={`判断パスを表示（${selectedCount}件の判断）`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
                <span>{selectedCount}</span>
              </button>
            ) : null;
          })()}
        </div>
        {/* Sentinel Agent: 警告バッジ */}
        {isRouteTerminal ? (
          <button
            type="button"
            className="dn-panel__sentinel-badge dn-panel__sentinel-badge--complete"
            onClick={() => setIsRouteRiskSummaryOpen(true)}
            title="ルートリスクサマリーを表示"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
            <span>完了</span>
          </button>
        ) : overlookedWarnings.length > 0 ? (
          <button
            type="button"
            className="dn-panel__sentinel-badge"
            onClick={() => setIsWarningModalOpen(true)}
            title={`${overlookedWarnings.length}件の見落とし警告があります`}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z" />
            </svg>
            <span>{overlookedWarnings.length}</span>
          </button>
        ) : null}
        {session && (
          <button
            type="button"
            className="dn-panel__export-btn"
            onClick={handleExportNodes}
            title="ノード情報をテキストエクスポート"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
          </button>
        )}
        <button
          type="button"
          className="dn-panel__close"
          onClick={handleClosePanel}
          title="閉じる"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* エラー表示 */}
      {error && (
        <div className="dn-panel__error">
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)}>
            閉じる
          </button>
        </div>
      )}

      {/* ローディング中（プログレスバーのみ表示、スピナーは不要） */}
      {isLoading && !session && (
        <div className="dn-panel__loading">
          <span>セッションを開始しています...</span>
          <div className="dn-panel__progress-bar">
            <div className="dn-panel__progress-fill" />
          </div>
          <span className="dn-panel__progress-hint">
            AIが最適な意思決定パスを分析中
          </span>
        </div>
      )}

      {/* 開始画面: initialPurposeがない場合のみ表示 */}
      {!session && !isLoading && !initialPurpose && (
        <div className="dn-panel__start">
          <div className="dn-panel__start-icon">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4" />
              <path d="M12 8h.01" />
            </svg>
          </div>
          <h2 className="dn-panel__start-title">意思決定を整理しましょう</h2>
          <p className="dn-panel__start-desc">
            条件を選んで選択肢を絞り込み、意思決定をサポートします。
          </p>
          <button
            type="button"
            className="dn-panel__start-btn"
            onClick={() =>
              handleStartSession(initialPurpose || "", initialSituation)
            }
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polygon points="5 3 19 12 5 21 5 3" />
            </svg>
            開始する
          </button>
        </div>
      )}

      {/* コンテンツ: セッション開始後 */}
      {session && (
        <div className="dn-panel__content">

          {/* Phase 5 UI: 2カラムレイアウト（左：チャット、右：条件ベース絞り込み） */}
          {isPhase5Active && initialLayout && thinkingBox && goalCompass && (
            <div className="dn-panel__body">
              {/* 左: チャット */}
              <div className="dn-panel__chat-area" style={{ width: chatWidth }}>
                <DecisionNavigatorChat
                  messages={session.chatHistory}
                  onSendMessage={handleSendMessage}
                  isProcessing={isChatProcessing}
                />
              </div>

              {/* スプリッター */}
              <div
                className={`dn-panel__splitter ${isResizing ? "dn-panel__splitter--active" : ""}`}
                onMouseDown={handleResizeStart}
              />

              {/* 右: 条件ベース絞り込み */}
              <div className="dn-panel__phase5-area">
                {/* ゴールコンパス（コンパクト表示） */}
                <div className="dn-panel__compass">
                  <GoalCompass
                    compassState={goalCompass}
                    remainingCandidates={thinkingBox.remainingCandidates}
                  />
                </div>

                {/* 決定完了時 */}
                {isTerminal && finalDecision && (
                  <div className="dn-panel__final-decision">
                    <div className="dn-panel__final-decision-header">
                      <span className="dn-panel__final-decision-icon">🎯</span>
                      <h3>決定完了</h3>
                    </div>
                    <div className="dn-panel__final-decision-value">
                      {finalDecision.value}
                    </div>
                    <div className="dn-panel__final-decision-rationale">
                      <strong>根拠:</strong> {finalDecision.rationale}
                    </div>
                    <div className="dn-panel__final-decision-conditions">
                      <strong>満たした条件:</strong>
                      <ul>
                        {finalDecision.satisfiedConditions.map((c, i) => (
                          <li key={i}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                )}

                {/* 三列レイアウト（初回）または思考ボックス（2回目以降） */}
                {!isTerminal && (
                  <div className="dn-panel__thinking-area">
                    {thinkingBox.depth === 0 ? (
                      <ThreeColumnLayout
                        layout={initialLayout}
                        onSelectCondition={handleSelectCondition}
                        isLoading={isLoading}
                      />
                    ) : (
                      <ThinkingBoxView
                        thinkingBox={thinkingBox}
                        compassState={goalCompass}
                        onSelectCondition={handleSelectCondition}
                        isLoading={isLoading}
                      />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ハイブリッドUI: 左パネル（質問/チャットタブ） + 右パネル（フローチャート） */}
          {!isPhase5Active && (
            <div className="dn-panel__body">
              {/* 左側: 質問パネル / AIチャット（タブ切替）— ローディング中は非表示 */}
              {!isLoading && (
                <>
                  <div className="dn-panel__left-panel" style={{ width: chatWidth }}>
                    {/* タブヘッダー */}
                    <div className="dn-panel__tab-header">
                      <button
                        type="button"
                        className={`dn-panel__tab${leftPanelTab === "question" ? " dn-panel__tab--active" : ""}`}
                        onClick={() => setLeftPanelTab("question")}
                      >
                        質問
                      </button>
                      <button
                        type="button"
                        className={`dn-panel__tab${leftPanelTab === "chat" ? " dn-panel__tab--active" : ""}`}
                        onClick={() => setLeftPanelTab("chat")}
                      >
                        AIチャット
                      </button>
                    </div>

                    {/* タブコンテンツ */}
                    <div className="dn-panel__tab-content">
                      {leftPanelTab === "question" ? (
                        <QuestionPanel
                          session={session}
                          onSelectOption={handlePopoverSelect}
                          onSelectNextCriteria={handleSelectNextCriteria}
                          isLoading={isLoading}
                          isAutoExploring={isAutoExploring}
                          onSkipDepthFirst={handleSkipDepthFirst}
                        />
                      ) : (
                        <DecisionNavigatorChat
                          messages={session.chatHistory}
                          onSendMessage={handleSendMessage}
                          isProcessing={isChatProcessing}
                        />
                      )}
                    </div>
                  </div>

                  {/* スプリッター */}
                  <div
                    className={`dn-panel__splitter ${isResizing ? "dn-panel__splitter--active" : ""}`}
                    onMouseDown={handleResizeStart}
                  />
                </>
              )}

              {/* 右側: フローチャート（自動描画ツリー） */}
              <div className="dn-panel__main-content">
                {/* 上部: 過去事例パネル（skipPastCasePanelの場合は非表示） */}
                {!skipPastCasePanel && (
                  <div className="dn-panel__top-area" style={{ height: pastCaseHeight }}>
                    <PastCasePanel
                      cases={pastCases}
                      isLoading={isConditionsLoading}
                    />
                  </div>
                )}

                {/* 垂直スプリッター（過去事例と条件パネルの間） */}
                {!skipPastCasePanel && (simulationConditions.length > 0 || allAvailableConditions.length > 0) && (
                  <div
                    className={`dn-panel__vertical-splitter ${isVerticalResizing ? "dn-panel__vertical-splitter--active" : ""}`}
                    onMouseDown={handleVerticalResizeStart}
                  />
                )}

                {/* 中間: 条件パネル（タグ形式、skipPastCasePanelの場合は非表示） */}
                {!skipPastCasePanel && (simulationConditions.length > 0 || allAvailableConditions.length > 0) && (
                  <div className="dn-panel__condition-bar">
                    <ConditionPanel
                      conditions={simulationConditions}
                      onConditionChange={handleConditionChange}
                      onDetailedSettingsChange={handleDetailedSettingsChange}
                      allAvailableConditions={allAvailableConditions}
                      purpose={session?.purpose || ""}
                      isLoading={isConditionsLoading}
                    />
                  </div>
                )}

                {/* Phase 5改改: 前提条件サマリー */}
                {confirmedPreconditions.length > 0 && (
                  <PreconditionSummary
                    preconditions={confirmedPreconditions}
                    additionalContext={additionalPreconditionContext}
                    onEdit={() => setIsPreconditionModalOpen(true)}
                  />
                )}

                {/* 下部: フローチャート / 俯瞰ビュー */}
                <div className="dn-panel__flowchart-area">
                  {/* ビュー切り替えトグル */}
                  <div className="dn-panel__view-toggle">
                    <button
                      type="button"
                      className={`dn-panel__view-toggle-btn${viewMode === "flowchart" ? " dn-panel__view-toggle-btn--active" : ""}`}
                      onClick={() => setViewMode("flowchart")}
                      title="フローチャート表示"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                      </svg>
                      <span>フロー</span>
                    </button>
                    <button
                      type="button"
                      className={`dn-panel__view-toggle-btn${viewMode === "landscape" ? " dn-panel__view-toggle-btn--active" : ""}`}
                      onClick={() => setViewMode("landscape")}
                      title="俯瞰ビュー"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="3" width="7" height="7" />
                        <rect x="14" y="3" width="7" height="7" />
                        <rect x="3" y="14" width="7" height="7" />
                        <rect x="14" y="14" width="7" height="7" />
                      </svg>
                      <span>俯瞰</span>
                    </button>
                  </div>

                  {/* シアターモード トグルボタン */}
                  <button
                    type="button"
                    className="dn-panel__theater-toggle"
                    onClick={() => setIsTheaterMode((prev) => !prev)}
                    title={isTheaterMode ? "通常表示に戻す" : "シアターモード"}
                  >
                    {isTheaterMode ? (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="4 14 10 14 10 20" />
                        <polyline points="20 10 14 10 14 4" />
                        <line x1="14" y1="10" x2="21" y2="3" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    ) : (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="15 3 21 3 21 9" />
                        <polyline points="9 21 3 21 3 15" />
                        <line x1="21" y1="3" x2="14" y2="10" />
                        <line x1="3" y1="21" x2="10" y2="14" />
                      </svg>
                    )}
                  </button>

                  {viewMode === "flowchart" ? (
                    <div className="dn-panel__flowchart">
                      <ReactFlowProvider>
                        <FlowChart
                          session={session}
                          onNodeClick={handleNodeClick}
                          loadingNodeId={loadingEdgeTarget}
                          onPaneClick={handleClosePopover}
                          onViewportChange={handleViewportChange}
                          isLoading={isLoading}
                          onAddCriteria={handleAddCriteria}
                          isAddingCriteria={isAddingCriteria}
                          onExploreNext={handleExploreNext}
                          exploringNodeId={exploringNodeId}
                          onCriteriaClick={handleSelectNextCriteria}
                        />
                      </ReactFlowProvider>
                    </div>
                  ) : (
                    <div className="dn-panel__landscape">
                      <DecisionLandscapeView
                        session={session}
                        onCriteriaClick={handleLandscapeCriteriaClick}
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ノードポップオーバー（従来UI用） */}
      {!isPhase5Active && (
        <NodePopover
          node={pendingNodeForRationale}
          isOpen={!!pendingNodeForRationale}
          position={popoverPosition}
          onClose={handleClosePopover}
          onSelect={handlePopoverSelect}
          isEditing={isEditingRationale}
          existingRationale={existingRationale}
          onUpdateRationale={handleUpdateRationale}
        />
      )}

      {/* Phase 5 ローディングオーバーレイ（プログレスバーがあるためスピナー不要） */}
      {isPhase5Active && isLoading && session && (
        <div className="dn-panel__overlay">
          <div className="dn-panel__overlay-content">
            <span>条件を処理中...</span>
          </div>
        </div>
      )}

      {/* 条件設定モーダル（スタートノード選択後） */}
      <ConditionSetupModal
        isOpen={isConditionModalOpen}
        purpose={pendingStartNodeSelection?.purpose ?? ""}
        extractedConditions={[]}
        onConfirm={handleConditionModalConfirm}
        onCancel={handleConditionModalCancel}
      />

      {/* Phase 5改改: 前提条件モーダル（セッション開始前） */}
      <PreconditionModal
        isOpen={isPreconditionModalOpen}
        purpose={initialPurpose || ""}
        extractedConditions={extractedPreconditions}
        clarificationQuestions={clarificationQuestions}
        isLoadingQuestions={isLoadingQuestions}
        onConfirm={handlePreconditionConfirm}
        onClose={handlePreconditionClose}
      />

      {/* Phase X: 見落とし警告モーダル（当面非表示 - 認知負荷軽減のため） */}
      {/* TODO: 適切なタイミングで表示するロジックを再検討
      {!isRouteTerminal && (
        <SentinelWarningModal
          isOpen={isWarningModalOpen}
          warnings={overlookedWarnings}
          onClose={() => setIsWarningModalOpen(false)}
          onAcknowledge={handleDismissWarning}
          onAcknowledgeAll={() => {
            // すべての警告を確認済みにする
            overlookedWarnings.forEach((w) => {
              setDismissedWarnings((prev) => new Set(prev).add(w.viewpoint));
            });
            setOverlookedWarnings([]);
          }}
        />
      )}
      */}

      {/* ルート完了時のリスクサマリーモーダル */}
      {session && isRouteRiskSummaryOpen && (
        <RouteRiskSummary
          nodes={session.nodes}
          selectionHistory={session.selectionHistory}
          purpose={session.purpose}
          onClose={() => setIsRouteRiskSummaryOpen(false)}
        />
      )}

      {/* Phase 27: 判断履歴モーダル */}
      {session && isJourneyViewOpen && (
        <div className="dn-panel__journey-modal">
          <div className="dn-panel__journey-backdrop" onClick={() => setIsJourneyViewOpen(false)} />
          <div className="dn-panel__journey-content">
            <DecisionJourneyView
              session={session}
              onClose={() => setIsJourneyViewOpen(false)}
            />
          </div>
        </div>
      )}
    </div>
  );
}
