"use client"
/**
 * 意思決定ナビゲーター提案カード
 *
 * チャットの中でAIが意思決定支援が必要と判断した場合に表示される
 * ユーザーは「起動する」をクリックして意思決定ナビを開くことができる
 */

import type { DecisionNavigatorSuggestion } from "../../types/chat";

type DecisionNavigatorSuggestionCardProps = {
  suggestion: DecisionNavigatorSuggestion;
  onLaunch: () => void;
  onDismiss: () => void;
};

export function DecisionNavigatorSuggestionCard({
  suggestion,
  onLaunch,
  onDismiss,
}: DecisionNavigatorSuggestionCardProps) {
  return (
    <div className="dn-suggestion-card">
      <div className="dn-suggestion-card__header">
        <svg
          className="dn-suggestion-card__icon"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="dn-suggestion-card__title">
          意思決定ナビで整理しますか？
        </span>
      </div>

      <div className="dn-suggestion-card__content">
        <div className="dn-suggestion-card__purpose">
          <span className="dn-suggestion-card__label">目的:</span>
          <span>{suggestion.purpose}</span>
        </div>

        {suggestion.triggerReason && (
          <p className="dn-suggestion-card__reason">{suggestion.triggerReason}</p>
        )}
      </div>

      <div className="dn-suggestion-card__actions">
        <button
          type="button"
          className="dn-suggestion-card__btn dn-suggestion-card__btn--primary"
          onClick={onLaunch}
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 3h18v18H3z" />
            <path d="M9 3v18" />
            <path d="M14 9l3 3-3 3" />
          </svg>
          起動する
        </button>
        <button
          type="button"
          className="dn-suggestion-card__btn dn-suggestion-card__btn--secondary"
          onClick={onDismiss}
        >
          今回はスキップ
        </button>
      </div>
    </div>
  );
}
