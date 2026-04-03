/**
 * 意思決定ナビゲーター用の選択肢テンプレート
 *
 * 状況に応じた戦略・戦術・アクションレベルの選択肢を提供
 */

import type { DecisionLevel, RiskLevel, RiskStrategy, RiskCategory, GeneratedOption, QCDESImpact, CustomerImpact } from "./types";

/**
 * Phase 6: リスク詳細情報
 * 選択肢に関連するリスクを明確に説明
 */
export type RiskDetail = {
  /** 対象となるリスク: 「〇〇というリスクがあります」 */
  targetRisk: string;
  /** この選択の効果: 「この選択を選ぶと、〇〇できます」 */
  howThisHelps: string;
  /** 残存リスク: 「ただし、△△には注意が必要です」（任意） */
  residualRisk?: string;
  /** トレードオフ: 「この選択により、□□が犠牲になる可能性があります」（任意） */
  tradeoffs?: string[];
};

/** 選択肢テンプレート */
export type OptionTemplate = {
  id: string;
  label: string;
  description: string;
  level: DecisionLevel;
  category: string;
  confidence: number;
  riskLevel: RiskLevel;
  /** PMBOKベースのリスク対応戦略 */
  riskStrategy?: RiskStrategy;
  /** 関連するリスク種別 */
  riskCategories?: RiskCategory[];
  /** Phase 6: リスク詳細情報 */
  riskDetail?: RiskDetail;
  /** このオプションが適用される条件キーワード */
  keywords: string[];
  /** 子となる選択肢のテンプレートID */
  childTemplateIds?: string[];
  /** Phase 13: QCDES影響評価 */
  qcdesImpact?: QCDESImpact;
  /** Phase 13: 顧客影響評価 */
  customerImpact?: CustomerImpact;
};

// ========================================
// Strategy（大方針）レベルの選択肢
// ========================================

