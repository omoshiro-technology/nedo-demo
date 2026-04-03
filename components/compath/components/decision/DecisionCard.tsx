"use client"
import type { DecisionItem, DecisionPatternType, DecisionStatus, ImportanceInfo, ImportanceCategory, ProjectPhase } from "../../types";

type DecisionCardProps = {
  decision: DecisionItem;
  isSelected: boolean;
  onClick: () => void;
};

const PATTERN_LABELS: Record<DecisionPatternType, string> = {
  agreement: "合意",
  decision: "決定",
  change: "変更",
  adoption: "採用",
  cancellation: "中止",
  other: "その他",
};

const PATTERN_TOOLTIPS: Record<DecisionPatternType, string> = {
  decision: "「〜とする」「〜に決定」などの表現",
  agreement: "「〜で合意」「〜に了承」などの表現",
  change: "「〜に変更」「〜を修正」などの表現",
  adoption: "「〜を採用」「〜を導入」などの表現",
  cancellation: "「〜を中止」「〜を取りやめ」などの表現",
  other: "その他の意思決定表現",
};

const STATUS_LABELS: Record<DecisionStatus, string> = {
  confirmed: "確定",
  gray: "要確認",
  proposed: "未確定",
};

const STATUS_TOOLTIPS: Record<DecisionStatus, string> = {
  confirmed: "明確に決定された事項（スコア70以上）",
  gray: "条件付きや曖昧な表現を含む（スコア40-69）。詳細の確認が必要です",
  proposed: "確実性が低い事項（スコア40未満）。決定内容の検証が必要です",
};

const PRIORITY_LABELS: Record<ImportanceInfo["level"], string> = {
  critical: "即対応",
  high: "要確認",
  medium: "",
  low: "",
};

const CATEGORY_LABELS: Record<ImportanceCategory, string> = {
  budget: "予算",
  schedule: "工期",
  spec: "仕様",
  quality: "品質",
  safety: "安全",
  contract: "契約",
  organization: "体制",
  other: "その他",
};

const PHASE_SHORT_LABELS: Record<ProjectPhase, string> = {
  planning: "企画",
  basic_design: "基本設計",
  detailed_design: "詳細設計",
  procurement: "調達",
  construction: "施工",
  testing: "検査",
  handover: "引渡",
  unknown: "",
};

const CHANGE_TYPE_SHORT: Record<string, string> = {
  specification: "仕様変更",
  schedule: "日程変更",
  budget: "予算変更",
  scope: "スコープ変更",
  other: "変更",
};

export default function DecisionCard({
  decision,
  isSelected,
  onClick,
}: DecisionCardProps) {
  const importance = decision.importance;
  const phaseInfo = decision.phaseInfo;
  const changeDetail = decision.changeDetail;

  // 重要な情報があるか
  const isHighImportance = importance && (importance.level === "critical" || importance.level === "high");
  const hasDelayWarning = phaseInfo?.isDelayed;
  const hasChange = changeDetail && decision.patternType === "change";

  return (
    <button
      type="button"
      className={`decision-card decision-card--${decision.status} ${isSelected ? "is-selected" : ""} ${hasDelayWarning ? "decision-card--has-warning" : ""}`}
      onClick={onClick}
    >
      {/* ヘッダー: ステータスと重要バッジ */}
      <div className="decision-card__header">
        <div className="decision-card__badges">
          <span
            className={`decision-card__status-badge decision-card__status-badge--${decision.status}`}
            title={STATUS_TOOLTIPS[decision.status]}
          >
            {STATUS_LABELS[decision.status]}
          </span>
          <span
            className={`decision-card__tag decision-card__tag--${decision.patternType}`}
            title={PATTERN_TOOLTIPS[decision.patternType]}
          >
            {PATTERN_LABELS[decision.patternType]}
          </span>
        </div>
        {isHighImportance && (
          <span className={`decision-card__importance-badge decision-card__importance-badge--${importance.level}`}>
            {PRIORITY_LABELS[importance.level]}
            {importance.categories.length > 0 && (
              <span className="decision-card__importance-categories">
                : {importance.categories.slice(0, 2).map(c => CATEGORY_LABELS[c]).join("・")}
              </span>
            )}
          </span>
        )}
      </div>

      {/* メイン: 決定内容 */}
      <div className="decision-card__content">{decision.content}</div>

      {/* 分析サマリー: 一目でわかる情報 */}
      {(hasDelayWarning || hasChange || (phaseInfo && phaseInfo.estimatedPhase !== "unknown")) && (
        <div className="decision-card__summary">
          {phaseInfo && phaseInfo.estimatedPhase !== "unknown" && (
            <span className="decision-card__phase-tag">
              {PHASE_SHORT_LABELS[phaseInfo.estimatedPhase]}
            </span>
          )}
          {hasChange && (
            <span className={`decision-card__change-tag decision-card__change-tag--${changeDetail.impactLevel}`}>
              {CHANGE_TYPE_SHORT[changeDetail.changeType] || "変更"}
            </span>
          )}
          {hasDelayWarning && (
            <span className="decision-card__delay-tag">
              ⏰ 遅延注意
            </span>
          )}
        </div>
      )}

      {/* 影響範囲サマリー（critical/highかつrisksがある場合のみ） */}
      {isHighImportance && decision.risks?.affectedAreas && decision.risks.affectedAreas.length > 0 && (
        <div className="decision-card__impact-summary">
          <span className="decision-card__impact-label">影響:</span>
          {decision.risks.affectedAreas.slice(0, 2).map((area, i) => (
            <span key={i} className="decision-card__impact-tag">{area}</span>
          ))}
          {decision.risks.affectedAreas.length > 2 && (
            <span className="decision-card__impact-more">+{decision.risks.affectedAreas.length - 2}</span>
          )}
        </div>
      )}
    </button>
  );
}
