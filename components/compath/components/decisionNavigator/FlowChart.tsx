"use client"
import { useCallback, useMemo, useEffect, useState, useRef } from "react";
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  useOnViewportChange,
  ReactFlowProvider,
  type Node,
  type Edge,
  type NodeMouseHandler,
  type Viewport,
  MarkerType,
} from "reactflow";
import "reactflow/dist/style.css";

import { StartNode, DecisionNode, ActionNode, OutcomeNode, ClarificationNode, LoadingPlaceholderNode, ConditionInputNode, TerminalNode } from "./nodes";
import { LabeledEdge } from "./edges";
import { BrainModelPeekPopover } from "./BrainModelPeekPopover";
import type {
  DecisionNavigatorSession,
  FlowNodeData,
  DecisionEdgeType,
} from "../../types/decisionNavigator";
import { FLOWCHART } from "../../constants/philosophy";

const nodeTypes = {
  start: StartNode,
  decision: DecisionNode,
  action: ActionNode,
  outcome: OutcomeNode,
  clarification: ClarificationNode,
  placeholder: LoadingPlaceholderNode,
  condition_input: ConditionInputNode,
  terminal: TerminalNode,
};

const edgeTypes = {
  labeled: LabeledEdge,
};

type FlowChartProps = {
  session: DecisionNavigatorSession;
  /** ノードクリック時のコールバック。スクリーン座標とビューポートも渡す */
  onNodeClick: (nodeId: string, screenPosition: { x: number; y: number }, viewport: Viewport) => void;
  onSelectNode?: (nodeId: string) => void; // ノード内の「選択する」ボタン用
  onToggleAlternatives?: (nodeId: string, expand: boolean) => void; // 代替選択肢の展開/折りたたみ
  /** Phase 8: ローディング中のノードID（次の選択肢を取得中） */
  loadingNodeId?: string | null;
  /** Phase 15.1: キャンバスクリック時のコールバック（ポップオーバーを閉じる用） */
  onPaneClick?: () => void;
  /** Phase 15.4: ビューポート変更時のコールバック（ポップオーバー位置更新用） */
  onViewportChange?: (viewport: Viewport) => void;
  /** セッション再生成中などのローディング状態（クリック無効化） */
  isLoading?: boolean;
  /** 判断軸追加ボタンクリック時のコールバック */
  onAddCriteria?: () => void;
  /** 判断軸追加中かどうか */
  isAddingCriteria?: boolean;
  /** Phase 22: 探索ノードクリック時のコールバック（次の問いを生成） */
  onExploreNext?: (explorationNodeId: string) => void;
  /** Phase 22: 放射状選択肢を選択したときのコールバック */
  onRadialOptionSelect?: (criteriaId: string, optionId: string) => void;
  /** Phase 22: 探索中のノードID */
  exploringNodeId?: string | null;
  /** 問いノードクリック時のコールバック（左パネル同期用） */
  onCriteriaClick?: (criteriaId: string) => void;
};

// エッジの視覚カテゴリ（10種のセマンティックタイプを3カテゴリに集約）
function getEdgeCategory(type: DecisionEdgeType): "selected" | "available" | "dimmed" {
  switch (type) {
    case "selected": return "selected";
    case "recommended":
    case "available":
    case "guide":
    case "converge":
      return "available";
    default:
      return "dimmed";
  }
}

// 3カテゴリの基本スタイル
const CATEGORY_STYLES: Record<"selected" | "available" | "dimmed", React.CSSProperties> = {
  selected: {
    stroke: "#1f7a6d",
    strokeWidth: 3,
    opacity: 1,
    strokeDasharray: "0",
  },
  available: {
    stroke: "#5b6770",
    strokeWidth: 2,
    opacity: 0.8,
    strokeDasharray: "6 4",
  },
  dimmed: {
    stroke: "#c7cdd1",
    strokeWidth: 1.5,
    opacity: 0.4,
    strokeDasharray: "5 5",
  },
};

