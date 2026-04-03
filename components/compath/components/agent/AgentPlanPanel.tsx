"use client"
/**
 * AgentPlanPanel: エージェントの計画と判断理由を可視化するパネル
 *
 * - 計画ステップの進捗表示
 * - 判断理由の表示（RouteResult）
 * - プログレスバー
 */

import type { PlanStep, RouteResult, ArtifactType } from "../../types/agent";
import { PLAN_STEP_ICONS, ARTIFACT_TYPE_LABELS } from "../../types/agent";

type AgentPlanPanelProps = {
  planSteps: PlanStep[];
  routeResult?: RouteResult;
  isActive: boolean;
  className?: string;
};

export function AgentPlanPanel({
  planSteps,
  routeResult,
  isActive,
  className = "",
}: AgentPlanPanelProps) {
  // 表示するステップがない場合は何も表示しない
  if (planSteps.length === 0 && !routeResult) {
    return null;
  }

  // 進捗計算
  const completedCount = planSteps.filter((s) => s.status === "completed").length;
  const totalCount = planSteps.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className={`agent-plan-panel ${isActive ? "agent-plan-panel--active" : ""} ${className}`}>
      {/* ヘッダー */}
      <div className="agent-plan-panel__header">
        <span className="agent-plan-panel__title">
          <RobotIcon />
          エージェントの計画
        </span>
        {totalCount > 0 && (
          <span className="agent-plan-panel__progress-text">
            {completedCount} / {totalCount}
          </span>
        )}
      </div>

      {/* プログレスバー */}
      {totalCount > 0 && (
        <div className="agent-plan-panel__progress-bar">
          <div
            className="agent-plan-panel__progress-fill"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      )}

      {/* 計画ステップ一覧 */}
      {planSteps.length > 0 && (
        <div className="agent-plan-panel__steps">
          {planSteps.map((step, index) => (
            <PlanStepItem key={step.id} step={step} stepNumber={index + 1} />
          ))}
        </div>
      )}

      {/* 判断理由（RouteResult） */}
      {routeResult && (
        <RouteResultSection routeResult={routeResult} />
      )}
    </div>
  );
}

// =============================================================================
// PlanStepItem: 計画ステップの1行
// =============================================================================

type PlanStepItemProps = {
  step: PlanStep;
  stepNumber: number;
};

function PlanStepItem({ step, stepNumber }: PlanStepItemProps) {
  const statusIcon = PLAN_STEP_ICONS[step.status];
  const isInProgress = step.status === "in_progress";

  return (
    <div className={`agent-plan-panel__step agent-plan-panel__step--${step.status}`}>
      <span className={`agent-plan-panel__step-icon ${isInProgress ? "agent-plan-panel__step-icon--pulse" : ""}`}>
        {statusIcon}
      </span>
      <span className="agent-plan-panel__step-number">{stepNumber}.</span>
      <span className="agent-plan-panel__step-label">{step.label}</span>
      {step.detail && (
        <span className="agent-plan-panel__step-detail">({step.detail})</span>
      )}
    </div>
  );
}

// =============================================================================
// RouteResultSection: 判断理由セクション
// =============================================================================

type RouteResultSectionProps = {
  routeResult: RouteResult;
};

function RouteResultSection({ routeResult }: RouteResultSectionProps) {
  return (
    <div className="agent-plan-panel__route-result">
      <div className="agent-plan-panel__route-header">
        <LightbulbIcon />
        <span>判断理由</span>
      </div>

      <div className="agent-plan-panel__route-type">
        この文書は <strong>{ARTIFACT_TYPE_LABELS[routeResult.type]}</strong> と判断しました
        <span className="agent-plan-panel__route-confidence">
          （確信度: {Math.round(routeResult.confidence * 100)}%）
        </span>
      </div>

      {routeResult.reasons.length > 0 && (
        <ul className="agent-plan-panel__route-reasons">
          {routeResult.reasons.map((reason, index) => (
            <li key={index} className="agent-plan-panel__route-reason">
              {reason}
            </li>
          ))}
        </ul>
      )}

      {routeResult.fallbackChoices && routeResult.fallbackChoices.length > 0 && (
        <div className="agent-plan-panel__route-fallback">
          他の可能性:
          {routeResult.fallbackChoices.map((choice) => (
            <span key={choice} className="agent-plan-panel__route-fallback-choice">
              {ARTIFACT_TYPE_LABELS[choice]}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// アイコンコンポーネント
// =============================================================================

function RobotIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="16" x2="8" y2="16" />
      <line x1="16" y1="16" x2="16" y2="16" />
    </svg>
  );
}

function LightbulbIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 18h6" />
      <path d="M10 22h4" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}
