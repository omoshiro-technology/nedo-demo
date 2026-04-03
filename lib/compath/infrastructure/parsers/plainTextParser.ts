import type { ParsedDocument } from "../../domain/types";

export async function parsePlainText(data: Buffer): Promise<ParsedDocument> {
  const text = data.toString("utf8").trim();
  const normalized = text.replace(/\r\n/g, "\n");
  const pages = normalized.split(/\n{2,}/).map((chunk) => chunk.trim()).filter(Boolean);

  return {
    fullText: normalized,
    pages
  };
}
