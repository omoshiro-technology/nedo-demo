"use client"
import type { DecisionFilter, DecisionStatus, DecisionPatternType } from "../../types";

type DecisionFilterProps = {
  filter: DecisionFilter;
  onChange: (filter: DecisionFilter) => void;
  counts: {
    confirmed: number;
    gray: number;
    proposed: number;
    total: number;
  };
  filteredCount: number;
};

const STATUS_OPTIONS: Array<{ value: DecisionStatus; label: string; tooltip: string }> = [
  { value: "confirmed", label: "確定", tooltip: "明確に決定された事項（スコア70以上）" },
  { value: "gray", label: "要確認", tooltip: "条件付きや曖昧な表現を含む（スコア40-69）。詳細の確認が必要です" },
  { value: "proposed", label: "未確定", tooltip: "確実性が低い事項（スコア40未満）。決定内容の検証が必要です" },
];

const PATTERN_OPTIONS: Array<{ value: DecisionPatternType; label: string; tooltip: string }> = [
  { value: "decision", label: "決定", tooltip: "「〜とする」「〜に決定」などの表現" },
  { value: "agreement", label: "合意", tooltip: "「〜で合意」「〜に了承」などの表現" },
  { value: "change", label: "変更", tooltip: "「〜に変更」「〜を修正」などの表現" },
  { value: "adoption", label: "採用", tooltip: "「〜を採用」「〜を導入」などの表現" },
  { value: "cancellation", label: "中止", tooltip: "「〜を中止」「〜を取りやめ」などの表現" },
];

export default function DecisionFilterComponent({
  filter,
  onChange,
  counts,
  filteredCount,
}: DecisionFilterProps) {
  const handleStatusToggle = (status: DecisionStatus) => {
    const currentStatus = filter.status || [];
    const newStatus = currentStatus.includes(status)
      ? currentStatus.filter((s) => s !== status)
      : [...currentStatus, status];
    onChange({ ...filter, status: newStatus.length > 0 ? newStatus : undefined });
  };

  const handlePatternToggle = (pattern: DecisionPatternType) => {
    const currentPatterns = filter.patternTypes || [];
    const newPatterns = currentPatterns.includes(pattern)
      ? currentPatterns.filter((p) => p !== pattern)
      : [...currentPatterns, pattern];
    onChange({
      ...filter,
      patternTypes: newPatterns.length > 0 ? newPatterns : undefined,
    });
  };

  const handleScoreChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    onChange({
      ...filter,
      minQualityScore: value ? parseInt(value, 10) : undefined,
    });
  };

  const isStatusActive = (status: DecisionStatus) => {
    return !filter.status || filter.status.includes(status);
  };

  const isPatternActive = (pattern: DecisionPatternType) => {
    return !filter.patternTypes || filter.patternTypes.includes(pattern);
  };

  return (
    <div className="decision-filter">
      <div className="decision-filter__section">
        <span className="decision-filter__label">ステータス:</span>
        <div className="decision-filter__buttons">
          {STATUS_OPTIONS.map(({ value, label, tooltip }) => (
            <button
              key={value}
              type="button"
              className={`decision-filter__btn decision-filter__btn--${value} ${
                isStatusActive(value) ? "is-active" : ""
              }`}
              onClick={() => handleStatusToggle(value)}
              title={tooltip}
            >
              {label}
              <span className="decision-filter__count">
                {value === "confirmed"
                  ? counts.confirmed
                  : value === "gray"
                    ? counts.gray
                    : counts.proposed}
              </span>
            </button>
          ))}
        </div>
      </div>

      <div className="decision-filter__section">
        <span className="decision-filter__label">種別:</span>
        <div className="decision-filter__buttons">
          {PATTERN_OPTIONS.map(({ value, label, tooltip }) => (
            <button
              key={value}
              type="button"
              className={`decision-filter__btn decision-filter__btn--pattern ${
                isPatternActive(value) ? "is-active" : ""
              }`}
              onClick={() => handlePatternToggle(value)}
              title={tooltip}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="decision-filter__section decision-filter__section--end">
        <span className="decision-filter__label">確度:</span>
        <select
          className="decision-filter__select"
          value={filter.minQualityScore || ""}
          onChange={handleScoreChange}
          title="決定の確実さでフィルタリング。高いほど明確で確定的な決定です"
        >
          <option value="">すべて</option>
          <option value="70">高（確定的）</option>
          <option value="40">中以上</option>
        </select>
        <span className="decision-filter__total">
          表示: {filteredCount}/{counts.total}件
        </span>
      </div>
    </div>
  );
}
