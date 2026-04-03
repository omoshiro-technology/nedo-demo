import type { AnalysisHistory, GraphResult, ExportOptions } from "../../domain/types";

/** JSONエクスポートの出力形式 */
export type JsonExportData = {
  version: string;
  exportedAt: string;
  source: {
    fileName: string;
    documentType: string;
    documentClassification?: string;
    analyzedAt: string;
  };
  axis: {
    id: string;
    label: string;
  };
  levels: Array<{
    id: string;
    label: string;
  }>;
  nodes: Array<{
    id: string;
    label: string;
    levelId: string;
    levelLabel: string;
    status: string;
    confidence?: number;
    tags?: {
      confidenceTag: string;
      taggedBy: string;
      taggedAt: string;
      reason?: string;
    };
    mergedFrom?: {
      sourceNodeIds: string[];
      sourceDocumentIds: string[];
    };
  }>;
  edges: Array<{
    id: string;
    source: string;
    target: string;
    label?: string;
  }>;
};

/**
 * 分析結果をJSON形式でエクスポート
 */
export function exportToJson(
  history: AnalysisHistory,
  graph: GraphResult,
  options: ExportOptions = { format: "json" }
): JsonExportData {
  const { includeTags = true, includeEdgeLabels = true } = options;

  return {
    version: "1.0",
    exportedAt: new Date().toISOString(),
    source: {
      fileName: history.fileName,
      documentType: history.result.documentType,
      documentClassification: history.documentClassification,
      analyzedAt: history.analyzedAt
    },
    axis: {
      id: graph.axisId,
      label: graph.axisLabel
    },
    levels: graph.levels.map((level) => ({
      id: level.id,
      label: level.label
    })),
    nodes: graph.nodes.map((node) => ({
      id: node.id,
      label: node.label,
      levelId: node.levelId,
      levelLabel: node.levelLabel,
      status: node.status,
      confidence: node.confidence,
      ...(includeTags && node.tags
        ? {
            tags: {
              confidenceTag: node.tags.confidenceTag,
              taggedBy: node.tags.taggedBy,
              taggedAt: node.tags.taggedAt,
              reason: node.tags.reason
            }
          }
        : {}),
      ...(node.mergedFrom
        ? {
            mergedFrom: {
              sourceNodeIds: node.mergedFrom.sourceNodeIds,
              sourceDocumentIds: node.mergedFrom.sourceDocumentIds
            }
          }
        : {})
    })),
    edges: graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      ...(includeEdgeLabels && edge.label ? { label: edge.label } : {})
    }))
  };
}

/**
 * JSON文字列としてエクスポート
 */
export function exportToJsonString(
  history: AnalysisHistory,
  graph: GraphResult,
  options: ExportOptions = { format: "json" }
): string {
  const data = exportToJson(history, graph, options);
  return JSON.stringify(data, null, 2);
}
