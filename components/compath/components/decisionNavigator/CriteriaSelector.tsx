"use client"
/**
 * 判断軸セレクター
 * - 回答完了後に「次にどの観点を検討する？」を表示
 * - 未完了の判断軸をリスト表示し、AI推奨順をヒント表示
 */

import type { CriteriaLabel, ColumnState } from "../../types/decisionNavigator";

type CriteriaSelectorProps = {
  criteriaLabels: CriteriaLabel[];
  columnStates: ColumnState[];
  onSelect: (criteriaId: string) => void;
};

export function CriteriaSelector({
  criteriaLabels,
  columnStates,
  onSelect,
}: CriteriaSelectorProps) {
  // 未完了（completed以外）の判断軸を抽出
  const uncompletedCriteria = criteriaLabels
    .map((cl, i) => ({ ...cl, state: columnStates[i] ?? "locked", index: i }))
    .filter((c) => c.state !== "completed");

  // order フィールドでソート（AI推奨順）
  const sorted = [...uncompletedCriteria].sort((a, b) => a.order - b.order);

  if (sorted.length === 0) return null;

  return (
    <div className="criteria-selector">
      <h4 className="criteria-selector__title">次にどの観点を検討する？</h4>
      <div className="criteria-selector__list">
        {sorted.map((criteria, idx) => (
          <button
            key={criteria.id}
            type="button"
            className={`criteria-selector__item${criteria.state === "active" ? " criteria-selector__item--active" : ""}`}
            onClick={() => onSelect(criteria.id)}
          >
            <span className="criteria-selector__question">{criteria.question}</span>
            {idx === 0 && (
              <span className="criteria-selector__hint">AI推奨</span>
            )}
            {criteria.orderReason && (
              <span className="criteria-selector__reason">{criteria.orderReason}</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
