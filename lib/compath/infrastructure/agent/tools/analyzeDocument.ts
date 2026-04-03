/**
 * 文書分析ツール
 *
 * アップロードされた文書を分析し、構造化された情報を抽出する
 */

import type { Tool, ToolResult, JSONSchema } from "../../../domain/agent/types";
import type { AnalysisResult, DocumentInput } from "../../../domain/types";
import { analyzeDocument } from "../../../application/analyzeDocument";

/**
 * ツールパラメータ
 */
type AnalyzeDocumentParams = {
  /** 文書の内容（テキスト） */
  content: string;
  /** ファイル名 */
  fileName: string;
  /** MIMEタイプ */
  mimeType?: string;
};

/**
 * パラメータのJSON Schema
 */
const parametersSchema: JSONSchema = {
  type: "object",
  properties: {
    content: {
      type: "string",
      description: "分析する文書の内容（テキスト形式）",
    },
    fileName: {
      type: "string",
      description: "ファイル名（拡張子を含む）",
    },
    mimeType: {
      type: "string",
      description: "MIMEタイプ（オプション）",
    },
  },
  required: ["content", "fileName"],
};

/**
 * ツール実行関数
 */
async function execute(
  params: AnalyzeDocumentParams
): Promise<ToolResult<AnalysisResult>> {
  try {
    // パラメータ検証
    if (!params.content || typeof params.content !== "string") {
      return {
        success: false,
        error: "content は必須の文字列パラメータです",
      };
    }

    if (!params.fileName || typeof params.fileName !== "string") {
      return {
        success: false,
        error: "fileName は必須の文字列パラメータです",
      };
    }

    // DocumentInputの形式に変換
    const input: DocumentInput = {
      fileName: params.fileName,
      mimeType: params.mimeType || "text/plain",
      data: Buffer.from(params.content, "utf-8"),
    };

    const result = await analyzeDocument(input);

    return {
      success: true,
      data: result,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "文書分析に失敗しました",
    };
  }
}

/**
 * 文書分析ツール定義
 */
export const analyzeDocumentTool: Tool<AnalyzeDocumentParams, AnalysisResult> = {
  name: "analyze_document",
  description:
    "アップロードされた文書（報告書、議事録など）を分析し、文書タイプの判定、要約、構造化軸の提案、ナレッジグラフの生成を行います。",
  parameters: parametersSchema,
  execute,
  category: "analysis",
  requiredPermissions: ["read_document"],
};
