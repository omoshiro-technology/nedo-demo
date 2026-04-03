/**
 * useAgentState: エージェント状態管理フック
 *
 * AgentState と ActionLog を管理し、UIに反映するためのフック
 */

import { useCallback, useState } from "react";
import type {
  AgentState,
  ActionLogEntry,
  ActionType,
  ActionResult,
  ArtifactType,
  AgentPanelState,
  PlanStep,
  PlanStepStatus,
  RouteResult,
} from "../types/agent";

// =============================================================================
// 初期状態
// =============================================================================

const initialState: AgentPanelState = {
  state: "idle",
  goal: "",
  mode: "",
  confidence: 0,
  plan: [],
  planSteps: [],
  actions: [],
  currentArtifactId: undefined,
  currentArtifactType: undefined,
  routeResult: undefined,
};

// =============================================================================
// useAgentState フック
// =============================================================================

export function useAgentState() {
  const [agentState, setAgentState] = useState<AgentPanelState>(initialState);

  // -------------------------------------------------------------------------
  // 状態遷移
  // -------------------------------------------------------------------------

  const transitionTo = useCallback((newState: AgentState) => {
    setAgentState((prev) => ({
      ...prev,
      state: newState,
    }));
  }, []);

  const startPlanning = useCallback((goal: string, mode: string = "") => {
    setAgentState((prev) => ({
      ...prev,
      state: "planning",
      goal,
      mode,
      actions: [], // 新しいセッション開始時にログをクリア
    }));
  }, []);

  const startExecuting = useCallback(() => {
    setAgentState((prev) => ({
      ...prev,
      state: "executing",
    }));
  }, []);

  const artifactUpdated = useCallback(
    (artifactId: string, artifactType: ArtifactType) => {
      setAgentState((prev) => ({
        ...prev,
        state: "artifact_updated",
        currentArtifactId: artifactId,
        currentArtifactType: artifactType,
      }));
    },
    []
  );

  const waitForInput = useCallback(() => {
    setAgentState((prev) => ({
      ...prev,
      state: "waiting_user_input",
    }));
  }, []);

  const accept = useCallback(() => {
    setAgentState((prev) => ({
      ...prev,
      state: "accepted",
    }));
  }, []);

  /** 実行完了（idle状態に戻す、ただしplanStepsとrouteResultは保持） */
  const finishExecution = useCallback(() => {
    setAgentState((prev) => ({
      ...prev,
      state: "idle",
    }));
  }, []);

  const reset = useCallback(() => {
    setAgentState(initialState);
  }, []);

  // -------------------------------------------------------------------------
  // アクションログ
  // -------------------------------------------------------------------------

  const addAction = useCallback(
    (
      actionType: ActionType,
      target: string,
      message: string,
      result: ActionResult = "ok",
      errorDetail?: string
    ) => {
      const entry: ActionLogEntry = {
        id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
        timestamp: new Date().toISOString(),
        step: 0, // 後で計算
        actionType,
        target,
        result,
        message,
        errorDetail,
      };

      setAgentState((prev) => {
        const newActions = [...prev.actions, { ...entry, step: prev.actions.length + 1 }];
        return {
          ...prev,
          actions: newActions,
        };
      });

      return entry.id;
    },
    []
  );

  const updateActionResult = useCallback(
    (actionId: string, result: ActionResult, errorDetail?: string) => {
      setAgentState((prev) => ({
        ...prev,
        actions: prev.actions.map((a) =>
          a.id === actionId ? { ...a, result, errorDetail } : a
        ),
      }));
    },
    []
  );

  // -------------------------------------------------------------------------
  // プラン管理
  // -------------------------------------------------------------------------

  const setPlan = useCallback((plan: string[]) => {
    setAgentState((prev) => ({
      ...prev,
      plan,
    }));
  }, []);

  const setConfidence = useCallback((confidence: number) => {
    setAgentState((prev) => ({
      ...prev,
      confidence,
    }));
  }, []);

  // -------------------------------------------------------------------------
  // 計画ステップ管理
  // -------------------------------------------------------------------------

  /** 計画ステップを初期化 */
  const initializePlanSteps = useCallback((steps: { label: string; detail?: string }[]) => {
    const planSteps: PlanStep[] = steps.map((step, index) => ({
      id: `step-${index + 1}`,
      label: step.label,
      status: index === 0 ? "in_progress" : "pending",
      detail: step.detail,
    }));
    setAgentState((prev) => ({
      ...prev,
      planSteps,
    }));
  }, []);

  /** 特定のステップのステータスを更新 */
  const updatePlanStep = useCallback((stepId: string, status: PlanStepStatus, detail?: string) => {
    setAgentState((prev) => {
      const planSteps = prev.planSteps.map((step) =>
        step.id === stepId
          ? { ...step, status, detail: detail ?? step.detail }
          : step
      );

      // 現在のステップが完了したら次のステップを in_progress に
      if (status === "completed") {
        const currentIndex = planSteps.findIndex((s) => s.id === stepId);
        if (currentIndex >= 0 && currentIndex < planSteps.length - 1) {
          const nextStep = planSteps[currentIndex + 1];
          if (nextStep.status === "pending") {
            planSteps[currentIndex + 1] = { ...nextStep, status: "in_progress" };
          }
        }
      }

      return {
        ...prev,
        planSteps,
      };
    });
  }, []);

  /** 次のステップに進む（現在の in_progress を completed にして次を開始） */
  const advancePlanStep = useCallback((detail?: string) => {
    setAgentState((prev) => {
      const currentIndex = prev.planSteps.findIndex((s) => s.status === "in_progress");
      if (currentIndex < 0) return prev;

      const planSteps = prev.planSteps.map((step, index) => {
        if (index === currentIndex) {
          return { ...step, status: "completed" as PlanStepStatus, detail: detail ?? step.detail };
        }
        if (index === currentIndex + 1 && step.status === "pending") {
          return { ...step, status: "in_progress" as PlanStepStatus };
        }
        return step;
      });

      return {
        ...prev,
        planSteps,
      };
    });
  }, []);

  /** ルーティング結果を設定 */
  const setRouteResult = useCallback((routeResult: RouteResult) => {
    setAgentState((prev) => ({
      ...prev,
      routeResult,
    }));
  }, []);

  // -------------------------------------------------------------------------
  // ユーティリティ
  // -------------------------------------------------------------------------

  const isActive = agentState.state === "planning" || agentState.state === "executing";
  const isComplete =
    agentState.state === "artifact_updated" || agentState.state === "accepted";
  const isWaiting = agentState.state === "waiting_user_input";

  return {
    // 状態
    agentState,
    isActive,
    isComplete,
    isWaiting,

    // 状態遷移
    transitionTo,
    startPlanning,
    startExecuting,
    finishExecution,
    artifactUpdated,
    waitForInput,
    accept,
    reset,

    // アクションログ
    addAction,
    updateActionResult,

    // プラン
    setPlan,
    setConfidence,

    // 計画ステップ
    initializePlanSteps,
    updatePlanStep,
    advancePlanStep,
    setRouteResult,
  };
}

// =============================================================================
// 型エクスポート
// =============================================================================

export type UseAgentStateReturn = ReturnType<typeof useAgentState>;
