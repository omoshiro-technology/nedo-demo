/**
 * グラフ構築ツール
 *
 * テキストからナレッジグラフを構築する
 */

import type { Tool, ToolResult, JSONSchema } from "../../../domain/agent/types";
import type { GraphResult, AxisDefinition } from "../../../domain/types";
import { buildGraph as buildGraphFromText } from "../../../application/graph/buildGraph";

/**
 * ツールパラメータ
 */
type BuildGraphParams = {
  /** 分析対象のテキスト */
  text: string;
  /** 軸定義 */
  axis: {
    id: string;
    label: string;
    description?: string;
    levels: Array<{
      id: string;
      label: string;
    }>;
  };
};

/**
 * パラメータのJSON Schema
 */
const parametersSchema: JSONSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "グラフを構築する対象のテキスト",
    },
    axis: {
      type: "object",
      description: "グラフの構造を定義する軸情報",
      properties: {
        id: {
          type: "string",
          description: "軸の一意識別子",
        },
        label: {
          type: "string",
          description: "軸の表示名",
        },
        description: {
          type: "string",
          description: "軸の説明（オプション）",
        },
        levels: {
          type: "array",
          description: "軸に含まれるレベルの配列",
          items: {
            type: "object",
            properties: {
              id: {
                type: "string",
                description: "レベルの一意識別子",
              },
              label: {
                type: "string",
                description: "レベルの表示名",
              },
            },
            required: ["id", "label"],
          },
        },
      },
      required: ["id", "label", "levels"],
    },
  },
  required: ["text", "axis"],
};

/**
 * ツール実行関数
 */
async function execute(
  params: BuildGraphParams
): Promise<ToolResult<GraphResult>> {
  try {
    // パラメータ検証
    if (!params.text || typeof params.text !== "string") {
      return {
        success: false,
        error: "text は必須の文字列パラメータです",
      };
    }

    if (!params.axis || !params.axis.id || !params.axis.label || !params.axis.levels) {
      return {
        success: false,
        error: "axis は必須のパラメータです（id, label, levels が必要）",
      };
    }

    // 軸定義を構築
    const axisDefinition: AxisDefinition = {
      id: params.axis.id,
      label: params.axis.label,
      levels: params.axis.levels.map((level) => ({
        id: level.id,
        label: level.label,
      })),
    };

    // ページ情報を構築（単一ページとして扱う）
    const pages: string[] = [params.text];

    // グラフを構築
    const result = await buildGraphFromText(axisDefinition, pages, params.text);

    return {
      success: true,
      data: result.graph,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "グラフ構築に失敗しました",
    };
  }
}

/**
 * グラフ構築ツール定義
 */
export const buildGraphTool: Tool<BuildGraphParams, GraphResult> = {
  name: "build_graph",
  description:
    "テキストから指定した軸定義に基づいてナレッジグラフを構築します。ノード（概念）とエッジ（関係）を抽出し、構造化された形式で返します。",
  parameters: parametersSchema,
  execute,
  category: "generation",
  requiredPermissions: ["read_document"],
};
