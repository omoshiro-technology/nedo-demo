import path from "node:path";
import type { DocumentInput, ParsedDocument } from "../../domain/types";
import { parsePdf } from "./pdfParser";
import { parseOfficeStub } from "./officeStubParser";
import { parsePlainText } from "./plainTextParser";

type ParseResult = {
  parsed: ParsedDocument;
  warnings: string[];
};

const OFFICE_EXTENSIONS = [".docx", ".xlsx", ".pptx"];
const OFFICE_MIME_PREFIX = "application/vnd.openxmlformats-officedocument";
const TEXT_MIME_TYPES = ["text/plain", "text/markdown", "text/csv"];
const TEXT_EXTENSIONS = [".txt", ".md", ".csv"];

export async function parseDocument(input: DocumentInput): Promise<ParseResult> {
  const warnings: string[] = [];
  const fileName = input.fileName.toLowerCase();
  const ext = path.extname(fileName);

  if (input.mimeType === "application/pdf" || ext === ".pdf") {
    return { parsed: await parsePdf(input.data), warnings };
  }

  if (OFFICE_EXTENSIONS.includes(ext) || input.mimeType.startsWith(OFFICE_MIME_PREFIX)) {
    warnings.push("Office形式は解析準備中です。");
    return { parsed: await parseOfficeStub(), warnings };
  }

  if (TEXT_EXTENSIONS.includes(ext) || TEXT_MIME_TYPES.includes(input.mimeType)) {
    return { parsed: await parsePlainText(input.data), warnings };
  }

  warnings.push("未対応のファイル形式です。");
  return {
    parsed: {
      fullText: "",
      pages: []
    },
    warnings
  };
}
