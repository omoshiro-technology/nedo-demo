/**
 * フォローアップ提案
 *
 * 目的達成後の「次の意思決定」を提案する
 *
 * Phase 3: 目的達成判定の構造化
 * Phase X: QCDES観点の問いかけ強化
 */

import type { GoalTarget } from "./types";

// ============================================================
// QCDES観点の問いかけ（製造業特化）
// ============================================================

/**
 * QCDES観点
 * - Q: Quality（品質）
 * - C: Cost（コスト）
 * - D: Delivery（納期）
 * - E: Environment（環境）
 * - S: Safety（安全）
 */
export type QCDESViewpoint = "quality" | "cost" | "delivery" | "environment" | "safety";

/**
 * QCDES観点ごとの「必ず問うべき問い」
 */
export const QCDES_QUESTIONS: Record<QCDESViewpoint, {
  name: string;
  icon: string;
  questions: Array<{
    question: string;
    /** 若手が見落としやすいか */
    isOftenOverlooked: boolean;
    /** 見落とした場合のリスク */
    overlookedRisk?: string;
  }>;
}> = {
  quality: {
    name: "品質",
    icon: "🎯",
    questions: [
      {
        question: "品質基準（規格・仕様）は明確になっていますか？",
        isOftenOverlooked: false,
      },
      {
        question: "検査工程・受入基準は定義されていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "不良品の流出、手戻り発生",
      },
      {
        question: "トレーサビリティは確保できますか？",
        isOftenOverlooked: true,
        overlookedRisk: "問題発生時の原因特定が困難",
      },
      {
        question: "過去の品質トラブルと類似していませんか？",
        isOftenOverlooked: true,
        overlookedRisk: "同じ失敗の繰り返し",
      },
    ],
  },
  cost: {
    name: "コスト",
    icon: "💰",
    questions: [
      {
        question: "初期コストだけでなく、ランニングコストも考慮していますか？",
        isOftenOverlooked: true,
        overlookedRisk: "長期的なコスト増加",
      },
      {
        question: "隠れたコスト（教育、移管、治具）は見積もりに含まれていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "予算超過",
      },
      {
        question: "コスト削減が品質・安全を犠牲にしていませんか？",
        isOftenOverlooked: true,
        overlookedRisk: "品質トラブル、安全事故による損失",
      },
      {
        question: "投資回収期間（ROI）は許容範囲ですか？",
        isOftenOverlooked: false,
      },
    ],
  },
  delivery: {
    name: "納期",
    icon: "📅",
    questions: [
      {
        question: "リードタイムは現実的ですか？（バッファは含まれていますか？）",
        isOftenOverlooked: true,
        overlookedRisk: "納期遅延、顧客信頼の低下",
      },
      {
        question: "依存関係（前工程、部品調達）は整理されていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "ボトルネックによる遅延",
      },
      {
        question: "並行作業のリスクは評価されていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "品質低下、手戻り",
      },
      {
        question: "マイルストーン・チェックポイントは設定されていますか？",
        isOftenOverlooked: false,
      },
    ],
  },
  environment: {
    name: "環境",
    icon: "🌱",
    questions: [
      {
        question: "環境規制（排出、廃棄物）への適合は確認されていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "法令違反、罰則",
      },
      {
        question: "エネルギー効率・省エネ対策は考慮されていますか？",
        isOftenOverlooked: false,
      },
      {
        question: "廃棄物の処理方法は決まっていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "廃棄コスト増加、環境汚染",
      },
      {
        question: "サステナビリティ（持続可能性）の観点は含まれていますか？",
        isOftenOverlooked: false,
      },
    ],
  },
  safety: {
    name: "安全",
    icon: "🛡️",
    questions: [
      {
        question: "作業者の安全は確保されていますか？（リスクアセスメント実施済み？）",
        isOftenOverlooked: false,
      },
      {
        question: "緊急停止時の手順は定義されていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "事故発生時の被害拡大",
      },
      {
        question: "保護具・安全装置は適切ですか？",
        isOftenOverlooked: false,
      },
      {
        question: "法的安全基準（労安法等）への適合は確認されていますか？",
        isOftenOverlooked: true,
        overlookedRisk: "法令違反、操業停止",
      },
      {
        question: "過去の安全インシデントと類似していませんか？",
        isOftenOverlooked: true,
        overlookedRisk: "同じ事故の再発",
      },
    ],
  },
};

/**
 * 選択肢のタイプに応じたQCDES観点の優先度
 */
