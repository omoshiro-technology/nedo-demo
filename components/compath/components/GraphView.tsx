"use client"
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import ReactFlow, {
  Background,
  Controls,
  MarkerType,
  applyEdgeChanges,
  applyNodeChanges,
  addEdge,
  updateEdge,
  type Edge,
  type Node,
  type NodeChange,
  type EdgeChange,
  type OnConnect,
  type NodeMouseHandler,
  ReactFlowInstance,
  type Viewport
} from "reactflow";
import type { GraphResult } from "../types";
import { chatWithAssistant, type ChatMessage } from "../api/chat";
import { exportGraph, downloadBlob } from "../api/export";
import type { ExtendedChatMessage, AgentAction } from "../types/agentMessage";
import type { FeedbackSuggestion, FeedforwardSuggestion } from "../utils/knowledgeExtractor";
import AgentMessage from "./AgentMessage";
import { extractConcreteActions } from "../utils/actionExtractor";

// 分離したモジュールからインポート
import {
  LEVEL_SPACING,
  NODE_SPACING,
  COLUMN_OFFSET,
  BASE_EDGE_WIDTH,
  EDGE_INTERACTION_WIDTH,
  BASE_EDGE_STYLE,
  nodeTypes,
  makeKeyword,
  findNearestLevel,
  insertPlaceholders,
  getLevelGap,
  buildChatContext,
  parseNodeCandidates,
  splitSpeculativeSection,
  addNodeFromCandidate,
  type AxisNodeData,
  type MissingPoolItem,
} from "./graph";

type GraphViewProps = {
  graph: GraphResult;
  summary?: string;
  feedforward?: FeedforwardSuggestion[];
  feedback?: FeedbackSuggestion[];
  /** 履歴ID（エクスポート機能に必要） */
  historyId?: string;
};

