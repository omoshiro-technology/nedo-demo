"use client"
import type { DecisionGuidance, SimilarDecision, DecisionPatternType } from "../../types";

type GuidancePanelProps = {
  guidance?: DecisionGuidance;
  similarDecisions?: SimilarDecision[];
};

const PATTERN_LABELS: Record<DecisionPatternType, string> = {
  agreement: "合意",
  decision: "決定",
  change: "変更",
  adoption: "採用",
  cancellation: "中止",
  other: "その他",
};

export default function GuidancePanel({
  guidance,
  similarDecisions,
}: GuidancePanelProps) {
  if (!guidance && (!similarDecisions || similarDecisions.length === 0)) {
    return null;
  }

  return (
    <div className="guidance-panel">
      {guidance && (
        <>
          {guidance.missingInfo.length > 0 && (
            <div className="guidance-panel__section">
              <h4 className="guidance-panel__title">
                <span className="guidance-panel__icon">📋</span>
                不足している情報
              </h4>
              <ul className="guidance-panel__list">
                {guidance.missingInfo.map((info, i) => (
                  <li key={i}>{info}</li>
                ))}
              </ul>
            </div>
          )}

          {guidance.requiredActions.length > 0 && (
            <div className="guidance-panel__section">
              <h4 className="guidance-panel__title">
                <span className="guidance-panel__icon">✅</span>
                確定するために必要なこと
              </h4>
              <ul className="guidance-panel__list guidance-panel__list--actions">
                {guidance.requiredActions.map((action, i) => (
                  <li key={i}>
                    <label className="guidance-panel__checkbox">
                      <input type="checkbox" />
                      <span>{action}</span>
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {guidance.suggestedQuestions.length > 0 && (
            <div className="guidance-panel__section">
              <h4 className="guidance-panel__title">
                <span className="guidance-panel__icon">❓</span>
                確認すべき質問
              </h4>
              <ul className="guidance-panel__list guidance-panel__list--questions">
                {guidance.suggestedQuestions.map((question, i) => (
                  <li key={i}>{question}</li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      {similarDecisions && similarDecisions.length > 0 && (
        <div className="guidance-panel__section">
          <h4 className="guidance-panel__title">
            <span className="guidance-panel__icon">📚</span>
            類似事例
          </h4>
          <div className="guidance-panel__similar">
            {similarDecisions.map((similar, i) => (
              <div key={i} className="guidance-panel__similar-item">
                <div className="guidance-panel__similar-header">
                  <span className={`guidance-panel__similar-tag guidance-panel__similar-tag--${similar.status}`}>
                    {similar.status === "confirmed" ? "確定" : "要確認"}
                  </span>
                  <span className="guidance-panel__similar-score">
                    類似度: {similar.similarity}%
                  </span>
                </div>
                <p className="guidance-panel__similar-content">
                  「{similar.content}」
                </p>
                <div className="guidance-panel__similar-meta">
                  <span>{PATTERN_LABELS[similar.patternType]}</span>
                  <span>{similar.sourceFileName}</span>
                  <span>{formatDate(similar.decisionDate)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function formatDate(isoString: string): string {
  return new Date(isoString).toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
