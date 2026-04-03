/**
 * 枝刈りロジック
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * 条件に基づいて候補値を枝刈りする
 */

import type {
  CandidateValue,
  ConditionOption,
  PruningDecision,
} from "./types";

// ============================================================
// 枝刈り判定
// ============================================================

/**
 * 候補値の枝刈りを判定
 *
 * @param candidate 判定対象の候補値
 * @param selectedConditions 選択済み条件
 * @param allCandidates 全候補値
 * @returns 枝刈り判定結果
 */
export function evaluatePruning(
  candidate: CandidateValue,
  selectedConditions: ConditionOption[],
  allCandidates: CandidateValue[]
): PruningDecision {
  // 1. 必須条件違反をチェック
  const mandatoryViolation = checkMandatoryConditionViolation(
    candidate,
    selectedConditions
  );

  if (mandatoryViolation.violates) {
    return {
      shouldPrune: true,
      reason: `必須条件を満たしていません: ${mandatoryViolation.violatedConditions.join(", ")}`,
      criteria: {
        violatesMandatoryCondition: true,
        violatedConditionIds: mandatoryViolation.violatedConditions,
        dominatedByOther: { isDominated: false },
        exceedsConstraints: { exceeds: false },
      },
    };
  }

  // 2. 他の候補に支配されているかチェック
  const dominationCheck = checkDomination(candidate, allCandidates, selectedConditions);

  if (dominationCheck.isDominated) {
    return {
      shouldPrune: true,
      reason: `他の候補（${dominationCheck.dominatingCandidate?.value}）に劣っています`,
      criteria: {
        violatesMandatoryCondition: false,
        dominatedByOther: {
          isDominated: true,
          dominatingCandidateId: dominationCheck.dominatingCandidate?.id,
        },
        exceedsConstraints: { exceeds: false },
      },
    };
  }

  // 3. 制約超過をチェック
  const constraintCheck = checkConstraintExceedance(candidate, selectedConditions);

  if (constraintCheck.exceeds) {
    return {
      shouldPrune: true,
      reason: `制約を超過しています: ${constraintCheck.constraintType} (${constraintCheck.constraintValue})`,
      criteria: {
        violatesMandatoryCondition: false,
        dominatedByOther: { isDominated: false },
        exceedsConstraints: {
          exceeds: true,
          constraintType: constraintCheck.constraintType,
          constraintValue: constraintCheck.constraintValue,
        },
      },
    };
  }

  // 枝刈りしない
  return {
    shouldPrune: false,
    criteria: {
      violatesMandatoryCondition: false,
      dominatedByOther: { isDominated: false },
      exceedsConstraints: { exceeds: false },
    },
  };
}

// ============================================================
// 必須条件違反チェック
// ============================================================

/**
 * 必須条件違反をチェック
 */
function checkMandatoryConditionViolation(
  candidate: CandidateValue,
  selectedConditions: ConditionOption[]
): { violates: boolean; violatedConditions: string[] } {
  // 法規・安全性は必須条件として扱う
  const mandatoryCategories = ["legal", "safety"];

  const mandatoryConditions = selectedConditions.filter((c) =>
    mandatoryCategories.includes(c.category)
  );

  const violatedConditions: string[] = [];

  for (const condition of mandatoryConditions) {
    // 条件の narrowsOptions に含まれていない候補は違反
    if (
      condition.narrowsOptions.length > 0 &&
      !condition.narrowsOptions.includes(candidate.id)
    ) {
      violatedConditions.push(condition.id);
    }

    // unsatisfiedConditions に含まれている場合も違反
    if (candidate.unsatisfiedConditions.includes(condition.id)) {
      if (!violatedConditions.includes(condition.id)) {
        violatedConditions.push(condition.id);
      }
    }
  }

  return {
    violates: violatedConditions.length > 0,
    violatedConditions,
  };
}

// ============================================================
// 支配チェック（Pareto支配）
// ============================================================

/**
 * 他の候補に支配されているかチェック
 *
 * 候補Aが候補Bに支配されている = Aは全ての条件でBと同等以下、かつ1つ以上の条件で劣る
 */
function checkDomination(
  candidate: CandidateValue,
  allCandidates: CandidateValue[],
  selectedConditions: ConditionOption[]
): { isDominated: boolean; dominatingCandidate?: CandidateValue } {
  // 自分以外の候補をチェック
  const otherCandidates = allCandidates.filter(
    (c) => c.id !== candidate.id && !c.isEliminated
  );

  for (const other of otherCandidates) {
    if (isDominatedBy(candidate, other, selectedConditions)) {
      return {
        isDominated: true,
        dominatingCandidate: other,
      };
    }
  }

  return { isDominated: false };
}

/**
 * candidateがdominatorに支配されているかを判定
 */
function isDominatedBy(
  candidate: CandidateValue,
  dominator: CandidateValue,
  _selectedConditions: ConditionOption[]
): boolean {
  // スコアで比較（簡易実装）
  // 候補のスコアが明らかに低い場合は支配されていると判定
  const scoreDiff = dominator.score - candidate.score;

  // スコア差が20以上で、満たす条件数も多い場合
  if (scoreDiff >= 20) {
    const candidateSatisfied = candidate.satisfiedConditions.length;
    const dominatorSatisfied = dominator.satisfiedConditions.length;

    if (dominatorSatisfied >= candidateSatisfied) {
      return true;
    }
  }

  return false;
}

