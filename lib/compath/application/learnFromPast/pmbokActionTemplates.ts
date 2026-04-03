/**
 * PMBOKベースのアクションテンプレート
 *
 * PMBOKの原則に基づき、状況に応じた適切なアクションを
 * 正しい優先順位で提案する
 *
 * 参考:
 * - PMBOK Schedule Management: https://www.projectengineer.net/project-schedule-management-according-to-the-pmbok/
 * - PMBOK Risk Management: https://www.projectengineer.net/project-risk-management-according-to-the-pmbok/
 */

import type { SituationContext } from "./analyzeSituationContext";
import type { NextAction, ActionRisk } from "../../domain/types";

/** アクションテンプレート */
export type ActionTemplate = {
  id: string;
  content: string;
  priority: "high" | "medium" | "low";
  whyImportant: string;
  rationale: string;
  risk: ActionRisk;
  aiPromptHint: string;
  /** このアクションが適用される条件 */
  applicableWhen: (ctx: SituationContext) => boolean;
  /** 順序優先度（小さいほど優先） */
  orderPriority: number;
};

/**
 * PMBOKベースのアクションテンプレート
 *
 * 順序の原則:
 * 1. 根本原因分析（常に最優先）
 * 2. 無コスト緩和策（Fast-tracking等）
 * 3. 利害関係者調整
 * 4. コスト発生緩和策（Crashing等）
 * 5. 代替案検討
 */
