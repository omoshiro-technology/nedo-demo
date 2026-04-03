/**
 * デモ/サンプルデータ バレルエクスポート
 */

// シナリオシステム（推奨: 各コンポーネントは useDemoScenario() を使用）
export { DemoScenarioProvider, useDemoScenario } from "./DemoScenarioContext";
export { DEMO_SCENARIOS, DEFAULT_SCENARIO_ID, getScenarioById } from "./scenarios";
export type { DemoScenario, QuestionDefinition } from "./scenarios";

// 個別データ（シナリオ定義内部で使用、直接importは非推奨）
export {
  DEMO_CUSTOMER_PROFILES,
  DEFAULT_EVALUATION_POINTS,
  DEFAULT_EVALUATION_POINT_ROWS,
} from "./proposalDemoData";

export { DEMO_ACTIONS } from "./chatDemoData";

export { DUMMY_PAST_CASES } from "./decisionNavigatorDemoData";
export { createDummyConditions, createAllAvailableConditions } from "./decisionNavigatorDemoHelpers";
