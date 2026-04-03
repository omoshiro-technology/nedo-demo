"use client"
/**
 * StrategyGoalCompass - 判断軸完了カウンター + 4軸横棒グラフ
 *
 * 「あとどれだけ選べばいいか」を直感的に表現:
 * - 大きなカウンター: 残りN問（完了でゴール！）
 * - プログレスバー: 全体進捗
 * - 4軸横棒: 明確さ / リスク対応 / 行動準備 / 制約充足
 */

import type {
  StrategyGoalDistance,
  DecisionFlowNode,
  ColumnState,
  CriteriaLabel,
} from "../../types/decisionNavigator";

type StrategyGoalCompassProps = {
  goalDistance: StrategyGoalDistance;
  nodes: DecisionFlowNode[];
  columnStates?: ColumnState[];
  criteriaLabels?: CriteriaLabel[];
};

const AXES = [
  { key: "clarityScore" as const, label: "明確さ" },
  { key: "riskCoverage" as const, label: "リスク" },
  { key: "actionReadiness" as const, label: "行動" },
  { key: "constraintSatisfaction" as const, label: "制約" },
];

function getColor(value: number): string {
  if (value >= 70) return "#16a34a";
  if (value >= 40) return "#ca8a04";
  return "#dc2626";
}

export function StrategyGoalCompass({
  goalDistance,
  nodes,
  columnStates,
  criteriaLabels,
}: StrategyGoalCompassProps) {
  const { dimensions } = goalDistance;

  // 判断軸の完了状況を計算
  const totalCriteria = criteriaLabels?.length ?? 0;
  const completedCriteria = columnStates
    ? columnStates.filter(s => s === "completed").length
    : 0;
  const remainingCriteria = totalCriteria - completedCriteria;
  const isAllCompleted = totalCriteria > 0 && remainingCriteria === 0;
  const progressPercent = totalCriteria > 0
    ? Math.round((completedCriteria / totalCriteria) * 100)
    : 0;

  return (
    <div className="strategy-compass">
      {/* 判断軸カウンター */}
      {totalCriteria > 0 ? (
        <div className="strategy-compass__counter">
          {isAllCompleted ? (
            <>
              <span className="strategy-compass__count" style={{ color: "#16a34a" }}>
                完了
              </span>
              <span className="strategy-compass__count-sub" style={{ color: "#16a34a" }}>
                全{totalCriteria}問クリア
              </span>
            </>
          ) : (
            <>
              <span className="strategy-compass__count">
                残{remainingCriteria}
              </span>
              <span className="strategy-compass__count-unit">問</span>
              <span className="strategy-compass__count-sub">
                / {totalCriteria}問中
              </span>
            </>
          )}
        </div>
      ) : null}

      {/* プログレスバー */}
      {totalCriteria > 0 && (
        <div className="strategy-compass__progress">
          <div className="strategy-compass__progress-track">
            <div
              className="strategy-compass__progress-fill"
              style={{
                width: `${progressPercent}%`,
                backgroundColor: isAllCompleted ? "#16a34a" : "var(--accent, #1f7a6d)",
              }}
            />
          </div>
          <span className="strategy-compass__progress-label">
            {progressPercent}%
          </span>
        </div>
      )}

      {/* 4軸横棒グラフ */}
      <div className="strategy-compass__bars">
        {AXES.map((axis) => {
          const value = dimensions[axis.key];
          const color = getColor(value);
          return (
            <div key={axis.key} className="strategy-compass__bar-row">
              <span className="strategy-compass__bar-label">{axis.label}</span>
              <div className="strategy-compass__bar-track">
                <div
                  className="strategy-compass__bar-fill"
                  style={{ width: `${value}%`, backgroundColor: color }}
                />
              </div>
              <span className="strategy-compass__bar-value" style={{ color }}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
