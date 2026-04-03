"use client"
/**
 * PDCACycleView
 *
 * PDCAサイクルの可視化コンポーネント
 * - Plan: 実行計画
 * - Do: 現在の進捗
 * - Check: 実行結果
 * - Act: 学びと改善
 */

import { useState } from "react";

type PDCAPhase = "plan" | "do" | "check" | "act" | "completed";

type PDCACycle = {
  id: string;
  sessionId: string;
  plan: {
    executionPlanId: string;
    goals: string[];
  };
  do: {
    currentStatus: string;
    progressPercentage: number;
  };
  check: {
    executionResults: Array<{
      id: string;
      title: string;
      status: string;
      outcome?: {
        evaluation: string;
        actualResult: string;
      };
    }>;
  };
  act: {
    learnings: Array<{
      id: string;
      category: string;
      content: string;
    }>;
    updatedKnowledge: Array<{
      type: string;
      description: string;
    }>;
  };
  currentPhase: PDCAPhase;
};

type PDCACycleViewProps = {
  cycle: PDCACycle;
  onPhaseClick?: (phase: PDCAPhase) => void;
};

/** フェーズの情報 */
const PHASE_INFO: Record<PDCAPhase, { label: string; icon: string; color: string }> = {
  plan: {
    label: "Plan",
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2",
    color: "#3b82f6",
  },
  do: {
    label: "Do",
    icon: "M13 10V3L4 14h7v7l9-11h-7z",
    color: "#22c55e",
  },
  check: {
    label: "Check",
    icon: "M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z",
    color: "#f59e0b",
  },
  act: {
    label: "Act",
    icon: "M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15",
    color: "#8b5cf6",
  },
  completed: {
    label: "完了",
    icon: "M5 13l4 4L19 7",
    color: "#10b981",
  },
};

/** 評価のラベル */
const EVALUATION_LABELS: Record<string, { label: string; color: string }> = {
  exceeded: { label: "期待以上", color: "#22c55e" },
  met: { label: "達成", color: "#3b82f6" },
  partial: { label: "部分達成", color: "#f59e0b" },
  not_met: { label: "未達成", color: "#ef4444" },
};

