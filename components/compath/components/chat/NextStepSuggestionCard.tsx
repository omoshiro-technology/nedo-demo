"use client"
import type { NextStepSuggestion } from "../../types/chat";

type NextStepSuggestionCardProps = {
  suggestion: NextStepSuggestion;
  onAccept: () => void;
  onSkip: () => void;
};

/**
 * Phase 12: 次のステップ提案カード
 * 分析完了後に自然な連携を提案するUIコンポーネント
 */
export default function NextStepSuggestionCard({
  suggestion,
  onAccept,
  onSkip,
}: NextStepSuggestionCardProps) {
  // 提案タイプに応じたアイコンを取得
  const getIcon = () => {
    switch (suggestion.type) {
      case "decision_navigator":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
          </svg>
        );
      case "learn_from_past":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
        );
      case "deeper_analysis":
        return (
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        );
    }
  };

  // 提案タイプに応じたボタンラベルを取得
  const getAcceptLabel = () => {
    switch (suggestion.type) {
      case "decision_navigator":
        return "意思決定ナビで整理する";
      case "learn_from_past":
        return "過去事例を検索する";
      case "deeper_analysis":
        return "詳細分析を実行する";
    }
  };

  return (
    <div className="next-step-suggestion-card">
      <div className="next-step-suggestion-card__header">
        <div className="next-step-suggestion-card__icon">{getIcon()}</div>
        <div className="next-step-suggestion-card__title-area">
          <span className="next-step-suggestion-card__badge">次のステップをご提案</span>
          <h4 className="next-step-suggestion-card__title">{suggestion.title}</h4>
        </div>
      </div>

      <p className="next-step-suggestion-card__description">{suggestion.description}</p>

      {suggestion.connectionToResult && (
        <div className="next-step-suggestion-card__connection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          <span>{suggestion.connectionToResult}</span>
        </div>
      )}

      <div className="next-step-suggestion-card__actions">
        <button
          type="button"
          className="next-step-suggestion-card__btn next-step-suggestion-card__btn--primary"
          onClick={onAccept}
        >
          {getAcceptLabel()}
        </button>
        <button
          type="button"
          className="next-step-suggestion-card__btn next-step-suggestion-card__btn--secondary"
          onClick={onSkip}
        >
          スキップ
        </button>
      </div>
    </div>
  );
}