const QCDES_PRIORITY_BY_CONTEXT: Record<string, QCDESViewpoint[]> = {
  // 外注・調達関連
  outsource: ["quality", "cost", "delivery"],
  procurement: ["cost", "quality", "delivery"],
  vendor: ["quality", "cost", "delivery"],
  // 設備・投資関連
  equipment: ["safety", "cost", "quality"],
  investment: ["cost", "quality", "delivery"],
  // 工程・プロセス関連
  process: ["quality", "safety", "delivery"],
  workflow: ["delivery", "quality", "cost"],
  // 環境関連
  disposal: ["environment", "cost", "safety"],
  emission: ["environment", "safety", "cost"],
  // デフォルト
  default: ["quality", "cost", "delivery", "safety", "environment"],
};

/**
 * コンテキストに基づいてQCDES観点の問いを取得
 *
 * @param context 選択の文脈（例: "外注", "設備投資"）
 * @param includeOverlookedOnly 見落としやすい問いのみ取得するか
 * @param limit 取得する最大数
 */
export function getQCDESQuestions(
  context?: string,
  includeOverlookedOnly: boolean = false,
  limit: number = 5
): Array<{
  viewpoint: QCDESViewpoint;
  name: string;
  icon: string;
  question: string;
  isOftenOverlooked: boolean;
  overlookedRisk?: string;
}> {
  // コンテキストから優先度を決定
  let priority: QCDESViewpoint[] = QCDES_PRIORITY_BY_CONTEXT.default;

  if (context) {
    const normalizedContext = context.toLowerCase();
    for (const [key, viewpoints] of Object.entries(QCDES_PRIORITY_BY_CONTEXT)) {
      if (normalizedContext.includes(key)) {
        priority = viewpoints;
        break;
      }
    }
  }

  const result: Array<{
    viewpoint: QCDESViewpoint;
    name: string;
    icon: string;
    question: string;
    isOftenOverlooked: boolean;
    overlookedRisk?: string;
  }> = [];

  // 優先度順に問いを収集
  for (const viewpoint of priority) {
    const viewpointData = QCDES_QUESTIONS[viewpoint];
    for (const q of viewpointData.questions) {
      if (includeOverlookedOnly && !q.isOftenOverlooked) {
        continue;
      }
      result.push({
        viewpoint,
        name: viewpointData.name,
        icon: viewpointData.icon,
        question: q.question,
        isOftenOverlooked: q.isOftenOverlooked,
        overlookedRisk: q.overlookedRisk,
      });
      if (result.length >= limit) {
        return result;
      }
    }
  }

  return result;
}

/**
 * 選択肢に対する「見落とし警告」を生成
 *
 * @param optionLabel 選択肢のラベル
 * @param optionDescription 選択肢の説明
 * @returns 見落とし警告のリスト
 */
export function generateOverlookedWarningsForOption(
  optionLabel: string,
  optionDescription?: string
): Array<{
  viewpoint: QCDESViewpoint;
  name: string;
  icon: string;
  warning: string;
  risk: string;
  checkItem: string;
}> {
  const context = `${optionLabel} ${optionDescription || ""}`.toLowerCase();
  const warnings: Array<{
    viewpoint: QCDESViewpoint;
    name: string;
    icon: string;
    warning: string;
    risk: string;
    checkItem: string;
  }> = [];

  // キーワードに基づいて警告を生成
  const keywordWarnings: Array<{
    keywords: string[];
    viewpoint: QCDESViewpoint;
    warning: string;
    risk: string;
    checkItem: string;
  }> = [
    {
      keywords: ["外注", "outsource", "委託", "外部"],
      viewpoint: "quality",
      warning: "外注先の品質基準が自社と同等か確認が必要です",
      risk: "品質トラブル、顧客クレーム",
      checkItem: "外注先の品質基準書・過去実績を確認",
    },
    {
      keywords: ["コスト削減", "cost reduction", "安い", "低価格"],
      viewpoint: "quality",
      warning: "コスト削減が品質を犠牲にしていないか確認が必要です",
      risk: "長期的な品質トラブル、ブランド毀損",
      checkItem: "品質への影響を評価",
    },
    {
      keywords: ["納期短縮", "急ぎ", "緊急", "スピード"],
      viewpoint: "safety",
      warning: "納期短縮による安全面への影響を確認が必要です",
      risk: "安全事故、品質低下",
      checkItem: "安全手順の省略がないか確認",
    },
    {
      keywords: ["新規", "初めて", "新しい", "未経験"],
      viewpoint: "quality",
      warning: "新規取り組みのリスク評価が必要です",
      risk: "予期せぬ問題発生",
      checkItem: "パイロット運用・段階導入を検討",
    },
    {
      keywords: ["設備", "機械", "装置", "投資"],
      viewpoint: "safety",
      warning: "設備導入時の安全対策を確認が必要です",
      risk: "操作ミス、安全事故",
      checkItem: "リスクアセスメント・安全教育計画を確認",
    },
    {
      keywords: ["変更", "切り替え", "移行", "入れ替え"],
      viewpoint: "delivery",
      warning: "変更による影響範囲と移行計画を確認が必要です",
      risk: "予期せぬダウンタイム、混乱",
      checkItem: "変更管理プロセスに従って実施",
    },
  ];

  for (const kw of keywordWarnings) {
    if (kw.keywords.some((k) => context.includes(k))) {
      const viewpointData = QCDES_QUESTIONS[kw.viewpoint];
      warnings.push({
        viewpoint: kw.viewpoint,
        name: viewpointData.name,
        icon: viewpointData.icon,
        warning: kw.warning,
        risk: kw.risk,
        checkItem: kw.checkItem,
      });
    }
  }

  return warnings;
}

