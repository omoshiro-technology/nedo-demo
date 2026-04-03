"use client"
/**
 * EnhancedGoalCompass
 *
 * 強化されたゴールコンパス
 * - サブゴールのツリー表示
 * - 進捗タイムライン
 * - 達成予測
 */

import { useState } from "react";

type SubGoal = {
  id: string;
  description: string;
  weight: number;
  status: "pending" | "in_progress" | "completed" | "blocked";
  dependencies: string[];
};

type GoalProgress = {
  overallPercentage: number;
  bySubGoal: Array<{
    subGoalId: string;
    percentage: number;
    trend: "up" | "stable" | "down";
  }>;
  history: Array<{
    timestamp: string;
    percentage: number;
    milestone?: string;
  }>;
  forecast: {
    estimatedCompletion: string;
    confidence: number;
    riskFactors: string[];
  };
};

type EnhancedGoalCompassProps = {
  purpose: string;
  subGoals: SubGoal[];
  progress: GoalProgress;
  requiredDecisions?: Array<{
    id: string;
    question: string;
    status: "pending" | "decided";
    decidedValue?: string;
  }>;
};

/** ステータスの表示情報 */
const STATUS_INFO: Record<string, { label: string; color: string; icon: string }> = {
  pending: {
    label: "未着手",
    color: "#9ca3af",
    icon: "M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z",
  },
  in_progress: {
    label: "進行中",
    color: "#3b82f6",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
  },
  completed: {
    label: "完了",
    color: "#22c55e",
    icon: "M5 13l4 4L19 7",
  },
  blocked: {
    label: "ブロック",
    color: "#ef4444",
    icon: "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z",
  },
};

/** トレンドアイコン */
const TREND_ICONS: Record<string, string> = {
  up: "M5 10l7-7m0 0l7 7m-7-7v18",
  stable: "M5 12h14",
  down: "M19 14l-7 7m0 0l-7-7m7 7V3",
};

