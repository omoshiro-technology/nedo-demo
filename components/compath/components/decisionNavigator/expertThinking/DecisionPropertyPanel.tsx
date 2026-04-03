"use client"
/**
 * DecisionPropertyPanel
 *
 * 熟達者の「思考の型」を表示するパネル
 * - ルール（IF/Else）の可視化
 * - 条件（Where）の表示
 * - 重要度（Weight）の表示
 * - 理由（Why）の表示
 * - 観点（View）のチェックリスト
 */

import type { DecisionProperty, DecisionViewpoint } from "../../../types/decisionNavigator";
import { RuleVisualizer } from "./RuleVisualizer";
import { ViewpointChecker } from "./ViewpointChecker";

type DecisionPropertyPanelProps = {
  property: DecisionProperty | undefined;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

/** 重み付け根拠のラベル */
const WEIGHT_BASIS_LABELS: Record<string, string> = {
  regulation: "規制・法令",
  safety: "安全性",
  cost: "コスト",
  experience: "経験則",
  preference: "優先事項",
  risk: "リスク管理",
};

/** 根拠ソースのラベル */
const RATIONALE_SOURCE_LABELS: Record<string, string> = {
  regulation: "規制・基準",
  standard: "業界標準",
  experience: "過去の経験",
  analysis: "分析結果",
  intuition: "直感・勘",
  past_case: "過去事例",
};

/** プロパティソースのラベル */
const PROPERTY_SOURCE_LABELS: Record<string, string> = {
  expert_input: "エキスパート入力",
  llm_inference: "AI推論",
  past_case: "過去事例",
  user_experience: "ユーザー経験",
};

export function DecisionPropertyPanel({
  property,
  isExpanded = true,
  onToggleExpand,
}: DecisionPropertyPanelProps) {
  if (!property) {
    return null;
  }

  const overlookedViewpoints = property.viewpoints.filter((v) => v.isOftenOverlooked);
  const hasOverlookedWarnings = overlookedViewpoints.length > 0;

  return (
    <div className="dp-panel">
      {/* ヘッダー */}
      <div className="dp-panel__header" onClick={onToggleExpand}>
        <div className="dp-panel__header-left">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2zm0 18a8 8 0 1 1 8-8 8 8 0 0 1-8 8z" />
            <path d="M12 6v6l4 2" />
          </svg>
          <h4 className="dp-panel__title">判断プロパティ</h4>
          {hasOverlookedWarnings && (
            <span className="dp-panel__warning-badge">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
              {overlookedViewpoints.length}
            </span>
          )}
        </div>
        <div className="dp-panel__header-right">
          <span className="dp-panel__source-badge">
            {PROPERTY_SOURCE_LABELS[property.source] || property.source}
          </span>
          <span className="dp-panel__confidence">
            確信度: {property.confidence}%
          </span>
          {onToggleExpand && (
            <svg
              className={`dp-panel__expand-icon ${isExpanded ? "dp-panel__expand-icon--expanded" : ""}`}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="dp-panel__content">
          {/* ルール（IF/Else） */}
          <section className="dp-panel__section">
            <h5 className="dp-panel__section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 3h5v5M21 3l-7 7M8 21H3v-5M3 21l7-7" />
              </svg>
              ルール（IF/THEN）
            </h5>
            <RuleVisualizer rule={property.rule} />
          </section>

          {/* 条件（Where） */}
          {property.conditions.length > 0 && (
            <section className="dp-panel__section">
              <h5 className="dp-panel__section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 8v4l2 2" />
                </svg>
                適用条件（Where）
              </h5>
              <ul className="dp-panel__conditions">
                {property.conditions.map((condition, index) => (
                  <li key={index} className="dp-panel__condition">
                    <div className="dp-panel__condition-header">
                      <span className={`dp-panel__condition-scope dp-panel__condition-scope--${condition.scope}`}>
                        {condition.scope === "always" ? "常時" : condition.scope === "situational" ? "状況依存" : "例外"}
                      </span>
                      <span className={`dp-panel__condition-certainty dp-panel__condition-certainty--${condition.certainty}`}>
                        {condition.certainty === "verified" ? "検証済" : condition.certainty === "assumed" ? "想定" : "不確実"}
                      </span>
                    </div>
                    <p className="dp-panel__condition-text">{condition.description}</p>
                    {condition.exceptions && condition.exceptions.length > 0 && (
                      <div className="dp-panel__condition-exceptions">
                        <span>例外: </span>
                        {condition.exceptions.join(", ")}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* 重要度（Weight） */}
          <section className="dp-panel__section">
            <h5 className="dp-panel__section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 2v20M2 12h20" />
              </svg>
              重要度（Weight）
            </h5>
            <div className="dp-panel__weight">
              <div className="dp-panel__weight-score">
                <div
                  className="dp-panel__weight-bar"
                  style={{ width: `${property.weight.score}%` }}
                />
                <span className="dp-panel__weight-value">{property.weight.score}</span>
              </div>
              <div className="dp-panel__weight-info">
                <span className="dp-panel__weight-basis">
                  {WEIGHT_BASIS_LABELS[property.weight.basis] || property.weight.basis}
                </span>
                <p className="dp-panel__weight-rationale">{property.weight.rationale}</p>
              </div>
            </div>
          </section>

          {/* 理由（Why） */}
          <section className="dp-panel__section">
            <h5 className="dp-panel__section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                <path d="M12 17h.01" />
              </svg>
              理由（Why）
            </h5>
            <div className="dp-panel__rationale">
              <p className="dp-panel__rationale-primary">{property.rationale.primary}</p>
              {property.rationale.secondary && property.rationale.secondary.length > 0 && (
                <ul className="dp-panel__rationale-secondary">
                  {property.rationale.secondary.map((reason, index) => (
                    <li key={index}>{reason}</li>
                  ))}
                </ul>
              )}
              <div className="dp-panel__rationale-meta">
                <span className="dp-panel__rationale-source">
                  {RATIONALE_SOURCE_LABELS[property.rationale.source] || property.rationale.source}
                </span>
                {property.rationale.reference && (
                  <span className="dp-panel__rationale-reference">
                    参照: {property.rationale.reference}
                  </span>
                )}
              </div>
              {property.rationale.pastExperience && (
                <div className="dp-panel__past-experience">
                  <span className={`dp-panel__experience-outcome dp-panel__experience-outcome--${property.rationale.pastExperience.outcome}`}>
                    {property.rationale.pastExperience.outcome === "success" ? "成功事例" : property.rationale.pastExperience.outcome === "failure" ? "失敗事例" : "混合"}
                  </span>
                  <p>{property.rationale.pastExperience.description}</p>
                  <p className="dp-panel__experience-lesson">
                    <strong>教訓:</strong> {property.rationale.pastExperience.lesson}
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 観点（View） */}
          {property.viewpoints.length > 0 && (
            <section className="dp-panel__section">
              <h5 className="dp-panel__section-title">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
                観点（View）
                {hasOverlookedWarnings && (
                  <span className="dp-panel__section-warning">
                    見落とし注意 {overlookedViewpoints.length}件
                  </span>
                )}
              </h5>
              <ViewpointChecker viewpoints={property.viewpoints} />
            </section>
          )}
        </div>
      )}
    </div>
  );
}
