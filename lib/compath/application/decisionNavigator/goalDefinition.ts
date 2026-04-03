/**
 * ゴール定義
 *
 * 目的テキストからゴールタイプを推定し、完了条件を持たせる
 *
 * Phase 3: 目的達成判定の構造化
 */

// ============================================================
// 型定義
// ============================================================

/** ゴールの種類 */
export type GoalType =
  | "numeric_value"     // 数値の決定（距離、金額、期間など）
  | "process_plan"      // 手順・プロセスの策定
  | "categorical_value" // カテゴリ選択（A or B）
  | "unknown";          // 不明

/** ゴールの対象 */
export type GoalTarget =
  | "distance"   // 距離・間隔
  | "budget"     // 予算・金額
  | "duration"   // 期間・時間
  | "quantity"   // 数量
  | "ratio"      // 比率・割合
  | "process"    // 手順・プロセス
  | "selection"  // 選択（A or B）
  | "unknown";   // 不明

/** 完了条件の種類 */
export type CompletionRule =
  | "numeric_value"  // 数値が確定したら完了
  | "steps_ready"    // 手順が揃ったら完了
  | "categorical"    // カテゴリが選択されたら完了
  | "unknown";       // 不明

/** ゴール定義 */
export type GoalDefinition = {
  type: GoalType;
  target: GoalTarget;
  unitHints?: string[];           // 単位のヒント（m, mm, 円など）
  completionRule: CompletionRule;
  followupHints?: string[];       // 完了後の次の意思決定候補
};

// ============================================================
// ゴール推定ルール
// ============================================================

type GoalRule = {
  type: GoalType;
  target: GoalTarget;
  unitHints?: string[];
  keywords: RegExp[];
  followupHints: string[];
};

const GOAL_RULES: GoalRule[] = [
  // 距離・間隔
  {
    type: "numeric_value",
    target: "distance",
    unitHints: ["mm", "cm", "m", "km"],
    keywords: [
      /距離|間隔|長さ|幅|高さ|奥行|spacing|gap|length|width|height|depth/i,
      /離す|広げる|縮める|寄せる/i,
    ],
    followupHints: ["許容差の設定", "法規/安全基準の確認", "施工方法の決定"],
  },
  // 予算・金額
  {
    type: "numeric_value",
    target: "budget",
    unitHints: ["円", "万円", "億円", "yen", "$", "USD"],
    keywords: [
      /予算|金額|費用|コスト|価格|見積|budget|cost|price/i,
    ],
    followupHints: ["内訳の確定", "見積取得", "承認フロー"],
  },
  // 期間・時間
  {
    type: "numeric_value",
    target: "duration",
    unitHints: ["日", "週", "月", "年", "時間", "day", "week", "month", "year", "hour"],
    keywords: [
      /期間|時間|納期|スケジュール|工期|duration|timeline|schedule|deadline/i,
    ],
    followupHints: ["工程分解", "依存関係の整理", "バッファ設定"],
  },
  // 数量
  {
    type: "numeric_value",
    target: "quantity",
    unitHints: ["個", "台", "本", "セット", "人", "名"],
    keywords: [
      /数量|個数|台数|人数|本数|quantity|count|number/i,
    ],
    followupHints: ["発注方法", "在庫確認", "調達先選定"],
  },
  // 比率・割合
  {
    type: "numeric_value",
    target: "ratio",
    unitHints: ["%", "割", "パーセント"],
    keywords: [
      /比率|割合|パーセント|率|ratio|percentage|rate/i,
    ],
    followupHints: ["基準値の確認", "許容範囲の設定"],
  },
  // 手順・プロセス
  {
    type: "process_plan",
    target: "process",
    keywords: [
      /手順|やり方|方法|進め方|フロー|ステップ|工程|procedure|process|workflow|steps|how to/i,
    ],
    followupHints: ["リスク洗い出し", "責任者/期限", "進捗モニタリング"],
  },
  // 選択（A or B）
  {
    type: "categorical_value",
    target: "selection",
    keywords: [
      /どちら|どれ|選択|選ぶ|決める|which|select|choose/i,
    ],
    followupHints: ["選択理由の記録", "代替案の保存"],
  },
];

// ============================================================
// ゴール推定関数
// ============================================================

/**
 * 目的テキストからゴール定義を推定
 */
export function inferGoalDefinition(purpose: string): GoalDefinition {
  const normalizedPurpose = purpose.toLowerCase();

  for (const rule of GOAL_RULES) {
    const matched = rule.keywords.some((re) => re.test(normalizedPurpose));
    if (matched) {
      return {
        type: rule.type,
        target: rule.target,
        unitHints: rule.unitHints,
        completionRule: getCompletionRule(rule.type),
        followupHints: rule.followupHints,
      };
    }
  }

  // マッチしなかった場合はunknown
  return {
    type: "unknown",
    target: "unknown",
    completionRule: "unknown",
  };
}

/**
 * ゴールタイプから完了条件を取得
 */
function getCompletionRule(type: GoalType): CompletionRule {
  switch (type) {
    case "numeric_value":
      return "numeric_value";
    case "process_plan":
      return "steps_ready";
    case "categorical_value":
      return "categorical";
    default:
      return "unknown";
  }
}

/**
 * ゴール定義が有効（unknown以外）かどうか
 */
export function isGoalDefined(goal: GoalDefinition): boolean {
  return goal.type !== "unknown" && goal.target !== "unknown";
}
