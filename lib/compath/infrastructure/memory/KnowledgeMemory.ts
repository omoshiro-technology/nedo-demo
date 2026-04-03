/**
 * 知識メモリ
 *
 * 分析結果や抽出された知識を管理する
 */

import { getMemoryStore, type MemoryEntry } from "./MemoryStore";
import type { AnalysisResult, GraphResult, DecisionItem } from "../../domain/types";

/**
 * 知識エントリの型
 */
export type KnowledgeEntry = {
  /** 知識のカテゴリ */
  category: KnowledgeCategory;
  /** タイトル/ラベル */
  title: string;
  /** 内容 */
  content: string;
  /** 関連するドキュメントID */
  sourceDocumentId?: string;
  /** 関連するセッションID */
  sessionId?: string;
  /** 信頼度（0-1） */
  confidence: number;
  /** タグ */
  tags: string[];
};

/**
 * 知識のカテゴリ
 */
export type KnowledgeCategory =
  | "analysis_insight"  // 分析から得た洞察
  | "decision"          // 意思決定
  | "graph_pattern"     // グラフパターン
  | "user_feedback"     // ユーザーフィードバック
  | "tool_success";     // 成功したツールパターン

/**
 * 知識メモリマネージャー
 */
export class KnowledgeMemory {
  /**
   * 分析結果から知識を抽出して保存
   */
  saveFromAnalysis(
    analysisResult: AnalysisResult,
    sessionId?: string
  ): string[] {
    const savedIds: string[] = [];
    const store = getMemoryStore();
    const timestamp = Date.now();

    // 要約を保存
    if (analysisResult.summary) {
      const summaryId = `knowledge_summary_${timestamp}`;
      store.save({
        id: summaryId,
        type: "knowledge",
        content: analysisResult.summary,
        metadata: {
          category: "analysis_insight",
          title: `${analysisResult.documentType}の分析要約`,
          sourceDocumentId: analysisResult.meta.fileName,
          sessionId,
          confidence: 0.8,
          tags: [analysisResult.documentType],
        },
        ttl: 30 * 24 * 60 * 60 * 1000, // 30日間保持
      });
      savedIds.push(summaryId);
    }

    // グラフからノード情報を保存
    for (const graph of analysisResult.graphs) {
      for (const node of graph.nodes) {
        if (node.status === "present" && (node.confidence || 0) >= 50) {
          const nodeId = `knowledge_node_${timestamp}_${node.id}`;
          store.save({
            id: nodeId,
            type: "knowledge",
            content: `${node.levelLabel}: ${node.label}`,
            metadata: {
              category: "graph_pattern",
              title: node.label,
              sourceDocumentId: analysisResult.meta.fileName,
              sessionId,
              confidence: (node.confidence || 50) / 100,
              tags: [graph.axisLabel, node.levelLabel],
              axisId: graph.axisId,
              nodeId: node.id,
            },
            ttl: 30 * 24 * 60 * 60 * 1000,
          });
          savedIds.push(nodeId);
        }
      }
    }

    console.log(`[KnowledgeMemory] Saved ${savedIds.length} knowledge entries from analysis`);
    return savedIds;
  }

  /**
   * 意思決定を保存
   */
  saveDecisions(
    decisions: DecisionItem[],
    sourceDocument: string,
    sessionId?: string
  ): string[] {
    const savedIds: string[] = [];
    const store = getMemoryStore();
    const timestamp = Date.now();

    for (const decision of decisions) {
      if (decision.status === "confirmed") {
        const decisionId = `knowledge_decision_${timestamp}_${decision.id}`;
        store.save({
          id: decisionId,
          type: "knowledge",
          content: decision.content,
          metadata: {
            category: "decision",
            title: decision.content.substring(0, 50),
            sourceDocumentId: sourceDocument,
            sessionId,
            confidence: decision.confidence === "high" ? 0.9 : decision.confidence === "medium" ? 0.7 : 0.5,
            tags: [decision.patternType, decision.status],
            decisionDate: decision.decisionDate,
          },
          ttl: 90 * 24 * 60 * 60 * 1000, // 90日間保持
        });
        savedIds.push(decisionId);
      }
    }

    console.log(`[KnowledgeMemory] Saved ${savedIds.length} decision entries`);
    return savedIds;
  }

