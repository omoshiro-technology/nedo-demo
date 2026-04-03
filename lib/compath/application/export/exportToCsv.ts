import type { AnalysisHistory, GraphResult, ExportOptions } from "../../domain/types";

/** CSVエクスポートの出力形式 */
export type CsvExportData = {
  nodes: string;
  edges: string;
};

/**
 * CSV用にエスケープ
 */
function escapeCsvField(value: string | undefined | null): string {
  if (value === undefined || value === null) {
    return "";
  }
  // ダブルクォートを含む場合はエスケープし、カンマ・改行・ダブルクォートを含む場合はクォートで囲む
  const escaped = value.replace(/"/g, '""');
  if (escaped.includes(",") || escaped.includes("\n") || escaped.includes('"')) {
    return `"${escaped}"`;
  }
  return escaped;
}

/**
 * ノードをCSV形式でエクスポート
 */
export function exportNodesToCsv(
  graph: GraphResult,
  options: ExportOptions = { format: "csv" }
): string {
  const { includeTags = true } = options;

  // ヘッダー行
  const headers = [
    "node_id",
    "label",
    "level_id",
    "level_label",
    "status",
    "confidence"
  ];

  if (includeTags) {
    headers.push("confidence_tag", "tagged_by", "tagged_at", "tag_reason");
  }

  const rows: string[] = [headers.join(",")];

  // データ行
  for (const node of graph.nodes) {
    const row = [
      escapeCsvField(node.id),
      escapeCsvField(node.label),
      escapeCsvField(node.levelId),
      escapeCsvField(node.levelLabel),
      escapeCsvField(node.status),
      node.confidence?.toString() ?? ""
    ];

    if (includeTags) {
      row.push(
        escapeCsvField(node.tags?.confidenceTag),
        escapeCsvField(node.tags?.taggedBy),
        escapeCsvField(node.tags?.taggedAt),
        escapeCsvField(node.tags?.reason)
      );
    }

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * エッジをCSV形式でエクスポート
 */
export function exportEdgesToCsv(
  graph: GraphResult,
  options: ExportOptions = { format: "csv" }
): string {
  const { includeEdgeLabels = true } = options;

  // ヘッダー行
  const headers = ["edge_id", "source_node_id", "target_node_id"];
  if (includeEdgeLabels) {
    headers.push("label");
  }

  const rows: string[] = [headers.join(",")];

  // データ行
  for (const edge of graph.edges) {
    const row = [
      escapeCsvField(edge.id),
      escapeCsvField(edge.source),
      escapeCsvField(edge.target)
    ];

    if (includeEdgeLabels) {
      row.push(escapeCsvField(edge.label));
    }

    rows.push(row.join(","));
  }

  return rows.join("\n");
}

/**
 * 分析結果をCSV形式でエクスポート（ノードとエッジの両方）
 */
export function exportToCsv(
  history: AnalysisHistory,
  graph: GraphResult,
  options: ExportOptions = { format: "csv" }
): CsvExportData {
  return {
    nodes: exportNodesToCsv(graph, options),
    edges: exportEdgesToCsv(graph, options)
  };
}