export function PDCACycleView({ cycle, onPhaseClick }: PDCACycleViewProps) {
  const [expandedPhase, setExpandedPhase] = useState<PDCAPhase | null>(cycle.currentPhase);

  const phases: PDCAPhase[] = ["plan", "do", "check", "act"];
  const currentPhaseIndex = phases.indexOf(cycle.currentPhase);

  const handlePhaseClick = (phase: PDCAPhase) => {
    setExpandedPhase(expandedPhase === phase ? null : phase);
    onPhaseClick?.(phase);
  };

  return (
    <div className="pdca">
      {/* サイクル図 */}
      <div className="pdca__cycle">
        {phases.map((phase, index) => {
          const info = PHASE_INFO[phase];
          const isActive = phase === cycle.currentPhase;
          const isCompleted = index < currentPhaseIndex || cycle.currentPhase === "completed";
          const isPending = index > currentPhaseIndex && cycle.currentPhase !== "completed";

          return (
            <button
              key={phase}
              type="button"
              className={`pdca__phase-btn ${isActive ? "pdca__phase-btn--active" : ""} ${isCompleted ? "pdca__phase-btn--completed" : ""} ${isPending ? "pdca__phase-btn--pending" : ""}`}
              style={{ "--phase-color": info.color } as React.CSSProperties}
              onClick={() => handlePhaseClick(phase)}
            >
              <div className="pdca__phase-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={info.icon} />
                </svg>
              </div>
              <span className="pdca__phase-label">{info.label}</span>
              {isCompleted && !isActive && (
                <svg className="pdca__check-icon" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                </svg>
              )}
            </button>
          );
        })}

        {/* 矢印 */}
        <div className="pdca__arrows">
          <svg className="pdca__arrow pdca__arrow--1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <svg className="pdca__arrow pdca__arrow--2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
          <svg className="pdca__arrow pdca__arrow--3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* 詳細パネル */}
      {expandedPhase && (
        <div className="pdca__detail" style={{ "--phase-color": PHASE_INFO[expandedPhase].color } as React.CSSProperties}>
          {/* Plan */}
          {expandedPhase === "plan" && (
            <div className="pdca__detail-content">
              <h4 className="pdca__detail-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={PHASE_INFO.plan.icon} />
                </svg>
                計画
              </h4>
              <div className="pdca__goals">
                <p className="pdca__label">目標</p>
                <ul className="pdca__goal-list">
                  {cycle.plan.goals.map((goal, index) => (
                    <li key={index} className="pdca__goal-item">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L4 5v6.09c0 5.05 3.41 9.76 8 10.91 4.59-1.15 8-5.86 8-10.91V5l-8-3z" />
                      </svg>
                      {goal}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Do */}
          {expandedPhase === "do" && (
            <div className="pdca__detail-content">
              <h4 className="pdca__detail-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={PHASE_INFO.do.icon} />
                </svg>
                実行
              </h4>
              <div className="pdca__progress-section">
                <p className="pdca__label">進捗状況</p>
                <div className="pdca__progress-bar-container">
                  <div
                    className="pdca__progress-bar"
                    style={{ width: `${cycle.do.progressPercentage}%` }}
                  />
                  <span className="pdca__progress-text">{cycle.do.progressPercentage}%</span>
                </div>
                <p className="pdca__status">{cycle.do.currentStatus}</p>
              </div>
            </div>
          )}

          {/* Check */}
          {expandedPhase === "check" && (
            <div className="pdca__detail-content">
              <h4 className="pdca__detail-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={PHASE_INFO.check.icon} />
                </svg>
                評価
              </h4>
              <div className="pdca__results">
                <p className="pdca__label">実行結果 ({cycle.check.executionResults.length}件)</p>
                {cycle.check.executionResults.length > 0 ? (
                  <ul className="pdca__result-list">
                    {cycle.check.executionResults.map((result) => (
                      <li key={result.id} className="pdca__result-item">
                        <span className="pdca__result-title">{result.title}</span>
                        {result.outcome && (
                          <span
                            className="pdca__result-eval"
                            style={{ color: EVALUATION_LABELS[result.outcome.evaluation]?.color }}
                          >
                            {EVALUATION_LABELS[result.outcome.evaluation]?.label}
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pdca__empty">実行結果はまだありません</p>
                )}
              </div>
            </div>
          )}

          {/* Act */}
          {expandedPhase === "act" && (
            <div className="pdca__detail-content">
              <h4 className="pdca__detail-title">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d={PHASE_INFO.act.icon} />
                </svg>
                改善
              </h4>
              <div className="pdca__learnings">
                <p className="pdca__label">学び ({cycle.act.learnings.length}件)</p>
                {cycle.act.learnings.length > 0 ? (
                  <ul className="pdca__learning-list">
                    {cycle.act.learnings.map((learning) => (
                      <li key={learning.id} className="pdca__learning-item">
                        <span className={`pdca__learning-category pdca__learning-category--${learning.category}`}>
                          {learning.category === "success_pattern" && "成功"}
                          {learning.category === "failure_pattern" && "失敗"}
                          {learning.category === "insight" && "洞察"}
                          {learning.category === "heuristic" && "経験則"}
                        </span>
                        <span className="pdca__learning-content">{learning.content}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="pdca__empty">学びはまだ記録されていません</p>
                )}

                {cycle.act.updatedKnowledge.length > 0 && (
                  <div className="pdca__knowledge-updates">
                    <p className="pdca__label">ナレッジ更新</p>
                    <ul className="pdca__knowledge-list">
                      {cycle.act.updatedKnowledge.map((knowledge, index) => (
                        <li key={index} className="pdca__knowledge-item">
                          <span className="pdca__knowledge-type">{knowledge.type}</span>
                          <span className="pdca__knowledge-desc">{knowledge.description}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