// ============================================================
// 制約超過チェック
// ============================================================

/**
 * 制約超過をチェック
 */
function checkConstraintExceedance(
  candidate: CandidateValue,
  selectedConditions: ConditionOption[]
): { exceeds: boolean; constraintType?: string; constraintValue?: string } {
  // コスト制約をチェック
  const costCondition = selectedConditions.find((c) => c.category === "cost");
  if (costCondition) {
    // コスト条件のラベルから制約値を抽出
    const costMatch = costCondition.label.match(/(\d+(?:万円|円|%)?)/);
    if (costMatch) {
      const constraintValue = costMatch[1];
      // 候補がこの制約を満たしていない場合
      if (candidate.unsatisfiedConditions.includes(costCondition.id)) {
        return {
          exceeds: true,
          constraintType: "cost",
          constraintValue,
        };
      }
    }
  }

  // 時間制約をチェック
  const timeCondition = selectedConditions.find((c) => c.category === "time");
  if (timeCondition) {
    const timeMatch = timeCondition.label.match(/(\d+(?:日|週間|ヶ月)?)/);
    if (timeMatch) {
      const constraintValue = timeMatch[1];
      if (candidate.unsatisfiedConditions.includes(timeCondition.id)) {
        return {
          exceeds: true,
          constraintType: "time",
          constraintValue,
        };
      }
    }
  }

  return { exceeds: false };
}

// ============================================================
// 候補値の絞り込み
// ============================================================

/**
 * 選択された条件に基づいて候補値を絞り込む
 *
 * @param candidates 候補値リスト
 * @param newCondition 新しく選択された条件
 * @param existingConditions 既存の選択済み条件
 * @returns 絞り込み結果
 */
export function narrowCandidates(
  candidates: CandidateValue[],
  newCondition: ConditionOption,
  existingConditions: ConditionOption[]
): {
  remaining: CandidateValue[];
  eliminated: CandidateValue[];
} {
  const allConditions = [...existingConditions, newCondition];
  const remaining: CandidateValue[] = [];
  const eliminated: CandidateValue[] = [];

  for (const candidate of candidates) {
    // 既に枝刈りされている場合はスキップ
    if (candidate.isEliminated) {
      eliminated.push(candidate);
      continue;
    }

    // 枝刈り判定
    const pruningResult = evaluatePruning(candidate, allConditions, candidates);

    if (pruningResult.shouldPrune) {
      eliminated.push({
        ...candidate,
        isEliminated: true,
        eliminationReason: pruningResult.reason,
      });
    } else {
      // スコアを更新
      const updatedCandidate = updateCandidateScore(candidate, newCondition);
      remaining.push(updatedCandidate);
    }
  }

  // スコア順にソート
  remaining.sort((a, b) => b.score - a.score);

  return { remaining, eliminated };
}

/**
 * 候補値のスコアを更新
 */
function updateCandidateScore(
  candidate: CandidateValue,
  newCondition: ConditionOption
): CandidateValue {
  let scoreAdjustment = 0;

  // 条件を満たしている場合はスコアを上げる
  if (candidate.satisfiedConditions.includes(newCondition.id)) {
    scoreAdjustment += 10;
  }

  // narrowsOptions に含まれている場合もスコアを上げる
  if (newCondition.narrowsOptions.includes(candidate.id)) {
    scoreAdjustment += 5;
  }

  // 条件を満たしていない場合はスコアを下げる
  if (candidate.unsatisfiedConditions.includes(newCondition.id)) {
    scoreAdjustment -= 15;
  }

  return {
    ...candidate,
    score: Math.max(0, Math.min(100, candidate.score + scoreAdjustment)),
    satisfiedConditions: candidate.satisfiedConditions.includes(newCondition.id)
      ? candidate.satisfiedConditions
      : newCondition.narrowsOptions.includes(candidate.id)
        ? [...candidate.satisfiedConditions, newCondition.id]
        : candidate.satisfiedConditions,
  };
}

// ============================================================
// 枝刈り可能性の事前チェック
// ============================================================

/**
 * 次の条件選択で枝刈りが発生するかを事前にチェック
 *
 * @param candidates 候補値リスト
 * @param potentialCondition 選択候補の条件
 * @param existingConditions 既存の選択済み条件
 * @returns 枝刈りが発生する候補のID
 */
export function previewPruning(
  candidates: CandidateValue[],
  potentialCondition: ConditionOption,
  existingConditions: ConditionOption[]
): string[] {
  const wouldBePruned: string[] = [];

  for (const candidate of candidates) {
    if (candidate.isEliminated) continue;

    const allConditions = [...existingConditions, potentialCondition];
    const pruningResult = evaluatePruning(candidate, allConditions, candidates);

    if (pruningResult.shouldPrune) {
      wouldBePruned.push(candidate.id);
    }
  }

  return wouldBePruned;
}
