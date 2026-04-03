"use client"
/**
 * デモシナリオ Context
 *
 * 選択されたデモシナリオを全コンポーネントに提供する。
 * ChatPage でラップし、AgentSelector / ProposalInputCard /
 * KnowledgeTransferQuestionCard / useDecisionNavigatorSession が利用する。
 */

import { createContext, useContext, useState, useCallback, useMemo } from "react";
import type { ReactNode } from "react";
import type { DemoScenario } from "./scenarios/types";
import { DEMO_SCENARIOS, DEFAULT_SCENARIO_ID, getScenarioById } from "./scenarios";

type DemoScenarioContextValue = {
  scenario: DemoScenario;
  scenarioId: string;
  scenarios: DemoScenario[];
  setScenarioId: (id: string) => void;
};

const DemoScenarioCtx = createContext<DemoScenarioContextValue | null>(null);

type ProviderProps = {
  children: ReactNode;
};

export function DemoScenarioProvider({ children }: ProviderProps) {
  const [scenarioId, setScenarioIdState] = useState(DEFAULT_SCENARIO_ID);

  const setScenarioId = useCallback((id: string) => {
    setScenarioIdState(id);
  }, []);

  const value = useMemo<DemoScenarioContextValue>(() => ({
    scenario: getScenarioById(scenarioId),
    scenarioId,
    scenarios: DEMO_SCENARIOS,
    setScenarioId,
  }), [scenarioId, setScenarioId]);

  return (
    <DemoScenarioCtx.Provider value={value}>
      {children}
    </DemoScenarioCtx.Provider>
  );
}

export function useDemoScenario(): DemoScenarioContextValue {
  const ctx = useContext(DemoScenarioCtx);
  if (!ctx) {
    throw new Error("useDemoScenario must be used within DemoScenarioProvider");
  }
  return ctx;
}
