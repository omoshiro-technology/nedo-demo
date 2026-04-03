/**
 * ツールカタログ
 *
 * エージェントが利用可能なツールを管理する
 */

import type { Tool, OpenAIToolDefinition, toOpenAIToolDefinition } from "../../domain/agent/types";
import { analyzeDocumentTool } from "./tools/analyzeDocument";
import { searchHistoryTool } from "./tools/searchHistory";
import { extractDecisionsTool } from "./tools/extractDecisions";
import { buildGraphTool } from "./tools/buildGraph";

/**
 * 登録されたツールのマップ
 */
const toolRegistry = new Map<string, Tool>();

/**
 * ツールを登録する
 */
export function registerTool(tool: Tool): void {
  if (toolRegistry.has(tool.name)) {
    console.warn(`Tool "${tool.name}" is already registered. Overwriting.`);
  }
  toolRegistry.set(tool.name, tool);
}

/**
 * ツールを取得する
 */
export function getTool(name: string): Tool | undefined {
  return toolRegistry.get(name);
}

/**
 * 全ツールを取得する
 */
export function getAllTools(): Tool[] {
  return Array.from(toolRegistry.values());
}

/**
 * カテゴリでツールをフィルタリング
 */
export function getToolsByCategory(category: Tool["category"]): Tool[] {
  return getAllTools().filter((tool) => tool.category === category);
}

/**
 * OpenAI Function Calling形式でツール定義を取得
 */
export function getOpenAIToolDefinitions(): OpenAIToolDefinition[] {
  return getAllTools().map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  }));
}

/**
 * ツール実行結果（実行時間付き）
 */
type ExecuteToolResult = {
  success: boolean;
  data?: unknown;
  error?: string;
  executionTimeMs: number;
};

/**
 * ツール名からツールを実行
 */
export async function executeTool(
  name: string,
  params: unknown
): Promise<ExecuteToolResult> {
  const tool = getTool(name);
  if (!tool) {
    return {
      success: false,
      error: `Tool "${name}" not found`,
      executionTimeMs: 0,
    };
  }

  const startTime = Date.now();
  try {
    const result = await tool.execute(params);
    return {
      ...result,
      executionTimeMs: Date.now() - startTime,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      executionTimeMs: Date.now() - startTime,
    };
  }
}

/**
 * デフォルトツールを初期化
 */
export function initializeDefaultTools(): void {
  // 型キャストでジェネリクスの差異を吸収
  registerTool(analyzeDocumentTool as Tool);
  registerTool(searchHistoryTool as Tool);
  registerTool(extractDecisionsTool as Tool);
  registerTool(buildGraphTool as Tool);

  console.log(`[ToolCatalog] Initialized ${toolRegistry.size} tools`);
}

/**
 * ツールカタログの状態をログ出力
 */
export function logToolCatalog(): void {
  console.log("[ToolCatalog] Registered tools:");
  for (const tool of getAllTools()) {
    console.log(`  - ${tool.name}: ${tool.description}`);
  }
}
