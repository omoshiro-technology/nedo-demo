/**
 * 思考ボックス生成
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * 条件選択に基づいて次の思考ボックスを生成する
 */

import { generateId, getTimestamp } from "../utils";
import type {
  ThinkingBox,
  ConditionOption,
  CandidateValue,
  ConditionSelectionResult,
  GoalDistanceCalculation,
  InitialLayout,
} from "./types";
import { calculateGoalDistance, isGoalAchieved } from "./distanceCalculator";
import { narrowCandidates, evaluatePruning } from "./pruningLogic";

// ============================================================
// 思考ボックス生成
// ============================================================

/**
 * 初期思考ボックスを生成
 *
 * @param initialLayout 初期レイアウト
 * @returns 初期思考ボックス
 */
export function createInitialThinkingBox(
  initialLayout: InitialLayout
): ThinkingBox {
  const now = getTimestamp();

  // 三列から条件を抽出
  const contextualConditions = initialLayout.columns.specialCircumstances.items;
  const experientialConditions = initialLayout.columns.pastCases.items.map(
    (pc) => pc.condition
  );
  const inferredConditions = initialLayout.columns.llmRecommendations.items;

  return {
    id: `tb-${generateId().slice(0, 8)}`,
    depth: 0,
    parentConditions: [],
    remainingCandidates: initialLayout.initialCandidates,
    columns: {
      contextual: contextualConditions,
      experiential: experientialConditions,
      inferred: inferredConditions,
    },
    goalDistance: initialLayout.initialDistance,
    canPrune: false,
    isTerminal: false,
    createdAt: now,
    updatedAt: now,
  };
}

/**
 * 条件選択後の次の思考ボックスを生成
 *
 * @param currentBox 現在の思考ボックス
 * @param selectedCondition 選択された条件
 * @param purpose 目的テキスト（新しい条件生成に使用）
 * @returns 条件選択結果
 */
export function processConditionSelection(
  currentBox: ThinkingBox,
  selectedCondition: ConditionOption,
  purpose: string
): ConditionSelectionResult {
  const now = getTimestamp();

  // 1. 選択された条件を累積リストに追加
  const updatedConditions = [
    ...currentBox.parentConditions,
    { ...selectedCondition, isSelected: true },
  ];

  // 2. 候補値を絞り込む
  const { remaining, eliminated } = narrowCandidates(
    currentBox.remainingCandidates,
    selectedCondition,
    currentBox.parentConditions
  );

  // 3. ゴール距離を計算
  const goalDistance = calculateGoalDistance(
    updatedConditions,
    remaining,
    currentBox.remainingCandidates.length + eliminated.length
  );

  // 4. ゴール達成を判定
  const goalResult = isGoalAchieved(goalDistance, remaining);

  // 5. 次の思考ボックスを生成
  const nextBox = generateNextThinkingBox(
    currentBox,
    updatedConditions,
    remaining,
    selectedCondition,
    goalDistance,
    goalResult.achieved,
    purpose
  );

  return {
    selectedCondition,
    updatedConditions,
    remainingCandidates: remaining,
    eliminatedCandidates: eliminated,
    nextThinkingBox: nextBox,
    goalDistance,
    isGoalAchieved: goalResult.achieved,
    achievedValue: goalResult.value,
  };
}

/**
 * 次の思考ボックスを生成
 */
