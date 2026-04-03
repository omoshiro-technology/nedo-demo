"use client"
/**
 * ドキュメントビューアーパネル
 *
 * アップロードされたドキュメントの全文を表示し、
 * 指定されたテキストをハイライト表示する
 */

import { useMemo, useEffect, useRef } from "react";

type DocumentViewerPanelProps = {
  /** 表示するドキュメントテキスト */
  content: string;
  /** ファイル名 */
  fileName?: string;
  /** ハイライトするテキスト（オプション） */
  highlightText?: string;
  /** パネルを閉じる */
  onClose: () => void;
};

/**
 * 空白を正規化する（改行、タブ、連続空白を単一スペースに）
 */
function normalizeWhitespace(text: string): string {
  return text.replace(/\s+/g, " ").trim();
}

/**
 * 部分文字列の最も長いマッチを見つける（fuzzy matching）
 * PDFからの抽出テキストでは改行位置が異なることがあるため
 */
function findBestMatch(content: string, searchText: string): { index: number; length: number } | null {
  // 検索テキストが短すぎる場合はスキップ
  if (searchText.length < 10) {
    return null;
  }

  // 1. まず完全一致を試す
  const exactIndex = content.indexOf(searchText);
  if (exactIndex !== -1) {
    return { index: exactIndex, length: searchText.length };
  }

  // 2. 空白を正規化して検索
  const normalizedContent = normalizeWhitespace(content);
  const normalizedSearch = normalizeWhitespace(searchText);

  // 正規化した検索テキストで完全一致を試す
  if (normalizedSearch.length >= 15) {
    const normalizedIndex = normalizedContent.indexOf(normalizedSearch);
    if (normalizedIndex !== -1) {
      // 元のcontentでの位置を推定（最初の単語で検索）
      const firstWords = normalizedSearch.slice(0, Math.min(40, normalizedSearch.length));
      const approxIndex = content.indexOf(firstWords);
      if (approxIndex !== -1) {
        // マッチした位置から検索テキストの長さ分をハイライト
        return { index: approxIndex, length: Math.min(searchText.length, content.length - approxIndex) };
      }
    }
  }

  // 3. 検索テキストの特徴的な部分（最初の40文字）で部分一致
  // ただし、誤マッチを防ぐため、十分に長い文字列のみ
  if (searchText.length >= 20) {
    const shortSearch = searchText.slice(0, Math.min(40, searchText.length));
    const shortIndex = content.indexOf(shortSearch);
    if (shortIndex !== -1) {
      // マッチした位置から元の検索テキストの長さ分をハイライト
      return { index: shortIndex, length: Math.min(searchText.length, content.length - shortIndex) };
    }
  }

  // 4. 改行を除去したバージョンで検索
  const searchWithoutNewlines = searchText.replace(/[\r\n]+/g, " ");
  const contentWithoutNewlines = content.replace(/[\r\n]+/g, " ");
  if (searchWithoutNewlines.length >= 20) {
    const indexWithoutNewlines = contentWithoutNewlines.indexOf(searchWithoutNewlines);
    if (indexWithoutNewlines !== -1) {
      // 元のcontentでの大体の位置を返す
      return { index: indexWithoutNewlines, length: searchWithoutNewlines.length };
    }
  }

  return null;
}

/**
 * テキスト内のハイライト対象をマークアップする
 */
function highlightContent(content: string, highlightText?: string): React.ReactNode {
  if (!highlightText || !highlightText.trim()) {
    return content;
  }

  const searchText = highlightText.trim();
  const match = findBestMatch(content, searchText);

  console.log("[DocumentViewerPanel] Highlight search:", {
    searchText: searchText.slice(0, 50),
    matchFound: !!match,
    matchIndex: match?.index,
    matchLength: match?.length,
    matchedText: match ? content.slice(match.index, match.index + Math.min(50, match.length)) : null,
  });

  if (!match) {
    return content;
  }

  const parts: React.ReactNode[] = [];

  // マッチ前のテキスト
  if (match.index > 0) {
    parts.push(content.slice(0, match.index));
  }

  // ハイライト部分
  parts.push(
    <mark key="highlight" className="document-viewer__highlight">
      {content.slice(match.index, match.index + match.length)}
    </mark>
  );

  // マッチ後のテキスト
  if (match.index + match.length < content.length) {
    parts.push(content.slice(match.index + match.length));
  }

  return parts;
}

export function DocumentViewerPanel({
  content,
  fileName,
  highlightText,
  onClose,
}: DocumentViewerPanelProps) {
  const contentRef = useRef<HTMLDivElement>(null);
  const displayContent = useMemo(
    () => highlightContent(content, highlightText),
    [content, highlightText]
  );

  // ハイライトテキストが変更されたらスクロール
  useEffect(() => {
    if (highlightText && contentRef.current) {
      const highlightElement = contentRef.current.querySelector(".document-viewer__highlight");
      if (highlightElement) {
        highlightElement.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [highlightText]);

  return (
    <div className="document-viewer">
      <div className="document-viewer__header">
        <div className="document-viewer__title">
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
          <span>{fileName || "ドキュメント"}</span>
        </div>
        <button
          type="button"
          className="document-viewer__close"
          onClick={onClose}
          aria-label="ドキュメントパネルを閉じる"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <div className="document-viewer__content" ref={contentRef}>{displayContent}</div>
    </div>
  );
}