export const STRATEGY_TEMPLATES: OptionTemplate[] = [
  // スケジュール問題向け
  {
    id: "strategy-schedule-compress",
    label: "工期を圧縮して対応する",
    description: "追加リソースや並列化で工期を短縮し、当初の納期を守る",
    level: "strategy",
    category: "schedule",
    confidence: 70,
    riskLevel: "medium",
    riskStrategy: "mitigate",
    riskCategories: ["delivery", "cost"],
    riskDetail: {
      targetRisk: "プロジェクトの納期遅延により、顧客との信頼関係が損なわれるリスクがあります",
      howThisHelps: "追加リソースの投入や作業の並列化により、遅延分を取り戻して納期を守ることができます",
      residualRisk: "急ぎ作業による品質低下や、残業増加によるチームの疲弊に注意が必要です",
      tradeoffs: ["コストが増加する可能性があります", "チームの負荷が一時的に上がります"],
    },
    keywords: ["遅延", "工期", "納期", "スケジュール", "遅れ", "リリース", "ローンチ", "公開", "デッドライン", "締切"],
    childTemplateIds: ["tactic-fast-tracking", "tactic-crashing", "tactic-scope-reduction"],
    qcdesImpact: {
      delivery: { impact: "positive", description: "納期遅延リスクを軽減" },
      cost: { impact: "negative", description: "残業・増員によりコスト増の可能性" },
      quality: { impact: "negative", description: "急ぎ作業で品質低下リスク" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "約束を守ることで信頼維持" },
      satisfaction: { impact: "neutral", description: "納期は守れるが品質影響の可能性" },
    },
  },
  {
    id: "strategy-schedule-extend",
    label: "納期を延長する",
    description: "発注者と協議し、現実的なスケジュールに変更する（顧客信頼への影響あり）",
    level: "strategy",
    category: "schedule",
    confidence: 65,
    riskLevel: "medium",
    riskStrategy: "accept",
    riskCategories: ["delivery"],
    riskDetail: {
      targetRisk: "無理な納期で進めると品質低下やチーム疲弊を招くリスクがあります",
      howThisHelps: "現実的なスケジュールに変更することで、品質を確保しながら確実に完了できます",
      residualRisk: "顧客との信頼関係に影響が出る可能性があるため、早めの誠実な説明が重要です",
      tradeoffs: ["顧客の計画に影響を与える可能性があります"],
    },
    keywords: ["遅延", "工期", "納期", "スケジュール", "遅れ", "リリース", "延期"],
    childTemplateIds: ["tactic-client-negotiate", "tactic-phased-delivery"],
    qcdesImpact: {
      delivery: { impact: "negative", description: "納期延長により顧客計画に影響" },
      cost: { impact: "neutral", description: "追加コストは限定的" },
      quality: { impact: "positive", description: "十分な時間で品質確保" },
    },
    customerImpact: {
      relationship: { impact: "negative", description: "顧客との信頼関係にリスク" },
      satisfaction: { impact: "negative", description: "顧客の期待に応えられない" },
    },
  },
  {
    id: "strategy-schedule-scope",
    label: "スコープを調整する",
    description: "優先度の低い要件を延期し、コア機能に集中する",
    level: "strategy",
    category: "schedule",
    confidence: 75,
    riskLevel: "low",
    riskStrategy: "avoid",
    riskCategories: ["delivery", "scope"],
    riskDetail: {
      targetRisk: "全ての要件を実装しようとすると、納期遅延や品質低下のリスクがあります",
      howThisHelps: "優先度の高いコア機能に集中することで、納期を守りながら価値を提供できます",
      residualRisk: "延期した機能について、顧客と明確な合意と次回計画の共有が必要です",
    },
    keywords: ["遅延", "工期", "納期", "スケジュール", "遅れ", "機能", "要件", "リリース"],
    childTemplateIds: ["tactic-must-have-only", "tactic-mvp"],
    qcdesImpact: {
      delivery: { impact: "positive", description: "コア機能を期限内に納品" },
      cost: { impact: "positive", description: "スコープ削減でコスト抑制" },
      quality: { impact: "positive", description: "集中によりコア機能の品質向上" },
    },
    customerImpact: {
      relationship: { impact: "neutral", description: "合意があれば信頼維持" },
      satisfaction: { impact: "neutral", description: "必須機能は提供、追加機能は後日" },
    },
  },

  // コスト問題向け
  {
    id: "strategy-cost-absorb",
    label: "コスト増を自社で吸収する",
    description: "プロジェクト予算内で調整し、追加費用を社内処理する",
    level: "strategy",
    category: "cost",
    confidence: 60,
    riskLevel: "high",
    riskStrategy: "accept",
    riskCategories: ["cost"],
    keywords: ["コスト", "予算", "費用", "超過", "赤字"],
    childTemplateIds: ["tactic-internal-cost-cut", "tactic-efficiency"],
    qcdesImpact: {
      cost: { impact: "negative", description: "自社利益が減少" },
      delivery: { impact: "positive", description: "スケジュールへの影響なし" },
      quality: { impact: "neutral", description: "品質への直接影響なし" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "顧客負担なしで信頼維持" },
      satisfaction: { impact: "positive", description: "顧客の期待通りに納品" },
    },
  },
  {
    id: "strategy-cost-negotiate",
    label: "発注者と費用協議する",
    description: "追加費用の一部または全部を発注者に請求する",
    level: "strategy",
    category: "cost",
    confidence: 70,
    riskLevel: "medium",
    riskStrategy: "transfer",
    riskCategories: ["cost"],
    keywords: ["コスト", "予算", "費用", "超過", "追加"],
    childTemplateIds: ["tactic-change-order", "tactic-contract-revision"],
    qcdesImpact: {
      cost: { impact: "positive", description: "適切な費用負担で収益確保" },
      delivery: { impact: "neutral", description: "協議次第でスケジュール調整" },
      quality: { impact: "positive", description: "適切な予算で品質確保" },
    },
    customerImpact: {
      relationship: { impact: "neutral", description: "透明な協議で関係維持" },
      satisfaction: { impact: "neutral", description: "追加費用の理解が必要" },
    },
  },
  {
    id: "strategy-cost-scope",
    label: "スコープを削減する",
    description: "機能や品質を調整し、予算内に収める",
    level: "strategy",
    category: "cost",
    confidence: 75,
    riskLevel: "low",
    riskStrategy: "avoid",
    riskCategories: ["cost", "scope"],
    keywords: ["コスト", "予算", "費用", "スコープ", "機能"],
    childTemplateIds: ["tactic-must-have-only", "tactic-quality-adjust"],
    qcdesImpact: {
      cost: { impact: "positive", description: "予算内に収まる" },
      delivery: { impact: "positive", description: "スコープ縮小で納期も安定" },
      quality: { impact: "neutral", description: "対象範囲内の品質は維持" },
    },
    customerImpact: {
      relationship: { impact: "neutral", description: "合意プロセス次第" },
      satisfaction: { impact: "negative", description: "一部機能が提供されない" },
    },
  },

  // 品質問題向け
  {
    id: "strategy-quality-assess",
    label: "影響範囲を評価する",
    description: "不具合の深刻度と影響範囲を確認し、判断材料を揃える",
    level: "strategy",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    riskStrategy: "avoid",
    riskCategories: ["quality"],
    keywords: ["品質", "不具合", "バグ", "影響", "評価", "判断", "直す", "リリース"],
    childTemplateIds: ["tactic-impact-analysis", "tactic-severity-check"],
    qcdesImpact: {
      quality: { impact: "positive", description: "問題の全容把握で適切な対応が可能" },
      delivery: { impact: "neutral", description: "評価後に影響を判断" },
      safety: { impact: "positive", description: "リスクを事前に把握" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "誠実な対応姿勢を示せる" },
      satisfaction: { impact: "neutral", description: "情報収集段階" },
    },
  },
  {
    id: "strategy-quality-workaround",
    label: "暫定対応で乗り切る",
    description: "根本修正せず、ワークアラウンドで当面の問題を回避する",
    level: "strategy",
    category: "quality",
    confidence: 70,
    riskLevel: "medium",
    riskStrategy: "mitigate",
    riskCategories: ["quality", "delivery"],
    keywords: ["品質", "不具合", "暫定", "ワークアラウンド", "回避", "リリース"],
    childTemplateIds: ["tactic-workaround", "tactic-document-known-issues"],
    qcdesImpact: {
      quality: { impact: "negative", description: "根本解決を先送り" },
      delivery: { impact: "positive", description: "納期を守れる" },
      cost: { impact: "positive", description: "短期的にはコスト抑制" },
    },
    customerImpact: {
      relationship: { impact: "neutral", description: "透明な説明が必要" },
      satisfaction: { impact: "negative", description: "一部機能に制限が残る" },
    },
  },
  {
    id: "strategy-quality-fix",
    label: "品質問題を修正する",
    description: "根本原因を特定し、再発防止策を講じる",
    level: "strategy",
    category: "quality",
    confidence: 80,
    riskLevel: "medium",
    riskStrategy: "mitigate",
    riskCategories: ["quality"],
    keywords: ["品質", "不具合", "欠陥", "問題", "エラー", "修正", "直す"],
    childTemplateIds: ["tactic-root-cause", "tactic-rework", "tactic-inspection"],
    qcdesImpact: {
      quality: { impact: "positive", description: "根本解決で品質向上" },
      delivery: { impact: "negative", description: "修正作業で納期影響の可能性" },
      cost: { impact: "negative", description: "修正コストが発生" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "品質重視の姿勢を評価される" },
      satisfaction: { impact: "positive", description: "問題のない製品を提供" },
    },
  },
  {
    id: "strategy-quality-accept",
    label: "現状の品質を受け入れる",
    description: "軽微な問題として許容し、次フェーズで改善する",
    level: "strategy",
    category: "quality",
    confidence: 50,
    riskLevel: "high",
    riskStrategy: "accept",
    riskCategories: ["quality"],
    keywords: ["品質", "軽微", "許容", "次フェーズ", "受け入れ"],
    childTemplateIds: ["tactic-document-known-issues", "tactic-workaround"],
    qcdesImpact: {
      quality: { impact: "negative", description: "問題が残存" },
      delivery: { impact: "positive", description: "納期を守れる" },
      cost: { impact: "positive", description: "追加コストなし" },
    },
    customerImpact: {
      relationship: { impact: "negative", description: "品質への姿勢を疑われる可能性" },
      satisfaction: { impact: "negative", description: "既知の問題がある状態で納品" },
    },
  },

  // リソース問題向け
  {
    id: "strategy-resource-internal",
    label: "社内リソースで対応する",
    description: "社内の他プロジェクトから人員を調達する",
    level: "strategy",
    category: "resource",
    confidence: 65,
    riskLevel: "medium",
    riskStrategy: "mitigate",
    riskCategories: ["delivery"],
    keywords: ["人員", "リソース", "不足", "人手"],
    childTemplateIds: ["tactic-overtime"],  // tactic-internal-transfer は削除済み
    qcdesImpact: {
      delivery: { impact: "positive", description: "人員確保でスケジュール安定" },
      cost: { impact: "neutral", description: "社内調整なので追加コスト限定" },
      quality: { impact: "neutral", description: "既存メンバーなら品質維持" },
    },
    customerImpact: {
      relationship: { impact: "neutral", description: "顧客への直接影響なし" },
      satisfaction: { impact: "positive", description: "納期を守れる可能性向上" },
    },
  },
  {
    id: "strategy-resource-external",
    label: "外部リソースを調達する",
    description: "協力会社や派遣会社から人員を調達する",
    level: "strategy",
    category: "resource",
    confidence: 70,
    riskLevel: "medium",
    riskStrategy: "transfer",
    riskCategories: ["delivery", "cost"],
    keywords: ["人員", "リソース", "不足", "外注", "協力会社"],
    childTemplateIds: ["tactic-subcontract", "tactic-temp-staff"],
    qcdesImpact: {
      delivery: { impact: "positive", description: "人員補充でスケジュール対応" },
      cost: { impact: "negative", description: "外部調達コストが発生" },
      quality: { impact: "negative", description: "新規参入者の立ち上げリスク" },
    },
    customerImpact: {
      relationship: { impact: "neutral", description: "顧客への直接影響なし" },
      satisfaction: { impact: "neutral", description: "納期対応次第" },
    },
  },

  // 仕様変更・要件変更向け
  {
    id: "strategy-change-assess",
    label: "変更の影響を評価する",
    description: "仕様変更がコスト・納期・品質に与える影響を分析する",
    level: "strategy",
    category: "change",
    confidence: 85,
    riskLevel: "low",
    riskStrategy: "avoid",
    riskCategories: ["scope", "delivery", "cost"],
    keywords: ["仕様変更", "要件変更", "スコープ変更", "変更", "追加要件", "要望", "修正依頼", "仕様追加", "機能追加"],
    childTemplateIds: ["tactic-impact-analysis", "tactic-change-cost-estimate"],
    qcdesImpact: {
      delivery: { impact: "neutral", description: "評価後に影響を判断" },
      cost: { impact: "neutral", description: "評価後にコスト影響を算出" },
      quality: { impact: "positive", description: "事前評価で品質リスク把握" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "誠実な対応姿勢を示せる" },
      satisfaction: { impact: "positive", description: "透明性のある対応" },
    },
  },
  {
    id: "strategy-change-accept",
    label: "変更を受け入れる",
    description: "仕様変更を受け入れ、計画を修正する",
    level: "strategy",
    category: "change",
    confidence: 70,
    riskLevel: "medium",
    riskStrategy: "mitigate",
    riskCategories: ["scope", "delivery"],
    keywords: ["仕様変更", "要件変更", "受け入れ", "対応", "追加", "変更対応"],
    childTemplateIds: ["tactic-change-order", "tactic-scope-reduction"],
    qcdesImpact: {
      delivery: { impact: "negative", description: "追加作業でスケジュール影響" },
      cost: { impact: "negative", description: "追加コストが発生" },
      quality: { impact: "neutral", description: "適切な計画変更で品質維持" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "顧客要望への柔軟な対応" },
      satisfaction: { impact: "positive", description: "要望が反映される" },
    },
  },
  {
    id: "strategy-change-reject",
    label: "変更を断る・延期する",
    description: "現在のスコープを維持し、変更は次フェーズに回す",
    level: "strategy",
    category: "change",
    confidence: 75,
    riskLevel: "low",
    riskStrategy: "avoid",
    riskCategories: ["scope"],
    keywords: ["仕様変更", "要件変更", "断る", "延期", "次フェーズ", "拒否", "保留"],
    childTemplateIds: ["tactic-client-negotiate", "tactic-phased-delivery"],
    qcdesImpact: {
      delivery: { impact: "positive", description: "当初スケジュールを維持" },
      cost: { impact: "positive", description: "追加コストなし" },
      quality: { impact: "positive", description: "品質に集中できる" },
    },
    customerImpact: {
      relationship: { impact: "negative", description: "顧客要望を断る形になる" },
      satisfaction: { impact: "negative", description: "要望が即座に反映されない" },
    },
  },
  {
    id: "strategy-change-negotiate",
    label: "発注者と条件を交渉する",
    description: "変更に伴うコスト増・納期延長について協議する",
    level: "strategy",
    category: "change",
    confidence: 80,
    riskLevel: "low",
    riskStrategy: "transfer",
    riskCategories: ["cost", "delivery"],
    keywords: ["仕様変更", "要件変更", "交渉", "協議", "条件", "追加費用", "見積"],
    childTemplateIds: ["tactic-change-order", "tactic-contract-revision"],
    qcdesImpact: {
      delivery: { impact: "neutral", description: "交渉次第でスケジュール調整" },
      cost: { impact: "positive", description: "適切な費用負担で収益確保" },
      quality: { impact: "positive", description: "適切なリソースで品質確保" },
    },
    customerImpact: {
      relationship: { impact: "positive", description: "透明な協議で長期的信頼構築" },
      satisfaction: { impact: "neutral", description: "条件次第で要望対応" },
    },
  },
];