export const PMBOK_ACTION_TEMPLATES: ActionTemplate[] = [
  // ========================================
  // 0. 止血・即時対応（緊急時のみ）
  // ========================================
  {
    id: "action-immediate-notify",
    content: "発注者/関係者に状況を連絡する",
    priority: "high",
    whyImportant: "報告の遅れが信頼を損なう。まず状況を共有することが最優先",
    rationale:
      "問題発生時は、解決策がなくても状況を共有することで、関係者の対応準備時間を確保できる",
    risk: {
      description:
        "連絡が遅れると、信頼損失や二次被害につながる可能性がある",
      severity: "high",
      mitigation: "本日中に状況を連絡する（解決策は後でも良い）",
    },
    aiPromptHint:
      "緊急時の関係者への連絡方法と、伝えるべき内容を教えてください",
    applicableWhen: (ctx) => ctx.isUrgent,
    orderPriority: 0.5, // 安全の次、根本原因分析の前
  },
  {
    id: "action-immediate-assess",
    content: "今日中にできる作業を洗い出す",
    priority: "high",
    whyImportant: "できることから着手し、被害を最小限に抑える",
    rationale:
      "完璧な解決策を待つより、今すぐ実行可能な対応を進める方が効果的",
    risk: {
      description:
        "何もしないまま時間が過ぎると、状況がさらに悪化する",
      severity: "high",
      mitigation: "30分以内に実行可能なタスクをリストアップする",
    },
    aiPromptHint:
      "緊急時に優先すべきタスクの洗い出し方を教えてください",
    applicableWhen: (ctx) =>
      ctx.isUrgent && ctx.detectedIssues.scheduleDelay !== undefined,
    orderPriority: 0.6,
  },

  // ========================================
  // 1. 根本原因分析（常に最優先）
  // ========================================
  {
    id: "action-root-cause-schedule",
    content: "遅延の根本原因を特定する（リソース不足？調達遅延？設計変更？）",
    priority: "high",
    whyImportant: "原因により対応策が大きく異なるため、まず原因特定が必要",
    rationale:
      "原因によって最適な対応策が異なる。原因不明のまま対策を打つと効果がない可能性がある",
    risk: {
      description:
        "原因を特定せずに対策を打つと、効果がない／逆効果になる可能性がある",
      severity: "high",
      mitigation: "本日中に関係者へのヒアリングを実施し、原因を特定する",
    },
    aiPromptHint:
      "遅延の根本原因を特定するためのヒアリング項目と、原因別の対応策を教えてください",
    applicableWhen: (ctx) =>
      !ctx.isRootCauseIdentified && ctx.detectedIssues.scheduleDelay !== undefined,
    orderPriority: 1,
  },
  {
    id: "action-root-cause-cost",
    content: "予算超過の原因を特定する（スコープ増？見積り誤差？外部要因？）",
    priority: "high",
    whyImportant: "原因により対応策が大きく異なるため、まず原因特定が必要",
    rationale:
      "予算超過の原因が「スコープ増」なら発注者協議、「見積り誤差」なら社内対応と、対応が異なる",
    risk: {
      description:
        "原因を特定せずにコスト削減を進めると、品質低下や追加遅延を招く可能性がある",
      severity: "high",
      mitigation: "本日中に費用内訳を分析し、超過原因を特定する",
    },
    aiPromptHint:
      "予算超過の原因分析方法と、原因別の対応策を教えてください",
    applicableWhen: (ctx) =>
      !ctx.isRootCauseIdentified &&
      ctx.detectedIssues.costOverrun !== undefined &&
      ctx.constraintRanking.primary === "cost",
    orderPriority: 1,
  },
  {
    id: "action-root-cause-quality",
    content: "品質問題の根本原因を特定する（工程？材料？作業手順？）",
    priority: "high",
    whyImportant: "品質問題の再発を防ぐため、根本原因の特定が必須",
    rationale:
      "問題の根本原因を特定しないと、同じ問題が繰り返し発生する",
    risk: {
      description:
        "原因を特定せずに対処すると、問題が再発し、より大きな損失につながる可能性がある",
      severity: "high",
      mitigation: "品質管理担当者と協力し、根本原因分析（RCA）を実施する",
    },
    aiPromptHint:
      "品質問題の根本原因分析（RCA）の進め方と、一般的な原因パターンを教えてください",
    applicableWhen: (ctx) =>
      !ctx.isRootCauseIdentified && ctx.detectedIssues.qualityRisk !== undefined,
    orderPriority: 1,
  },

  // ========================================
  // 2. 無コスト緩和策（スケジュール問題向け）
  // ========================================
  {
    id: "action-fast-tracking",
    content: "工程表を見直し、並列化可能な作業を特定する（Fast-tracking）",
    priority: "high",
    whyImportant: "追加コストなしで遅延を短縮できる可能性がある",
    rationale:
      "作業の並列化は追加コストなしで遅延を短縮できる可能性がある。コスト発生前に検討すべき",
    risk: {
      description:
        "並列化可能な作業を見逃すと、不要なコストが発生する可能性がある",
      severity: "medium",
      mitigation: "週内に工程表を更新し、並列化可能な作業を洗い出す",
    },
    aiPromptHint:
      "Fast-trackingの進め方と、並列化可能な作業の見分け方を教えてください",
    applicableWhen: (ctx) =>
      ctx.constraintRanking.primary === "schedule" &&
      ctx.detectedIssues.scheduleDelay !== undefined,
    orderPriority: 2,
  },
  {
    id: "action-scope-review",
    content: "スコープの見直しを検討する（必須要件と推奨要件の仕分け）",
    priority: "medium",
    whyImportant: "スコープ調整で工期・コストを最適化できる可能性がある",
    rationale:
      "本当に必要な要件に絞ることで、追加コストなしで制約を緩和できる",
    risk: {
      description:
        "不要なスコープを含めたまま進めると、工期・コスト両方に悪影響がある",
      severity: "medium",
      mitigation: "発注者と協議し、優先度の低い要件の延期を検討する",
    },
    aiPromptHint:
      "スコープ見直しの進め方と、発注者への提案方法を教えてください",
    applicableWhen: (ctx) =>
      ctx.detectedIssues.scheduleDelay !== undefined ||
      ctx.detectedIssues.costOverrun !== undefined,
    orderPriority: 2.5,
  },

  // ========================================
  // 3. 利害関係者調整
  // ========================================
  {
    id: "action-stakeholder",
    content: "関係者への影響範囲を確認し、早期に情報共有する",
    priority: "high",
    whyImportant: "早期の情報共有により、関係者の対応準備時間を確保する",
    rationale:
      "問題の早期共有は信頼関係の維持に重要。遅れた報告は信頼を損なう",
    risk: {
      description:
        "影響範囲を把握せずに進めると、他工程との調整が困難になる",
      severity: "high",
      mitigation: "本日中に関係者リストを作成し、影響確認の打ち合わせを設定する",
    },
    aiPromptHint:
      "関係者への効果的な情報共有方法と、影響範囲の洗い出し方を教えてください",
    applicableWhen: (ctx) =>
      ctx.detectedIssues.scheduleDelay !== undefined ||
      ctx.detectedIssues.costOverrun !== undefined,
    orderPriority: 3,
  },
  {
    id: "action-client-report",
    content: "発注者への報告・協議を行う",
    priority: "high",
    whyImportant: "契約上の義務を遵守し、信頼関係を維持するため",
    rationale:
      "問題を隠さず早期に報告することが、長期的な信頼構築につながる",
    risk: {
      description:
        "報告が遅れると、契約違反や信頼損失につながる可能性がある",
      severity: "high",
      mitigation: "翌営業日までに状況報告書を作成し、発注者に連絡する",
    },
    aiPromptHint:
      "発注者への報告書の書き方と、協議のポイントを教えてください",
    applicableWhen: (ctx) =>
      ctx.matchedCategories.has("契約") ||
      (ctx.detectedIssues.costOverrun !== undefined &&
        ctx.detectedIssues.costOverrun.severity === "high"),
    orderPriority: 3,
  },

  // ========================================
  // 4. コスト発生緩和策
  // ========================================
  {
    id: "action-crashing",
    content: "追加リソース投入（Crashing）のコスト見積もりを作成する",
    priority: "medium",
    whyImportant:
      "無コスト緩和策で不十分な場合、追加リソースの費用対効果を検討する",
    rationale:
      "追加リソースは費用が発生するため、無コスト対策の後に検討すべき",
    risk: {
      description:
        "見積もりを先延ばしにすると、発注者との交渉時間がなくなる",
      severity: "medium",
      mitigation: "無コスト緩和策の検討後、必要に応じて翌営業日までに概算を作成",
    },
    aiPromptHint:
      "Crashingの費用見積もり方法と、費用対効果の評価方法を教えてください",
    applicableWhen: (ctx) =>
      ctx.constraintRanking.primary === "schedule" &&
      ctx.detectedIssues.scheduleDelay !== undefined,
    orderPriority: 4,
  },
  {
    id: "action-cost-estimate",
    content: "追加コストの見積もりを作成する",
    priority: "medium",
    whyImportant:
      "コスト影響を定量化し、意思決定の材料を揃える",
    rationale:
      "定量的なコスト情報がないと、適切な意思決定ができない",
    risk: {
      description:
        "見積もりが遅れると、発注者との交渉が難航する可能性がある",
      severity: "medium",
      mitigation: "翌営業日までに概算見積もりを作成する",
    },
    aiPromptHint:
      "追加コストの見積もり方法と、発注者への説明方法を教えてください",
    applicableWhen: (ctx) =>
      ctx.detectedIssues.costOverrun !== undefined &&
      ctx.constraintRanking.primary !== "schedule", // スケジュール主体の場合はCrashingを先に
    orderPriority: 4,
  },

  // ========================================
  // 5. 代替案・その他
  // ========================================
  {
    id: "action-alternatives",
    content: "代替案を検討する（工法変更、調達先変更など）",
    priority: "medium",
    whyImportant: "最適な解決策を見つけ、リスクを最小化するため",
    rationale:
      "複数の選択肢を比較検討することで、より良い意思決定ができる",
    risk: {
      description:
        "代替案を検討せずに進めると、より良い解決策を見逃す可能性がある",
      severity: "medium",
      mitigation: "チームミーティングで複数の代替案を洗い出す",
    },
    aiPromptHint:
      "代替案の検討方法と、比較評価の進め方を教えてください",
    applicableWhen: () => true, // 常に適用可能
    orderPriority: 5,
  },
  {
    id: "action-procurement-alt",
    content: "代替調達先を検討する",
    priority: "high",
    whyImportant: "調達リスクを分散し、プロジェクト継続性を確保するため",
    rationale:
      "単一サプライヤーへの依存はリスクが高い。代替先を確保することで継続性を守る",
    risk: {
      description:
        "代替調達先がないと、資材遅延時にプロジェクト全体が停止する可能性がある",
      severity: "high",
      mitigation: "今週中に代替サプライヤー2〜3社をリストアップする",
    },
    aiPromptHint:
      "代替調達先の選定基準と、評価方法を教えてください",
    applicableWhen: (ctx) => ctx.detectedIssues.procurementIssue !== undefined,
    orderPriority: 2,
  },
  {
    id: "action-safety",
    content: "安全対策の追加を検討する",
    priority: "high",
    whyImportant: "作業員の安全を確保し、事故を未然に防ぐため",
    rationale:
      "安全は最優先事項。人命に関わる問題は他のすべてに優先する",
    risk: {
      description: "安全対策を怠ると、重大な事故につながる可能性がある",
      severity: "high",
      mitigation: "本日中に安全パトロールを実施し、対策を講じる",
    },
    aiPromptHint:
      "追加の安全対策と、安全パトロールのポイントを教えてください",
    applicableWhen: (ctx) => ctx.detectedIssues.safetyRisk !== undefined,
    orderPriority: 0, // 安全は最優先
  },
];

/**
 * 状況コンテキストに基づいて適用可能なアクションを取得
 *
 * @param context 状況コンテキスト
 * @param topCaseContent 最上位の類似事例の内容（根拠表示用）
 * @param topCaseId 最上位の類似事例のID
 * @returns PMBOKの推奨順でソートされたNextAction配列
 */
export function getApplicableActions(
  context: SituationContext,
  topCaseContent?: string,
  topCaseId?: string
): NextAction[] {
  // 適用可能なアクションをフィルタリング
  const applicableTemplates = PMBOK_ACTION_TEMPLATES.filter((template) =>
    template.applicableWhen(context)
  );

  // orderPriorityでソート
  applicableTemplates.sort((a, b) => a.orderPriority - b.orderPriority);

  // NextAction形式に変換
  return applicableTemplates.slice(0, 5).map((template) => ({
    id: template.id,
    content: template.content,
    basedOnCaseId: topCaseId || "",
    priority: template.priority,
    whyImportant: template.whyImportant,
    rationale: topCaseContent
      ? `${template.rationale}。過去事例「${topCaseContent}」も参考になる`
      : template.rationale,
    risk: template.risk,
    aiPromptHint: template.aiPromptHint,
  }));
}