function generateNextThinkingBox(
  currentBox: ThinkingBox,
  updatedConditions: ConditionOption[],
  remainingCandidates: CandidateValue[],
  selectedCondition: ConditionOption,
  goalDistance: GoalDistanceCalculation,
  isAchieved: boolean,
  purpose: string
): ThinkingBox {
  const now = getTimestamp();

  // ゴール達成した場合は終了ボックス
  if (isAchieved) {
    return {
      id: `tb-${generateId().slice(0, 8)}`,
      depth: currentBox.depth + 1,
      parentConditions: updatedConditions,
      remainingCandidates,
      columns: {
        contextual: [],
        experiential: [],
        inferred: [],
      },
      goalDistance: goalDistance.baseScore,
      canPrune: false,
      isTerminal: true,
      terminationReason: remainingCandidates.length === 1
        ? `決定値が確定: ${remainingCandidates[0].value}`
        : "全ての条件が満たされました",
      createdAt: now,
      updatedAt: now,
    };
  }

  // 次の条件を生成
  const nextConditions = generateNextConditions(
    updatedConditions,
    remainingCandidates,
    selectedCondition,
    purpose
  );

  // 枝刈り可能かを判定
  const canPrune = remainingCandidates.some((c) => {
    const pruning = evaluatePruning(c, updatedConditions, remainingCandidates);
    return pruning.shouldPrune;
  });

  return {
    id: `tb-${generateId().slice(0, 8)}`,
    depth: currentBox.depth + 1,
    parentConditions: updatedConditions,
    remainingCandidates,
    columns: nextConditions,
    goalDistance: goalDistance.baseScore,
    canPrune,
    isTerminal: false,
    createdAt: now,
    updatedAt: now,
  };
}

// ============================================================
// 次の条件生成
// ============================================================

/**
 * 次に確認すべき条件を生成
 */
function generateNextConditions(
  selectedConditions: ConditionOption[],
  remainingCandidates: CandidateValue[],
  lastSelectedCondition: ConditionOption,
  purpose: string
): ThinkingBox["columns"] {
  const now = getTimestamp();
  const coveredCategories = new Set(selectedConditions.map((c) => c.category));

  // 文脈から抽出した条件（選択された条件に関連する追加条件）
  const contextualConditions = generateContextualConditions(
    lastSelectedCondition,
    coveredCategories,
    now
  );

  // 過去事例から抽出した条件（ダミー実装）
  const experientialConditions = generateExperientialConditions(
    remainingCandidates,
    coveredCategories,
    now
  );

  // LLM推論による条件
  const inferredConditions = generateInferredConditions(
    purpose,
    coveredCategories,
    remainingCandidates,
    now
  );

  return {
    contextual: contextualConditions,
    experiential: experientialConditions,
    inferred: inferredConditions,
  };
}

/**
 * 文脈に基づく追加条件を生成
 */
function generateContextualConditions(
  lastCondition: ConditionOption,
  coveredCategories: Set<string>,
  now: string
): ConditionOption[] {
  const conditions: ConditionOption[] = [];

  // 前の条件のカテゴリに基づいて関連条件を提案
  if (lastCondition.category === "legal" && !coveredCategories.has("safety")) {
    conditions.push({
      id: `cond-${generateId().slice(0, 8)}`,
      type: "implicit_condition",
      label: "法規に関連する安全基準",
      description: "法規制約を考慮する場合、関連する安全基準も確認が必要です",
      category: "safety",
      implications: ["安全基準を満たす候補に絞られる"],
      narrowsOptions: [],
      source: "user_context",
      confidence: 75,
      isSelected: false,
      createdAt: now,
    });
  }

  if (lastCondition.category === "cost" && !coveredCategories.has("quality")) {
    conditions.push({
      id: `cond-${generateId().slice(0, 8)}`,
      type: "implicit_condition",
      label: "コストと品質のバランス",
      description: "コスト制約を設定する場合、品質への影響を確認してください",
      category: "quality",
      implications: ["品質を維持できる候補に絞られる"],
      narrowsOptions: [],
      source: "user_context",
      confidence: 70,
      isSelected: false,
      createdAt: now,
    });
  }

  return conditions;
}

/**
 * 過去事例に基づく条件を生成（ダミー実装）
 */
function generateExperientialConditions(
  remainingCandidates: CandidateValue[],
  coveredCategories: Set<string>,
  now: string
): ConditionOption[] {
  // TODO: 過去事例検索機能と連携
  // 現在はダミー実装
  if (remainingCandidates.length > 2 && !coveredCategories.has("technical")) {
    return [{
      id: `cond-${generateId().slice(0, 8)}`,
      type: "knowhow",
      label: "類似案件での採用実績",
      description: "過去の類似案件での採用実績を考慮することをお勧めします",
      category: "technical",
      implications: ["実績のある候補が優先される"],
      narrowsOptions: [],
      source: "past_case",
      confidence: 65,
      isSelected: false,
      createdAt: now,
    }];
  }
  return [];
}

