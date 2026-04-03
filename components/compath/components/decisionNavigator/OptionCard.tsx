"use client"
/**
 * 選択肢カード
 * - QuestionPanel内で各選択肢を表示するカード
 * - ActionNodeのスタイルを参考にした通常div版
 */

import type { DecisionFlowNode } from "../../types/decisionNavigator";

type OptionCardProps = {
  node: DecisionFlowNode;
  isSelected: boolean;
  onClick: () => void;
};

const RISK_STRATEGY_LABELS: Record<string, string> = {
  avoid: "リスク回避",
  mitigate: "リスク軽減",
  transfer: "リスク転嫁",
  accept: "リスク受容",
};

export function OptionCard({ node, isSelected, onClick }: OptionCardProps) {
  const hasRecommended = node.isRecommended;
  const riskLabel = node.riskStrategy ? RISK_STRATEGY_LABELS[node.riskStrategy] : null;

  return (
    <button
      type="button"
      className={`option-card${isSelected ? " option-card--selected" : ""}${hasRecommended ? " option-card--recommended" : ""}`}
      onClick={onClick}
    >
      <div className="option-card__header">
        <span className="option-card__label">{node.label}</span>
        {hasRecommended && !isSelected && (
          <span className="option-card__badge option-card__badge--recommended">おすすめ</span>
        )}
        {isSelected && (
          <span className="option-card__badge option-card__badge--selected">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </span>
        )}
      </div>

      {node.description && (
        <p className="option-card__description">{node.description}</p>
      )}

      <div className="option-card__tags">
        {riskLabel && (
          <span className={`option-card__tag option-card__tag--risk-${node.riskStrategy}`}>
            {riskLabel}
          </span>
        )}
        {node.pastCaseCount != null && node.pastCaseCount > 0 && (
          <span className="option-card__tag option-card__tag--past-case">
            過去{node.pastCaseCount}件
          </span>
        )}
        {node.isFromKnowledgeBase && (
          <span className="option-card__tag option-card__tag--kb">汎知化</span>
        )}
      </div>

      {node.veteranInsight && (
        <p className="option-card__insight">
          <span className="option-card__insight-icon">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2a7 7 0 0 1 7 7c0 3-2 5.5-4 7l-1 4H10l-1-4c-2-1.5-4-4-4-7a7 7 0 0 1 7-7z" />
              <line x1="10" y1="22" x2="14" y2="22" />
            </svg>
          </span>
          {node.veteranInsight.length > 60
            ? `${node.veteranInsight.slice(0, 60)}...`
            : node.veteranInsight}
        </p>
      )}
    </button>
  );
}
