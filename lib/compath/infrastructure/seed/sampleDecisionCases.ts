/**
 * サンプル判断事例データ
 *
 * デモ用のハードコードされた事例。
 * 復水脱塩装置（コンデミ）樹脂量選定の実際の判断プロセスを基に作成。
 * 工事番号形式: Lxx-xxxxxx（工事）、Pxx-xxxxxx（計画）
 *
 * ストーリー: 中堅エンジニア（火力経験者、原子力3年目）が新設プラントのコンデミ樹脂量を決定する
 */

import type { DecisionCase } from "../../domain/decisionCase/types";

const now = new Date().toISOString();

/**
 * 事例1: 高稀釈率運転を重視したホールドアップ式採用ケース
 * - 起動頻度が高く、復旧時間を最優先した事例
 * - 前後設備との流量バランスを考慮した安全マージン設計
 */
export const case001: DecisionCase = {
  id: "case-001",
  title: "工事番号 L12-034521 コンデミ樹脂量決定（2012年）",
  decision: {
    summary: "ホールドアップ式 樹脂量2.0m³を採用",
    date: "2012-03-15",
    owner: "設計部 佐藤主任",
  },
  conditions: {
    context: "年間起動頻度25回、復旧目標4時間以内、PWR 4ループプラント。前後設備との流量バランスを確認済み。",
    constraints: [
      "復水器材質: チタン管",
      "海水温度: 夏季最高28℃",
      "高稀釈率運転（1000以上）を維持する必要あり",
      "上流の復水ポンプ吐出圧との整合性確認済み",
    ],
    assumptions: [
      "定期検査後の起動を含む",
      "計画外停止は年3回程度を想定",
      "樹脂の耐用年数は5年で計算",
      "安全マージン15%を確保（前後設備の変動を考慮）",
    ],
  },
  rationale: {
    primary: "起動頻度が高く、樹脂再生中も運転継続が必要なためホールドアップ式を選択。系統全体のP&IDを確認し、前後設備との整合性を担保。",
    supporting: [
      "ホールドアップ式は再生中も100%の処理能力を維持可能",
      "同条件のL08-012345（大飯工事）で10年以上の安定運用実績あり",
      "高稀釈率運転により、樹脂劣化を抑制できる",
      "下流の給水加熱器への水質影響を考慮した設計",
    ],
    tradeoffs: [
      "初期コストはベッセル切替式より約1.5倍高いが、運用コストで5年で回収可能",
      "設置スペースは約1.2倍必要だが、建屋設計で対応済み",
    ],
  },
  relatedKnowledge: [
    {
      kind: "document",
      id: "doc-proc-2",
      relation: "supports",
      label: "手順書「樹脂量決定フロー」",
    },
    {
      kind: "document",
      id: "doc-exp-5",
      relation: "supports",
      label: "解説「高稀釈率運転の効果」",
    },
  ],
  questions: [
    {
      id: "q-001-1",
      text: "年間の起動回数は何回を想定していますか？",
      category: "context",
      options: ["10回未満", "10-30回", "30回以上"],
      required: true,
    },
    {
      id: "q-001-2",
      text: "樹脂再生時の復旧目標時間は？",
      category: "context",
      options: ["4時間以内", "8時間以内", "制約なし"],
      required: true,
    },
    {
      id: "q-001-3",
      text: "設置スペースに余裕はありますか？",
      category: "boundary",
      options: ["厳しい（既存建屋内）", "標準", "余裕あり（新設建屋）"],
      required: true,
    },
  ],
  metadata: {
    domain: ["PWR", "コンデミ", "樹脂量", "ホールドアップ式", "高稀釈率"],
    plantName: "L12-034521",
    year: 2012,
    source: "技術伝承資料",
    createdAt: now,
    updatedAt: now,
  },
};

/**
 * 事例2: スペース制約を重視したベッセル切替式採用ケース
 * - 既存建屋への設置で省スペースが必須だった事例
 * - 上流の復水器出口配管との接続位置を考慮
 */
