"use client"
/**
 * RelatedDocumentCard - RAG検索結果の関連ドキュメント表示カード
 *
 * Phase 20: 手順書・解説書ボタン追加（RAG連携）
 * - 目的入力時にRAG検索で見つかった関連ドキュメントを表示
 * - 「詳細を見る」クリックで別タブに詳細を表示
 */

import { memo } from "react";

export type RelatedDocument = {
  id: string;
  title: string;
  summary: string;
  category?: string;
  url?: string;
};

type RelatedDocumentCardProps = {
  documents: RelatedDocument[];
  onViewDetail?: (docId: string) => void;
};

function RelatedDocumentCardComponent({
  documents,
  onViewDetail,
}: RelatedDocumentCardProps) {
  if (documents.length === 0) {
    return null;
  }

  const handleViewDetail = (doc: RelatedDocument) => {
    if (doc.url) {
      window.open(doc.url, "_blank");
    } else if (onViewDetail) {
      onViewDetail(doc.id);
    } else {
      // デフォルト: /documents/:id を別タブで開く
      window.open(`/documents/${doc.id}`, "_blank");
    }
  };

  return (
    <div className="related-docs">
      <div className="related-docs__header">
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
        </svg>
        <span>関連する手順書・解説書があります</span>
      </div>
      <div className="related-docs__list">
        {documents.map((doc) => (
          <div key={doc.id} className="related-docs__item">
            <div className="related-docs__item-header">
              <span className="related-docs__item-icon">📖</span>
              <span className="related-docs__item-title">{doc.title}</span>
              {doc.category && (
                <span className="related-docs__item-category">{doc.category}</span>
              )}
            </div>
            <p className="related-docs__item-summary">{doc.summary}</p>
            <button
              type="button"
              className="related-docs__item-action"
              onClick={() => handleViewDetail(doc)}
            >
              詳細を見る
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export const RelatedDocumentCard = memo(RelatedDocumentCardComponent);
