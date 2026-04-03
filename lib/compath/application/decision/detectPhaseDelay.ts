import type {
  ProjectPhase,
  PhaseDelayInfo,
  DecisionPatternType,
} from "../../domain/types";

/**
 * フェーズ推定用キーワード
 */
const PHASE_KEYWORDS: Record<ProjectPhase, string[]> = {
  planning: [
    "企画",
    "構想",
    "計画立案",
    "プロジェクト開始",
    "キックオフ",
    "要件定義",
    "要求仕様",
    "提案",
    "見積依頼",
    "RFP",
  ],
  basic_design: [
    "基本設計",
    "概略設計",
    "方針決定",
    "基本仕様",
    "システム設計",
    "全体設計",
    "アーキテクチャ",
    "構成検討",
  ],
  detailed_design: [
    "詳細設計",
    "実施設計",
    "製作図",
    "施工図",
    "詳細仕様",
    "部品設計",
    "配線図",
    "配管図",
  ],
  procurement: [
    "調達",
    "発注",
    "購買",
    "サプライヤー",
    "部品手配",
    "材料手配",
    "外注",
    "納入",
    "リードタイム",
  ],
  construction: [
    "施工",
    "製造",
    "組立",
    "据付",
    "工事",
    "現場",
    "作業",
    "製作",
    "加工",
    "溶接",
    "配線",
    "配管",
  ],
  testing: [
    "検査",
    "試験",
    "テスト",
    "試運転",
    "調整",
    "検証",
    "確認",
    "立会",
    "完成検査",
    "性能試験",
  ],
  handover: [
    "引渡し",
    "竣工",
    "完了",
    "納品",
    "引継ぎ",
    "取扱説明",
    "保守",
    "運用開始",
    "稼働",
  ],
  unknown: [],
};

/**
 * 決定パターンと本来あるべきフェーズの対応
 * （この決定はこのフェーズまでに完了しているべき）
 */
const PATTERN_EXPECTED_PHASE: Record<
  DecisionPatternType,
  Record<string, ProjectPhase>
> = {
  decision: {
    // 仕様に関する決定は詳細設計までに
    仕様: "detailed_design",
    設計: "detailed_design",
    構造: "basic_design",
    // 予算・契約は企画〜基本設計で
    予算: "basic_design",
    契約: "planning",
    // 工期は企画で
    工期: "planning",
    納期: "planning",
  },
  agreement: {
    仕様: "detailed_design",
    設計: "detailed_design",
    予算: "basic_design",
    契約: "planning",
  },
  change: {
    // 変更は本来あるべきフェーズより遅れている可能性が高い
    仕様: "detailed_design",
    設計: "detailed_design",
    工程: "detailed_design",
    材料: "procurement",
  },
  adoption: {
    材料: "procurement",
    工法: "detailed_design",
    設備: "basic_design",
  },
  cancellation: {
    // 中止は早ければ早いほど良い
  },
  other: {},
};

/**
 * フェーズの順序（数値が大きいほど後のフェーズ）
 */
const PHASE_ORDER: Record<ProjectPhase, number> = {
  planning: 1,
  basic_design: 2,
  detailed_design: 3,
  procurement: 4,
  construction: 5,
  testing: 6,
  handover: 7,
  unknown: 0,
};

/**
 * フェーズの日本語ラベル
 */
export const PHASE_LABELS: Record<ProjectPhase, string> = {
  planning: "企画",
  basic_design: "基本設計",
  detailed_design: "詳細設計",
  procurement: "調達",
  construction: "施工・製造",
  testing: "検査・試験",
  handover: "引渡し",
  unknown: "不明",
};

/**
 * テキストからフェーズを推定
 */
function estimatePhase(
  content: string,
  sourceText: string,
  fileName: string
): ProjectPhase {
  const text = (content + " " + sourceText + " " + fileName).toLowerCase();

  // 各フェーズのキーワードマッチ数をカウント
  const matchCounts: Record<ProjectPhase, number> = {
    planning: 0,
    basic_design: 0,
    detailed_design: 0,
    procurement: 0,
    construction: 0,
    testing: 0,
    handover: 0,
    unknown: 0,
  };

  for (const [phase, keywords] of Object.entries(PHASE_KEYWORDS)) {
    for (const keyword of keywords) {
      if (text.includes(keyword.toLowerCase())) {
        matchCounts[phase as ProjectPhase]++;
      }
    }
  }

  // 最もマッチ数が多いフェーズを返す
  let maxPhase: ProjectPhase = "unknown";
  let maxCount = 0;

  for (const [phase, count] of Object.entries(matchCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxPhase = phase as ProjectPhase;
    }
  }

  return maxPhase;
}

/**
 * 決定内容から「本来あるべきフェーズ」を推定
 */
function getExpectedPhase(
  content: string,
  patternType: DecisionPatternType
): ProjectPhase | undefined {
  const expectedMap = PATTERN_EXPECTED_PHASE[patternType];
  if (!expectedMap) return undefined;

  for (const [keyword, phase] of Object.entries(expectedMap)) {
    if (content.includes(keyword)) {
      return phase;
    }
  }

  return undefined;
}

/**
 * フェーズ遅延を検出
 */
export function detectPhaseDelay(
  content: string,
  sourceText: string,
  sourceFileName: string,
  patternType: DecisionPatternType
): PhaseDelayInfo {
  // 現在のフェーズを推定
  const estimatedPhase = estimatePhase(content, sourceText, sourceFileName);

  // 本来あるべきフェーズを推定
  const expectedPhase = getExpectedPhase(content, patternType);

  // 遅延判定
  let isDelayed = false;
  let delayReason: string | undefined;

  if (expectedPhase && estimatedPhase !== "unknown") {
    const currentOrder = PHASE_ORDER[estimatedPhase];
    const expectedOrder = PHASE_ORDER[expectedPhase];

    if (currentOrder > expectedOrder) {
      isDelayed = true;
      delayReason = `この決定は「${PHASE_LABELS[expectedPhase]}」フェーズまでに完了すべきですが、「${PHASE_LABELS[estimatedPhase]}」フェーズで行われています`;
    }
  }

  // 変更パターンの場合は特に注意
  if (patternType === "change" && estimatedPhase !== "unknown") {
    const order = PHASE_ORDER[estimatedPhase];
    if (order >= PHASE_ORDER.construction) {
      isDelayed = true;
      delayReason =
        delayReason ||
        `「${PHASE_LABELS[estimatedPhase]}」フェーズでの変更は、手戻りコストが高くなる可能性があります`;
    }
  }

  return {
    estimatedPhase,
    expectedPhase,
    isDelayed,
    delayReason,
  };
}