export const case002: DecisionCase = {
  id: "case-002",
  title: "工事番号 L15-078432 コンデミ樹脂量決定（2015年）",
  decision: {
    summary: "ベッセル切替式 樹脂量1.5m³を採用",
    date: "2015-06-20",
    owner: "設計部 田中課長",
  },
  conditions: {
    context: "年間起動頻度8回、既存建屋内設置、初期コスト制約あり。上流復水器出口との配管ルートを確認済み。",
    constraints: [
      "PWR 3ループプラント",
      "既存建屋内への設置（スペース厳しい）",
      "予算制約：当初計画の90%以内",
      "上流復水器出口配管との接続位置制約あり",
    ],
    assumptions: [
      "起動頻度は定期検査後のみ",
      "復旧時間は8時間まで許容可能",
      "将来的な増設スペースは不要",
      "既存配管流用により配管長を最小化",
    ],
  },
  rationale: {
    primary: "設置スペース制約が厳しく、コンパクトなベッセル切替式が最適。上流の復水器出口配管との接続を考慮し、コンパクト設計を優先。",
    supporting: [
      "起動頻度が低いため、再生時の運転停止も許容範囲",
      "既存建屋のクレーン揚程で対応可能なサイズ",
      "初期コストを約30%削減できた",
      "配管ルート最適化により圧損を10%低減",
    ],
    tradeoffs: [
      "再生時は約6時間の運転制限が必要",
      "将来的な処理能力増強は困難",
    ],
  },
  relatedKnowledge: [
    {
      kind: "document",
      id: "doc-proc-2",
      relation: "supports",
      label: "手順書「樹脂量決定フロー」",
    },
    {
      kind: "document",
      id: "doc-exp-6",
      relation: "supports",
      label: "解説「設置スペースの検討」",
    },
  ],
  questions: [
    {
      id: "q-002-1",
      text: "設置場所は新設建屋ですか、既存建屋ですか？",
      category: "boundary",
      options: ["新設建屋", "既存建屋（改造あり）", "既存建屋（現状のまま）"],
      required: true,
    },
    {
      id: "q-002-2",
      text: "年間の起動回数は何回を想定していますか？",
      category: "context",
      options: ["10回未満", "10-30回", "30回以上"],
      required: true,
    },
    {
      id: "q-002-3",
      text: "初期コストの制約は？",
      category: "tradeoff",
      options: ["厳しい（当初計画の90%以内）", "標準", "余裕あり"],
      required: true,
    },
  ],
  metadata: {
    domain: ["PWR", "コンデミ", "樹脂量", "ベッセル切替式", "省スペース"],
    plantName: "L15-078432",
    year: 2015,
    source: "技術伝承資料",
    createdAt: now,
    updatedAt: now,
  },
};

/**
 * 事例3: 海水温度が高い環境での樹脂量増量ケース
 * - 樹脂劣化リスクを考慮して余裕を持たせた事例
 * - 下流の給水加熱器への影響を考慮した安全マージン設計
 */
