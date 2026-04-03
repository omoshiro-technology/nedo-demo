"use client"
import type { DecisionRisk } from "../../types";

type RiskIndicatorProps = {
  risks?: DecisionRisk;
};

const DELAY_RISK_LABELS: Record<"high" | "medium" | "low", string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const DELAY_RISK_COLORS: Record<"high" | "medium" | "low", string> = {
  high: "#ef4444",
  medium: "#f59e0b",
  low: "#10b981",
};

export default function RiskIndicator({ risks }: RiskIndicatorProps) {
  if (!risks) {
    return null;
  }

  return (
    <div className="risk-indicator">
      <div className="risk-indicator__header">
        <span className="risk-indicator__icon">⚡</span>
        <h4 className="risk-indicator__title">リスク評価</h4>
      </div>

      <div className="risk-indicator__content">
        <div className="risk-indicator__delay">
          <span className="risk-indicator__label">遅延リスク:</span>
          <span
            className={`risk-indicator__level risk-indicator__level--${risks.delayRisk}`}
            style={{ color: DELAY_RISK_COLORS[risks.delayRisk] }}
          >
            {DELAY_RISK_LABELS[risks.delayRisk]}
          </span>
        </div>

        {risks.affectedAreas.length > 0 && (
          <div className="risk-indicator__areas">
            <span className="risk-indicator__label">影響範囲:</span>
            <div className="risk-indicator__area-tags">
              {risks.affectedAreas.map((area, i) => (
                <span key={i} className="risk-indicator__area-tag">
                  {area}
                </span>
              ))}
            </div>
          </div>
        )}

        {risks.estimatedImpact && (
          <div className="risk-indicator__impact">
            <p>{risks.estimatedImpact}</p>
          </div>
        )}
      </div>
    </div>
  );
}
