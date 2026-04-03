"use client"
/**
 * PreconditionSummary - 前提条件サマリー
 *
 * フローチャート上部に表示され、設定された前提条件を一覧表示する。
 * クリックで前提条件編集モーダルを開く。
 */

import type { ExtractedPrecondition } from "./PreconditionModal";

type PreconditionSummaryProps = {
  preconditions: ExtractedPrecondition[];
  additionalContext?: string;
  onEdit: () => void;
};

export function PreconditionSummary({
  preconditions,
  additionalContext,
  onEdit,
}: PreconditionSummaryProps) {
  // 有効な条件（選択済みまたは詳細入力あり）をフィルタ
  const activeConditions = preconditions.filter(
    (p) => p.isSelected || p.detail?.trim()
  );

  // 表示する条件がない場合は非表示
  if (activeConditions.length === 0 && !additionalContext?.trim()) {
    return null;
  }

  // 最大3つまで表示し、残りは「+N件」で表示
  const displayItems = activeConditions.slice(0, 3);
  const remainingCount = activeConditions.length - 3;

  return (
    <div className="precondition-summary" onClick={onEdit}>
      <span className="precondition-summary__icon">📋</span>
      <span className="precondition-summary__label">前提条件:</span>
      <div className="precondition-summary__items">
        {displayItems.map((item) => (
          <span key={item.id} className="precondition-summary__item">
            {item.label}
            {item.detail && `: ${item.detail}`}
          </span>
        ))}
        {remainingCount > 0 && (
          <span className="precondition-summary__more">
            +{remainingCount}件
          </span>
        )}
        {additionalContext?.trim() && displayItems.length === 0 && (
          <span className="precondition-summary__item">
            補足: {additionalContext.slice(0, 30)}
            {additionalContext.length > 30 ? "..." : ""}
          </span>
        )}
      </div>
      <button
        type="button"
        className="precondition-summary__edit"
        onClick={(e) => {
          e.stopPropagation();
          onEdit();
        }}
        aria-label="前提条件を編集"
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      </button>
    </div>
  );
}