export const case003: DecisionCase = {
  id: "case-003",
  title: "工事番号 L18-112847 コンデミ樹脂量決定（2018年）",
  decision: {
    summary: "ホールドアップ式 樹脂量2.5m³（標準の1.25倍）を採用",
    date: "2018-09-10",
    owner: "設計部 山田主任",
  },
  conditions: {
    context: "海水温度が高い（夏季32℃超）、樹脂劣化リスク大。下流の給水加熱器への水質影響を考慮。",
    constraints: [
      "PWR 3ループプラント",
      "瀬戸内海沿岸（海水温度変動大）",
      "既存プラントで樹脂劣化実績あり",
      "下流の給水加熱器の水質要求を満足すること",
    ],
    assumptions: [
      "海水温度上昇により樹脂劣化が加速する可能性を考慮",
      "樹脂補給頻度は標準の1.5倍で計算",
      "耐用年数は4年で保守的に設計",
      "安全マージン25%を確保（環境変動を考慮）",
    ],
  },
  rationale: {
    primary: "同一海域の既設プラント（L10-056789）で樹脂劣化が想定より早かった実績を踏まえ、余裕を持った設計。下流の給水加熱器への影響を考慮し、安全マージン25%を確保。",
    supporting: [
      "L10-056789で樹脂交換周期が計画の80%だった実績",
      "補給装置の容量も25%増としてリスクに備えた",
      "高温対策として樹脂保管庫の空調を追加",
      "下流設備の水質要求を十分に満足",
    ],
    tradeoffs: [
      "初期コスト約20%増だが、計画外停止リスクを大幅に低減",
      "補給作業の頻度増による運用コスト増は許容範囲",
    ],
  },
  relatedKnowledge: [
    {
      kind: "document",
      id: "doc-exp-10",
      relation: "supports",
      label: "解説「樹脂の選定と環境条件」",
    },
    {
      kind: "document",
      id: "doc-exp-11",
      relation: "derived",
      label: "解説「海水温度が樹脂寿命に与える影響」",
    },
  ],
  questions: [
    {
      id: "q-003-1",
      text: "設置場所の海水温度は？",
      category: "context",
      options: ["25℃以下", "25-30℃", "30℃超"],
      required: true,
    },
    {
      id: "q-003-2",
      text: "近隣プラントで樹脂劣化の実績はありますか？",
      category: "context",
      options: ["実績なし", "軽微な劣化あり", "想定より早い劣化あり"],
      required: true,
    },
    {
      id: "q-003-3",
      text: "計画外停止のリスクをどの程度許容できますか？",
      category: "tradeoff",
      options: ["許容不可（最優先で回避）", "最小限に抑えたい", "ある程度許容可"],
      required: true,
    },
  ],
  metadata: {
    domain: ["PWR", "コンデミ", "樹脂量", "海水温度", "樹脂劣化"],
    plantName: "L18-112847",
    year: 2018,
    source: "技術伝承資料",
    createdAt: now,
    updatedAt: now,
  },
};

/**
 * 事例4: 新設プラントでの標準設計採用ケース
 * - バランスの取れた標準的な選定事例
 * - 系統全体のP&IDレビューを完了し、前後設備との整合性を確認
 */
export const case004: DecisionCase = {
  id: "case-004",
  title: "計画番号 P20-045678 コンデミ樹脂量決定（2020年）",
  decision: {
    summary: "ホールドアップ式 樹脂量2.0m³（標準）を採用",
    date: "2020-04-15",
    owner: "設計部 高橋主任",
  },
  conditions: {
    context: "新設プラント、標準的な運転条件、設計自由度あり。系統全体のP&IDレビューを完了し、前後設備との整合性を確認。",
    constraints: [
      "ABWR型（フルMOXプラント）",
      "新設建屋のため設置スペースに余裕あり",
      "海水温度: 標準域（夏季最高26℃）",
      "系統全体のアーキテクチャ確認済み",
    ],
    assumptions: [
      "年間起動頻度15回を想定",
      "復旧目標時間6時間",
      "将来的な処理能力増強の可能性を考慮",
      "前後設備の運転状態変動を考慮した設計",
    ],
  },
  rationale: {
    primary: "標準的な運転条件のため、実績のある標準設計を採用。系統全体のP&IDレビューを完了し、前後設備との整合性を担保。",
    supporting: [
      "L97-067890、L97-067891（ABWR）で15年以上の安定運用実績",
      "新設建屋のため、将来の増設スペースも確保",
      "MOX燃料特有の要件も標準設計で対応可能と判断",
      "上流復水ポンプ・下流給水系との運転条件を確認",
    ],
    tradeoffs: [
      "保守的な設計のため、若干のオーバースペックの可能性",
      "コストは最適化より安全側を優先",
    ],
  },
  relatedKnowledge: [
    {
      kind: "document",
      id: "doc-proc-2",
      relation: "supports",
      label: "手順書「樹脂量決定フロー」",
    },
    {
      kind: "document",
      id: "doc-exp-abwr",
      relation: "supports",
      label: "解説「ABWR型の水処理設計」",
    },
  ],
  questions: [
    {
      id: "q-004-1",
      text: "プラントの種類は？",
      category: "context",
      options: ["PWR 3ループ", "PWR 4ループ", "BWR", "ABWR"],
      required: true,
    },
    {
      id: "q-004-2",
      text: "新設プラントですか、既設プラントの更新ですか？",
      category: "boundary",
      options: ["新設", "既設更新（建屋改造あり）", "既設更新（現状建屋）"],
      required: true,
    },
    {
      id: "q-004-3",
      text: "将来的な処理能力増強の可能性は？",
      category: "boundary",
      options: ["考慮不要", "可能性あり", "計画あり"],
      required: false,
    },
  ],
  metadata: {
    domain: ["ABWR", "コンデミ", "樹脂量", "新設", "MOX"],
    plantName: "P20-045678",
    year: 2020,
    source: "技術伝承資料",
    createdAt: now,
    updatedAt: now,
  },
};