  /**
   * 成功したツールパターンを保存
   */
  saveToolPattern(
    toolName: string,
    params: unknown,
    context: string,
    sessionId?: string
  ): void {
    const store = getMemoryStore();
    const patternId = `knowledge_tool_${Date.now()}_${toolName}`;

    store.save({
      id: patternId,
      type: "tool_pattern",
      content: `Tool: ${toolName}\nContext: ${context}\nParams: ${JSON.stringify(params)}`,
      metadata: {
        category: "tool_success",
        title: `${toolName}の成功パターン`,
        sessionId,
        confidence: 0.8,
        tags: [toolName],
        toolName,
        params,
      },
      ttl: 14 * 24 * 60 * 60 * 1000, // 14日間保持
    });

    console.log(`[KnowledgeMemory] Saved tool pattern: ${toolName}`);
  }

  /**
   * 関連する知識を検索
   */
  searchKnowledge(
    query: string,
    options: {
      category?: KnowledgeCategory;
      tags?: string[];
      limit?: number;
    } = {}
  ): KnowledgeEntry[] {
    const store = getMemoryStore();
    const entries = store.search(query, {
      type: "knowledge",
      limit: options.limit || 10,
    });

    // カテゴリでフィルタ
    let filtered = entries;
    if (options.category) {
      filtered = filtered.filter(
        (e) => e.metadata.category === options.category
      );
    }

    // タグでフィルタ
    if (options.tags && options.tags.length > 0) {
      filtered = filtered.filter((e) => {
        const entryTags = (e.metadata.tags as string[]) || [];
        return options.tags!.some((tag) => entryTags.includes(tag));
      });
    }

    return filtered.map((entry) => ({
      category: entry.metadata.category as KnowledgeCategory,
      title: entry.metadata.title as string,
      content: entry.content,
      sourceDocumentId: entry.metadata.sourceDocumentId as string | undefined,
      sessionId: entry.metadata.sessionId as string | undefined,
      confidence: entry.metadata.confidence as number,
      tags: (entry.metadata.tags as string[]) || [],
    }));
  }

  /**
   * 類似のツールパターンを取得
   */
  getSimilarToolPatterns(
    context: string,
    toolName?: string,
    limit: number = 5
  ): Array<{ toolName: string; params: unknown; context: string }> {
    const store = getMemoryStore();
    const entries = store.search(context, {
      type: "tool_pattern",
      limit,
    });

    let filtered = entries;
    if (toolName) {
      filtered = filtered.filter((e) => e.metadata.toolName === toolName);
    }

    return filtered.map((entry) => ({
      toolName: entry.metadata.toolName as string,
      params: entry.metadata.params,
      context: entry.content,
    }));
  }

  /**
   * 統計情報を取得
   */
  getStats(): {
    totalKnowledge: number;
    byCategory: Record<KnowledgeCategory, number>;
    averageConfidence: number;
  } {
    const store = getMemoryStore();
    const stats = store.getStats();

    const byCategory: Record<KnowledgeCategory, number> = {
      analysis_insight: 0,
      decision: 0,
      graph_pattern: 0,
      user_feedback: 0,
      tool_success: 0,
    };

    // 詳細な統計は将来実装
    return {
      totalKnowledge: stats.byType.knowledge + stats.byType.tool_pattern,
      byCategory,
      averageConfidence: 0.7,
    };
  }
}

// シングルトンインスタンス
let knowledgeMemoryInstance: KnowledgeMemory | null = null;

/**
 * 知識メモリのシングルトンインスタンスを取得
 */
export function getKnowledgeMemory(): KnowledgeMemory {
  if (!knowledgeMemoryInstance) {
    knowledgeMemoryInstance = new KnowledgeMemory();
  }
  return knowledgeMemoryInstance;
}
