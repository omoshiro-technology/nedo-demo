"use client"
/**
 * GoalCompass - ゴールコンパスコンポーネント
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * ゴールへの距離を視覚的に表示し、進捗を追跡する。
 */

import type { GoalCompassState, GoalDistanceCalculation, CandidateValue } from "../../types/decisionNavigator";

type GoalCompassProps = {
  compassState: GoalCompassState;
  goalDistance?: GoalDistanceCalculation;
  remainingCandidates: CandidateValue[];
};

export function GoalCompass({ compassState, goalDistance, remainingCandidates }: GoalCompassProps) {
  const { completionPercentage, estimatedRemainingSteps, nextMilestone, isAchieved, achievedValue } = compassState;

  // 進捗バーの色を決定
  const getProgressColor = () => {
    if (isAchieved) return "#16a34a"; // 緑
    if (completionPercentage >= 70) return "#16a34a"; // 緑
    if (completionPercentage >= 40) return "#ca8a04"; // 黄色
    return "#dc2626"; // 赤
  };

  // 候補値をスコア順にソート
  const sortedCandidates = [...remainingCandidates]
    .filter((c) => !c.isEliminated)
    .sort((a, b) => b.score - a.score);

  return (
    <div className={`goal-compass ${isAchieved ? "goal-compass--achieved" : ""}`}>
      {/* 達成状態 */}
      {isAchieved ? (
        <div className="goal-compass__achieved">
          <div className="goal-compass__achieved-icon">🎯</div>
          <div className="goal-compass__achieved-text">
            <h3>決定完了</h3>
            <p className="goal-compass__achieved-value">{achievedValue}</p>
          </div>
        </div>
      ) : (
        <>
          {/* 進捗バー */}
          <div className="goal-compass__progress">
            <div className="goal-compass__progress-header">
              <span className="goal-compass__progress-label">ゴールへの進捗</span>
              <span className="goal-compass__progress-value">{completionPercentage}%</span>
            </div>
            <div className="goal-compass__progress-bar">
              <div
                className="goal-compass__progress-fill"
                style={{
                  width: `${completionPercentage}%`,
                  backgroundColor: getProgressColor(),
                }}
              />
            </div>
          </div>

          {/* 残りステップ */}
          <div className="goal-compass__info">
            <div className="goal-compass__info-item">
              <span className="goal-compass__info-icon">📍</span>
              <span className="goal-compass__info-text">
                残り約 <strong>{estimatedRemainingSteps}</strong> ステップ
              </span>
            </div>
            <div className="goal-compass__info-item">
              <span className="goal-compass__info-icon">🎯</span>
              <span className="goal-compass__info-text">{nextMilestone}</span>
            </div>
          </div>

          {/* 候補値一覧 */}
          {sortedCandidates.length > 0 && (
            <div className="goal-compass__candidates">
              <h4 className="goal-compass__candidates-title">
                残り候補 ({sortedCandidates.length})
              </h4>
              <div className="goal-compass__candidates-list">
                {sortedCandidates.slice(0, 5).map((candidate, idx) => (
                  <div
                    key={candidate.id}
                    className={`goal-compass__candidate ${idx === 0 ? "goal-compass__candidate--top" : ""}`}
                  >
                    <span className="goal-compass__candidate-rank">{idx + 1}</span>
                    <span className="goal-compass__candidate-value">{candidate.value}</span>
                    <span className="goal-compass__candidate-score">
                      {candidate.score}点
                    </span>
                  </div>
                ))}
                {sortedCandidates.length > 5 && (
                  <div className="goal-compass__candidate goal-compass__candidate--more">
                    +{sortedCandidates.length - 5} 件
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 距離計算の詳細（折りたたみ） */}
          {goalDistance && (
            <details className="goal-compass__details">
              <summary>距離計算の詳細</summary>
              <div className="goal-compass__details-content">
                <div className="goal-compass__detail-item">
                  <span>未解決条件</span>
                  <span>{goalDistance.components.unresolvedConditions.count}件 ({goalDistance.components.unresolvedConditions.contribution.toFixed(1)}%)</span>
                </div>
                <div className="goal-compass__detail-item">
                  <span>残り候補</span>
                  <span>{goalDistance.components.remainingCandidates.count}件 ({goalDistance.components.remainingCandidates.contribution.toFixed(1)}%)</span>
                </div>
                <div className="goal-compass__detail-item">
                  <span>情報ギャップ</span>
                  <span>{goalDistance.components.informationGaps.count}件 ({goalDistance.components.informationGaps.contribution.toFixed(1)}%)</span>
                </div>
                <div className="goal-compass__detail-item">
                  <span>優先順位の曖昧さ</span>
                  <span>{goalDistance.components.priorityAmbiguity.level} ({goalDistance.components.priorityAmbiguity.contribution.toFixed(1)}%)</span>
                </div>
              </div>
            </details>
          )}
        </>
      )}
    </div>
  );
}