/**
 * 事例5: コスト最適化を重視した選定ケース
 * - 厳しい予算制約の中での最適解を選んだ事例
 * - 既存配管を流用し、上流の復水ポンプ能力との適合を確認
 */
export const case005: DecisionCase = {
  id: "case-005",
  title: "工事番号 L21-156789 コンデミ樹脂量決定（2021年）",
  decision: {
    summary: "ベッセル切替式 樹脂量1.8m³を採用（コスト最適化設計）",
    date: "2021-11-20",
    owner: "設計部 中村課長",
  },
  conditions: {
    context: "設備更新、予算制約厳しい、運転条件は標準。既存配管を流用し、上流の復水ポンプ能力との適合を確認済み。",
    constraints: [
      "PWR 4ループプラント",
      "既存設備の更新（老朽化対応）",
      "予算: 当初計画の85%に圧縮要請",
      "既存復水ポンプの吐出能力範囲内で設計",
    ],
    assumptions: [
      "年間起動頻度12回",
      "復旧目標時間8時間で許容",
      "既存配管を最大限活用",
      "前後設備の運転状態は現状維持",
    ],
  },
  rationale: {
    primary: "予算制約が厳しい中、必要十分な性能を確保できるベッセル切替式を選択。既存配管を流用し、上流の復水ポンプ能力との適合を確認。",
    supporting: [
      "既存配管の流用により配管工事費を40%削減",
      "起動頻度が標準的なため、切替式でも運用に支障なし",
      "L15-078432（同型）での運用実績を参考に設計",
      "上流復水ポンプの運転範囲を確認し、圧損増加を許容範囲内に収めた",
    ],
    tradeoffs: [
      "再生時は約5時間の運転制限が必要",
      "ホールドアップ式への将来変更は困難",
      "運用コストは若干増加するが、初期投資削減を優先",
    ],
  },
  relatedKnowledge: [
    {
      kind: "document",
      id: "doc-proc-2",
      relation: "supports",
      label: "手順書「樹脂量決定フロー」",
    },
    {
      kind: "document",
      id: "doc-cost",
      relation: "supports",
      label: "解説「コスト最適化設計の考え方」",
    },
  ],
  questions: [
    {
      id: "q-005-1",
      text: "予算制約の厳しさは？",
      category: "tradeoff",
      options: ["厳しい（計画の90%以下）", "標準", "余裕あり"],
      required: true,
    },
    {
      id: "q-005-2",
      text: "既存設備の流用は可能ですか？",
      category: "boundary",
      options: ["流用不可（全面更新）", "一部流用可", "大部分流用可"],
      required: true,
    },
    {
      id: "q-005-3",
      text: "再生時の運転制限は許容できますか？",
      category: "tradeoff",
      options: ["許容不可", "4時間まで許容", "8時間まで許容"],
      required: true,
    },
  ],
  metadata: {
    domain: ["PWR", "コンデミ", "樹脂量", "ベッセル切替式", "コスト最適化"],
    plantName: "L21-156789",
    year: 2021,
    source: "技術伝承資料",
    createdAt: now,
    updatedAt: now,
  },
};

/**
 * 全サンプル事例
 */
export const sampleDecisionCases: DecisionCase[] = [
  case001,
  case002,
  case003,
  case004,
  case005,
];

/**
 * IDで事例を取得
 */
export function getSampleCaseById(id: string): DecisionCase | undefined {
  return sampleDecisionCases.find((c) => c.id === id);
}

/**
 * ドメインタグで事例をフィルタ
 */
export function filterSampleCasesByDomain(domains: string[]): DecisionCase[] {
  if (domains.length === 0) return sampleDecisionCases;
  return sampleDecisionCases.filter((c) =>
    domains.some((d) => c.metadata.domain.includes(d))
  );
}