// ========================================
// Tactic（戦術）レベルの選択肢
// ========================================

export const TACTIC_TEMPLATES: OptionTemplate[] = [
  // スケジュール圧縮の戦術
  {
    id: "tactic-fast-tracking",
    label: "Fast-tracking（並列化）",
    description: "本来順次で行う作業を並列化して工期を短縮",
    level: "tactic",
    category: "schedule",
    confidence: 70,
    riskLevel: "medium",
    keywords: ["並列", "同時", "fast-tracking"],
    childTemplateIds: ["action-identify-parallel", "action-update-schedule"],
  },
  {
    id: "tactic-crashing",
    label: "Crashing（リソース追加）",
    description: "追加リソースを投入して工期を短縮",
    level: "tactic",
    category: "schedule",
    confidence: 65,
    riskLevel: "high",
    keywords: ["追加", "リソース", "人員", "crashing"],
    childTemplateIds: ["action-estimate-cost", "action-request-resource"],
  },
  {
    id: "tactic-scope-reduction",
    label: "スコープ削減",
    description: "優先度の低い機能を延期または削除",
    level: "tactic",
    category: "schedule",
    confidence: 75,
    riskLevel: "low",
    keywords: ["スコープ", "機能", "削減", "延期"],
    childTemplateIds: ["action-prioritize-features", "action-client-discuss"],
  },
  {
    id: "tactic-client-negotiate",
    label: "発注者と納期交渉",
    description: "現実的なスケジュールへの変更を協議",
    level: "tactic",
    category: "schedule",
    confidence: 80,
    riskLevel: "low",
    keywords: ["交渉", "協議", "発注者", "クライアント"],
    childTemplateIds: ["action-prepare-proposal", "action-schedule-meeting"],
  },
  {
    id: "tactic-phased-delivery",
    label: "段階的納品",
    description: "優先機能を先行納品し、残りは後続で対応",
    level: "tactic",
    category: "schedule",
    confidence: 75,
    riskLevel: "low",
    keywords: ["段階", "フェーズ", "分割", "優先"],
    childTemplateIds: ["action-define-phases", "action-client-discuss"],
  },
  {
    id: "tactic-must-have-only",
    label: "必須機能のみ実装",
    description: "Must-have要件に絞り、Nice-to-haveは延期",
    level: "tactic",
    category: "schedule",
    confidence: 80,
    riskLevel: "low",
    keywords: ["必須", "優先", "要件", "must-have"],
    childTemplateIds: ["action-categorize-requirements", "action-client-approve"],
  },
  {
    id: "tactic-mvp",
    label: "MVP（最小限製品）として納品",
    description: "コア機能のみで納品し、追加機能は次フェーズ",
    level: "tactic",
    category: "schedule",
    confidence: 75,
    riskLevel: "medium",
    keywords: ["MVP", "最小", "コア", "基本"],
    childTemplateIds: ["action-define-mvp", "action-plan-next-phase"],
  },

  // コスト管理の戦術
  {
    id: "tactic-internal-cost-cut",
    label: "社内コスト削減",
    description: "効率化や残業削減でコストを抑制",
    level: "tactic",
    category: "cost",
    confidence: 60,
    riskLevel: "medium",
    keywords: ["削減", "効率", "コストカット"],
    childTemplateIds: ["action-identify-waste", "action-optimize-process"],
  },
  {
    id: "tactic-change-order",
    label: "変更指示書の発行",
    description: "スコープ変更に伴う追加費用を正式に請求",
    level: "tactic",
    category: "cost",
    confidence: 75,
    riskLevel: "low",
    keywords: ["変更", "追加", "請求", "変更指示"],
    childTemplateIds: ["action-document-changes", "action-calculate-cost"],
  },
  {
    id: "tactic-contract-revision",
    label: "契約変更協議",
    description: "契約条件の見直しを発注者と協議",
    level: "tactic",
    category: "cost",
    confidence: 65,
    riskLevel: "medium",
    keywords: ["契約", "変更", "協議", "条件"],
    childTemplateIds: ["action-review-contract", "action-prepare-proposal"],
  },

  // 品質管理の戦術
  {
    id: "tactic-impact-analysis",
    label: "影響範囲分析",
    description: "不具合がどの機能・ユーザーに影響するか特定",
    level: "tactic",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["影響", "範囲", "分析", "特定", "機能"],
    childTemplateIds: ["action-list-affected-features", "action-count-affected-users"],
  },
  {
    id: "tactic-severity-check",
    label: "深刻度判定",
    description: "不具合の深刻度をS/A/B/Cでランク付け",
    level: "tactic",
    category: "quality",
    confidence: 80,
    riskLevel: "low",
    keywords: ["深刻度", "重要度", "ランク", "優先度", "判定"],
    childTemplateIds: ["action-define-severity", "action-check-blockers"],
  },
  {
    id: "tactic-workaround",
    label: "ワークアラウンド策定",
    description: "根本修正なしで問題を回避する方法を検討",
    level: "tactic",
    category: "quality",
    confidence: 70,
    riskLevel: "medium",
    keywords: ["ワークアラウンド", "回避策", "暫定", "代替"],
    childTemplateIds: ["action-design-workaround", "action-test-workaround"],
  },
  {
    id: "tactic-document-known-issues",
    label: "既知問題として文書化",
    description: "不具合を既知問題として記録し、ユーザーに周知",
    level: "tactic",
    category: "quality",
    confidence: 75,
    riskLevel: "low",
    keywords: ["文書", "記録", "周知", "既知問題", "リリースノート"],
    childTemplateIds: ["action-write-known-issues", "action-notify-users"],
  },
  {
    id: "tactic-phased-release",
    label: "段階的リリース",
    description: "限定公開で様子を見ながら段階的にリリース",
    level: "tactic",
    category: "delivery",
    confidence: 75,
    riskLevel: "medium",
    keywords: ["段階", "フェーズ", "限定", "β", "カナリア", "リリース"],
    childTemplateIds: ["action-define-rollout-plan", "action-setup-feature-flag"],
  },
  {
    id: "tactic-root-cause",
    label: "根本原因分析",
    description: "問題の真因を特定し、再発防止策を策定",
    level: "tactic",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["原因", "分析", "RCA", "なぜなぜ"],
    childTemplateIds: ["action-5why-analysis", "action-create-countermeasure"],
  },
  {
    id: "tactic-rework",
    label: "手直し・再作業",
    description: "問題箇所を修正し、品質基準を満たす",
    level: "tactic",
    category: "quality",
    confidence: 80,
    riskLevel: "medium",
    keywords: ["修正", "手直し", "再作業", "やり直し"],
    childTemplateIds: ["action-identify-defects", "action-schedule-rework"],
  },
  {
    id: "tactic-inspection",
    label: "検査強化",
    description: "検査頻度や項目を増やし、問題の早期発見",
    level: "tactic",
    category: "quality",
    confidence: 75,
    riskLevel: "low",
    keywords: ["検査", "チェック", "確認", "品質管理"],
    childTemplateIds: ["action-add-checkpoints", "action-train-inspectors"],
  },

  // リソース管理の戦術
  // 注: 「社内異動」テンプレートは人事を巻き込む特殊なケースのため削除
  // ユーザーからのフィードバック: とっぴすぎる選択肢は表示しない
  {
    id: "tactic-subcontract",
    label: "協力会社への発注",
    description: "外部の協力会社に作業を委託",
    level: "tactic",
    category: "resource",
    confidence: 70,
    riskLevel: "medium",
    keywords: ["外注", "協力会社", "委託", "発注"],
    childTemplateIds: ["action-select-vendor", "action-prepare-spec"],
  },

  // 仕様変更関連の戦術
  {
    id: "tactic-change-cost-estimate",
    label: "変更コストを見積もる",
    description: "仕様変更に伴う追加工数・費用を算出",
    level: "tactic",
    category: "change",
    confidence: 85,
    riskLevel: "low",
    keywords: ["変更", "見積", "コスト", "工数", "費用", "仕様変更"],
    childTemplateIds: ["action-estimate-cost", "action-prepare-proposal"],
  },
  {
    id: "tactic-change-scope-analysis",
    label: "変更範囲を明確化する",
    description: "仕様変更の具体的な範囲と影響箇所を特定",
    level: "tactic",
    category: "change",
    confidence: 80,
    riskLevel: "low",
    keywords: ["変更", "範囲", "影響", "特定", "仕様変更"],
    childTemplateIds: ["action-list-affected-features", "action-document-changes"],
  },
  {
    id: "tactic-change-prioritize",
    label: "変更の優先順位を決める",
    description: "複数の変更要求に優先順位をつけ、対応順序を決定",
    level: "tactic",
    category: "change",
    confidence: 75,
    riskLevel: "low",
    keywords: ["変更", "優先", "順位", "トリアージ", "仕様変更"],
    childTemplateIds: ["action-prioritize-features", "action-client-discuss"],
  },
];