// セマンティックタイプ別のアクセント色上書き
const ACCENT_OVERRIDES: Partial<Record<DecisionEdgeType, string>> = {
  recommended: "#f05a28",  // オレンジ
  guide: "#1f7a6d",        // ティール
};

// ease-outカスタムイージング（減速のみ、より自然な動き）
const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

// 内部コンポーネント（useReactFlowを使用するため）
function FlowChartInner({
  session,
  onNodeClick,
  onSelectNode,
  onToggleAlternatives,
  loadingNodeId,
  onPaneClick,
  onViewportChange,
  isLoading,
  onAddCriteria,
  isAddingCriteria,
  onExploreNext,
  onRadialOptionSelect,
  exploringNodeId,
  onCriteriaClick,
}: FlowChartProps) {
  const { getViewport, setViewport, fitView } = useReactFlow();

  // Phase 19: ブレインモデル覗き見機能の状態
  const [brainPeekCriteriaId, setBrainPeekCriteriaId] = useState<string | null>(null);

  // 選択後圧縮: 完了済みcriteriaのdimmed兄弟展開トグル
  const [expandedCriteria, setExpandedCriteria] = useState<Set<string>>(new Set());

  // ブレインモデルポップアップを閉じる
  const handleBrainPeekClose = useCallback(() => {
    setBrainPeekCriteriaId(null);
  }, []);

  // Phase 15.4: ビューポート変更を親に通知（ポップオーバー位置更新用）
  useOnViewportChange({
    onChange: (viewport) => {
      if (onViewportChange) {
        onViewportChange(viewport);
      }
    },
  });

  // Phase 16: 同じラベルの選択肢が複数の深さに出現するかを計算
  const recurringLabelsMap = useMemo(() => {
    // ラベルごとに出現する深さを収集
    const labelDepthsMap = new Map<string, Set<number>>();

    for (const node of session.nodes) {
      // decision/action ノードのみ対象
      if (node.type !== "decision" && node.type !== "action") continue;

      const depth = node.depth ?? 0;
      const existingDepths = labelDepthsMap.get(node.label) ?? new Set<number>();
      existingDepths.add(depth);
      labelDepthsMap.set(node.label, existingDepths);
    }

    // 2つ以上の深さに出現するラベルだけを返す
    const recurringMap = new Map<string, number[]>();
    for (const [label, depths] of labelDepthsMap.entries()) {
      if (depths.size > 1) {
        recurringMap.set(label, Array.from(depths).sort((a, b) => a - b));
      }
    }

    return recurringMap;
  }, [session.nodes]);

  // 選択後圧縮: 完了済みのcriteria IDセットを計算（ノード/エッジ両方で使用）
  const completedCriteriaIds = useMemo(() => new Set(
    (session.criteriaLabels ?? [])
      .filter((_, i) => (session.columnStates ?? [])[i] === "completed")
      .map(c => c.id)
  ), [session.criteriaLabels, session.columnStates]);

  // 段階的開示: ロック列のcriteria IDセットを計算
  const lockedCriteriaIds = useMemo(() => new Set(
    (session.criteriaLabels ?? [])
      .filter((_, i) => (session.columnStates ?? [])[i] === "locked")
      .map(c => c.id)
  ), [session.criteriaLabels, session.columnStates]);

  // 選択済みstrategy IDセット（探索ノード表示判定用）
  const selectedStrategyIds = useMemo(() => new Set(
    session.nodes.filter(n => n.level === "strategy" && n.status === "selected").map(n => n.id)
  ), [session.nodes]);

  // 選択済みの兄弟がいる criteria の ID セット（その criteria では未選択ノードを非表示にする）
  const criteriaWithSelection = useMemo(() => {
    const set = new Set<string>();
    for (const node of session.nodes) {
      if (node.level === "strategy" && node.status === "selected" && node.parentId) {
        set.add(node.parentId);
      }
    }
    return set;
  }, [session.nodes]);

  // 表示対象ノードIDセット（エッジフィルタでも使用）
  const visibleNodeIds = useMemo(() => {
    const ids = new Set<string>();
    for (const node of session.nodes) {
      if (node.status === "hidden") continue;
      // 探索ノード: 親strategyが選択済みの場合のみ表示
      if (node.isExplorationNode && node.parentId && !selectedStrategyIds.has(node.parentId)) continue;
      // 段階的開示: ロック列のノードを非表示
      if (node.level === "criteria" && lockedCriteriaIds.has(node.id)) continue;
      if (node.level === "strategy" && node.parentId && lockedCriteriaIds.has(node.parentId)) continue;
      // 選択済み兄弟がいる criteria 配下の未選択 strategy ノードを非表示
      // （左パネルで選択肢を表示するため、ツリーには選択済みのみ表示）
      // 展開トグル（expandedCriteria）で復元可能
      if (
        node.level === "strategy" &&
        node.status !== "selected" &&
        node.parentId &&
        criteriaWithSelection.has(node.parentId) &&
        !expandedCriteria.has(node.parentId)
      ) {
        continue;
      }
      ids.add(node.id);
    }
    return ids;
  }, [session.nodes, lockedCriteriaIds, selectedStrategyIds, expandedCriteria, criteriaWithSelection]);

  // セッションのノードをReactFlow形式に変換
  const initialNodes: Node<FlowNodeData>[] = useMemo(() => {
    // Backcasting Canvas: シンプル化 - 非表示ノードをフィルタリング
    // hidden: 代替選択肢（オンデマンドで取得）
    // Phase 8: lockedは表示するが選択不可（列ロック状態）
    // 選択後圧縮: 完了列のdimmed兄弟を非表示（トグルで展開中は除く）
    const visibleNodes = session.nodes.filter(node => visibleNodeIds.has(node.id));

    // 各criteriaの非表示兄弟数を計算
    const hiddenCountByCriteria = new Map<string, number>();
    for (const node of session.nodes) {
      if (
        node.level === "strategy" &&
        node.status !== "selected" &&
        node.parentId &&
        criteriaWithSelection.has(node.parentId) &&
        !expandedCriteria.has(node.parentId)
      ) {
        hiddenCountByCriteria.set(
          node.parentId,
          (hiddenCountByCriteria.get(node.parentId) ?? 0) + 1
        );
      }
    }

    const nodes: Node<FlowNodeData>[] = visibleNodes.map((node) => {
      // ノードタイプのマッピング
      // 判断軸（level: "criteria"）は通常のDecisionNodeとして表示
      let nodeType: string;
      switch (node.type) {
        case "start":
          nodeType = "start";
          break;
        case "decision":
          nodeType = "decision";
          break;
        case "action":
          nodeType = "action";
          break;
        case "clarification":
          nodeType = "clarification";
          break;
        case "condition_input":
          nodeType = "condition_input";
          break;
        default:
          nodeType = "outcome";
      }

      // Phase 16: 必須検討フラグを計算
      const recurringDepths = recurringLabelsMap.get(node.label);
      const isRecurringOption = Boolean(recurringDepths);

      // Phase 22: 探索中のノードかどうか
      const isExploring = exploringNodeId === node.id;

      return {
        id: node.id,
        type: nodeType,
        position: node.position,
        data: {
          // Phase 22: 探索中ならラベルを「探索中...」に変更
          label: isExploring ? "🔍 探索中..." : node.label,
          description: node.description,
          type: node.type,
          level: node.level,
          status: node.status,
          confidence: node.confidence,
          riskLevel: node.riskLevel,
          riskStrategy: node.riskStrategy,
          riskCategories: node.riskCategories,
          hasPastCase: node.hasPastCase,
          pastCaseCount: node.pastCaseCount,
          isFromKnowledgeBase: node.isFromKnowledgeBase,
          isRecommended: node.isRecommended,
          recommendationReason: node.recommendationReason,
          rationalePresets: node.rationalePresets, // 選択理由プリセット（動的生成）
          nodeId: node.id, // 元のノードID
          onSelect: onSelectNode, // 選択ボタンクリック時のコールバック
          // Phase 3: 推奨パス全体表示
          pathRole: node.pathRole,
          lane: node.lane,
          alternatives: node.alternatives,
          onToggleAlternatives, // 代替選択肢の展開/折りたたみ
          // Phase 3: 比較モード用
          isContender: node.isContender,
          scoreDifference: node.scoreDifference,
          // 選択可能フラグ
          isSelectable: node.isSelectable,
          // Phase 8: ローディング中フラグは不要（プレースホルダーノードに置き換え）
          isLoadingNext: false,
          // Phase 5改: 条件入力ノード用（バックエンドから設定される）
          conditionInputState: node.conditionInputState,
          // Phase 16: 必須検討マーカー（複数段階に出現する選択肢）
          isRecurringOption,
          recurringDepths,
          // Phase 22: 探索ノードフラグ
          isExplorationNode: node.isExplorationNode,
          // Phase 22: 探索中フラグ（APIコール中）
          isExploring,
          // Phase 23: 問いに対する理由
          questionReason: node.questionReason,
          // Phase 24: パス名（思考パターン）
          pathName: node.pathName,
          thinkingPattern: node.thinkingPattern,
          // 選択後圧縮: 列の完了状態と非表示兄弟数
          isColumnCompleted:
            node.level === "criteria"
              ? completedCriteriaIds.has(node.id)
              : node.level === "strategy" && node.parentId
                ? completedCriteriaIds.has(node.parentId)
                : false,
          hiddenAlternativeCount:
            node.level === "criteria"
              ? hiddenCountByCriteria.get(node.id) ?? 0
              : 0,
          // カバレッジマップ: outcomeノードに全criteriaの状態を注入
          coveragePieces: node.level === "outcome"
            ? (session.criteriaLabels ?? []).map((cl, i) => ({
                id: cl.id,
                label: cl.question,
                state: (session.columnStates ?? [])[i] ?? "locked",
              }))
            : undefined,
        } as FlowNodeData,
      };
    });

    // ローディング中のノードがあれば、その子位置にプレースホルダーノードを追加
    if (loadingNodeId) {
      const loadingNode = session.nodes.find(n => n.id === loadingNodeId);
      if (loadingNode) {
        // 子ノード位置（左→右フロー: 右方向、X座標が大きい方が右）
        nodes.push({
          id: "loading-placeholder",
          type: "placeholder",
          position: {
            x: loadingNode.position.x + 300, // NODE_SPACING_X分右へ
            y: loadingNode.position.y,
          },
          data: {
            label: FLOWCHART.LOADING_PLACEHOLDER,
          } as FlowNodeData,
        });
      }
    }

    return nodes;
  }, [session.nodes, session.selectionHistory, visibleNodeIds, completedCriteriaIds, expandedCriteria, onSelectNode, onToggleAlternatives, loadingNodeId, recurringLabelsMap, exploringNodeId]);

  // セッションのエッジをReactFlow形式に変換
  const initialEdges: Edge[] = useMemo(() => {
    // hidden以外の全エッジを表示（dimmed, guide, converge等も描画する）
    const visibleEdges = session.edges.filter(edge => edge.type !== "hidden");

    // 表示中のノードのみ参照するエッジをフィルタ（コンパクト非表示ノードも除外）
    const validEdges = visibleEdges.filter(
      e => visibleNodeIds.has(e.source) && visibleNodeIds.has(e.target)
    );

    const edges: Edge[] = validEdges.map((edge) => {
      // カテゴリベースのスタイル取得
      const category = getEdgeCategory(edge.type);
      const style = { ...CATEGORY_STYLES[category] };
      // アクセント色の上書き（recommended=オレンジ, guide=ティール）
      const accent = ACCENT_OVERRIDES[edge.type];
      if (accent) {
        style.stroke = accent;
      }

      // アニメーション対象: selected のみ（確定パスにフローアニメーション）
      const isAnimated = edge.type === "selected";

      // ラベル色: カテゴリベース + アクセント上書き
      const labelColor = category === "selected" ? "#1f7a6d"
        : accent ?? "#5b6770";

      // エッジラベルの表示ルール:
      // dimmedカテゴリ → ラベル非表示
      // selected/available → label優先、なければrationale（"理由"と略記）
      const edgeLabel = category === "dimmed" ? undefined
        : edge.label
          ? edge.label
          : (edge.type === "selected" || edge.type === "recommended") && edge.rationale
            ? "理由"
            : undefined;

      // ラベルの背景色（カテゴリベース + アクセント上書き）
      const labelBgColor = category === "selected" ? "#f0fdf4"
        : edge.type === "recommended" ? "#fff4ec"
        : "#f5f7f9";

      // ラベルがある場合はカスタムエッジ（labeled）を使用、なければsmoothstep
      const edgeType = edgeLabel ? "labeled" : "smoothstep";

      return {
        id: edge.id,
        source: edge.source,
        target: edge.target,
        // Phase 7: Handle指定（縦方向エッジ用）
        sourceHandle: edge.sourceHandle,
        targetHandle: edge.targetHandle,
        type: edgeType,
        animated: isAnimated,
        style,
        // カスタムエッジ用のデータ（labeledタイプで使用）
        data: edgeLabel ? {
          label: edgeLabel,
          labelColor,
          labelBgColor,
        } : undefined,
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: style.stroke as string,
          width: 20,
          height: 20,
        },
      };
    });

    // ローディング中のノードがあれば、プレースホルダーへのエッジを追加
    if (loadingNodeId) {
      edges.push({
        id: "loading-edge",
        source: loadingNodeId,
        target: "loading-placeholder",
        type: "smoothstep",
        animated: true,
        style: {
          stroke: "#f05a28",
          strokeWidth: 2,
          strokeDasharray: "5 5",
          opacity: 0.7,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: "#f05a28",
          width: 16,
          height: 16,
        },
      });
    }

    return edges;
  }, [session.edges, loadingNodeId, visibleNodeIds]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // ノード・エッジの更新を監視（副作用なのでuseEffectを使用）
  // 注: setNodes/setEdgesは依存配列から除外（ReactFlowの内部実装で参照が変わる可能性があるため）
  useEffect(() => {
    setNodes(initialNodes);
    setEdges(initialEdges);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialNodes, initialEdges]);

  // ノード数が変わったら（新しい問い/選択肢が追加された）ビューを全体にフィット
  const nodeCount = initialNodes.length;
  const prevNodeCountRef = useRef(nodeCount);
  useEffect(() => {
    if (nodeCount !== prevNodeCountRef.current) {
      prevNodeCountRef.current = nodeCount;
      // setNodes/setEdges の反映後にfitViewを実行
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, maxZoom: 0.9, duration: 300 });
      });
    }
  }, [nodeCount, fitView]);

  // ノードクリックハンドラ
  const handleNodeClick: NodeMouseHandler = useCallback(
    (event, node) => {
      // ローディング中はクリックを無効化
      if (isLoading) {
        return;
      }

      const nodeData = node.data as FlowNodeData;

      // Phase 22: 探索ノードをクリックした場合は次の問いを生成
      if (nodeData.isExplorationNode && onExploreNext) {
        onExploreNext(node.id);
        return;
      }

      // criteria クリック → 左パネルをこの問いに同期
      if (nodeData.level === "criteria") {
        // 完了済みの場合はdimmed兄弟トグルも実行
        if (nodeData.isColumnCompleted) {
          setExpandedCriteria(prev => {
            const next = new Set(prev);
            if (next.has(node.id)) {
              next.delete(node.id);
            } else {
              next.add(node.id);
            }
            return next;
          });
        }
        // 左パネル同期（完了/未完了どちらでも）
        onCriteriaClick?.(node.id);
        return;
      }

      // isSelectable フラグで判定（バックエンドで親子関係を考慮して計算）
      // 選択済みノード（status === "selected"）は常にクリック可能（理由変更用）
      if (nodeData.isSelectable || nodeData.status === "selected") {
        // マウスイベントからスクリーン座標を取得
        const screenPosition = {
          x: event.clientX,
          y: event.clientY,
        };
        // Phase 15.4: クリック時のビューポートも渡す（ポップオーバー追従用）
        const currentViewport = getViewport();
        onNodeClick(node.id, screenPosition, currentViewport);
      }
    },
    [onNodeClick, getViewport, isLoading, onExploreNext, onCriteriaClick, setExpandedCriteria]
  );

  // Phase 8: 判断軸ラベル情報を取得
  const criteriaLabels = session.criteriaLabels ?? [];
  const columnStates = session.columnStates ?? [];
  const currentColumnIndex = session.currentColumnIndex ?? 0;

  return (
    <div className="dn-flowchart">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onPaneClick={onPaneClick}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        fitView
        fitViewOptions={{
          // Phase 21: 行ベースレイアウト用 - ラベルエリアを含めて表示
          padding: 0.2, // 左側のラベルエリア用に余裕を持たせる
          maxZoom: 0.9, // 拡大しすぎない（ラベルが見切れないように）
          minZoom: 0.4, // 縮小可能範囲を広げる
          includeHiddenNodes: false, // 非表示ノードは含めない
        }}
        defaultViewport={{ x: 100, y: 0, zoom: 0.7 }} // 左にオフセットしてラベルエリアを表示
        minZoom={0.3}
        maxZoom={2}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={true}
        selectNodesOnDrag={false}
        panOnScroll={false}
        zoomOnScroll={true}
        zoomOnPinch={true}
        preventScrolling={true}
        defaultEdgeOptions={{
          type: "step",
        }}
      >
        <Background color="#e2e8f0" gap={20} size={1} />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(node) => {
            const data = node.data as FlowNodeData;
            // 確定系 = アクセント、未確定系 = グレー
            if (data.status === "recommended" || data.status === "selected") {
              return "#1f7a6d"; // アクセント
            }
            if (data.status === "dimmed" || data.status === "alternative-collapsed") {
              return "#c7cdd1"; // 薄グレー
            }
            return "#5b6770"; // スチールグレー
          }}
          maskColor="rgba(255, 255, 255, 0.8)"
          style={{ backgroundColor: "#f8fafc" }}
        />
      </ReactFlow>

      {/* Phase 22: CriteriaLabelOverlayは非表示（CriteriaNodeで統一） */}
      {/* 判断軸追加ボタンのみ表示が必要な場合は別途対応 */}

      {/* Phase 19: ブレインモデル覗き見ポップアップ（一時的に無効化 — 左パネル同期に切替） */}
      {/* <BrainModelPeekPopover
        isOpen={brainPeekCriteriaId !== null}
        criteriaId={brainPeekCriteriaId}
        onClose={handleBrainPeekClose}
      /> */}

      {/* ローディングオーバーレイ（セッション再生成中など） */}
      {isLoading && (
        <div className="dn-flowchart__loading-overlay">
          <div className="dn-flowchart__loading-spinner" />
          <div className="dn-flowchart__loading-text">条件を反映中...</div>
        </div>
      )}
    </div>
  );
}

// ReactFlowProviderでラップしたエクスポート用コンポーネント
export function FlowChart(props: FlowChartProps) {
  return (
    <ReactFlowProvider>
      <FlowChartInner {...props} />
    </ReactFlowProvider>
  );
}