export default function GraphView({ graph, summary, feedforward, feedback, historyId }: GraphViewProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [nodesState, setNodesState] = useState<Node<AxisNodeData>[]>([]);
  const [edgesState, setEdgesState] = useState<Edge[]>([]);
  const flowRef = useRef<ReactFlowInstance | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const [edgeUpdateSuccessful, setEdgeUpdateSuccessful] = useState(false);
  const [viewport, setViewport] = useState<Viewport>({ x: 0, y: 0, zoom: 1 });
  const [missingPool, setMissingPool] = useState<MissingPoolItem[]>([]);
  const [selectedNodeIds, setSelectedNodeIds] = useState<string[]>([]);
  const levelOrder = useMemo(
    () => new Map(graph.levels.map((l, idx) => [l.label, idx])),
    [graph.levels]
  );
  const [chatWidth, setChatWidth] = useState<number>(540);
  const [isResizingChat, setIsResizingChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  // 軸ごとにチャット履歴を保持
  const [chatMessagesByAxis, setChatMessagesByAxis] = useState<Map<string, ExtendedChatMessage[]>>(new Map());
  const chatMessages = chatMessagesByAxis.get(graph.axisId) ?? [];
  const setChatMessages = (updater: ExtendedChatMessage[] | ((prev: ExtendedChatMessage[]) => ExtendedChatMessage[])) => {
    setChatMessagesByAxis((prev) => {
      const current = prev.get(graph.axisId) ?? [];
      const newMessages = typeof updater === "function" ? updater(current) : updater;
      const next = new Map(prev);
      next.set(graph.axisId, newMessages);
      return next;
    });
  };
  const [isChatSending, setIsChatSending] = useState(false);
  const chatBodyRef = useRef<HTMLDivElement | null>(null);
  // 軸ごとにフィードフォワード/フィードバックのインデックスを保持
  const [feedforwardIndexByAxis, setFeedforwardIndexByAxis] = useState<Map<string, number>>(new Map());
  const [feedbackIndexByAxis, setFeedbackIndexByAxis] = useState<Map<string, number>>(new Map());
  const currentFeedforwardIndex = feedforwardIndexByAxis.get(graph.axisId) ?? 0;
  const currentFeedbackIndex = feedbackIndexByAxis.get(graph.axisId) ?? 0;
  const setCurrentFeedforwardIndex = (value: number) => {
    setFeedforwardIndexByAxis((prev) => new Map(prev).set(graph.axisId, value));
  };
  const setCurrentFeedbackIndex = (value: number) => {
    setFeedbackIndexByAxis((prev) => new Map(prev).set(graph.axisId, value));
  };
  const [isPaletteCollapsed, setIsPaletteCollapsed] = useState(true);

  const { nodes, edges } = useMemo(() => {
    const levelIndex = new Map(graph.levels.map((level, index) => [level.id, index]));
    const nodesByLevel = graph.levels.map((level) => ({
      level,
      nodes: graph.nodes
        .filter((node) => node.levelId === level.id && node.status !== "missing")
        .sort((a, b) => a.label.localeCompare(b.label, "ja"))
    }));

    const maxPerLevel = Math.max(
      ...nodesByLevel.map(({ nodes }) => nodes.length || 1),
      1
    );

    const flowNodes: Node<AxisNodeData>[] = nodesByLevel.flatMap(({ level, nodes }) => {
      const total = nodes.length || 1;
      const levelOrder = levelIndex.get(level.id) ?? 0;
      const centeredStart = ((maxPerLevel - total) * NODE_SPACING) / 2;

      return nodes.map((node, index) => ({
        id: node.id,
        type: "axisNode",
        position: {
          x: levelOrder * LEVEL_SPACING,
          y: centeredStart + index * NODE_SPACING
        },
        data: {
          label: makeKeyword(node.label),
          fullLabel: node.label,
          levelId: level.id,
          levelLabel: level.label,
          status: node.status,
          confidence: node.confidence,
          tags: node.tags
        },
        draggable: false,
        selectable: true
      }));
    });

    const presentIds = new Set(flowNodes.map((n) => n.id));
    const flowEdges: Edge[] = graph.edges
      .filter((edge) => presentIds.has(edge.source) && presentIds.has(edge.target))
      .map((edge) => ({
        id: edge.id,
        source: edge.source,
        target: edge.target,
        type: "straight",
        animated: true,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          width: 18,
          height: 18,
          color: BASE_EDGE_STYLE.stroke
        },
        style: { ...BASE_EDGE_STYLE }
      }));

    const { nodes: normalizedNodes, edges: normalizedEdges } = insertPlaceholders(
      flowNodes,
      flowEdges,
      graph.levels,
      levelIndex
    );

    return { nodes: normalizedNodes, edges: normalizedEdges };
  }, [graph]);

  // 軸が変わったら入力欄のみクリア（履歴は保持）
  useEffect(() => {
    setChatInput("");
  }, [graph.axisId]);

  useEffect(() => {
    // Initialize editable state with column-fixed x and trigger fit
    const levelIndex = new Map(graph.levels.map((level, index) => [level.label, index]));
    const fixedNodes = nodes.map((node) => {
      const label = (node.data as AxisNodeData).levelLabel;
      const idx = levelIndex.get(label) ?? 0;
      return {
        ...node,
        position: { x: idx * LEVEL_SPACING + COLUMN_OFFSET, y: node.position.y },
        draggable: true
      };
    });
    setNodesState(fixedNodes);
    setEdgesState(edges);
    const missing = graph.nodes
      .filter((n) => n.status === "missing")
      .filter((n) => !/未記入|missing/i.test(n.label))
      .map((n) => ({ id: n.id, label: n.label, levelLabel: n.levelLabel, levelId: n.levelId }));
    setMissingPool(missing);
    setTimeout(() => flowRef.current?.fitView({ padding: 0.3 }), 50);
  }, [graph, nodes, edges]);

  useEffect(() => {
    if (isFullscreen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      document.body.classList.add("is-fullscreen-mode");
      return () => {
        document.body.style.overflow = prev;
        document.body.classList.remove("is-fullscreen-mode");
      };
    }
    return;
  }, [isFullscreen]);

  // 編集モードに入った時にウェルカムメッセージを表示
  useEffect(() => {
    if (!isEditMode) return;

    // 初回の編集モード時にのみ表示（重複防止）
    const hasAgentMessages = chatMessages.some((msg) => msg.role === "agent");
    if (hasAgentMessages) return;

    // 分析結果に基づいて推奨アクションを決定
    // nodesStateに既に存在するレベルは除外して重複を防ぐ
    const existingLevelLabels = new Set(nodesState.map((n) => (n.data as AxisNodeData).levelLabel));
    const missingNodes = graph.nodes.filter((n) =>
      n.status === "missing" && !existingLevelLabels.has(n.levelLabel)
    );
    const missingCount = missingNodes.length;
    const hasFeedforward = feedforward && feedforward.length > 0;
    const hasFeedback = feedback && feedback.length > 0;

    // 優先度判定: 1. 高優先度のリスク → 2. 未入力の項目 → 3. 品質改善 → 4. フリーチャット
    const highPriorityRisks = feedforward?.filter((ff) => ff.priority === "high") || [];
    const criticalMissing = graph.nodes.filter((n) =>
      n.status === "missing" && ["根本原因", "恒久対策", "効果検証"].includes(n.levelLabel)
    );

    let recommendation = "";
    let priority: "high" | "medium" | "low" = "low";

    // 未入力の項目が少数（1-3件）の場合は、直接追加ボタンを表示する
    const shouldAutoSuggestNodes = missingCount > 0 && missingCount <= 3;

    if (highPriorityRisks.length > 0) {
      recommendation = `高優先度のリスク・懸念事項が${highPriorityRisks.length}件見つかりました。確認することをお勧めします。`;
      priority = "high";
    } else if (shouldAutoSuggestNodes) {
      // 未入力の項目が少数の場合は、具体的に提案
      const missingLabels = missingNodes.slice(0, 3).map((n) => n.levelLabel).join("、");
      recommendation = `${missingCount}件の未入力の項目を検出しました（${missingLabels}）。以下のボタンから追加できます。`;
      priority = missingCount <= 1 ? "medium" : "high";
    } else if (criticalMissing.length > 0) {
      recommendation = `重要な未入力の項目（${criticalMissing.map((n) => n.levelLabel).join("、")}）が${criticalMissing.length}件あります。内容を確認して追加しましょう。`;
      priority = "high";
    } else if (missingCount > 0) {
      recommendation = `${missingCount}件の未入力の項目があります。左側のリストから確認して、必要に応じて追加してください。`;
      priority = "medium";
    } else if (hasFeedback) {
      recommendation = `未入力の項目はありませんが、品質改善の余地があります。ドキュメントを精緻化しましょう。`;
      priority = "medium";
    } else if (hasFeedforward) {
      recommendation = `未入力の項目はありませんが、将来のリスクに備えましょう。懸念事項をチェックしてください。`;
      priority = "low";
    } else {
      recommendation = `ドキュメントは充実しています！追加で確認したいことがあれば「💬 AIと自由に相談」をご利用ください。`;
      priority = "low";
    }

    const messages: ExtendedChatMessage[] = [];

    // ウェルカムメッセージ
    const welcomeMessage: ExtendedChatMessage = {
      role: "agent",
      type: "gap_analysis",
      timestamp: Date.now(),
      data: {
        totalMissing: missingCount,
        missingByLevel: graph.levels.map((level) => {
          const levelMissing = graph.nodes.filter(
            (n) => n.levelLabel === level.label && n.status === "missing"
          );
          return {
            levelLabel: level.label,
            count: levelMissing.length,
            examples: levelMissing.slice(0, 2).map((n) => n.label)
          };
        }).filter((l) => l.count > 0),
        priority,
        recommendation
      },
      actions: shouldAutoSuggestNodes ?
        // 欠損が少数の場合は、直接追加ボタンを表示
        missingNodes.slice(0, 3).map((node, idx) => ({
          id: `add-missing-${idx}`,
          label: `➕ ${node.levelLabel}を追加`,
          type: "add_node" as const,
          data: { levelLabel: node.levelLabel, label: node.label, chatSource: "agent_auto_suggest" }
        })).concat([
          ...(hasFeedforward ? [{
            id: "action-check-risks",
            label: "⚠️ リスクや懸念事項を確認",
            type: "expand_detail" as const,
            data: { actionType: "check_feedforward" }
          }] : []),
          {
            id: "action-free-chat",
            label: "💬 AIと自由に相談",
            type: "expand_detail" as const,
            data: { actionType: "free_chat" }
          }
        ])
      :
        // 欠損が多数の場合は従来通り
        [
          ...(hasFeedforward ? [{
            id: "action-check-risks",
            label: highPriorityRisks.length > 0 ? "⚠️ リスクや懸念事項を確認（推奨）" : "⚠️ リスクや懸念事項を確認",
            type: "expand_detail" as const,
            data: { actionType: "check_feedforward" }
          }] : []),
          ...(missingCount > 0 ? [{
            id: "action-analyze-gaps",
            label: "📊 未入力の項目をさらに分析",
            type: "expand_detail" as const,
            data: { actionType: "analyze_gaps" }
          }] : []),
          ...(hasFeedback ? [{
            id: "action-improve-quality",
            label: "✍️ ドキュメント品質を改善",
            type: "expand_detail" as const,
            data: { actionType: "check_feedback" }
          }] : []),
          {
            id: "action-free-chat",
            label: "💬 AIと自由に相談",
            type: "expand_detail" as const,
            data: { actionType: "free_chat" }
          }
        ]
    };

    messages.push(welcomeMessage);
    setChatMessages((msgs) => [...msgs, ...messages]);
  }, [isEditMode, graph, feedforward, feedback, chatMessages]);

  // チャットメッセージが更新されたら自動的に最下部にスクロール
  useEffect(() => {
    if (chatBodyRef.current) {
      // DOM更新とレイアウト完了後にスクロールするため、二重のrequestAnimationFrameを使用
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (chatBodyRef.current) {
            const element = chatBodyRef.current;
            element.scrollTop = element.scrollHeight;
          }
        });
      });
    }
  }, [chatMessages]);

  const handleNodesChange = (changes: NodeChange[]) => {
    setNodesState((nds) =>
      applyNodeChanges(
        changes.map((change) => {
          if (change.type === "position" && change.position) {
            const nearest = findNearestLevel(change.position.x, graph.levels);
            const x = nearest.index * LEVEL_SPACING + COLUMN_OFFSET;
            return {
              ...change,
              position: { x, y: change.position.y },
              data: {
                ...(nds.find((n) => n.id === change.id)?.data as AxisNodeData),
                levelLabel: nearest.level.label,
                levelId: nearest.level.id
              }
            };
          }
          return change;
        }),
        nds
      )
    );
  };

  const handleEdgesChange = (changes: EdgeChange[]) => {
    setEdgesState((eds) => applyEdgeChanges(changes, eds));
  };

  const handleConnect: OnConnect = (connection) => {
    if (!connection.source || !connection.target) return;
    setEdgesState((eds) =>
      addEdge(
        {
          ...connection,
          type: "straight",
          animated: true,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            width: 18,
            height: 18,
            color: "#1f7a6d"
          },
          style: {
            stroke: "#1f7a6d",
            strokeWidth: BASE_EDGE_WIDTH,
            opacity: 0.9,
            strokeDasharray: BASE_EDGE_STYLE.strokeDasharray,
            pointerEvents: BASE_EDGE_STYLE.pointerEvents,
            zIndex: BASE_EDGE_STYLE.zIndex
          }
        },
        eds
      )
    );
    clearSelection();
  };

  const handleEdgeClick = (_evt: React.MouseEvent, edge: Edge) => {
    if (isEditMode) {
      const gapInfo = getLevelGap(edge, nodesState, levelOrder, graph.levels);
      if (gapInfo.gap > 1) {
        const targetLevel = gapInfo.missingLevels[0];
        const defaultLabel = `${targetLevel?.label ?? "原因"}ノード`;
        const next = window.prompt(`間に追加するノードを入力 (${targetLevel?.label ?? "原因"})`, defaultLabel);
        if (next && next.trim()) {
          insertIntermediateNode(edge, next.trim(), targetLevel?.label ?? defaultLabel);
          return;
        }
      }
    }
    setSelectedEdgeId((prev) => (prev === edge.id ? null : edge.id));
  };

  const handleEdgeUpdateStart = (_evt: React.MouseEvent | TouchEvent, edge: Edge) => {
    setEdgeUpdateSuccessful(false);
    setSelectedEdgeId(edge.id);
  };

  const handleEdgeUpdate = (oldEdge: Edge, newConnection: { source?: string; target?: string }) => {
    setEdgesState((eds) => updateEdge(oldEdge, newConnection, eds));
    setEdgeUpdateSuccessful(true);
    setSelectedEdgeId(null);
    setNodesState((nds) => nds); // force rerender so gap-based coloring updates
  };

  const handleEdgeUpdateEnd = (_evt: React.MouseEvent | TouchEvent, edge: Edge) => {
    setSelectedEdgeId(null);
    if (!edgeUpdateSuccessful) return;
  };

  const deleteSelectedEdge = () => {
    if (!selectedEdgeId) return;
    setEdgesState((eds) => eds.filter((e) => e.id !== selectedEdgeId));
    setSelectedEdgeId(null);
  };

  const handlePaneClick = () => {
    setSelectedEdgeId(null);
    setSelectedNodeIds([]);
  };

  const clearSelection = () => {
    setSelectedEdgeId(null);
    setSelectedNodeIds([]);
  };

  const handleNodeDoubleClick: NodeMouseHandler = (_evt, node) => {
    if (!isEditMode) return;
    const data = node.data as AxisNodeData;
    if (data.isPlaceholder) return;
    const currentLabel = (node.data as AxisNodeData).fullLabel;
    const next = window.prompt("ノードのラベルを編集", currentLabel);
    if (next && next.trim()) {
      setNodesState((nds) =>
        nds.map((n) =>
          n.id === node.id
            ? {
                ...n,
                data: {
                  ...(n.data as AxisNodeData),
                  label: makeKeyword(next.trim()),
                  fullLabel: next.trim()
                }
              }
            : n
        )
      );
    }
  };

  const handleFit = () => {
    flowRef.current?.fitView({ padding: 0.3 });
  };

  const handleDeleteSelection = () => {
    if (!isEditMode) return;
    if (selectedEdgeId) {
      deleteSelectedEdge();
      return;
    }
    if (selectedNodeIds.length === 0) return;
    setNodesState((nds) => nds.filter((n) => !selectedNodeIds.includes(n.id)));
    setEdgesState((eds) => eds.filter((e) => !selectedNodeIds.includes(e.source) && !selectedNodeIds.includes(e.target)));
    clearSelection();
  };

  const insertIntermediateNode = (edge: Edge, label: string, levelLabel: string) => {
    const targetLevel = graph.levels.find((l) => l.label === levelLabel);
    if (!targetLevel) return;

    const sourceNode = nodesState.find((n) => n.id === edge.source);
    const targetNode = nodesState.find((n) => n.id === edge.target);
    const y =
      sourceNode && targetNode ? (sourceNode.position.y + targetNode.position.y) / 2 : 0;
    const x = (levelOrder.get(levelLabel) ?? 0) * LEVEL_SPACING + COLUMN_OFFSET;

    const newNode: Node<AxisNodeData> = {
      id: `bridge-${Date.now()}`,
      type: "axisNode",
      position: { x, y },
      data: {
        label: makeKeyword(label),
        fullLabel: label,
        levelLabel,
        levelId: targetLevel.id,
        status: "present"
      }
    };

    setNodesState((nds) => [...nds, newNode]);
    setEdgesState((eds) => {
      const without = eds.filter((e) => e.id !== edge.id);
      return [
        ...without,
        {
          id: `bridge-edge-${Date.now()}-a`,
          source: edge.source,
          target: newNode.id,
          type: "straight",
          animated: edge.animated,
          markerEnd: edge.markerEnd,
          style: edge.style
        },
        {
          id: `bridge-edge-${Date.now()}-b`,
          source: newNode.id,
          target: edge.target,
          type: "straight",
          animated: edge.animated,
          markerEnd: edge.markerEnd,
          style: edge.style
        }
      ];
    });
    setSelectedEdgeId(null);
  };

  const handleAgentAction = (action: AgentAction) => {
    if (action.type === "add_node") {
      // ユーザーにノード名を入力させてから追加
      const { levelLabel } = action.data;
      const level = graph.levels.find((l) => l.label === levelLabel);
      if (!level) return;

      const userInput = window.prompt(`${levelLabel} ノードを追加`, `${levelLabel}項目`);
      if (!userInput || !userInput.trim()) return;

      const label = userInput.trim();
      const levelNodes = nodesState.filter((n) => (n.data as AxisNodeData).levelLabel === levelLabel);
      const maxY = levelNodes.length > 0 ? Math.max(...levelNodes.map((n) => n.position.y)) + NODE_SPACING : 0;
      const x = (levelOrder.get(level.label) ?? 0) * LEVEL_SPACING + COLUMN_OFFSET;

      const newNode: Node<AxisNodeData> = {
        id: `agent-${Date.now()}`,
        type: "axisNode",
        position: { x, y: maxY },
        data: {
          label: makeKeyword(label),
          fullLabel: label,
          levelLabel,
          levelId: level.id,
          status: "present"
        }
      };

      setNodesState((nds) => [...nds, newNode]);
      // 入力された内容に関わらず、該当レベルの未入力項目を削除
      setMissingPool((pool) => pool.filter((p) => p.levelLabel !== levelLabel));
    } else if (action.type === "expand_detail") {
      // ユーザーがアクションを選択した時の処理
      const actionType = action.data?.actionType;

      if (actionType === "analyze_gaps") {
        // 未入力の項目分析を開始
        handleAnalyzeGaps();
      } else if (actionType === "check_feedforward") {
        // フィードフォワード（リスク・懸念）を表示
        setCurrentFeedforwardIndex(0);
        handleCheckFeedforward(0);
      } else if (actionType === "check_feedback") {
        // フィードバック（品質改善）を表示
        setCurrentFeedbackIndex(0);
        handleCheckFeedback(0);
      } else if (actionType === "show_next_feedforward") {
        // 次のフィードフォワードを表示
        const nextIndex = (action.data?.index ?? 0);
        setCurrentFeedforwardIndex(nextIndex);
        handleShowNextFeedforward(nextIndex);
      } else if (actionType === "show_next_feedback") {
        // 次のフィードバックを表示
        const nextIndex = (action.data?.index ?? 0);
        setCurrentFeedbackIndex(nextIndex);
        handleShowNextFeedback(nextIndex);
      } else if (actionType === "free_chat") {
        // 自由チャットモードに入る
        const msg: ExtendedChatMessage = {
          role: "assistant",
          content: "何でも聞いてください。追加すべき項目の候補、リスク、改善案など、何でもサポートします。"
        };
        setChatMessages((msgs) => [...msgs, msg]);
      } else if (action.data?.userInput) {
        // ユーザーが追記入力した場合
        const userMsg: ExtendedChatMessage = {
          role: "user",
          content: action.data.userInput
        };
        setChatMessages((msgs) => [...msgs, userMsg]);
      }
    } else if (action.type === "dismiss") {
      // Just acknowledge dismissal - no action needed
    } else if (action.type === "concrete_action") {
      // Concrete actionの処理：AIがテキスト提案を生成
      const { messageText } = action.data || {};

      // ユーザーの要求をチャットに記録
      const userRequest: ExtendedChatMessage = {
        role: "user",
        content: `${action.label}について具体的なテキストを生成してください`
      };
      setChatMessages((msgs) => [...msgs, userRequest]);

      // AIに具体的な提案生成を依頼
      let systemPrompt = "";
      if (action.concreteType === "schedule") {
        systemPrompt = `以下のAI提案に基づいて、予定登録用の具体的なテキストを生成してください：\n\n提案内容: ${messageText}\n\n以下の形式で、実施期限・担当者・内容を含む予定登録テキストを作成してください。カレンダーやスケジュール管理ツールにコピーして使える形式で出力してください。`;
      } else if (action.concreteType === "plan") {
        systemPrompt = `以下のAI提案に基づいて、アクションプランを生成してください：\n\n提案内容: ${messageText}\n\n実施手順（ステップバイステップ）、優先順位、担当者を含む具体的なアクションプランを作成してください。`;
      } else if (action.concreteType === "add_detail") {
        systemPrompt = `以下のAI提案に基づいて、ドキュメントに追記する詳細情報を生成してください：\n\n提案内容: ${messageText}\n\n5W1H（誰が・いつ・どこで・何を・なぜ・どのように）に基づく具体的な詳細情報を作成してください。`;
      } else if (action.concreteType === "verify") {
        systemPrompt = `以下のAI提案に基づいて、効果検証計画を生成してください：\n\n提案内容: ${messageText}\n\n測定指標・基準値・目標値・測定日・測定方法を含む具体的な効果検証計画を作成してください。`;
      } else if (action.concreteType === "deploy") {
        systemPrompt = `以下のAI提案に基づいて、横展開計画を生成してください：\n\n提案内容: ${messageText}\n\n展開対象・展開範囲・展開責任者・展開期限・展開方法を含む具体的な横展開計画を作成してください。`;
      } else if (action.concreteType === "free_form") {
        systemPrompt = `以下のAI提案に基づいて、対応内容の記録テキストを生成してください：\n\n提案内容: ${messageText}\n\n対応日・対応者・実施内容・結果を含む具体的な記録テキストを作成してください。`;
      }

      // チャットコンテキストを構築
      const context = buildChatContext(graph.axisLabel, nodesState, edgesState, missingPool, summary);
      setIsChatSending(true);

      // チャット履歴をフィルタリング（user/assistantのみ）
      const apiMessages: ChatMessage[] = chatMessages
        .filter((msg): msg is ChatMessage => msg.role === "user" || msg.role === "assistant")
        .concat([{ role: "user", content: systemPrompt }]);

      chatWithAssistant({ messages: apiMessages, context })
        .then((reply) => {
          const assistantMsg: ExtendedChatMessage = {
            role: "assistant",
            content: reply
          };
          setChatMessages((msgs) => [...msgs, assistantMsg]);

          // AIレスポンスから言及されているノードを抽出してハイライト
          const { facts, speculative } = parseNodeCandidates(reply, graph.levels);
          const mentionedNodes = [...facts, ...speculative];

          if (mentionedNodes.length > 0) {
            const matchingNodeIds = nodesState
              .filter((node) => {
                const data = node.data as AxisNodeData;
                return mentionedNodes.some(
                  (mentioned) =>
                    mentioned.levelLabel === data.levelLabel &&
                    (data.fullLabel.includes(mentioned.label) || mentioned.label.includes(data.fullLabel))
                );
              })
              .map((node) => node.id);

            if (matchingNodeIds.length > 0) {
              setSelectedNodeIds(matchingNodeIds);
            }
          }

          // フォローアップメッセージを追加
          const followUpMsg: ExtendedChatMessage = {
            role: "assistant",
            content: "この内容で問題なければコピーして使用してください。変更が必要な場合は、具体的な要望を教えてください（例：「担当者を〇〇に変更」「期限を1週間後に」など）。"
          };
          setChatMessages((msgs) => [...msgs, followUpMsg]);
        })
        .catch((err) => {
          setChatMessages((msgs) => [
            ...msgs,
            { role: "assistant", content: `エラー: ${err instanceof Error ? err.message : "提案の生成に失敗しました。"}` }
          ]);
        })
        .finally(() => {
          setIsChatSending(false);
        });
    }
  };

  const handleAnalyzeGaps = () => {
    // 未入力の項目の分析結果を表示
    const missingNodes = graph.nodes.filter((n) => n.status === "missing");
    const criticalMissing = missingNodes.filter((n) =>
      ["根本原因", "恒久対策", "効果検証"].includes(n.levelLabel)
    );

    const contextMsg: ExtendedChatMessage = {
      role: "assistant",
      content: `現在、**${missingNodes.length}件の未入力の項目**が検出されています。${
        criticalMissing.length > 0
          ? `\n\nそのうち**${criticalMissing.length}件は重要度が高い**レベル（${criticalMissing.map((n) => n.levelLabel).join("、")}）です。`
          : ""
      }\n\n左側のリストからドラッグ&ドロップでグラフに配置できます。または、AIに候補を提案してもらうこともできます。\n\n**どうしますか？**`
    };

    setChatMessages((msgs) => [...msgs, contextMsg]);
  };

  const handleCheckFeedforward = (index: number = 0) => {
    if (!feedforward || feedforward.length === 0) return;

    const highPriorityFF = feedforward.filter((ff) => ff.priority === "high");
    const targetFF = highPriorityFF.length > 0 ? highPriorityFF[0]! : feedforward[0]!;

    const contextMsg: ExtendedChatMessage = {
      role: "assistant",
      content: `現在のドキュメントを分析したところ、**${feedforward.length}件のリスク・懸念事項**が見つかりました。\n\n最も優先度が高いのは以下です:`
    };

    // AI提案文から具体的な行動候補を抽出
    const concreteActions = extractConcreteActions(targetFF.message, targetFF.relatedNodes);

    const suggestionMsg: ExtendedChatMessage = {
      role: "agent",
      type: "feedforward_suggestion",
      timestamp: Date.now(),
      data: targetFF,
      actions: [
        ...concreteActions,
        ...(feedforward.length > 1 ? [{
          id: `ff-next-${Date.now()}`,
          label: "次の懸念を見る",
          type: "expand_detail" as const,
          data: { actionType: "show_next_feedforward", index: 1 }
        }] : [])
      ]
    };

    setChatMessages((msgs) => [...msgs, contextMsg, suggestionMsg]);
  };

  const handleShowNextFeedforward = (index: number) => {
    if (!feedforward || feedforward.length === 0) return;
    if (index >= feedforward.length) return;

    const targetFF = feedforward[index]!;
    const nextIndex = index + 1;

    // AI提案文から具体的な行動候補を抽出
    const concreteActions = extractConcreteActions(targetFF.message, targetFF.relatedNodes);

    const suggestionMsg: ExtendedChatMessage = {
      role: "agent",
      type: "feedforward_suggestion",
      timestamp: Date.now(),
      data: targetFF,
      actions: [
        ...concreteActions,
        ...(nextIndex < feedforward.length ? [{
          id: `ff-next-${Date.now()}`,
          label: "次の懸念を見る",
          type: "expand_detail" as const,
          data: { actionType: "show_next_feedforward", index: nextIndex }
        }] : [])
      ]
    };

    setChatMessages((msgs) => [...msgs, suggestionMsg]);
  };

  const handleCheckFeedback = (index: number = 0) => {
    if (!feedback || feedback.length === 0) return;

    const highPriorityFB = feedback.filter((fb) => fb.priority === "high");
    const targetFB = highPriorityFB.length > 0 ? highPriorityFB[0]! : feedback[0]!;

    const contextMsg: ExtendedChatMessage = {
      role: "assistant",
      content: `ドキュメント品質を分析したところ、**${feedback.length}件の改善提案**があります。\n\n最も重要な改善点は以下です:`
    };

    // AI提案文（action + rationale）から具体的な行動候補を抽出
    const feedbackMessage = `${targetFB.action} ${targetFB.rationale}`;
    const concreteActions = extractConcreteActions(feedbackMessage, targetFB.relatedNodes);

    const suggestionMsg: ExtendedChatMessage = {
      role: "agent",
      type: "feedback_suggestion",
      timestamp: Date.now(),
      data: targetFB,
      actions: [
        ...concreteActions,
        ...(feedback.length > 1 ? [{
          id: `fb-next-${Date.now()}`,
          label: "次の改善案を見る",
          type: "expand_detail" as const,
          data: { actionType: "show_next_feedback", index: 1 }
        }] : [])
      ]
    };

    setChatMessages((msgs) => [...msgs, contextMsg, suggestionMsg]);
  };

  const handleShowNextFeedback = (index: number) => {
    if (!feedback || feedback.length === 0) return;
    if (index >= feedback.length) return;

    const targetFB = feedback[index]!;
    const nextIndex = index + 1;

    // AI提案文（action + rationale）から具体的な行動候補を抽出
    const feedbackMessage = `${targetFB.action} ${targetFB.rationale}`;
    const concreteActions = extractConcreteActions(feedbackMessage, targetFB.relatedNodes);

    const suggestionMsg: ExtendedChatMessage = {
      role: "agent",
      type: "feedback_suggestion",
      timestamp: Date.now(),
      data: targetFB,
      actions: [
        ...concreteActions,
        ...(nextIndex < feedback.length ? [{
          id: `fb-next-${Date.now()}`,
          label: "次の改善案を見る",
          type: "expand_detail" as const,
          data: { actionType: "show_next_feedback", index: nextIndex }
        }] : [])
      ]
    };

    setChatMessages((msgs) => [...msgs, suggestionMsg]);
  };

  const handleChatSend = () => {
    if (!chatInput.trim()) return;
    const content = chatInput.trim();
    const userMsg: ExtendedChatMessage = { role: "user", content };
    setChatMessages((msgs) => [...msgs, userMsg]);
    setChatInput("");

    const context = buildChatContext(graph.axisLabel, nodesState, edgesState, missingPool, summary);
    setIsChatSending(true);

    // Filter only user/assistant messages for API call
    const apiMessages: ChatMessage[] = chatMessages
      .filter((msg): msg is ChatMessage => msg.role === "user" || msg.role === "assistant")
      .concat([{ role: "user", content }]);

    chatWithAssistant({ messages: apiMessages, context })
      .then((reply) => {
        setChatMessages((msgs) => [...msgs, { role: "assistant", content: reply }]);

        // AIレスポンスから言及されているノードを抽出してハイライト
        const { facts, speculative } = parseNodeCandidates(reply, graph.levels);
        const mentionedNodes = [...facts, ...speculative];

        if (mentionedNodes.length > 0) {
          // nodesStateから一致するノードを検索
          const matchingNodeIds = nodesState
            .filter((node) => {
              const data = node.data as AxisNodeData;
              return mentionedNodes.some(
                (mentioned) =>
                  mentioned.levelLabel === data.levelLabel &&
                  (data.fullLabel.includes(mentioned.label) || mentioned.label.includes(data.fullLabel))
              );
            })
            .map((node) => node.id);

          if (matchingNodeIds.length > 0) {
            setSelectedNodeIds(matchingNodeIds);
          }
        }
      })
      .catch((err) => {
        setChatMessages((msgs) => [
          ...msgs,
          { role: "assistant", content: `エラー: ${err instanceof Error ? err.message : "送信に失敗しました。"}` }
        ]);
      })
      .finally(() => setIsChatSending(false));
  };

  useEffect(() => {
    if (!isResizingChat) return;
    const handleMove = (e: MouseEvent) => {
      setChatWidth((prev) => {
        const next = Math.min(Math.max(prev - e.movementX, 260), 900);
        return next;
      });
    };
    const handleUp = () => setIsResizingChat(false);
    window.addEventListener("mousemove", handleMove);
    window.addEventListener("mouseup", handleUp);
    return () => {
      window.removeEventListener("mousemove", handleMove);
      window.removeEventListener("mouseup", handleUp);
    };
  }, [isResizingChat, chatWidth]);

  const workspaceStyle = useMemo(() => {
    const hasSidebar = missingPool.length > 0;
    const hasChat = isEditMode;
    if (hasSidebar && hasChat) {
      return { gridTemplateColumns: `260px minmax(0, 1fr) 6px ${chatWidth}px` };
    }
    if (hasSidebar && !hasChat) {
      return { gridTemplateColumns: "260px minmax(0, 1fr)" };
    }
    if (!hasSidebar && hasChat) {
      return { gridTemplateColumns: `minmax(0, 1fr) 6px ${chatWidth}px` };
    }
    return { gridTemplateColumns: "minmax(0, 1fr)" };
  }, [chatWidth, isEditMode, missingPool.length]);

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    if (!isEditMode) return;
    const raw = event.dataTransfer.getData("application/reactflow");
    if (!raw) return;
    const payload: { id: string; label: string; levelLabel: string; levelId: string } = JSON.parse(raw);
    const reactFlowBounds = flowRef.current;
    const position = reactFlowBounds?.project({
      x: event.clientX,
      y: event.clientY
    });
    if (!position) return;
    const nearest = findNearestLevel(position.x, graph.levels);
    const x = nearest.index * LEVEL_SPACING + COLUMN_OFFSET;
    const y = position.y;
    const newNode: Node<AxisNodeData> = {
      id: `manual-${Date.now()}`,
      type: "axisNode",
      position: { x, y },
      data: {
        label: makeKeyword(payload.label),
        fullLabel: payload.label,
        levelLabel: nearest.level.label,
        status: "present"
      }
    };
    setNodesState((nds) => [...nds, newNode]);
    setMissingPool((pool) => pool.filter((p) => p.id !== payload.id));
  };

  return (
    <div className={`graph-panel ${isFullscreen ? "is-fullscreen" : ""}`}>
      <div className="graph-panel__header">
        <div>
          <h3>{graph.axisLabel} グラフ</h3>
        </div>
        <div className="graph-panel__actions">
          {/* エクスポートドロップダウン */}
          <div className="export-dropdown">
            <button
              className="ghost-button"
              type="button"
              disabled={!historyId}
              title={historyId ? "グラフをエクスポート" : "履歴保存後にエクスポート可能"}
            >
              エクスポート ▼
            </button>
            {historyId && (
              <div className="export-dropdown__menu">
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const blob = await exportGraph({
                        historyId,
                        axisId: graph.axisId,
                        format: "json",
                        includeTags: true,
                        includeEdgeLabels: true
                      });
                      downloadBlob(blob, `${graph.axisLabel}.json`);
                    } catch (error) {
                      console.error("Export failed:", error);
                    }
                  }}
                >
                  JSON (構造化データ)
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    try {
                      const blob = await exportGraph({
                        historyId,
                        axisId: graph.axisId,
                        format: "csv",
                        includeTags: true
                      });
                      downloadBlob(blob, `${graph.axisLabel}_nodes.csv`);
                    } catch (error) {
                      console.error("Export failed:", error);
                    }
                  }}
                >
                  CSV (ノード)
                </button>
              </div>
            )}
          </div>
          <button
            type="button"
            className={`graph-panel__button ${isEditMode ? "is-active" : ""}`}
            onClick={() => {
              setIsEditMode((v) => {
                const next = !v;
                setIsFullscreen(next);
                setTimeout(handleFit, 50);
                return next;
              });
            }}
            aria-label={isEditMode ? "編集モード終了" : "編集モード開始"}
          >
            {isEditMode ? "編集終了" : "編集モード"}
          </button>
        </div>
      </div>
      <div className={`graph-panel__workspace ${missingPool.length > 0 ? "has-sidebar" : ""} ${isEditMode ? "has-chat" : ""}`} style={workspaceStyle}>
        {missingPool.length > 0 && (
          <div className="graph-panel__sidebar">
            <div className="graph-panel__sidebar-head">
              <div>未配置ノード</div>
              <span className="muted small">{missingPool.length}件</span>
            </div>
            <ul className="graph-panel__pool">
              {missingPool.map((item) => (
                <li
                  key={item.id}
                  draggable={isEditMode}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("application/reactflow", JSON.stringify(item));
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  className={`graph-panel__pool-item ${isEditMode ? "" : "is-disabled"}`}
                  title={`${item.levelLabel} に配置`}
                >
                  <div className="graph-panel__pool-label">{item.label}</div>
                  <div className="graph-panel__pool-meta">{item.levelLabel}</div>
                </li>
              ))}
            </ul>
          </div>
        )}
        <div className="graph-panel__canvas">
          <div
            className="graph-panel__columns"
            style={{
              transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`
            }}
          >
            {graph.levels.map((level, idx) => {
              const x = idx * LEVEL_SPACING + COLUMN_OFFSET;
              return (
                <div
                  key={level.id}
                  className="graph-panel__column-line"
                  style={{ left: `${x}px` }}
                />
              );
            })}
          </div>
          {isEditMode && (
            <div className={`graph-panel__palette ${isPaletteCollapsed ? "is-collapsed" : ""}`}>
              {isPaletteCollapsed ? (
                <button
                  type="button"
                  className="graph-panel__palette-toggle"
                  onClick={() => setIsPaletteCollapsed(false)}
                  aria-label="編集パレットを展開"
                >
                  🛠
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    className="graph-panel__palette-close"
                    onClick={() => setIsPaletteCollapsed(true)}
                    aria-label="編集パレットを折りたたむ"
                  >
                    ×
                  </button>
                  <div className="graph-panel__palette-header">
                    <span className="graph-panel__palette-title">編集</span>
                    <span
                      className="graph-panel__palette-help"
                      title={`ノード: ダブルクリックで編集 / ドラッグで上下・列移動 / Deleteで削除\nエッジ: Clickで選択→削除 / 接続操作で追加・繋ぎ替え / ブリッジは赤\n未配置ノードは左リストからDrag&Dropで追加`}
                    >
                      ？
                    </span>
                  </div>
                  <div className="graph-panel__palette-buttons">
                    <button type="button" onClick={handleFit}>
                      Fit
                    </button>
                    <button type="button" onClick={deleteSelectedEdge} disabled={!selectedEdgeId}>
                      選択エッジ削除
                    </button>
                  </div>
                  <div className="graph-panel__add-nodes">
                    {graph.levels.map((level, idx) => (
                      <button
                        key={`add-${level.id}`}
                        type="button"
                        onClick={() => {
                          const label = window.prompt(`${level.label} ノードを追加`, `${level.label}項目`);
                          if (!label || !label.trim()) return;
                          const levelNodes = nodesState.filter(
                            (n) => (n.data as AxisNodeData).levelLabel === level.label
                          );
                          const maxY =
                            levelNodes.length > 0
                              ? Math.max(...levelNodes.map((n) => n.position.y)) + NODE_SPACING
                              : 0;
                          const x = idx * LEVEL_SPACING + COLUMN_OFFSET;
                          const newNode: Node<AxisNodeData> = {
                            id: `new-${Date.now()}`,
                            type: "axisNode",
                            position: { x, y: maxY },
                            data: {
                              label: makeKeyword(label.trim()),
                              fullLabel: label.trim(),
                              levelLabel: level.label,
                              status: "present"
                            }
                          };
                          setNodesState((nds) => [...nds, newNode]);
                        }}
                      >
                        {level.label}を追加
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
          <ReactFlow
            nodes={nodesState}
            edges={(() => {
              const base = edgesState;
              const ordered = selectedEdgeId
                ? [...base.filter((e) => e.id !== selectedEdgeId), ...base.filter((e) => e.id === selectedEdgeId)]
                : base;
              return ordered.map((edge) => {
                const isSelected = isEditMode && edge.id === selectedEdgeId;
                const gapInfo = getLevelGap(edge, nodesState, levelOrder, graph.levels);
                const isBridge = gapInfo.gap > 1;
                const baseStyle = { ...BASE_EDGE_STYLE, ...(edge.style || {}) };
                const dash = BASE_EDGE_STYLE.strokeDasharray;
                const strokeColor = isBridge ? "#d4483d" : baseStyle.stroke;
                return {
                  ...edge,
                  animated: isSelected ? false : edge.animated,
                  style: {
                    ...baseStyle,
                    stroke: strokeColor,
                    strokeWidth: isSelected
                      ? ((baseStyle.strokeWidth as number) || BASE_EDGE_WIDTH) * 1.5
                      : BASE_EDGE_STYLE.strokeWidth,
                    strokeDasharray: isSelected ? "0" : dash,
                    zIndex: isSelected ? 20 : baseStyle.zIndex
                  },
                  selected: isSelected,
                  updatable: isEditMode && isSelected,
                  interactionWidth: EDGE_INTERACTION_WIDTH
                };
              });
            })()}
            nodeTypes={nodeTypes}
            fitView
            fitViewOptions={{ padding: 0.3 }}
            nodesDraggable={isEditMode}
            nodesConnectable={isEditMode}
            elementsSelectable={isEditMode}
            defaultEdgeOptions={{ animated: true, style: { strokeWidth: BASE_EDGE_WIDTH } }}
            edgeUpdaterRadius={EDGE_INTERACTION_WIDTH}
            connectionMode="loose"
            selectNodesOnDrag={!isEditMode}
            onNodeClick={(e, node) => {
              const data = node.data as AxisNodeData;
              if (!isEditMode) return;
              if (data.isPlaceholder) {
                handlePlaceholderClick(node);
              }
            }}
            onNodeDoubleClick={isEditMode ? handleNodeDoubleClick : undefined}
            onConnect={isEditMode ? handleConnect : undefined}
            onNodesChange={isEditMode ? handleNodesChange : undefined}
            onEdgesChange={isEditMode ? handleEdgesChange : undefined}
            onEdgeClick={isEditMode ? handleEdgeClick : undefined}
            onEdgeUpdate={isEditMode ? handleEdgeUpdate : undefined}
            onEdgeUpdateStart={isEditMode ? handleEdgeUpdateStart : undefined}
            onEdgeUpdateEnd={isEditMode ? handleEdgeUpdateEnd : undefined}
            onPaneClick={handlePaneClick}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            onKeyDown={(e) => {
              if (e.key === "Delete" || e.key === "Backspace") {
                handleDeleteSelection();
              }
            }}
            onSelectionChange={({ nodes: selNodes, edges: selEdges }) => {
              setSelectedNodeIds(selNodes.map((n) => n.id));
              const edgeId = selEdges[0]?.id ?? null;
              setSelectedEdgeId(edgeId);
            }}
            onInit={(instance) => {
              flowRef.current = instance;
              instance.fitView({ padding: 0.3 });
              setViewport(instance.getViewport());
            }}
            onMove={(_, vp) => {
              setViewport(vp);
            }}
          >
            <Background gap={24} size={1} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </div>
        {isEditMode && (
          <>
            <div
              className="graph-panel__chat-resize"
              onMouseDown={(e) => {
                e.preventDefault();
                setIsResizingChat(true);
              }}
            />
            <div className="graph-panel__chat">
              <div className="graph-panel__chat-head">AIアシスト</div>
              <div className="graph-panel__chat-body" ref={chatBodyRef}>
                {chatMessages.map((msg, idx) => {
                  // Handle agent messages
                  if (msg.role === "agent") {
                    return (
                      <AgentMessage
                        key={`agent-${idx}-${msg.timestamp}`}
                        message={msg}
                        onAction={handleAgentAction}
                      />
                    );
                  }

                  // Handle regular user/assistant messages
                  return (
                    <div
                      key={`${msg.role}-${idx}-${msg.content.slice(0, 10)}`}
                      className={`graph-panel__chat-msg ${msg.role === "user" ? "is-user" : "is-assistant"}`}
                    >
                      <div className="graph-panel__chat-role">{msg.role === "user" ? "あなた" : "AI"}</div>
                      <div className="graph-panel__chat-bubble">
                        {(() => {
                          const { facts, speculative } = parseNodeCandidates(msg.content, graph.levels);
                          const { factsText, speculativeText, hasSpeculative } = splitSpeculativeSection(msg.content);
                          return (
                            <>
                              <ReactMarkdown>{factsText || msg.content}</ReactMarkdown>
                              {facts.length > 0 && (
                                <div className="graph-panel__chat-actions">
                                  {facts.map((cand) => (
                                    <button
                                      key={`${idx}-${cand.levelLabel}-${cand.label}`}
                                      type="button"
                                      className="graph-panel__chat-add"
                                      onClick={() =>
                                        addNodeFromCandidate(
                                          cand.levelLabel,
                                        cand.label,
                                        graph.levels,
                                        nodesState,
                                        setNodesState,
                                        setMissingPool,
                                        levelOrder,
                                        "fact"
                                      )
                                    }
                                  >
                                    {cand.levelLabel}: {cand.label}
                                  </button>
                                  ))}
                                </div>
                              )}
                              {hasSpeculative && (
                                <>
                                  <div className="graph-panel__chat-spec-label">[推測]</div>
                                  {speculativeText && <ReactMarkdown>{speculativeText}</ReactMarkdown>}
                                </>
                              )}
                              {speculative.length > 0 && (
                                <div className="graph-panel__chat-actions is-speculative">
                                  {speculative.map((cand) => (
                                    <button
                                      key={`${idx}-spec-${cand.levelLabel}-${cand.label}`}
                                      type="button"
                                      className="graph-panel__chat-add is-speculative"
                                      onClick={() =>
                                        addNodeFromCandidate(
                                          cand.levelLabel,
                                        cand.label,
                                        graph.levels,
                                        nodesState,
                                        setNodesState,
                                        setMissingPool,
                                        levelOrder,
                                        "speculative"
                                      )
                                    }
                                  >
                                      {cand.levelLabel} (推測): {cand.label}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </div>
                  );
                })}
                {isChatSending && (
                  <div className="graph-panel__chat-msg is-assistant">
                    <div className="graph-panel__chat-role">AI</div>
                    <div className="graph-panel__chat-bubble">
                      <div className="graph-panel__chat-typing">
                        <span></span><span></span><span></span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
              <div className="graph-panel__chat-input">
                <textarea
                  value={chatInput}
                  onChange={(e) => setChatInput(e.target.value)}
                  placeholder="抜けている原因や対策の候補を聞いてみてください"
                  rows={3}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                      e.preventDefault();
                      handleChatSend();
                    }
                  }}
                />
                <button type="button" onClick={handleChatSend} disabled={isChatSending}>
                  {isChatSending ? "送信中..." : "送信"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
