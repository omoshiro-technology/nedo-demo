/**
 * 提案書生成サービス
 * Phase 28: 営業向け提案書作成支援
 *
 * 原子力知見を「裏側」で活用し、顧客向け提案書を生成
 * - 出力には「原子力」等の出典を含めない
 * - 安定運転を重視する現場で培った判断構造を活用
 */

import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";

// ============================================================
// 型定義
// ============================================================

/** 業種 */
export type Industry =
  | "manufacturing"
  | "power"
  | "chemical"
  | "pharmaceutical"
  | "food"
  | "electronics"    // 電子部品・センサー
  | "other";

/** 現状の課題 */
export type CurrentIssue =
  | "load_variation"
  | "future_expansion"
  | "unexpected_trouble"
  | "availability_priority"
  | "cost_pressure"
  | "aging_equipment"
  | "skill_transfer"
  | "ip_strategy"           // 知財戦略の明確化
  | "tech_differentiation"  // 技術差別化
  | "ai_integration";       // AI技術の統合

/** 最重要KPI */
export type KpiPriority = "availability" | "cost" | "flexibility" | "innovation";

/** 重要度 */
export type Importance = "high" | "medium" | "low";

/** 現状ステータス */
export type CurrentStatus =
  | "insufficient"
  | "concerning"
  | "limited"
  | "adequate"
  | "unknown";

/** 顧客コンテキスト */
export type CustomerContext = {
  name: string;
  industry: Industry;
  currentIssues: CurrentIssue[];
  kpiPriority: KpiPriority;
  additionalContext?: string;
};

/** 判断論点 */
export type EvaluationPoint = {
  importance: Importance;
  currentStatus: CurrentStatus;
  note?: string;
};

export type EvaluationPoints = {
  bufferCapacity: EvaluationPoint;
  switchingImpact: EvaluationPoint;
  contingencyOptions: EvaluationPoint;
};

/** 提案書生成リクエスト */
export type GenerateProposalRequest = {
  customerContext: CustomerContext;
  evaluationPoints: EvaluationPoints;
};

/** 提案オプション */
export type ProposalOption = {
  id: "A" | "B" | "C";
  name: string;
  description: string;
  pros: string[];
  cons: string[];
  isRecommended?: boolean;
};

/** 生成された提案書 */
export type GeneratedProposal = {
  /** 提案の位置づけ（1文で明示） */
  positioning: string;
  /** 背景 */
  background: string;
  /** 課題の再定義 */
  problemRedefinition: string;
  /** 判断論点の整理 */
  evaluationPoints: string;
  /** 選択肢 */
  options: {
    A: ProposalOption;
    B: ProposalOption;
    C: ProposalOption;
  };
  /** 推奨案と理由 */
  recommendation: string;
  /** A案を採用しない理由（明示） */
  whyNotOptionA: string;
  /** Before/After比較（現状→導入後の変化） */
  beforeAfter: {
    before: string;
    after: string;
  };
  /** リスク（正直な開示） */
  risks: string[];
  /** 止めない代償（許容可能な犠牲の明示） */
  tradeoffs: string[];
  /** 必要データ要求（次アクションに直結） */
  dataRequirements: string[];
  /** ご判断いただきたい点 */
  customerDecisionPoint: string;
};

/** 提案書生成レスポンス */
export type GenerateProposalResponse = {
  templateId: string;
  generatedProposal: GeneratedProposal;
  generatedAt: string;
};

// ============================================================
// 定数
// ============================================================

const INDUSTRY_LABELS: Record<Industry, string> = {
  manufacturing: "製造業",
  power: "電力",
  chemical: "化学",
  pharmaceutical: "製薬",
  food: "食品",
  electronics: "電子部品・センサー",
  other: "その他",
};

