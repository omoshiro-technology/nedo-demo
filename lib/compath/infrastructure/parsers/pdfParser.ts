// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdfParse = require("pdf-parse");
import type { ParsedDocument } from "../../domain/types";

/**
 * PDFテキストアイテムから改行を検出してテキストを結合
 * Y座標の変化を検出して改行を挿入
 */
function extractTextWithLineBreaks(items: any[]): string {
  if (items.length === 0) return "";

  const lines: string[] = [];
  let currentLine = "";
  let lastY: number | null = null;
  const LINE_HEIGHT_THRESHOLD = 5; // Y座標がこれ以上変化したら改行とみなす

  for (const item of items) {
    const text = item.str || "";
    if (!text) continue;

    // transform[5] がY座標（PDFは左下原点なので、Y座標が小さくなると下の行）
    const currentY = item.transform ? item.transform[5] : null;

    if (lastY !== null && currentY !== null) {
      const yDiff = Math.abs(lastY - currentY);
      if (yDiff > LINE_HEIGHT_THRESHOLD) {
        // 改行を検出
        if (currentLine.trim()) {
          lines.push(currentLine.trim());
        }
        currentLine = text;
      } else {
        // 同じ行
        currentLine += text;
      }
    } else {
      currentLine += text;
    }

    lastY = currentY;
  }

  // 最後の行を追加
  if (currentLine.trim()) {
    lines.push(currentLine.trim());
  }

  return lines.join("\n");
}

export async function parsePdf(buffer: Buffer): Promise<ParsedDocument> {
  const pages: string[] = [];

  const options = {
    pagerender: async (pageData: any) => {
      const textContent = await pageData.getTextContent();
      const pageText = extractTextWithLineBreaks(textContent.items);
      pages.push(pageText);
      return pageText;
    }
  };

  const result = await pdfParse(buffer, options);

  // result.textはデフォルトの抽出結果だが、改行が失われることがあるので
  // pagesから再構築する
  const fullText = pages.length > 0
    ? pages.join("\n\n--- ページ区切り ---\n\n")
    : (result.text?.trim() ?? "");

  return { fullText, pages };
}
