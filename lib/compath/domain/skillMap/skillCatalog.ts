/**
 * スキルカタログ
 *
 * 製造業における技能伝承に必要なスキル体系を定義する。
 * 技術スキルだけでなく、ビジョン・マネジメント・市場理解等も含む。
 *
 * 各スキルに認知→理解→応用→統合の4段階レベル記述を持つ。
 * 「次に何ができればレベルが上がるか」を明示する設計。
 */

import type { SkillLevel } from "./types";

// ============================================================
// 型定義
// ============================================================

/** レベルごとの具体的記述 */
export type LevelDescription = {
  /** このレベルでできること */
  description: string;
  /** 次のレベルに上がるために必要なこと（Lv.4 は到達状態の記述） */
  nextStep: string;
};

/** スキル項目の完全定義 */
export type SkillDefinition = {
  id: string;
  name: string;
  /** 所属カテゴリID */
  categoryId: string;
  /** 各レベルの記述 */
  levels: Record<SkillLevel, LevelDescription>;
};

/** スキルカテゴリ */
export type SkillCategory = {
  id: string;
  name: string;
  /** 表示順 */
  order: number;
};

// ============================================================
// カテゴリ定義
// ============================================================

export const SKILL_CATEGORIES: SkillCategory[] = [
  { id: "vision", name: "ビジョン・戦略", order: 1 },
  { id: "management", name: "マネジメント", order: 2 },
  { id: "process-design", name: "工程設計", order: 3 },
  { id: "manufacturing", name: "加工技術", order: 4 },
  { id: "quality", name: "品質管理", order: 5 },
  { id: "equipment", name: "設備・保全", order: 6 },
  { id: "market", name: "市場・競合", order: 7 },
  { id: "communication", name: "コミュニケーション", order: 8 },
];

// ============================================================
// スキル定義
// ============================================================

