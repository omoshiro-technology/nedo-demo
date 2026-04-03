/**
 * 意思決定抽出ツール
 *
 * 文書から意思決定項目を抽出する
 */

import type { Tool, ToolResult, JSONSchema } from "../../../domain/agent/types";
import type { DecisionItem } from "../../../domain/types";
import { extractDecisionsFromText } from "../../../application/decision/extractDecisions";

/**
 * ツールパラメータ
 */
type ExtractDecisionsParams = {
  /** 分析対象のテキスト */
  text: string;
  /** ファイル名（オプション） */
  fileName?: string;
};

/**
 * 抽出結果
 */
type ExtractDecisionsResult = {
  /** 抽出された意思決定項目 */
  decisions: DecisionItem[];
  /** 確定済みの件数 */
  confirmedCount: number;
  /** グレー（要確認）の件数 */
  grayCount: number;
};

/**
 * パラメータのJSON Schema
 */
const parametersSchema: JSONSchema = {
  type: "object",
  properties: {
    text: {
      type: "string",
      description: "意思決定を抽出する対象のテキスト（議事録など）",
    },
    fileName: {
      type: "string",
      description: "ファイル名（オプション、コンテキスト情報として使用）",
    },
  },
  required: ["text"],
};

/**
 * ツール実行関数
 */
async function execute(
  params: ExtractDecisionsParams
): Promise<ToolResult<ExtractDecisionsResult>> {
  try {
    // パラメータ検証
    if (!params.text || typeof params.text !== "string") {
      return {
        success: false,
        error: "text は必須の文字列パラメータです",
      };
    }

    // 意思決定を抽出
    const fileName = params.fileName || "unknown";
    const documentDate = new Date().toISOString().split("T")[0];
    const decisions = extractDecisionsFromText(params.text, fileName, documentDate);

    // 統計情報を計算
    const confirmedCount = decisions.filter((d) => d.status === "confirmed").length;
    const grayCount = decisions.filter((d) => d.status === "gray").length;

    return {
      success: true,
      data: {
        decisions,
        confirmedCount,
        grayCount,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "意思決定の抽出に失敗しました",
    };
  }
}

/**
 * 意思決定抽出ツール定義
 */
export const extractDecisionsTool: Tool<ExtractDecisionsParams, ExtractDecisionsResult> = {
  name: "extract_decisions",
  description:
    "議事録などのテキストから意思決定項目を抽出します。各項目は「確定」または「グレー（要確認）」のステータスで分類されます。",
  parameters: parametersSchema,
  execute,
  category: "extraction",
  requiredPermissions: ["read_document"],
};
