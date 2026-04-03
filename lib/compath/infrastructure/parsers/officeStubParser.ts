import type { ParsedDocument } from "../../domain/types";

export async function parseOfficeStub(): Promise<ParsedDocument> {
  return {
    fullText: "",
    pages: []
  };
}