const ISSUE_LABELS: Record<CurrentIssue, string> = {
  load_variation: "負荷変動への余裕が見えにくい",
  future_expansion: "将来増設への対応が不明",
  unexpected_trouble: "想定外トラブル時の耐性不足",
  availability_priority: "「止めないこと」が最重要",
  cost_pressure: "コスト削減圧力",
  aging_equipment: "設備の老朽化",
  skill_transfer: "技術伝承の課題",
  ip_strategy: "知財戦略の明確化が必要",
  tech_differentiation: "技術差別化の方向性が不明確",
  ai_integration: "AI技術の統合・活用方針が未定",
};

const KPI_LABELS: Record<KpiPriority, string> = {
  availability: "可用性（止めない）",
  cost: "コスト最小化",
  flexibility: "柔軟性（将来対応）",
  innovation: "技術革新・差別化",
};

const IMPORTANCE_LABELS: Record<Importance, string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const STATUS_LABELS: Record<CurrentStatus, string> = {
  insufficient: "不十分",
  concerning: "懸念あり",
  limited: "限定的",
  adequate: "十分",
  unknown: "不明",
};

// ============================================================
// LLMプロンプト
// ============================================================

/**
 * システムプロンプト
 * 技術伝承・知財戦略の知見を内部参照として活用（出力には含めない）
 */