// ============================================================
// フォローアップマッピング
// ============================================================

/**
 * ゴールターゲットごとの次の意思決定候補
 */
const FOLLOWUPS_BY_TARGET: Record<GoalTarget, string[]> = {
  // 距離・間隔
  distance: [
    "許容差の設定（±○○mm）",
    "法規/安全基準の確認",
    "施工方法の決定",
    "配置図の作成",
  ],
  // 予算・金額
  budget: [
    "内訳の確定",
    "見積取得（3社以上）",
    "承認フローの確認",
    "支払条件の決定",
  ],
  // 期間・時間
  duration: [
    "工程分解（WBS作成）",
    "依存関係の整理",
    "バッファ設定",
    "マイルストーン設定",
  ],
  // 数量
  quantity: [
    "発注方法の決定",
    "在庫確認",
    "調達先選定",
    "納期調整",
  ],
  // 比率・割合
  ratio: [
    "基準値の確認",
    "許容範囲の設定",
    "モニタリング方法の決定",
  ],
  // 手順・プロセス
  process: [
    "リスク洗い出し",
    "責任者/期限の設定",
    "進捗モニタリング方法",
    "完了基準の明確化",
  ],
  // 選択（A or B）
  selection: [
    "選択理由の記録",
    "代替案の保存",
    "ステークホルダーへの共有",
  ],
  // 不明
  unknown: [],
};

// ============================================================
// フォローアップ取得関数
// ============================================================

/**
 * ゴールターゲットに基づくフォローアップ提案を取得
 *
 * @param target ゴールターゲット
 * @param limit 取得する最大数（デフォルト: 3）
 * @returns フォローアップ提案のリスト
 */
export function getFollowupSuggestions(
  target: GoalTarget,
  limit: number = 3
): string[] {
  const suggestions = FOLLOWUPS_BY_TARGET[target] ?? [];
  return suggestions.slice(0, limit);
}

/**
 * カスタムフォローアップ提案を追加
 *
 * @param target ゴールターゲット
 * @param customSuggestions カスタム提案
 * @param limit 取得する最大数
 * @returns マージされたフォローアップ提案
 */
export function getFollowupSuggestionsWithCustom(
  target: GoalTarget,
  customSuggestions: string[],
  limit: number = 3
): string[] {
  const baseSuggestions = FOLLOWUPS_BY_TARGET[target] ?? [];
  // カスタム提案を優先し、重複を除去
  const merged = [...new Set([...customSuggestions, ...baseSuggestions])];
  return merged.slice(0, limit);
}

/**
 * フォローアップメッセージを生成
 *
 * @param target ゴールターゲット
 * @param decisionValue 確定した決定値
 * @returns ユーザーに表示するメッセージ
 */
export function generateFollowupMessage(
  target: GoalTarget,
  decisionValue: string
): string {
  const suggestions = getFollowupSuggestions(target, 3);

  if (suggestions.length === 0) {
    return `「${decisionValue}」で決定しました。`;
  }

  const suggestionList = suggestions.map((s, i) => `${i + 1}. ${s}`).join("\n");

  return `「${decisionValue}」で決定しました。

次に検討するなら:
${suggestionList}`;
}