// ========================================
// Action（具体的アクション）レベルの選択肢
// ========================================

export const ACTION_TEMPLATES: OptionTemplate[] = [
  // スケジュール関連アクション
  {
    id: "action-identify-parallel",
    label: "並列化可能な作業を洗い出す",
    description: "工程表を見直し、同時実行可能な作業を特定",
    level: "action",
    category: "schedule",
    confidence: 85,
    riskLevel: "low",
    keywords: ["工程", "並列", "洗い出し"],
  },
  {
    id: "action-update-schedule",
    label: "工程表を更新する",
    description: "変更を反映した新しい工程表を作成",
    level: "action",
    category: "schedule",
    confidence: 90,
    riskLevel: "low",
    keywords: ["工程表", "更新", "スケジュール"],
  },
  {
    id: "action-estimate-cost",
    label: "追加コストを見積もる",
    description: "リソース追加に必要な費用を算出",
    level: "action",
    category: "cost",
    confidence: 80,
    riskLevel: "low",
    keywords: ["見積", "コスト", "費用"],
  },
  {
    id: "action-request-resource",
    label: "リソース追加を申請する",
    description: "上長または PMO に追加リソースを申請",
    level: "action",
    category: "resource",
    confidence: 75,
    riskLevel: "low",
    keywords: ["申請", "リソース", "追加"],
  },
  {
    id: "action-prioritize-features",
    label: "機能の優先順位を付ける",
    description: "Must/Should/Could/Won't で機能を分類",
    level: "action",
    category: "scope",
    confidence: 85,
    riskLevel: "low",
    keywords: ["優先", "機能", "分類"],
  },
  {
    id: "action-client-discuss",
    label: "発注者と協議する",
    description: "変更内容について発注者と打ち合わせ",
    level: "action",
    category: "communication",
    confidence: 80,
    riskLevel: "low",
    keywords: ["協議", "打ち合わせ", "発注者"],
  },
  {
    id: "action-prepare-proposal",
    label: "提案書を作成する",
    description: "変更提案の内容をまとめた資料を作成",
    level: "action",
    category: "communication",
    confidence: 85,
    riskLevel: "low",
    keywords: ["提案", "資料", "作成"],
  },
  {
    id: "action-schedule-meeting",
    label: "打ち合わせを設定する",
    description: "関係者との会議を調整・設定",
    level: "action",
    category: "communication",
    confidence: 90,
    riskLevel: "low",
    keywords: ["会議", "打ち合わせ", "設定"],
  },
  {
    id: "action-define-phases",
    label: "フェーズを定義する",
    description: "段階的納品のフェーズ分けを決定",
    level: "action",
    category: "schedule",
    confidence: 80,
    riskLevel: "low",
    keywords: ["フェーズ", "段階", "定義"],
  },
  {
    id: "action-categorize-requirements",
    label: "要件を分類する",
    description: "Must/Should/Could で要件を仕分け",
    level: "action",
    category: "scope",
    confidence: 85,
    riskLevel: "low",
    keywords: ["要件", "分類", "仕分け"],
  },
  {
    id: "action-client-approve",
    label: "発注者の承認を得る",
    description: "変更内容について正式な承認を取得",
    level: "action",
    category: "communication",
    confidence: 75,
    riskLevel: "low",
    keywords: ["承認", "発注者", "正式"],
  },

  // 品質関連アクション
  {
    id: "action-list-affected-features",
    label: "影響機能を洗い出す",
    description: "不具合が影響する機能一覧を作成",
    level: "action",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["影響", "機能", "洗い出し", "一覧"],
  },
  {
    id: "action-count-affected-users",
    label: "影響ユーザー数を推定する",
    description: "不具合の影響を受けるユーザー数を見積もる",
    level: "action",
    category: "quality",
    confidence: 80,
    riskLevel: "low",
    keywords: ["ユーザー", "推定", "見積もり", "影響"],
  },
  {
    id: "action-define-severity",
    label: "深刻度を定義する",
    description: "S（致命的）〜C（軽微）のランクを決定",
    level: "action",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["深刻度", "定義", "ランク", "優先度"],
  },
  {
    id: "action-check-blockers",
    label: "ブロッカーを確認する",
    description: "リリースを止めるべき致命的な問題か判断",
    level: "action",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["ブロッカー", "致命的", "判断", "リリース"],
  },
  {
    id: "action-design-workaround",
    label: "ワークアラウンドを設計する",
    description: "回避策の具体的な手順を設計",
    level: "action",
    category: "quality",
    confidence: 70,
    riskLevel: "medium",
    keywords: ["ワークアラウンド", "設計", "手順", "回避"],
  },
  {
    id: "action-test-workaround",
    label: "ワークアラウンドをテストする",
    description: "回避策が正しく機能するか検証",
    level: "action",
    category: "quality",
    confidence: 75,
    riskLevel: "low",
    keywords: ["ワークアラウンド", "テスト", "検証"],
  },
  {
    id: "action-write-known-issues",
    label: "既知問題を記載する",
    description: "リリースノートに既知問題として記載",
    level: "action",
    category: "quality",
    confidence: 80,
    riskLevel: "low",
    keywords: ["既知問題", "記載", "リリースノート"],
  },
  {
    id: "action-notify-users",
    label: "ユーザーに周知する",
    description: "影響を受けるユーザーに事前に通知",
    level: "action",
    category: "communication",
    confidence: 80,
    riskLevel: "low",
    keywords: ["周知", "通知", "ユーザー"],
  },
  {
    id: "action-define-rollout-plan",
    label: "展開計画を策定する",
    description: "段階的リリースの計画を作成",
    level: "action",
    category: "delivery",
    confidence: 80,
    riskLevel: "low",
    keywords: ["展開", "計画", "リリース", "段階"],
  },
  {
    id: "action-setup-feature-flag",
    label: "フィーチャーフラグを設定する",
    description: "機能の切り替えを可能にする仕組みを用意",
    level: "action",
    category: "delivery",
    confidence: 75,
    riskLevel: "low",
    keywords: ["フィーチャーフラグ", "切り替え", "設定"],
  },
  {
    id: "action-5why-analysis",
    label: "なぜなぜ分析を行う",
    description: "5回の「なぜ」で根本原因を特定",
    level: "action",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["なぜなぜ", "分析", "原因"],
  },
  {
    id: "action-create-countermeasure",
    label: "再発防止策を策定する",
    description: "根本原因に対する対策を立案",
    level: "action",
    category: "quality",
    confidence: 80,
    riskLevel: "low",
    keywords: ["再発防止", "対策", "策定"],
  },
  {
    id: "action-identify-defects",
    label: "不具合箇所を特定する",
    description: "問題のある箇所を詳細に洗い出し",
    level: "action",
    category: "quality",
    confidence: 85,
    riskLevel: "low",
    keywords: ["不具合", "特定", "洗い出し"],
  },
  {
    id: "action-schedule-rework",
    label: "手直し作業を計画する",
    description: "修正作業のスケジュールを策定",
    level: "action",
    category: "quality",
    confidence: 80,
    riskLevel: "low",
    keywords: ["手直し", "計画", "スケジュール"],
  },

  // 仕様変更関連アクション
  {
    id: "action-document-changes",
    label: "変更内容を文書化する",
    description: "仕様変更の内容を正式に文書化し記録",
    level: "action",
    category: "change",
    confidence: 85,
    riskLevel: "low",
    keywords: ["文書", "記録", "変更", "仕様変更"],
  },
  {
    id: "action-assess-change-impact",
    label: "変更の影響を分析する",
    description: "仕様変更が既存機能やスケジュールに与える影響を分析",
    level: "action",
    category: "change",
    confidence: 80,
    riskLevel: "low",
    keywords: ["影響", "分析", "変更", "仕様変更"],
  },
];