/**
 * LLM推論による条件を生成
 */
function generateInferredConditions(
  purpose: string,
  coveredCategories: Set<string>,
  remainingCandidates: CandidateValue[],
  now: string
): ConditionOption[] {
  const conditions: ConditionOption[] = [];

  // 候補が多い場合は絞り込みを促す条件を提案
  if (remainingCandidates.length >= 3) {
    // まだカバーされていない重要なカテゴリを提案
    const importantCategories: Array<{
      category: ConditionOption["category"];
      label: string;
      description: string;
    }> = [
      { category: "stakeholder", label: "関係者の意見確認", description: "決定前に関係者の意見を確認することをお勧めします" },
      { category: "time", label: "実施時期の制約", description: "いつまでに決定・実施する必要があるか確認してください" },
      { category: "resource", label: "必要リソースの確認", description: "実施に必要なリソース（人員、設備等）を確認してください" },
    ];

    for (const { category, label, description } of importantCategories) {
      if (!coveredCategories.has(category)) {
        conditions.push({
          id: `cond-${generateId().slice(0, 8)}`,
          type: "unrecognized_condition",
          label,
          description,
          category,
          implications: ["この条件を満たす候補に絞られる"],
          narrowsOptions: [],
          source: "llm_inference",
          confidence: 60,
          isSelected: false,
          createdAt: now,
        });
        break; // 1つだけ追加
      }
    }
  }

  // 候補が2つに絞られた場合は決定を促す
  if (remainingCandidates.length === 2) {
    const [first, second] = remainingCandidates;
    conditions.push({
      id: `cond-${generateId().slice(0, 8)}`,
      type: "knowhow",
      label: `${first.value} vs ${second.value} の最終判断`,
      description: `候補が2つに絞られました。どちらを選ぶか最終判断してください`,
      category: "other",
      implications: ["決定値が確定する"],
      narrowsOptions: [first.id],
      source: "llm_inference",
      confidence: 80,
      isSelected: false,
      createdAt: now,
    });
  }

  return conditions;
}

// ============================================================
// ゴールコンパス
// ============================================================

/**
 * ゴールコンパス情報を生成
 *
 * @param thinkingBox 現在の思考ボックス
 * @param totalInitialCandidates 初期候補数
 * @returns ゴール距離計算結果
 */
export function generateGoalCompass(
  thinkingBox: ThinkingBox,
  totalInitialCandidates: number
): GoalDistanceCalculation {
  return calculateGoalDistance(
    thinkingBox.parentConditions,
    thinkingBox.remainingCandidates,
    totalInitialCandidates
  );
}

// ============================================================
// 終了判定
// ============================================================

/**
 * 思考ボックスの終了条件を判定
 */
export function checkTerminationCondition(
  thinkingBox: ThinkingBox
): { shouldTerminate: boolean; reason?: string } {
  // 候補が1つに絞られた
  if (thinkingBox.remainingCandidates.length === 1) {
    return {
      shouldTerminate: true,
      reason: `決定値が確定: ${thinkingBox.remainingCandidates[0].value}`,
    };
  }

  // 候補が0になった（エラー状態）
  if (thinkingBox.remainingCandidates.length === 0) {
    return {
      shouldTerminate: true,
      reason: "全ての候補が枝刈りされました。条件を見直してください。",
    };
  }

  // 深さが10を超えた（無限ループ防止）
  if (thinkingBox.depth >= 10) {
    return {
      shouldTerminate: true,
      reason: "最大深度に到達しました",
    };
  }

  // ゴール距離が0になった
  if (thinkingBox.goalDistance <= 0) {
    return {
      shouldTerminate: true,
      reason: "ゴールに到達しました",
    };
  }

  return { shouldTerminate: false };
}
