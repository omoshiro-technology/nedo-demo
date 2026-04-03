/**
 * 履歴検索ツール
 *
 * 過去の分析履歴から類似事例を検索する
 */

import type { Tool, ToolResult, JSONSchema } from "../../../domain/agent/types";
import type { AnalysisHistorySummary } from "../../../domain/types";
import { AnalysisHistoryRepository } from "../../repositories/AnalysisHistoryRepository";

/**
 * ツールパラメータ
 */
type SearchHistoryParams = {
  /** 検索クエリ */
  query: string;
  /** 最大取得件数 */
  limit?: number;
  /** 文書タイプでフィルタリング */
  documentType?: string;
};

/**
 * 検索結果
 */
type SearchHistoryResult = {
  /** 検索結果の件数 */
  totalCount: number;
  /** 検索結果 */
  items: AnalysisHistorySummary[];
};

/**
 * パラメータのJSON Schema
 */
const parametersSchema: JSONSchema = {
  type: "object",
  properties: {
    query: {
      type: "string",
      description: "検索クエリ（キーワードや状況の説明）",
    },
    limit: {
      type: "number",
      description: "最大取得件数（デフォルト: 10）",
    },
    documentType: {
      type: "string",
      description: "文書タイプでフィルタリング（例: 議事録、報告書）",
    },
  },
  required: ["query"],
};

/**
 * 簡易的なテキスト類似度計算（単語の重複率）
 */
function calculateSimilarity(text1: string, text2: string): number {
  const words1 = new Set(text1.toLowerCase().split(/\s+/));
  const words2 = new Set(text2.toLowerCase().split(/\s+/));

  let intersection = 0;
  for (const word of words1) {
    if (words2.has(word)) {
      intersection++;
    }
  }

  const union = words1.size + words2.size - intersection;
  return union > 0 ? intersection / union : 0;
}

/**
 * ツール実行関数
 */
async function execute(
  params: SearchHistoryParams
): Promise<ToolResult<SearchHistoryResult>> {
  try {
    // パラメータ検証
    if (!params.query || typeof params.query !== "string") {
      return {
        success: false,
        error: "query は必須の文字列パラメータです",
      };
    }

    const limit = params.limit || 10;

    // 全履歴を取得（サマリー形式）
    let allHistory = AnalysisHistoryRepository.findAll();

    // 文書タイプでフィルタリング
    if (params.documentType) {
      allHistory = allHistory.filter(
        (h: AnalysisHistorySummary) => h.documentType === params.documentType
      );
    }

    // 類似度でソート
    const scoredHistory = allHistory.map((history: AnalysisHistorySummary) => {
      const textToMatch = [
        history.documentType,
        history.fileName,
      ].join(" ");

      return {
        history,
        score: calculateSimilarity(params.query, textToMatch),
      };
    });

    scoredHistory.sort((a: { score: number }, b: { score: number }) => b.score - a.score);

    // 上位N件を取得
    const results = scoredHistory.slice(0, limit).map((item: { history: AnalysisHistorySummary }) => item.history);

    return {
      success: true,
      data: {
        totalCount: results.length,
        items: results,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "履歴検索に失敗しました",
    };
  }
}

/**
 * 履歴検索ツール定義
 */
export const searchHistoryTool: Tool<SearchHistoryParams, SearchHistoryResult> = {
  name: "search_history",
  description:
    "過去の分析履歴から、指定したクエリに類似する事例を検索します。類似した問題や対応策を参照する際に使用します。",
  parameters: parametersSchema,
  execute,
  category: "search",
  requiredPermissions: ["search_history"],
};