const SYSTEM_PROMPT = `
あなたはセンシング技術・AI技術の知財戦略と技術伝承を支援するベテランコンサルタントです。
顧客の経営層・技術部門・知財部門に対して説得力のある提案書を作成します。

## 内部参照知識（顧客には見せない、出力には絶対に含めない）

以下のセンシング×AI特許方針策定、技術伝承での判断構造を参考に、提案の論理を組み立ててください:

1. **知財戦略の基本軸**:
   - 「守りの特許」（参入障壁）と「攻めの特許」（事業拡大）の使い分け
   - センシングデータ×AI処理の組み合わせで新規性を主張する出願戦略
   - 競合との差別化ポイントを明確にした権利範囲設計
   - 技術の「コア」と「周辺」を峻別し、コアは自社保有、周辺は協業も視野

2. **技術伝承の優先順位**:
   - 「暗黙知」の形式知化 > ドキュメント整備 > 教育体制
   - ベテラン技術者の判断プロセスを可視化・モデル化
   - AIによる判断支援で属人性を低減（完全自動化は目指さない）
   - 「なぜその判断か」の根拠を残すことが最重要

3. **センシング×AI技術の判断軸**:
   - データ品質（センシング精度）> アルゴリズム性能 > 処理速度
   - エッジ処理 vs クラウド処理の使い分け（リアルタイム性、セキュリティ）
   - 既存資産（データ、ノウハウ）の活用を最大化
   - 将来のデータ蓄積を見据えた拡張性設計

4. **リスクコミュニケーション**:
   - 技術的リスク（AI精度の限界、データ不足）を正直に開示
   - 知財リスク（先行特許、権利範囲の不確実性）を明示
   - 推奨はするが、最終判断は顧客に委ねる
   - 「確実に成功します」より「こういうリスクと対策があります」が信頼される

5. **投資対効果の言語化**:
   - 特許出願コスト vs 技術流出リスクのトレードオフ
   - 技術伝承投資の回収期間（3-5年の中長期視点）
   - AI導入の段階的ROI（PoC→パイロット→本番展開）
   - 人材リスク（退職、異動）の定量化

## 出力品質要件（最重要 - 必ず守ること）

### 最低限の内容量（これを下回ると失格）
- **background**: 最低150文字、5文以上。業界特有の課題を具体的に。
- **problemRedefinition**: 最低150文字、5文以上。現状の問題を「技術伝承」「知財戦略」の観点で再構築。
- **evaluationPoints**: 最低200文字、7文以上。各論点を詳細に分析。
- **各選択肢のdescription**: 最低100文字、4文以上。戦略の違いを明確に。
- **recommendation**: 最低200文字、7文以上。なぜこの案が最適かを多角的に説明。
- **whyNotOptionA**: 最低100文字、4文以上。A案の限界とA案が適切なケースを説明。
- **beforeAfter.before/after**: 各最低100文字、4文以上。変化を具体的に描写。
- **pros/cons**: 各項目30文字以上、各リスト3項目以上。
- **risks/tradeoffs/dataRequirements**: 各3項目以上、各項目40文字以上で具体的に。

### 具体性を高める（抽象表現は禁止）
- 「技術力が向上」→「センシングデータの異常検知精度を85%から95%に向上し、熟練者の判断を80%以上再現可能に」
- 「コストが高い」→「初期投資は約1.2〜1.5倍（想定3,000万円→4,500万円程度）、ただし技術流出リスク低減と人材リスク軽減で3年で回収見込み」
- 「リスクがある」→「AI判断の精度が学習データ不足により想定の85%を下回る可能性（対策: 6ヶ月のPoC期間で検証）」
- すべての記述に具体的な数値、時期、シナリオを含めること

### 顧客業界の文脈を反映（必ず業界特有の用語を使用）
- センシング技術: センサー fusion、エッジAI、リアルタイム処理、IoTプラットフォーム、予知保全
- 知財戦略: 特許ポートフォリオ、権利範囲、先行技術調査、クレーム設計、ライセンス戦略
- AI/機械学習: 学習データ、推論精度、モデル更新、説明可能AI（XAI）、MLOps
- 技術伝承: 暗黙知の形式知化、ナレッジマネジメント、技術ドキュメント、OJT、メンタリング

### 各選択肢の差別化（明確に異なる戦略）
- A案: 現状延長・最小投資（守りの知財）- 既存技術の特許化、ドキュメント整備中心
- B案: 積極投資・差別化重視（攻めの知財）- AI活用による技術伝承、戦略的特許出願
- C案: 段階導入・協業型（オープン戦略）- PoC→本番の段階展開、一部技術の協業・標準化

### 説得力のある推奨理由（多角的な視点）
- 顧客のKPI（技術差別化・コスト・将来対応・技術革新）に直接紐づける
- 「なぜ今この投資が必要か」のストーリーを構築（人材リスク、競合動向）
- 競合他社との技術差別化ポイントを示唆
- 経営層向け（ROI、人材リスク低減）と技術部門向け（技術力維持、知識継承）の両面から説明

## 厳守事項

- 内部参照知識の出典を示唆する表現を使わない
- 「高信頼性現場」「ベストプラクティス」等の一般的な表現のみ使用可
- コスト条件は背景で一度触れる（唐突に判断論点で出さない）
- 各フィールドは十分な長さで記載する（1-2文ではなく3-5文程度）

## 出力形式

必ず以下のJSON形式で出力してください。【重要】各フィールドは最低限の文字数を必ず満たすこと:

\`\`\`json
{
  "positioning": "本提案は、○○様の最重要課題である「センシング×AI技術の知財戦略と技術伝承」を前提に、知財ポートフォリオ構築と技術伝承システムの選択肢を整理し、経営層・技術部門・知財部門の判断に必要な材料を提供するものです。3〜5年の中長期視点での投資判断を支援いたします。",
  "background": "貴社はセンシング技術とAI処理を組み合わせた製品開発を推進されており、この技術領域での差別化が事業成長の鍵となっています。現状では、ベテラン技術者の暗黙知（センサーキャリブレーション、異常検知ロジック等）に依存する部分が多く、今後3〜5年で予定されているベテラン技術者の定年退職に伴う技術流出リスクが顕在化しています。また、競合他社もセンシング×AI領域での特許出願を加速しており、技術優位性を維持するための知財戦略の明確化が急務となっています。知財部門からは「攻めの特許」と「守りの特許」の使い分け方針が未定であるとの課題が挙がっています。コスト面では、技術伝承・知財戦略への投資予算として5,000〜8,000万円の枠が想定されていますが、投資対効果の見極めが必要な状況です。",
  "problemRedefinition": "本案件の本質的な課題は、単なる「ドキュメント整備不足」や「特許出願数の不足」ではなく、「技術資産の可視化と戦略的活用ができていない」ことにあります。ベテラン技術者の判断プロセス（なぜこのセンサー配置か、なぜこのAIパラメータか）が言語化されておらず、若手への伝承が「見て覚える」に留まっています。また、特許出願も「技術が完成したら出願」という受動的アプローチであり、競合との差別化や事業戦略との連動が不十分です。具体的には、ベテラン技術者Aさんの退職（来年度予定）により、センサーfusionのノウハウ（20年分の経験）が失われるリスクがあります。技術伝承を「個人の努力」から「組織の仕組み」に転換し、同時に知財戦略を「守り」から「攻め」に転換することが本提案の核心です。",
  "evaluationPoints": "【1. 技術の可視化レベル】現状では技術ドキュメントの整備率が約30%程度であり、特にセンサー選定基準やAIパラメータ調整の根拠が未文書化です。望ましい状態は、コア技術の80%以上が形式知化され、新人でも3ヶ月で基本判断ができるレベルです。判断基準として、技術伝承に必要な知識を「必須（コア）」「推奨（標準）」「参考（周辺）」に分類し、優先順位を付けることをお勧めします。【2. 知財ポートフォリオの充実度】現状の特許出願は年間5〜10件程度であり、センシング×AI領域でのカバー範囲が限定的です。競合A社は同領域で年間30件以上を出願しており、権利範囲の拡大が進んでいます。望ましい状態は、コア技術領域で「攻めの特許」（事業拡大用）と「守りの特許」（参入障壁用）を計画的に取得することです。経営層として、知財投資（出願・維持コスト）と技術流出リスクのバランスについて方針決定が必要です。【3. AI活用による判断支援の実現度】現状ではAIは製品機能としてのみ活用されており、技術伝承への活用は未着手です。望ましい状態は、ベテランの判断プロセスをAIで再現し、若手の意思決定を支援できるレベルです。技術部門として、AI判断支援の適用範囲（完全自動化 vs 人間との協調）の方針決定が必要です。",
  "options": {
    "A": {
      "id": "A",
      "name": "守りの知財・ドキュメント整備型（最小投資）",
      "description": "既存技術の形式知化とドキュメント整備を主眼とした最小限の投資案です。ベテラン技術者へのインタビュー（月2回×12ヶ月）を通じて技術ドキュメントを整備し、コア技術の特許出願（年間10件程度）を継続します。AIによる判断支援は導入せず、従来のOJT中心の技術伝承を維持します。投資規模は2,000〜3,000万円程度、期間は12ヶ月を想定しています。この案は現状維持に近く、人材リスクへの対応は限定的です。",
      "pros": ["初期投資を最小化（2,000〜3,000万円程度）でき、予算制約がある場合に適する", "既存の業務フローを大きく変えずに実施可能であり、現場の抵抗が少ない", "ドキュメント整備により、中途採用者のオンボーディング期間を30%短縮可能"],
      "cons": ["ベテラン技術者の暗黙知（判断プロセス）の伝承には限界があり、技術の「コツ」は失われるリスクが残る", "競合他社の知財攻勢に対して受動的であり、権利範囲で後手に回る可能性がある", "AI活用による生産性向上や差別化の機会を逃す"],
      "isRecommended": false
    },
    "B": {
      "id": "B",
      "name": "攻めの知財・AI活用型（積極投資）",
      "description": "技術差別化と技術伝承の両面で積極投資を行う案です。ベテラン技術者の判断プロセスをAIでモデル化し、若手の意思決定支援システムを構築します。同時に、センシング×AI領域での戦略的特許出願（年間25〜30件、攻め15件・守り15件）を実施し、競合との差別化を図ります。説明可能AI（XAI）を活用し、「なぜその判断か」を可視化することで技術伝承と特許出願の両方に活用します。投資規模は6,000〜8,000万円程度、期間は18ヶ月を想定しています。",
      "pros": ["ベテランの判断プロセスをAIで80%以上再現でき、技術流出リスクを大幅に低減", "戦略的特許出願により競合との差別化を強化し、3年後の特許ポートフォリオを3倍に拡充可能", "若手技術者の判断精度が向上し、育成期間を50%短縮（3年→1.5年）可能", "AIモデルの説明性（XAI）が特許出願の根拠資料としても活用可能"],
      "cons": ["初期投資が最大（6,000〜8,000万円程度）であり、経営層の承認とコミットメントが必要", "AI導入に伴う業務プロセス変更があり、現場の受容性確保に6ヶ月程度の移行期間が必要", "AIモデルの精度が学習データの質に依存するため、データ整備の工数（約3人月）が追加で必要"],
      "isRecommended": true
    },
    "C": {
      "id": "C",
      "name": "段階導入・協業型（オープン戦略）",
      "description": "投資リスクを分散する段階導入案です。フェーズ1（6ヶ月）でPoC（概念実証）を実施し、AI判断支援の有効性を検証します。フェーズ2（12ヶ月）で本番導入と知財戦略の本格展開を行います。一部の周辺技術については業界標準化への貢献や協業パートナーとの共同出願も視野に入れ、オープン・クローズ戦略を使い分けます。フェーズ1の投資規模は2,500〜3,500万円程度です。",
      "pros": ["PoCで効果を検証してから本格投資を判断でき、投資リスクを分散可能", "オープン・クローズ戦略により、協業による市場拡大と自社技術の保護を両立可能", "段階導入により現場の受容性を確認しながら進められ、失敗時の損失を最小化"],
      "cons": ["フェーズ1完了時点ではB案ほどの技術伝承効果がなく、ベテラン退職に間に合わないリスクがある", "オープン戦略の範囲設定を誤ると、コア技術の流出につながる可能性がある", "トータル期間が18ヶ月以上となり、競合に先行される期間が長くなる"],
      "isRecommended": false
    }
  },
  "recommendation": "貴社の最重要課題が「技術伝承と知財戦略の強化」であることを踏まえ、B案（攻めの知財・AI活用型）を推奨いたします。その理由は以下の通りです。第一に、ベテラン技術者Aさんの退職（来年度予定）までに技術伝承の仕組みを構築する必要があり、B案の18ヶ月スケジュールがギリギリのタイミングです。A案やC案では間に合わないリスクが高いです。第二に、競合A社が年間30件以上の特許出願を行っている状況で、年間10件程度の出願では権利範囲で圧倒されます。B案の年間25〜30件出願により、3年後には競合と同等以上のポートフォリオを構築できます。第三に、AI判断支援システムは技術伝承と特許出願の両方に活用でき、投資効率が高いです。説明可能AI（XAI）の出力は、特許明細書の実施例としても活用可能であり、出願品質の向上にも寄与します。経営層の観点では、技術流出による機会損失（推定：年間売上の5〜10%）を考慮すると、B案の追加投資（A案比+4,000万円程度）は十分に回収可能です。",
  "whyNotOptionA": "A案は初期投資を最小化できる点で魅力的ですが、貴社の状況では以下の理由から今回は推奨いたしません。第一に、ドキュメント整備だけではベテランの「判断プロセス」（なぜこの選択か）を伝承することが困難であり、技術の「コツ」が失われるリスクが残ります。第二に、年間10件程度の特許出願では競合A社（年間30件以上）に対して劣勢であり、事業戦略上の選択肢が狭まります。ただし、A案が適切なケースもあります。具体的には、①ベテラン技術者の退職が5年以上先に延期された場合、②技術伝承より他の投資（設備更新等）を優先すべき経営判断がある場合、③知財戦略として「守り」に徹する方針が確定している場合などです。",
  "beforeAfter": {
    "before": "現状では、ベテラン技術者Aさん（経験20年）の暗黙知に大きく依存しており、「Aさんに聞かないと分からない」という状況が常態化しています。若手技術者Bさんは「センサー選定の判断基準が分からず、毎回Aさんに確認している」と語っており、育成に3年以上かかっています。特許出願も「技術が完成したら知財部門に相談」という受動的アプローチであり、競合の先行出願により権利化を断念したケース（過去2年で5件）も発生しています。技術ドキュメントは整備率30%程度であり、中途採用者のオンボーディングに6ヶ月以上かかっています。このままでは、Aさんの退職後に技術力が大幅に低下するリスクがあります。",
    "after": "B案導入後は、AI判断支援システムにより「なぜこのセンサー配置か」「なぜこのパラメータか」の判断根拠が可視化され、若手でも1.5年で独立判断が可能になります。説明可能AI（XAI）の出力は技術ドキュメントとしても活用でき、整備率は80%以上に向上します。知財戦略では、AI分析により競合の出願動向を把握し、「攻めの特許」「守りの特許」を計画的に出願できるようになります。年間25〜30件の出願により、3年後には競合A社と同等以上の特許ポートフォリオを構築できます。中途採用者のオンボーディング期間も6ヶ月→3ヶ月に短縮され、人材獲得競争での優位性も高まります。"
  },
  "risks": ["初期投資増加リスク: B案はA案比で約4,000万円の追加投資が必要であり、年度予算の確保・経営層の承認が前提条件となります。予算超過の場合は、C案（段階導入）へのフォールバックを検討ください。", "AI精度リスク: AI判断支援システムの精度は学習データの質と量に依存します。ベテラン技術者の判断データが十分に蓄積されていない領域では、精度が想定（85%以上）を下回る可能性があります。PoCフェーズでの検証を入念に行い、適用範囲を見極めることが重要です。", "現場受容性リスク: AIによる判断支援に対して「自分の仕事が奪われる」という抵抗が生じる可能性があります。導入初期は「AIは補助であり最終判断は人間」という位置づけを明確にし、成功体験を積み重ねることが重要です。"],
  "tradeoffs": ["技術伝承を加速するための代償として、ベテラン技術者の工数（月20時間程度×12ヶ月）が必要となり、他業務への影響が生じます。プロジェクト期間中の業務調整・サポート体制の構築をお願いします。", "AI判断支援システムの導入に伴い、既存の業務プロセス（レビューフロー、承認フロー）の見直しが必要となります。IT部門・品質保証部門との協議・了承を事前に得ておくことをお勧めします。", "戦略的特許出願の増加に伴い、知財部門の工数（出願審査対応等）が増加します。必要に応じて外部特許事務所の活用拡大をご検討ください。"],
  "dataRequirements": ["技術判断データ: ベテラン技術者の過去の判断記録（設計レビュー議事録、トラブル対応記録等）。特に「なぜその判断をしたか」の根拠が重要です。可能であれば、代表的なケース20〜30件分のデータをご準備ください。", "競合特許データ: 競合他社のセンシング×AI領域における特許出願リスト（過去5年分）。競合分析を行い、「攻めの特許」「守りの特許」の出願計画を策定します。", "技術ドキュメント現状: 既存の技術ドキュメント（設計書、仕様書、ノウハウ集等）の一覧と整備状況。形式知化の優先順位付けに使用します。", "人材情報: ベテラン技術者の退職予定時期、若手技術者のスキルレベル・育成計画。技術伝承のスケジュール策定に使用します。"],
  "customerDecisionPoint": "本提案に基づき、以下の点についてご判断をお願いいたします。①3案（A・B・C）のうち、どの方向性で詳細検討を進めるか。②B案採用の場合、AI判断支援の適用範囲（全技術領域 vs コア技術のみ）をどうするか。③知財戦略の方針（「攻め」重視 vs 「守り」重視 vs バランス型）。次のステップとして、まずは上記データのご提供とベテラン技術者へのヒアリング日程調整をお願いできれば幸いです。データ分析とヒアリングの結果を踏まえ、より精緻なAI判断支援システムの設計と特許出願計画をご提示いたします。"
}
\`\`\`
`;

