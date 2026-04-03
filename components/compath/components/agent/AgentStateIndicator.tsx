"use client"
/**
 * AgentStateIndicator: エージェントの現在状態を表示するバッジコンポーネント
 *
 * 「いま何をしているか」を常に表示し、チャットではなく「作業体」として認識させる
 */

import {
  type AgentState,
  type ArtifactType,
  AGENT_STATE_LABELS,
  ARTIFACT_TYPE_LABELS,
} from "../../types/agent";

type AgentStateIndicatorProps = {
  state: AgentState;
  artifactType?: ArtifactType;
  confidence?: number;
  className?: string;
};

export function AgentStateIndicator({
  state,
  artifactType,
  confidence,
  className = "",
}: AgentStateIndicatorProps) {
  const isActive = state === "planning" || state === "executing";
  const isComplete = state === "artifact_updated" || state === "accepted";
  const isWaiting = state === "waiting_user_input";

  return (
    <div className={`agent-state-indicator ${className}`}>
      <div className={`agent-state-indicator__badge agent-state-indicator__badge--${state}`}>
        {/* アニメーションドット（アクティブ時のみ） */}
        {isActive && (
          <span className="agent-state-indicator__pulse" />
        )}

        {/* 状態アイコン */}
        <span className="agent-state-indicator__icon">
          {state === "idle" && <IdleIcon />}
          {state === "planning" && <PlanningIcon />}
          {state === "executing" && <ExecutingIcon />}
          {state === "artifact_updated" && <UpdatedIcon />}
          {state === "waiting_user_input" && <WaitingIcon />}
          {state === "accepted" && <AcceptedIcon />}
        </span>

        {/* 状態ラベル */}
        <span className="agent-state-indicator__label">
          {AGENT_STATE_LABELS[state]}
        </span>

        {/* 信頼度（表示する場合） */}
        {confidence !== undefined && confidence > 0 && (
          <span className="agent-state-indicator__confidence">
            {Math.round(confidence * 100)}%
          </span>
        )}
      </div>

      {/* 成果物タイプ（判明している場合） */}
      {artifactType && (isComplete || isWaiting) && (
        <div className="agent-state-indicator__artifact">
          <span className="agent-state-indicator__artifact-icon">
            {artifactType === "FTA" && <FTAIcon />}
            {artifactType === "MINUTES" && <MinutesIcon />}
            {artifactType === "DECISION_LOG" && <DecisionIcon />}
          </span>
          <span className="agent-state-indicator__artifact-label">
            {ARTIFACT_TYPE_LABELS[artifactType]}
          </span>
        </div>
      )}
    </div>
  );
}

// =============================================================================
// アイコンコンポーネント
// =============================================================================

function IdleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
    </svg>
  );
}

function PlanningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </svg>
  );
}

function ExecutingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}

function UpdatedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function WaitingIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function AcceptedIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      <polyline points="9 12 12 15 16 10" />
    </svg>
  );
}

function FTAIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function MinutesIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
    </svg>
  );
}

function DecisionIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <path d="M16 12l-4-4-4 4" />
      <path d="M12 16V8" />
    </svg>
  );
}
