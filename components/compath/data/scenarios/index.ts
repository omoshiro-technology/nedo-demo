/**
 * デモシナリオレジストリ
 */

export type { DemoScenario, QuestionDefinition, QuestionOption } from "./types";

import { ipStrategyScenario } from "./ipStrategy";
import { constructionScenario } from "./construction";
import type { DemoScenario } from "./types";

/** 利用可能な全シナリオ */
export const DEMO_SCENARIOS: DemoScenario[] = [
  ipStrategyScenario,
  constructionScenario,
];

/** デフォルトシナリオID */
export const DEFAULT_SCENARIO_ID = "ip-strategy";

/** IDからシナリオを取得 */
export function getScenarioById(id: string): DemoScenario {
  return DEMO_SCENARIOS.find((s) => s.id === id) ?? ipStrategyScenario;
}
