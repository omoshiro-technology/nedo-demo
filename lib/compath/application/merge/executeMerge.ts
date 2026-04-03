import type {
  AnalysisHistory,
  GraphResult,
  GraphNode,
  GraphEdge,
  MergeCandidate,
  MergedNodeInfo
} from "../../domain/types";

/**
 * マージ実行のオプション
 */
export type ExecuteMergeOptions = {
  /** 承認済み候補のみをマージ */
  approvedOnly?: boolean;
};

/**
 * 統合グラフの結果
 */
export type UnifiedGraphResult = {
  /** 統合されたグラフ */
  graph: GraphResult;
  /** マージされたノード数 */
  mergedNodeCount: number;
  /** 元文書のID一覧 */
  sourceDocumentIds: string[];
  /** 警告メッセージ */
  warnings: string[];
};

/**
 * 承認済みマージ候補を使って統合グラフを構築
 */
export function executeGraphMerge(
  histories: AnalysisHistory[],
  candidates: MergeCandidate[],
  axisId: string,
  options: ExecuteMergeOptions = {}
): UnifiedGraphResult {
  const { approvedOnly = true } = options;

  // 対象の候補をフィルタ
  const targetCandidates = approvedOnly
    ? candidates.filter((c) => c.status === "approved")
    : candidates;

  const warnings: string[] = [];

  // 各履歴から対象軸のグラフを取得
  const graphs = histories
    .map((h) => ({
      documentId: h.id,
      graph: h.result.graphs.find((g) => g.axisId === axisId)
    }))
    .filter((item): item is { documentId: string; graph: GraphResult } => !!item.graph);

  if (graphs.length === 0) {
    return {
      graph: {
        axisId,
        axisLabel: "統合グラフ",
        levels: [],
        nodes: [],
        edges: []
      },
      mergedNodeCount: 0,
      sourceDocumentIds: [],
      warnings: ["対象の軸が見つかりませんでした。"]
    };
  }

  // ベースとなるグラフ情報
  const baseGraph = graphs[0].graph;

  // マージマッピングを構築: sourceNodeId -> targetNodeId
  const mergeMap = new Map<string, string>();
  for (const candidate of targetCandidates) {
    if (candidate.mergedLabel) {
      // sourceをtargetにマージ
      mergeMap.set(candidate.sourceNodeId, candidate.targetNodeId);
    }
  }

  // 全ノードを収集（重複を除去しながら）
  const nodeMap = new Map<string, GraphNode>();
  const mergedNodeIds = new Set<string>();

  for (const { documentId, graph } of graphs) {
    for (const node of graph.nodes) {
      // マージ対象の場合はスキップ（マージ先のノードに統合される）
      if (mergeMap.has(node.id)) {
        continue;
      }

      // 既に存在するノードの場合はマージ情報を追加
      if (nodeMap.has(node.id)) {
        const existing = nodeMap.get(node.id)!;
        const existingMergedFrom = existing.mergedFrom ?? {
          sourceNodeIds: [existing.id],
          sourceDocumentIds: [existing.sourceDocumentId ?? documentId]
        };

        nodeMap.set(node.id, {
          ...existing,
          mergedFrom: {
            sourceNodeIds: [...existingMergedFrom.sourceNodeIds, node.id],
            sourceDocumentIds: [...existingMergedFrom.sourceDocumentIds, documentId]
          }
        });
        mergedNodeIds.add(node.id);
      } else {
        nodeMap.set(node.id, {
          ...node,
          sourceDocumentId: documentId
        });
      }
    }
  }

  // マージ候補のノードを処理
  for (const candidate of targetCandidates) {
    const targetNode = nodeMap.get(candidate.targetNodeId);
    if (!targetNode) continue;

    // マージ情報を追加
    const existingMergedFrom = targetNode.mergedFrom ?? {
      sourceNodeIds: [candidate.targetNodeId],
      sourceDocumentIds: [candidate.targetDocumentId]
    };

    const mergedFrom: MergedNodeInfo = {
      sourceNodeIds: [...existingMergedFrom.sourceNodeIds, candidate.sourceNodeId],
      sourceDocumentIds: [...existingMergedFrom.sourceDocumentIds, candidate.sourceDocumentId]
    };

    nodeMap.set(candidate.targetNodeId, {
      ...targetNode,
      label: candidate.mergedLabel ?? targetNode.label,
      mergedFrom
    });

    mergedNodeIds.add(candidate.targetNodeId);
  }

  // 全エッジを収集（ノードIDをマージ後のIDに置換）
  const edgeMap = new Map<string, GraphEdge>();

  for (const { graph } of graphs) {
    for (const edge of graph.edges) {
      // ソース・ターゲットをマージ後のIDに置換
      const source = mergeMap.get(edge.source) ?? edge.source;
      const target = mergeMap.get(edge.target) ?? edge.target;

      // ノードが存在しない場合はスキップ
      if (!nodeMap.has(source) || !nodeMap.has(target)) {
        continue;
      }

      const edgeKey = `${source}-${target}`;
      if (!edgeMap.has(edgeKey)) {
        edgeMap.set(edgeKey, {
          id: `unified-edge-${edgeMap.size}`,
          source,
          target,
          label: edge.label
        });
      }
    }
  }

  const unifiedGraph: GraphResult = {
    axisId,
    axisLabel: `${baseGraph.axisLabel} (統合)`,
    levels: baseGraph.levels,
    nodes: Array.from(nodeMap.values()),
    edges: Array.from(edgeMap.values())
  };

  return {
    graph: unifiedGraph,
    mergedNodeCount: mergedNodeIds.size,
    sourceDocumentIds: graphs.map((g) => g.documentId),
    warnings
  };
}
