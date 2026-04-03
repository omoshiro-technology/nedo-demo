"use client"
/**
 * サンプルデータ確認カード
 *
 * サンプルデータを分析するか確認するカード
 */

import type { SampleDataConfirmation } from "../../types/chat";

type SampleDataConfirmationCardProps = {
  confirmation: SampleDataConfirmation;
  onConfirm: () => void;
  onDismiss: () => void;
};

export function SampleDataConfirmationCard({
  confirmation,
  onConfirm,
  onDismiss,
}: SampleDataConfirmationCardProps) {
  const icon = confirmation.sampleDataId === "meeting_minutes" ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );

  return (
    <div className="sample-confirm-card">
      <div className="sample-confirm-card__header">
        <div className="sample-confirm-card__icon">{icon}</div>
        <div className="sample-confirm-card__title">
          {confirmation.label}を分析しますか？
        </div>
      </div>

      <div className="sample-confirm-card__content">
        <p className="sample-confirm-card__description">
          {confirmation.description}
        </p>
      </div>

      <div className="sample-confirm-card__actions">
        <button
          type="button"
          className="sample-confirm-card__btn sample-confirm-card__btn--primary"
          onClick={onConfirm}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          はい、分析する
        </button>
        <button
          type="button"
          className="sample-confirm-card__btn sample-confirm-card__btn--secondary"
          onClick={onDismiss}
        >
          キャンセル
        </button>
      </div>
    </div>
  );
}
