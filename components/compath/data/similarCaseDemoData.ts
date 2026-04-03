/**
 * 類似事例検索のデモデータ
 * Phase 28+: 過去の類似事例を参照
 * オムロン技術・知財本部向け
 */

import type { SimilarCase, SimilarCaseSearchResult, SimilarCaseSearchCondition } from "../types/similarCase";

/** デモ用類似事例データ（知財戦略） */
export const DEMO_SIMILAR_CASES: SimilarCase[] = [
  {
    id: "case-001",
    title: "画像センシングAI技術 特許出願戦略",
    customerName: "A事業部",
    industry: "manufacturing",
    equipmentType: "ip_strategy",
    summary: "センシング×AI技術の単独出願による競争優位確保。技術独自性の高い領域を特定し、10件の基本特許を権利化。",
    background: "FA事業部への技術移管を見据え、製品化1年前に特許出願戦略を策定。「Sensing & Control + Think」の中核技術として位置づけ。",
    adoptedSolution: {
      name: "単独出願戦略（独占領域確保）",
      description: "技術独自性が高い画像認識アルゴリズムを単独出願。競合の参入障壁を構築し、ライセンス収入の可能性も確保。",
    },
    otherOptions: [
      {
        name: "大学との共同出願",
        notAdoptedReason: "技術の独自性が高く、共同出願のメリットより自社独占の価値が大きかった",
      },
      {
        name: "秘匿化（ノウハウとして保持）",
        notAdoptedReason: "製品から技術が推定可能であり、特許による保護が有効と判断",
      },
    ],
    outcomes: [
      "出願から2年で基本特許10件の権利化完了",
      "競合他社からの参入抑止に成功",
      "ライセンス交渉での優位なポジション確保",
    ],
    lessons: [
      "技術独自性が高い場合は迷わず単独出願が有効",
      "製品化スケジュールから逆算した出願計画が重要",
      "権利化まで2〜3年かかることを考慮した戦略策定が必要",
    ],
    kpiPriority: "availability",
    similarityScore: 92,
    matchReasons: [
      "同技術分野（センシング×AI）",
      "同出願戦略（単独出願）",
      "事業接続重視",
    ],
    metadata: {
      year: 2019,
      region: "京都",
      scale: "大規模",
      projectDuration: "24ヶ月",
    },
  },
  {
    id: "case-002",
    title: "推論エンジン技術 大学連携特許戦略",
    customerName: "B事業部",
    industry: "manufacturing",
    equipmentType: "ip_strategy",
    summary: "基礎研究段階の技術を大学と共同出願。共創による価値拡大を図りながら、事業化時の優先実施権を確保。",
    background: "AI推論の高速化技術について、京都大学との共同研究成果を特許化。オープンイノベーションによる技術発展を期待。",
    adoptedSolution: {
      name: "共同出願戦略（共創領域）",
      description: "大学との共同出願により、学術的な信頼性を付与。事業化時の優先実施権を契約で確保し、両利きの知財活動を実現。",
    },
    otherOptions: [
      {
        name: "単独出願",
        notAdoptedReason: "基礎研究段階では大学の知見が不可欠だった",
      },
      {
        name: "ライセンス購入",
        notAdoptedReason: "共同研究による技術発展の機会を失いたくなかった",
      },
    ],
    outcomes: [
      "学会発表との両立で技術認知度向上",
      "3年後の製品化時に優先実施権を行使",
      "大学との継続的な共同研究関係を構築",
    ],
    lessons: [
      "基礎研究段階では共同出願による共創が有効",
      "事業化時の権利関係は契約で明確化すべき",
      "学術発表と特許出願のタイミング調整が重要",
    ],
    kpiPriority: "flexibility",
    similarityScore: 85,
    matchReasons: [
      "同技術分野（AI技術）",
      "大学連携事例",
      "共創戦略採用",
    ],
    metadata: {
      year: 2020,
      region: "京都",
      scale: "中規模",
      projectDuration: "36ヶ月",
    },
  },
  {
    id: "case-003",
    title: "エッジAI技術 海外出願戦略",
    customerName: "C事業部",
    industry: "manufacturing",
    equipmentType: "ip_strategy",
    summary: "グローバル市場を見据えた海外出願戦略。主要3カ国（米欧中）優先で、市場規模とコストのバランスを最適化。",
    background: "エッジデバイス向けAI推論技術の海外展開を計画。限られた予算で最大効果を得る出願国選定が課題。",
    adoptedSolution: {
      name: "主要3カ国優先出願（米欧中）",
      description: "市場規模と競合状況を分析し、米国・欧州・中国を優先。その他地域は製品展開決定後に追加出願の方針。",
    },
    otherOptions: [
      {
        name: "全主要国同時出願",
        notAdoptedReason: "出願コストが予算を大幅に超過",
      },
      {
        name: "国内のみ",
        notAdoptedReason: "グローバル市場での競争力を失う",
      },
    ],
    outcomes: [
      "出願コストを50%削減（全主要国出願比）",
      "主要市場でのIP保護を確保",
      "2年後のアジア市場展開時に追加出願で対応",
    ],
    lessons: [
      "海外出願は市場規模と競合状況の分析が必須",
      "段階的出願でコストと保護範囲のバランスを取る",
      "PCT出願の30ヶ月期限を有効活用",
    ],
    kpiPriority: "cost",
    similarityScore: 88,
    matchReasons: [
      "同技術分野（AI技術）",
      "海外展開事例",
      "コスト最適化重視",
    ],
    metadata: {
      year: 2021,
      region: "グローバル",
      scale: "大規模",
      projectDuration: "18ヶ月",
    },
  },
  {
    id: "case-004",
    title: "通信プロトコル技術 標準化戦略",
    customerName: "D事業部",
    industry: "manufacturing",
    equipmentType: "ip_strategy",
    summary: "業界標準への技術提案と特許戦略の連携。標準必須特許（SEP）の獲得により、業界内での影響力を確保。",
    background: "次世代FA通信規格の標準化活動に参画。技術提案と特許出願を連携させ、標準必須特許の獲得を目指した。",
    adoptedSolution: {
      name: "標準化積極参加戦略",
      description: "技術仕様への貢献と並行して特許出願。FRAND条件でのライセンス提供を前提とし、業界エコシステムでの存在感を確立。",
    },
    otherOptions: [
      {
        name: "標準化観察のみ",
        notAdoptedReason: "後発参入では標準への影響力を持てない",
      },
      {
        name: "独自規格推進",
        notAdoptedReason: "市場採用のリスクが高すぎた",
      },
    ],
    outcomes: [
      "標準必須特許3件を獲得",
      "業界標準への仕様反映に成功",
      "ライセンス収入の継続的な確保",
    ],
    lessons: [
      "標準化活動は早期参加が重要",
      "技術提案と特許出願のタイミングを同期させる",
      "FRANDコミットメントの条件を慎重に検討",
    ],
    kpiPriority: "availability",
    similarityScore: 75,
    matchReasons: [
      "標準化戦略事例",
      "業界影響力重視",
    ],
    metadata: {
      year: 2022,
      region: "グローバル",
      scale: "大規模",
      projectDuration: "48ヶ月",
    },
  },
];

