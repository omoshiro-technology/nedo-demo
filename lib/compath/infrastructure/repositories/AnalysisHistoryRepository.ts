import type {
  AnalysisHistory,
  AnalysisHistorySummary,
  AnalysisResult,
  DocumentClassification,
  NodeTagInfo
} from "../../domain/types";

// インメモリストレージ（後でDB対応可能）
const storage: Map<string, AnalysisHistory> = new Map();

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function countMissingNodes(result: AnalysisResult): number {
  return result.graphs.reduce((count, graph) => {
    return count + graph.nodes.filter((node) => node.status === "missing").length;
  }, 0);
}

export const AnalysisHistoryRepository = {
  create(input: { fileName: string; result: AnalysisResult; qualityScore?: number }): AnalysisHistory {
    const id = generateId();
    const missingCount = countMissingNodes(input.result);
    const history: AnalysisHistory = {
      id,
      fileName: input.fileName,
      analyzedAt: new Date().toISOString(),
      result: input.result,
      qualityScore: input.qualityScore,
      missingCount
    };
    storage.set(id, history);
    return history;
  },

  findById(id: string): AnalysisHistory | undefined {
    return storage.get(id);
  },

  findAll(): AnalysisHistorySummary[] {
    const items = Array.from(storage.values());
    // 新しい順にソート
    items.sort((a, b) => new Date(b.analyzedAt).getTime() - new Date(a.analyzedAt).getTime());
    return items.map((item) => ({
      id: item.id,
      fileName: item.fileName,
      analyzedAt: item.analyzedAt,
      documentType: item.result.documentType,
      qualityScore: item.qualityScore,
      missingCount: item.missingCount
    }));
  },

  delete(id: string): boolean {
    return storage.delete(id);
  },

  clear(): void {
    storage.clear();
  },

  /**
   * 文書分類を更新
   */
  updateClassification(
    id: string,
    classification: DocumentClassification,
    manuallySet: boolean = true
  ): AnalysisHistory | undefined {
    const history = storage.get(id);
    if (!history) {
      return undefined;
    }
    const updated: AnalysisHistory = {
      ...history,
      documentClassification: classification,
      classificationManuallySet: manuallySet
    };
    storage.set(id, updated);
    return updated;
  },

  /**
   * ノードタグを更新
   */
  updateNodeTag(
    historyId: string,
    axisId: string,
    nodeId: string,
    tagInfo: NodeTagInfo
  ): AnalysisHistory | undefined {
    const history = storage.get(historyId);
    if (!history) {
      return undefined;
    }

    // graphsの中から対象のaxisとnodeを見つけて更新
    const updatedGraphs = history.result.graphs.map((graph) => {
      if (graph.axisId !== axisId) {
        return graph;
      }
      return {
        ...graph,
        nodes: graph.nodes.map((node) => {
          if (node.id !== nodeId) {
            return node;
          }
          return {
            ...node,
            tags: tagInfo
          };
        })
      };
    });

    const updated: AnalysisHistory = {
      ...history,
      result: {
        ...history.result,
        graphs: updatedGraphs
      }
    };
    storage.set(historyId, updated);
    return updated;
  },

  /**
   * 複数ノードのタグを一括更新
   */
  updateNodeTagsBatch(
    historyId: string,
    updates: Array<{ axisId: string; nodeId: string; tagInfo: NodeTagInfo }>
  ): AnalysisHistory | undefined {
    let history = storage.get(historyId);
    if (!history) {
      return undefined;
    }

    for (const update of updates) {
      history = this.updateNodeTag(historyId, update.axisId, update.nodeId, update.tagInfo);
      if (!history) {
        return undefined;
      }
    }
    return history;
  },

  /**
   * グラフ全体を更新（編集モードからの保存用）
   */
  updateGraph(
    historyId: string,
    axisId: string,
    updatedGraph: { nodes: AnalysisHistory["result"]["graphs"][0]["nodes"]; edges: AnalysisHistory["result"]["graphs"][0]["edges"] }
  ): AnalysisHistory | undefined {
    const history = storage.get(historyId);
    if (!history) {
      return undefined;
    }

    const updatedGraphs = history.result.graphs.map((graph) => {
      if (graph.axisId !== axisId) {
        return graph;
      }
      return {
        ...graph,
        nodes: updatedGraph.nodes,
        edges: updatedGraph.edges
      };
    });

    const updated: AnalysisHistory = {
      ...history,
      result: {
        ...history.result,
        graphs: updatedGraphs
      },
      missingCount: countMissingNodes({ ...history.result, graphs: updatedGraphs })
    };
    storage.set(historyId, updated);
    return updated;
  }
};
