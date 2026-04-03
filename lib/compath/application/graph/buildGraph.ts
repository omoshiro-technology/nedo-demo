/**
 * グラフ構築オーケストレーション
 */

import type { AxisDefinition } from "../../domain/types";
import { env } from "../../config/env";
import type { BuildGraphResult } from "./graphUtils";
import { buildGraphHeuristic } from "./heuristicExtractor";
import { buildGraphWithLLM } from "./llmGraphExtractor";

/**
 * グラフを構築
 *
 * LLMが利用可能な場合はLLMで抽出、
 * 利用不可またはLLM抽出失敗時はヒューリスティックにフォールバック
 */
export async function buildGraph(
  axis: AxisDefinition,
  pages: string[],
  fullText: string
): Promise<BuildGraphResult> {
  // APIキーがない場合はヒューリスティックにフォールバック
  if (!env.openaiApiKey) {
    return {
      graph: buildGraphHeuristic(axis, pages),
      warnings: ["OPENAI_API_KEY が設定されていないためローカル抽出にフォールバックしました。"]
    };
  }

  // LLMでグラフ抽出を試行
  const llm = await buildGraphWithLLM(axis, fullText);
  if (llm.graph) {
    return { graph: llm.graph, warnings: llm.warnings };
  }

  // LLM抽出失敗時はヒューリスティックにフォールバック
  return {
    graph: buildGraphHeuristic(axis, pages),
    warnings: ["LLMグラフ抽出に失敗したためローカル抽出にフォールバックしました。"]
  };
}

// 型を再エクスポート
export type { BuildGraphResult } from "./graphUtils";
