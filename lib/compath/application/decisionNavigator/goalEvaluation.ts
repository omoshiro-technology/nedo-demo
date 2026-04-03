/**
 * 目的達成判定
 *
 * 選択されたノードから目的達成を判定する
 * LLMではなくコードで判定することで安定性を確保
 *
 * Phase 3: 目的達成判定の構造化
 */

import type { DecisionFlowNode, GoalStatus } from "./types";
import type { GoalDefinition } from "./goalDefinition";

// ============================================================
// 型定義
// ============================================================

/** 目的達成評価結果 */
export type GoalEvaluation = {
  status: GoalStatus;
  decisionValue?: string;  // 検出された決定値（例: "0.8m"）
  reason?: string;         // 判定理由
};

// ============================================================
// デフォルト単位リスト
// ============================================================

const DEFAULT_UNITS = [
  // 距離
  "mm", "cm", "m", "km",
  // 金額
  "円", "万円", "億円",
  // 割合
  "%", "パーセント",
  // 時間
  "秒", "分", "時間", "日", "週", "月", "年",
  // 数量
  "個", "台", "本", "セット", "人", "名",
];

// ============================================================
// テキスト正規化
// ============================================================

/**
 * 全角数字を半角に変換し、特殊文字を正規化
 */
function normalizeNumericText(text: string): string {
  return text
    // 全角数字を半角に変換
    .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
    // 全角小数点を半角に変換
    .replace(/．/g, ".")
    // 特殊な単位記号を正規化
    .replace(/㎜/g, "mm")
    .replace(/㎝/g, "cm")
    .replace(/ｍ/g, "m")
    .replace(/㎞/g, "km");
}

// ============================================================
// 数値抽出
// ============================================================

/**
 * テキストから数値＋単位を抽出
 *
 * @param text 対象テキスト
 * @param units 検出対象の単位リスト
 * @returns 検出された数値＋単位の文字列、または null
 */
function extractNumericValue(text: string, units: string[]): string | null {
  const normalized = normalizeNumericText(text);

  // 単位をエスケープしてパターンを構築
  const escapedUnits = units
    .map((u) => u.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("|");

  // 数値パターン（整数または小数）
  const number = "(\\d+(?:\\.\\d+)?)";

  // 範囲パターン（例: 1.0m〜2.0m, 100-200円）
  const rangeRe = new RegExp(
    `${number}\\s*(?:${escapedUnits})\\s*(?:-|~|〜|から)\\s*${number}\\s*(?:${escapedUnits})`,
    "i"
  );
  const rangeMatch = normalized.match(rangeRe);
  if (rangeMatch) {
    return rangeMatch[0];
  }

  // 単一値パターン（例: 1.5m, 100万円）
  const valueRe = new RegExp(
    `${number}\\s*(?:${escapedUnits})`,
    "i"
  );
  const valueMatch = normalized.match(valueRe);
  if (valueMatch) {
    return valueMatch[0];
  }

  return null;
}

// ============================================================
// 目的達成判定
// ============================================================

/**
 * 目的達成を評価
 *
 * @param goal ゴール定義
 * @param node 選択されたノード
 * @returns 評価結果
 */
export function evaluateGoalCompletion(
  goal: GoalDefinition,
  node: DecisionFlowNode
): GoalEvaluation {
  // 1. ノードが明示的に終端（isTerminal）ならachieved
  if (node.isTerminal) {
    return {
      status: "achieved",
      reason: "user selected terminal option",
    };
  }

  // 2. ノードのoptionTypeがcandidate_valueで、かつ数値を含むならachieved
  if (node.optionType === "candidate_value") {
    const text = `${node.label} ${node.description ?? ""}`;
    const units = goal.unitHints ?? DEFAULT_UNITS;
    const value = extractNumericValue(text, units);

    if (value) {
      return {
        status: "achieved",
        decisionValue: value,
        reason: `numeric value detected: ${value}`,
      };
    }
  }

  // 3. ゴールタイプがnumeric_valueの場合、ラベル/説明から数値を検出
  if (goal.type === "numeric_value") {
    const text = `${node.label} ${node.description ?? ""}`;
    const units = goal.unitHints ?? DEFAULT_UNITS;
    const value = extractNumericValue(text, units);

    if (value) {
      return {
        status: "achieved",
        decisionValue: value,
        reason: `numeric value detected from goal type: ${value}`,
      };
    }
  }

  // 4. categorical_valueの場合、特定のパターンを検出
  if (goal.type === "categorical_value") {
    // 「Aを選択」「Bに決定」などのパターンを検出
    const decisionPatterns = [
      /を選択|に決定|を採用|で確定|を実施/,
      /selected|decided|chosen|confirmed/i,
    ];
    const text = `${node.label} ${node.description ?? ""}`;

    if (decisionPatterns.some((re) => re.test(text))) {
      return {
        status: "achieved",
        decisionValue: node.label,
        reason: "categorical decision detected",
      };
    }
  }

  // 5. process_planの場合、完了を示すパターンを検出
  if (goal.type === "process_plan") {
    const completionPatterns = [
      /完了|終了|実行|開始|着手/,
      /complete|done|start|execute/i,
    ];
    const text = `${node.label} ${node.description ?? ""}`;

    if (completionPatterns.some((re) => re.test(text))) {
      return {
        status: "achieved",
        decisionValue: node.label,
        reason: "process completion detected",
      };
    }
  }

  // 6. それ以外は partial
  return {
    status: "partial",
    reason: "no completion criteria met",
  };
}

/**
 * 選択履歴全体から目的達成を評価
 * 過去の選択で既に決定値が確定しているかをチェック
 */
export function evaluateGoalFromHistory(
  goal: GoalDefinition,
  nodes: DecisionFlowNode[]
): GoalEvaluation {
  // 選択済みノードを順番に評価
  for (const node of nodes) {
    if (node.status === "selected") {
      const evaluation = evaluateGoalCompletion(goal, node);
      if (evaluation.status === "achieved") {
        return evaluation;
      }
    }
  }

  return {
    status: "partial",
    reason: "no completion in history",
  };
}
