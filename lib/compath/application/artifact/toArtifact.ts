/**
 * 既存の型からArtifact統一スキーマへの変換関数
 *
 * 対象:
 * - AnalysisResult → FTAArtifact
 * - DecisionTimelineResult → MinutesArtifact
 * - DecisionNavigatorSession → DecisionLogArtifact
 */

import type {
  Artifact,
  ArtifactType,
  FTAContent,
  MinutesContent,
  DecisionLogContent,
  MissingItem,
  EvidenceItem,
} from "../../domain/artifact";
import type { AnalysisResult, GraphResult, DecisionTimelineResult, DecisionItem } from "../../domain/types";

// =============================================================================
// ID生成ヘルパー
// =============================================================================

function generateArtifactId(type: ArtifactType): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${type.toLowerCase()}-${timestamp}-${random}`;
}

// =============================================================================
// AnalysisResult → FTAArtifact
// =============================================================================

/**
 * AnalysisResultからFTAArtifactに変換
 */
export function analysisResultToArtifact(
  result: AnalysisResult,
  fileName: string
): Artifact<FTAContent> {
  // 最初のグラフを使用（複数グラフがある場合は最初のみ）
  const graph = result.graphs[0] as GraphResult | undefined;

  // FTAContentの構築
  const content: FTAContent = graph
    ? {
        top_event: graph.axisLabel,
        nodes: graph.nodes.map((n) => ({
          id: n.id,
          label: n.label,
          kind: determineNodeKind(n.levelId, graph.levels),
          note: n.tags?.reason,
        })),
        edges: graph.edges.map((e) => ({
          from: e.source,
          to: e.target,
          gate: "NONE" as const,
        })),
        metrics: {
          node_count: graph.nodes.length,
          depth: graph.levels.length,
        },
      }
    : {
        top_event: result.summary,
        nodes: [],
        edges: [],
        metrics: { node_count: 0, depth: 0 },
      };

  // Missing項目の抽出（missingステータスのノードから）
  const missing: MissingItem[] = graph
    ? graph.nodes
        .filter((n) => n.status === "missing")
        .map((n, i) => ({
          id: `missing-${i}`,
          field: `node:${n.id}`,
          question: `「${n.label}」の詳細情報が不足しています`,
          severity: "medium" as const,
        }))
    : [];

  // Evidence（根拠）の抽出
  const evidence: EvidenceItem[] = result.fullText
    ? [
        {
          source_id: fileName,
          quote: result.fullText.slice(0, 200) + (result.fullText.length > 200 ? "..." : ""),
          location: fileName,
        },
      ]
    : [];

  return {
    artifact_id: generateArtifactId("FTA"),
    type: "FTA",
    title: `${fileName} - ${result.documentType}`,
    version: 1,
    status: "draft",
    updated_at: new Date().toISOString(),
    summary: result.summary,
    content,
    missing,
    evidence,
  };
}

/**
 * ノードの種類を判定
 */
function determineNodeKind(
  levelId: string,
  levels: Array<{ id: string; label: string }>
): "EVENT" | "CAUSE" | "CONTROL" {
  const index = levels.findIndex((l) => l.id === levelId);
  if (index === 0) return "EVENT";
  if (index === levels.length - 1) return "CONTROL";
  return "CAUSE";
}

// =============================================================================
// DecisionTimelineResult → MinutesArtifact
// =============================================================================

/**
 * DecisionTimelineResultからMinutesArtifactに変換
 */
export function decisionTimelineToArtifact(
  result: DecisionTimelineResult
): Artifact<MinutesContent> {
  // 議論内容をグループ化
  const discussionTopics = new Map<string, DecisionItem[]>();
  for (const decision of result.decisions) {
    const topic = extractTopic(decision);
    const items = discussionTopics.get(topic) || [];
    items.push(decision);
    discussionTopics.set(topic, items);
  }

  // MinutesContentの構築
  const content: MinutesContent = {
    meeting: {
      title: result.processedDocuments[0]?.fileName || "議事録",
      date: result.timeRange?.earliest,
      attendees: [], // 抽出されていない
      context: undefined,
    },
    agenda: Array.from(discussionTopics.keys()),
    discussion: Array.from(discussionTopics.entries()).map(([topic, items]) => ({
      topic,
      points: items.map((d) => d.sourceText || d.content),
      decisions: items.filter((d) => d.status === "confirmed").map((d) => d.content),
      open_questions: items
        .filter((d) => d.status === "gray")
        .map((d) => d.guidance?.missingInfo?.[0] || d.content),
    })),
    action_items: result.decisions
      .flatMap((d) => d.guidance?.actionItems || [])
      .map((item) => ({
        who: item.actor || "未定",
        what: item.summary,
        due: item.dueDate,
        status: "OPEN" as const,
      })),
  };

  // Missing項目の抽出
  const missing: MissingItem[] = result.decisions
    .filter((d) => d.status === "gray" || (d.guidance?.missingInfo?.length ?? 0) > 0)
    .flatMap((d, i) =>
      (d.guidance?.missingInfo || ["詳細不明"]).map((info, j) => ({
        id: `missing-${i}-${j}`,
        field: `decision:${d.content.slice(0, 20)}`,
        question: info,
        severity: d.status === "gray" ? "high" as const : "medium" as const,
      }))
    );

  // Evidence（根拠）の抽出
  const evidence: EvidenceItem[] = result.decisions
    .filter((d) => d.sourceText)
    .slice(0, 5)
    .map((d, i) => ({
      source_id: `decision-${i}`,
      quote: d.sourceText || "",
      location: result.processedDocuments[0]?.fileName || "不明",
    }));

  return {
    artifact_id: generateArtifactId("MINUTES"),
    type: "MINUTES",
    title: result.processedDocuments[0]?.fileName || "議事録分析結果",
    version: 1,
    status: "draft",
    updated_at: new Date().toISOString(),
    summary: `${result.decisions.length}件の意思決定を抽出`,
    content,
    missing,
    evidence,
  };
}

/**
 * 意思決定からトピックを抽出
 */
function extractTopic(decision: DecisionItem): string {
  // パターンタイプからトピックを推定
  switch (decision.patternType) {
    case "agreement":
      return "合意事項";
    case "decision":
      return "決定事項";
    case "change":
      return "変更事項";
    case "adoption":
      return "採用事項";
    case "cancellation":
      return "中止・取消事項";
    default:
      return "その他";
  }
}

// =============================================================================
// 汎用変換関数
// =============================================================================

/**
 * 成果物タイプを判定して適切な変換を行う
 */
export function toArtifact(
  data: AnalysisResult | DecisionTimelineResult,
  type: "analysis" | "decision",
  fileName?: string
): Artifact {
  if (type === "analysis") {
    return analysisResultToArtifact(data as AnalysisResult, fileName || "unknown");
  } else {
    return decisionTimelineToArtifact(data as DecisionTimelineResult);
  }
}