/** すべてのテンプレートを統合 */
export const ALL_TEMPLATES: OptionTemplate[] = [
  ...STRATEGY_TEMPLATES,
  ...TACTIC_TEMPLATES,
  ...ACTION_TEMPLATES,
];

/**
 * キーワードマッチングで適用可能な選択肢を取得
 *
 * @param purpose 目的（キーワード抽出元）
 * @param level 決定レベル（strategy, tactic, action）
 * @param parentTemplateId 親テンプレートID（子テンプレートを取得する場合）
 * @param excludeLabels 除外するラベル（既に選択済みの選択肢を除外）
 */
export function findMatchingTemplates(
  purpose: string,
  level: DecisionLevel,
  parentTemplateId?: string,
  excludeLabels?: string[]
): OptionTemplate[] {
  const normalizedPurpose = purpose.toLowerCase();
  const keywords = normalizedPurpose.split(/[\s、。・]+/).filter((k) => k.length > 0);

  // 除外ラベルをセットに変換（高速検索用）
  const excludeSet = new Set(excludeLabels?.map(l => l.toLowerCase()) ?? []);

  // 親テンプレートが指定されている場合、その子テンプレートを取得
  if (parentTemplateId) {
    const parentTemplate = ALL_TEMPLATES.find((t) => t.id === parentTemplateId);
    if (parentTemplate?.childTemplateIds) {
      return ALL_TEMPLATES.filter((t) =>
        parentTemplate.childTemplateIds?.includes(t.id) &&
        !excludeSet.has(t.label.toLowerCase())
      );
    }
  }

  // レベルでフィルタリング
  const levelTemplates = ALL_TEMPLATES.filter((t) =>
    t.level === level &&
    !excludeSet.has(t.label.toLowerCase())
  );

  // キーワードマッチングでスコアリング
  const scored = levelTemplates.map((template) => {
    let score = 0;
    for (const keyword of keywords) {
      if (template.keywords.some((tk) => tk.includes(keyword) || keyword.includes(tk))) {
        score += 10;
      }
      if (template.label.includes(keyword) || template.description.includes(keyword)) {
        score += 5;
      }
    }
    return { template, score };
  });

  // スコア順でソートし、スコアが0より大きいもののみ返す（制限なし）
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((s) => s.template);
}

/**
 * テンプレートをGeneratedOption形式に変換
 */
export function templateToOption(
  template: OptionTemplate,
  pastCases: import("../../domain/types").SimilarCase[] = []
): GeneratedOption {
  const relatedCases = pastCases.filter((c) =>
    template.keywords.some(
      (k) => c.content.includes(k) || (c.adoptedConclusion?.includes(k) ?? false)
    )
  );

  return {
    label: template.label,
    description: template.description,
    confidence: template.confidence,
    riskLevel: template.riskLevel,
    riskStrategy: template.riskStrategy,
    riskCategories: template.riskCategories,
    // Phase 6: リスク詳細情報
    riskDetail: template.riskDetail,
    relatedPastCases: relatedCases.slice(0, 3),
    source: relatedCases.length > 0 ? "past_case" : "ai_generated",
    // Phase 13: QCDES・顧客影響
    qcdesImpact: template.qcdesImpact,
    customerImpact: template.customerImpact,
  };
}