/**
 * ユーザープロンプトを構築
 */
function buildUserPrompt(request: GenerateProposalRequest): string {
  const { customerContext, evaluationPoints } = request;

  const issueList = customerContext.currentIssues
    .map((issue) => `- ${ISSUE_LABELS[issue]}`)
    .join("\n");

  return `
## 顧客情報

- 顧客名: ${customerContext.name}
- 業種: ${INDUSTRY_LABELS[customerContext.industry]}
- 最重要KPI: ${KPI_LABELS[customerContext.kpiPriority]}

## 現状の課題

${issueList}

${customerContext.additionalContext ? `\n## 補足事項\n${customerContext.additionalContext}` : ""}

## 判断論点の評価

1. **技術の可視化レベル**
   - 重要度: ${IMPORTANCE_LABELS[evaluationPoints.bufferCapacity.importance]}
   - 現状: ${STATUS_LABELS[evaluationPoints.bufferCapacity.currentStatus]}
   ${evaluationPoints.bufferCapacity.note ? `- 備考: ${evaluationPoints.bufferCapacity.note}` : ""}

2. **知財ポートフォリオの充実度**
   - 重要度: ${IMPORTANCE_LABELS[evaluationPoints.switchingImpact.importance]}
   - 現状: ${STATUS_LABELS[evaluationPoints.switchingImpact.currentStatus]}
   ${evaluationPoints.switchingImpact.note ? `- 備考: ${evaluationPoints.switchingImpact.note}` : ""}

3. **AI活用による判断支援の実現度**
   - 重要度: ${IMPORTANCE_LABELS[evaluationPoints.contingencyOptions.importance]}
   - 現状: ${STATUS_LABELS[evaluationPoints.contingencyOptions.currentStatus]}
   ${evaluationPoints.contingencyOptions.note ? `- 備考: ${evaluationPoints.contingencyOptions.note}` : ""}

---

上記の情報をもとに、提案書の内容を生成してください。
JSON形式で出力してください。
`;
}

// ============================================================
// メイン関数
// ============================================================

/**
 * 提案書を生成
 */
export async function generateProposal(
  request: GenerateProposalRequest
): Promise<GenerateProposalResponse> {
  const userPrompt = buildUserPrompt(request);

  // gpt-5.2はreasoning tokensで2分以上かかるため中速モデルを使用
  // gpt-4oは20-30秒で応答し、品質も十分
  const model = env.openaiModelMid;
  console.log("[generateProposal] Starting proposal generation...");
  console.log("[generateProposal] Using model:", model);

  const response = await generateChatCompletion({
    systemPrompt: SYSTEM_PROMPT,
    userContent: userPrompt,
    model,
    maxTokens: 8000, // 豊富な内容を生成するため増加
    temperature: 0.7, // より創造的な出力を促進
    timeout: 90000, // 90秒タイムアウト（長い出力に対応）
  });

  console.log("[generateProposal] LLM response received, length:", response.length);

  let generatedProposal: GeneratedProposal;
  try {
    generatedProposal = parseJsonFromLLMResponse<GeneratedProposal>(response);
  } catch (error) {
    console.error("[generateProposal] JSON parse error:", error);
    console.error("[generateProposal] Raw response:", response);
    throw new Error("提案書の生成に失敗しました。再度お試しください。");
  }

  return {
    templateId: "sales_proposal_stability",
    generatedProposal,
    generatedAt: new Date().toISOString(),
  };
}