/**
 * デモ用検索結果を生成
 * @param condition 検索条件
 * @param cases シナリオ固有の事例データ（省略時はデフォルトの知財事例を使用）
 */
export function generateDemoSearchResult(
  condition: SimilarCaseSearchCondition,
  cases?: SimilarCase[]
): SimilarCaseSearchResult {
  // 条件に基づいてフィルタリング（デモなので簡易的に）
  let filtered = [...(cases ?? DEMO_SIMILAR_CASES)];

  // 業種でフィルタ
  if (condition.searchScope === "same_industry") {
    filtered = filtered.filter((c) => c.industry === condition.industry);
  }

  // 設備でフィルタ
  if (condition.searchScope === "same_equipment" || condition.equipmentType) {
    filtered = filtered.filter(
      (c) =>
        c.equipmentType === condition.equipmentType ||
        condition.equipmentType === "ip_strategy"
    );
  }

  // KPIでフィルタ（オプション）
  if (condition.kpiPriority) {
    // KPIが一致するものを優先的に上位に
    filtered.sort((a, b) => {
      if (a.kpiPriority === condition.kpiPriority && b.kpiPriority !== condition.kpiPriority) {
        return -1;
      }
      if (a.kpiPriority !== condition.kpiPriority && b.kpiPriority === condition.kpiPriority) {
        return 1;
      }
      return b.similarityScore - a.similarityScore;
    });
  } else {
    // 類似度スコア順
    filtered.sort((a, b) => b.similarityScore - a.similarityScore);
  }

  return {
    condition,
    cases: filtered,
    totalCount: filtered.length,
    searchedAt: new Date().toISOString(),
  };
}