export function EnhancedGoalCompass({
  purpose,
  subGoals,
  progress,
  requiredDecisions = [],
}: EnhancedGoalCompassProps) {
  const [showTimeline, setShowTimeline] = useState(false);
  const [expandedSubGoal, setExpandedSubGoal] = useState<string | null>(null);

  const completedCount = subGoals.filter((g) => g.status === "completed").length;
  const decidedCount = requiredDecisions.filter((d) => d.status === "decided").length;

  return (
    <div className="egc">
      {/* ヘッダー: 全体進捗 */}
      <div className="egc__header">
        <div className="egc__purpose">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          <h3 className="egc__purpose-text">{purpose}</h3>
        </div>

        <div className="egc__overall-progress">
          <div className="egc__progress-circle">
            <svg viewBox="0 0 36 36" className="egc__circular-chart">
              <path
                className="egc__circle-bg"
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="egc__circle"
                strokeDasharray={`${progress.overallPercentage}, 100`}
                d="M18 2.0845
                  a 15.9155 15.9155 0 0 1 0 31.831
                  a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <span className="egc__progress-value">{progress.overallPercentage}%</span>
          </div>
          <div className="egc__progress-meta">
            <span className="egc__subgoal-count">
              サブゴール: {completedCount}/{subGoals.length}
            </span>
            <span className="egc__decision-count">
              決定事項: {decidedCount}/{requiredDecisions.length}
            </span>
          </div>
        </div>
      </div>

      {/* サブゴールツリー */}
      <div className="egc__subgoals">
        <div className="egc__section-header">
          <h4 className="egc__section-title">サブゴール</h4>
          <button
            type="button"
            className="egc__timeline-toggle"
            onClick={() => setShowTimeline(!showTimeline)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 8v4l3 3" />
              <circle cx="12" cy="12" r="10" />
            </svg>
            {showTimeline ? "ツリー表示" : "タイムライン"}
          </button>
        </div>

        {!showTimeline ? (
          // ツリー表示
          <ul className="egc__subgoal-list">
            {subGoals.map((subGoal) => {
              const statusInfo = STATUS_INFO[subGoal.status];
              const progressData = progress.bySubGoal.find((p) => p.subGoalId === subGoal.id);
              const isExpanded = expandedSubGoal === subGoal.id;

              return (
                <li key={subGoal.id} className="egc__subgoal-item">
                  <button
                    type="button"
                    className={`egc__subgoal-btn egc__subgoal-btn--${subGoal.status}`}
                    onClick={() => setExpandedSubGoal(isExpanded ? null : subGoal.id)}
                  >
                    <div className="egc__subgoal-left">
                      <span
                        className="egc__subgoal-status"
                        style={{ backgroundColor: statusInfo.color }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                          <path d={statusInfo.icon} />
                        </svg>
                      </span>
                      <span className="egc__subgoal-desc">{subGoal.description}</span>
                    </div>
                    <div className="egc__subgoal-right">
                      {progressData && (
                        <>
                          <span className="egc__subgoal-progress">{progressData.percentage}%</span>
                          <svg
                            className={`egc__trend-icon egc__trend-icon--${progressData.trend}`}
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                          >
                            <path d={TREND_ICONS[progressData.trend]} />
                          </svg>
                        </>
                      )}
                      <span className="egc__subgoal-weight">{subGoal.weight}%</span>
                    </div>
                  </button>

                  {isExpanded && subGoal.dependencies.length > 0 && (
                    <div className="egc__subgoal-deps">
                      <span className="egc__deps-label">依存:</span>
                      {subGoal.dependencies.map((depId) => {
                        const dep = subGoals.find((g) => g.id === depId);
                        return dep ? (
                          <span key={depId} className="egc__dep-tag">
                            {dep.description.slice(0, 20)}...
                          </span>
                        ) : null;
                      })}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          // タイムライン表示
          <div className="egc__timeline">
            {progress.history.map((entry, index) => (
              <div key={index} className="egc__timeline-item">
                <div className="egc__timeline-marker">
                  {entry.milestone ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                    </svg>
                  ) : (
                    <span className="egc__timeline-dot" />
                  )}
                </div>
                <div className="egc__timeline-content">
                  <span className="egc__timeline-time">
                    {new Date(entry.timestamp).toLocaleDateString("ja-JP")}
                  </span>
                  <span className="egc__timeline-progress">{entry.percentage}%</span>
                  {entry.milestone && (
                    <span className="egc__timeline-milestone">{entry.milestone}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 達成予測 */}
      <div className="egc__forecast">
        <h4 className="egc__section-title">達成予測</h4>
        <div className="egc__forecast-content">
          <div className="egc__forecast-main">
            <span className="egc__forecast-date">
              {new Date(progress.forecast.estimatedCompletion).toLocaleDateString("ja-JP")}
            </span>
            <span className="egc__forecast-confidence">
              確信度: {progress.forecast.confidence}%
            </span>
          </div>

          {progress.forecast.riskFactors.length > 0 && (
            <div className="egc__forecast-risks">
              <span className="egc__risks-label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
                </svg>
                リスク要因
              </span>
              <ul className="egc__risk-list">
                {progress.forecast.riskFactors.map((risk, index) => (
                  <li key={index} className="egc__risk-item">{risk}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* 必要な決定事項 */}
      {requiredDecisions.length > 0 && (
        <div className="egc__decisions">
          <h4 className="egc__section-title">必要な決定事項</h4>
          <ul className="egc__decision-list">
            {requiredDecisions.map((decision) => (
              <li
                key={decision.id}
                className={`egc__decision-item egc__decision-item--${decision.status}`}
              >
                <span className="egc__decision-icon">
                  {decision.status === "decided" ? (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  ) : (
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                      <path d="M12 17h.01" />
                    </svg>
                  )}
                </span>
                <span className="egc__decision-question">{decision.question}</span>
                {decision.decidedValue && (
                  <span className="egc__decision-value">{decision.decidedValue}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