export const SKILL_DEFINITIONS: SkillDefinition[] = [
  // ─── ビジョン・戦略 ───
  {
    id: "biz-strategy",
    name: "事業戦略の理解",
    categoryId: "vision",
    levels: {
      1: { description: "自社の事業領域を知っている", nextStep: "中期経営計画の主要テーマを説明できるようになる" },
      2: { description: "中期計画のテーマと自部門の関係を説明できる", nextStep: "技術ロードマップと事業戦略の接続を語れるようになる" },
      3: { description: "自部門の施策を事業戦略と紐づけて提案できる", nextStep: "複数事業間の優先度判断に参画できるようになる" },
      4: { description: "事業ポートフォリオの観点から技術投資の優先度を判断できる", nextStep: "到達: 経営層と技術戦略を議論できる水準" },
    },
  },
  {
    id: "tech-roadmap",
    name: "技術ロードマップ",
    categoryId: "vision",
    levels: {
      1: { description: "自社の主要製品・技術を知っている", nextStep: "技術の世代交代や開発計画を把握する" },
      2: { description: "次世代技術の方向性と自分の業務の関係を理解している", nextStep: "技術トレンドを踏まえた提案ができるようになる" },
      3: { description: "技術ロードマップに基づいて先行検討を提案できる", nextStep: "ロードマップ自体の策定に貢献できるようになる" },
      4: { description: "業界動向と自社技術を俯瞰してロードマップを策定できる", nextStep: "到達: 技術戦略のリーダーシップを担える水準" },
    },
  },
  {
    id: "innovation-mindset",
    name: "改善・革新マインド",
    categoryId: "vision",
    levels: {
      1: { description: "改善提案制度を知っている", nextStep: "自分の業務で改善点を見つけて提案する" },
      2: { description: "日常業務の中で改善を実行している", nextStep: "部門横断的な改善テーマをリードできるようになる" },
      3: { description: "部門を超えた改善プロジェクトを推進している", nextStep: "業務プロセスの抜本的な再設計を提案できるようになる" },
      4: { description: "既存の枠にとらわれず業務変革を構想・実行できる", nextStep: "到達: 組織変革のドライバーとなれる水準" },
    },
  },

  // ─── マネジメント ───
  {
    id: "project-mgmt",
    name: "プロジェクト管理",
    categoryId: "management",
    levels: {
      1: { description: "WBSやガントチャートの読み方を知っている", nextStep: "小規模タスクのスケジュールを自分で管理できるようになる" },
      2: { description: "担当範囲のスケジュール・進捗を管理できる", nextStep: "リスクを事前に洗い出し、対策を計画できるようになる" },
      3: { description: "複数メンバーのタスクを調整しプロジェクトを推進できる", nextStep: "複数プロジェクトの優先度調整とリソース配分ができるようになる" },
      4: { description: "部門横断プロジェクトのPMとして全体最適を図れる", nextStep: "到達: 複雑なプロジェクトを自律的に完遂できる水準" },
    },
  },
  {
    id: "people-dev",
    name: "人材育成",
    categoryId: "management",
    levels: {
      1: { description: "OJTの基本的な進め方を知っている", nextStep: "後輩に手順を教えながら理由も説明できるようになる" },
      2: { description: "手順だけでなく判断の根拠を含めて指導できる", nextStep: "相手のレベルに合わせた育成計画を立てられるようになる" },
      3: { description: "育成計画を策定し、成長度合いを評価しながら指導している", nextStep: "組織全体のスキルギャップを特定し育成戦略を立案できるようになる" },
      4: { description: "組織の人材ポートフォリオを踏まえた育成戦略を設計できる", nextStep: "到達: 組織能力開発のリーダーシップを担える水準" },
    },
  },
  {
    id: "resource-allocation",
    name: "リソース配分",
    categoryId: "management",
    levels: {
      1: { description: "自分の業務量を把握できている", nextStep: "チーム内のリソース状況を可視化できるようになる" },
      2: { description: "チーム内の負荷状況を把握し、応援要請ができる", nextStep: "複数案件間の優先度を判断してリソースを再配置できるようになる" },
      3: { description: "部門内のリソースを案件優先度に応じて配分できる", nextStep: "部門間のリソース交渉と中長期の人員計画ができるようになる" },
      4: { description: "組織全体のリソース最適化と採用・育成計画を統合的に管理できる", nextStep: "到達: 組織リソースの戦略的マネジメントができる水準" },
    },
  },

  // ─── 工程設計 ───
  {
    id: "process-sequence",
    name: "工程順序の構想",
    categoryId: "process-design",
    levels: {
      1: { description: "基本的な加工工程の順序を知っている", nextStep: "製品要求から工程順序を自分で組み立てられるようになる" },
      2: { description: "標準的な製品に対して工程順序を設計できる", nextStep: "複数の工程案を比較してトレードオフを評価できるようになる" },
      3: { description: "複数案の比較・最適化を行い工程を設計できる", nextStep: "前例のない製品でも一から工程を構想できるようになる" },
      4: { description: "新規性の高い製品でも成立する工程を構想・検証できる", nextStep: "到達: 工程設計の第一人者として組織をリードできる水準" },
    },
  },
  {
    id: "material-selection",
    name: "材料選定",
    categoryId: "process-design",
    levels: {
      1: { description: "主要材料の名前と基本特性を知っている", nextStep: "用途に応じた材料選定の判断基準を説明できるようになる" },
      2: { description: "製品要求に対して適切な材料を選定できる", nextStep: "材料特性とコスト・調達性のトレードオフを評価できるようになる" },
      3: { description: "材料変更の影響を工程全体で評価し提案できる", nextStep: "新素材の適用可能性を自ら検証・実証できるようになる" },
      4: { description: "材料技術の最新動向を踏まえた最適選定ができる", nextStep: "到達: 材料×工程の統合的な最適化ができる水準" },
    },
  },
  {
    id: "tolerance-design",
    name: "公差設計",
    categoryId: "process-design",
    levels: {
      1: { description: "公差の意味と図面の読み方を知っている", nextStep: "公差値の妥当性を工程能力との関係で理解する" },
      2: { description: "Cp/Cpkと公差の関係を理解し、妥当性を評価できる", nextStep: "公差の積み上げ計算と後工程への影響を分析できるようになる" },
      3: { description: "複数工程の公差積み上げを分析し、設計にフィードバックできる", nextStep: "顧客要求と工程能力の両面から公差を設計できるようになる" },
      4: { description: "公差設計を全体最適の視点で行い、品質とコストを両立できる", nextStep: "到達: 設計と製造の橋渡しとして公差設計をリードできる水準" },
    },
  },
  {
    id: "cost-estimation",
    name: "コスト見積",
    categoryId: "process-design",
    levels: {
      1: { description: "コスト構成（材料費・加工費・間接費）を知っている", nextStep: "標準的な製品のコスト見積を自分で作成できるようになる" },
      2: { description: "標準的なコスト見積を作成でき、根拠を説明できる", nextStep: "工程変更によるコスト影響を定量的に評価できるようになる" },
      3: { description: "複数案のコスト比較を行い、コスト削減策を提案できる", nextStep: "ライフサイクルコストや隠れコストも含めた総合評価ができるようになる" },
      4: { description: "戦略的なコスト設計（VE/VA）を主導できる", nextStep: "到達: 利益構造を理解した上でのコスト戦略を策定できる水準" },
    },
  },

  // ─── 加工技術 ───
  {
    id: "press-forming",
    name: "プレス成形",
    categoryId: "manufacturing",
    levels: {
      1: { description: "プレス加工の基本原理と主な成形方法を知っている", nextStep: "材料・形状に応じた加工条件の選定基準を理解する" },
      2: { description: "標準的な製品の加工条件を設定できる", nextStep: "成形不良の原因を推定し条件変更で対処できるようになる" },
      3: { description: "成形不良を分析し、金型・条件の両面から対策できる", nextStep: "難成形品でも成立する条件を見出せるようになる" },
      4: { description: "経験のない形状・材料でも成形可否を判断し条件を確立できる", nextStep: "到達: プレス成形のエキスパートとして技術を牽引できる水準" },
    },
  },
  {
    id: "springback",
    name: "スプリングバック制御",
    categoryId: "manufacturing",
    levels: {
      1: { description: "スプリングバックの現象を知っている", nextStep: "材料・板厚ごとの傾向を理解する" },
      2: { description: "一般的な補正方法を適用できる", nextStep: "形状・材料条件に応じた補正量を自分で判断できるようになる" },
      3: { description: "複雑な形状でも適切な補正量を設定できる", nextStep: "CAEと実測の差異を分析して補正精度を向上させられるようになる" },
      4: { description: "新材料・新工法でもスプリングバックを予測・制御できる", nextStep: "到達: スプリングバック制御の組織内第一人者の水準" },
    },
  },
  {
    id: "die-design",
    name: "金型設計の理解",
    categoryId: "manufacturing",
    levels: {
      1: { description: "金型の基本構造（ダイ・パンチ・ストリッパ）を知っている", nextStep: "金型の制約が工程設計に与える影響を理解する" },
      2: { description: "金型制約を考慮した工程設計ができる", nextStep: "金型寿命・メンテナンスを考慮した設計ができるようになる" },
      3: { description: "金型寿命と生産性を両立する設計提案ができる", nextStep: "新しい金型構造の採用可否を判断できるようになる" },
      4: { description: "金型設計者と対等に議論し最適な金型仕様を決定できる", nextStep: "到達: 金型と工程の統合最適化をリードできる水準" },
    },
  },

  // ─── 品質管理 ───
  {
    id: "qc-method",
    name: "QC手法",
    categoryId: "quality",
    levels: {
      1: { description: "QC7つ道具の名称と用途を知っている", nextStep: "実データを使ってQC手法を適用できるようになる" },
      2: { description: "QC手法を使ってデータ分析し、傾向を読み取れる", nextStep: "分析結果から改善アクションを導出できるようになる" },
      3: { description: "QC手法を駆使して品質問題の根本原因を特定し改善できる", nextStep: "予防的な品質管理体制を設計できるようになる" },
      4: { description: "統計的工程管理（SPC）を含む品質管理体系を設計・運用できる", nextStep: "到達: 品質管理システム全体を設計・最適化できる水準" },
    },
  },
  {
    id: "inspection-design",
    name: "検査設計",
    categoryId: "quality",
    levels: {
      1: { description: "検査項目と検査方法の基本を知っている", nextStep: "製品特性に応じた検査計画を作成できるようになる" },
      2: { description: "QC工程表に基づく検査計画を作成できる", nextStep: "検査の費用対効果を考慮した検査戦略を立てられるようになる" },
      3: { description: "抜取検査と全数検査の使い分けを含む検査戦略を設計できる", nextStep: "自動検査・インライン検査の導入判断ができるようになる" },
      4: { description: "検査自動化を含む検査体系全体を設計・最適化できる", nextStep: "到達: 検査戦略のエキスパートとして品質保証をリードできる水準" },
    },
  },
  {
    id: "troubleshooting",
    name: "不良対策・是正",
    categoryId: "quality",
    levels: {
      1: { description: "不良報告書の書き方と基本的なフローを知っている", nextStep: "不良現象から原因候補を列挙できるようになる" },
      2: { description: "一般的な不良に対して原因分析と暫定対策ができる", nextStep: "真因にたどり着く体系的な分析（なぜなぜ、FTA等）ができるようになる" },
      3: { description: "体系的な分析手法で真因を特定し、恒久対策を立案・実行できる", nextStep: "水平展開と再発防止の仕組みを組織に定着させられるようになる" },
      4: { description: "組織的な品質問題解決の仕組みを構築・改善できる", nextStep: "到達: 品質問題解決のリーダーとして組織能力を底上げできる水準" },
    },
  },

  // ─── 設備・保全 ───
  {
    id: "equipment-eval",
    name: "設備能力評価",
    categoryId: "equipment",
    levels: {
      1: { description: "設備の基本仕様（能力・精度）の見方を知っている", nextStep: "製品要求と設備能力のマッチングを判断できるようになる" },
      2: { description: "設備能力と製品要求の適合性を評価できる", nextStep: "設備能力の経時劣化を考慮した運用判断ができるようになる" },
      3: { description: "設備能力のトレンドを管理し、更新・改造の判断ができる", nextStep: "新設備の導入評価と投資対効果の分析ができるようになる" },
      4: { description: "設備戦略（投資・更新・廃止）を事業計画と連動して立案できる", nextStep: "到達: 設備戦略を経営視点で判断できる水準" },
    },
  },
  {
    id: "preventive-maint",
    name: "予防保全",
    categoryId: "equipment",
    levels: {
      1: { description: "定期点検の項目と頻度を知っている", nextStep: "異常の兆候を早期に検知できるようになる" },
      2: { description: "点検データから異常傾向を読み取り、保全要否を判断できる", nextStep: "予防保全計画を策定し運用できるようになる" },
      3: { description: "CBM（状態基準保全）を含む保全計画を設計・運用できる", nextStep: "保全データ分析に基づく設備信頼性向上を推進できるようになる" },
      4: { description: "設備ライフサイクル全体の保全戦略を設計・最適化できる", nextStep: "到達: TPM推進のリーダーシップを担える水準" },
    },
  },

  // ─── 市場・競合 ───
  {
    id: "competitor-analysis",
    name: "競合分析",
    categoryId: "market",
    levels: {
      1: { description: "主要な競合企業を知っている", nextStep: "競合の製品・技術の特徴を比較できるようになる" },
      2: { description: "競合製品との技術的な差異を説明できる", nextStep: "競合の強み・弱みを自社戦略に結びつけて分析できるようになる" },
      3: { description: "競合動向を踏まえた差別化戦略を提案できる", nextStep: "業界全体の競争構造を分析し中長期の技術戦略に反映できるようになる" },
      4: { description: "業界構造を俯瞰し、競争優位の源泉を特定・強化できる", nextStep: "到達: 競争戦略の立案に参画できる水準" },
    },
  },
  {
    id: "customer-needs",
    name: "顧客ニーズ把握",
    categoryId: "market",
    levels: {
      1: { description: "自社の主要顧客と納入製品を知っている", nextStep: "顧客の品質・コスト・納期の優先度を理解する" },
      2: { description: "顧客要求の背景（用途・使用環境）を理解して対応できる", nextStep: "潜在ニーズを引き出す提案ができるようになる" },
      3: { description: "顧客の課題を先取りした技術提案ができる", nextStep: "複数顧客のニーズ傾向から市場全体の要求変化を読めるようになる" },
      4: { description: "市場ニーズの変化を予測し、先行的な技術開発を企画できる", nextStep: "到達: 市場と技術の橋渡しとしてビジネス開発を牽引できる水準" },
    },
  },
  {
    id: "industry-trends",
    name: "業界動向",
    categoryId: "market",
    levels: {
      1: { description: "自社業界の基本的な構造を知っている", nextStep: "業界紙やカンファレンスから最新動向を把握する習慣をつける" },
      2: { description: "業界のトレンド（技術・規制・市場）を把握し説明できる", nextStep: "トレンドが自社事業に与える影響を分析できるようになる" },
      3: { description: "業界動向を自社戦略に結びつけた分析と提案ができる", nextStep: "異業種のトレンドも含めた複合的な分析ができるようになる" },
      4: { description: "業界のゲームチェンジを予見し、事業転換の方向性を提示できる", nextStep: "到達: 業界のオピニオンリーダーとなれる水準" },
    },
  },

  // ─── コミュニケーション ───
  {
    id: "customer-negotiation",
    name: "顧客折衝",
    categoryId: "communication",
    levels: {
      1: { description: "顧客への基本的な報告・連絡の仕方を知っている", nextStep: "技術的な内容を顧客に分かりやすく説明できるようになる" },
      2: { description: "技術説明や仕様確認を顧客と直接行える", nextStep: "顧客との交渉（仕様変更・コスト・納期調整）を自律的に行えるようになる" },
      3: { description: "顧客との技術交渉を主導し、Win-Winの合意を形成できる", nextStep: "重要顧客との戦略的な関係構築ができるようになる" },
      4: { description: "顧客との長期パートナーシップを構築し、共同開発を推進できる", nextStep: "到達: キーアカウントの技術パートナーとして信頼される水準" },
    },
  },
  {
    id: "cross-dept",
    name: "部門間連携",
    categoryId: "communication",
    levels: {
      1: { description: "他部門の役割と業務内容を知っている", nextStep: "他部門と情報共有・依頼をスムーズに行えるようになる" },
      2: { description: "他部門との情報共有を適切に行い、連携して業務を進められる", nextStep: "部門間の利害調整を行い、合意を形成できるようになる" },
      3: { description: "部門間の調整役として全体最適の視点で合意形成をリードできる", nextStep: "組織横断プロジェクトの推進役を担えるようになる" },
      4: { description: "組織横断的な課題解決をリードし、部門間の壁を越えた協力体制を構築できる", nextStep: "到達: 組織の横串として機能し変革を推進できる水準" },
    },
  },
  {
    id: "documentation",
    name: "技術文書化",
    categoryId: "communication",
    levels: {
      1: { description: "報告書やメモの基本的な書き方を知っている", nextStep: "技術的な内容を構造的に文書化できるようになる" },
      2: { description: "技術報告書を論理的に構成して作成できる", nextStep: "読み手に合わせた文書のレベル調整ができるようになる" },
      3: { description: "技術標準やガイドラインを策定できる", nextStep: "組織の知識管理体系を設計できるようになる" },
      4: { description: "暗黙知を形式知に変換する仕組みを設計・運用できる", nextStep: "到達: ナレッジマネジメントのリーダーシップを担える水準" },
    },
  },
];

// ============================================================
// ルックアップ
// ============================================================

export const CATEGORY_MAP = new Map(SKILL_CATEGORIES.map((c) => [c.id, c]));
export const SKILL_MAP = new Map(SKILL_DEFINITIONS.map((s) => [s.id, s]));

/** カテゴリID → そのカテゴリに属するスキル一覧 */
export function getSkillsByCategory(): Map<string, SkillDefinition[]> {
  const result = new Map<string, SkillDefinition[]>();
  for (const cat of SKILL_CATEGORIES) {
    result.set(cat.id, []);
  }
  for (const skill of SKILL_DEFINITIONS) {
    const list = result.get(skill.categoryId);
    if (list) list.push(skill);
  }
  return result;
}
