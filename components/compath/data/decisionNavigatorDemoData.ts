/**
 * DecisionNavigator デモ用過去事例データ
 *
 * components/chat/decisionNavigatorDummyData.ts から分離
 *
 * オムロン技術・知財本部向けシナリオ:
 * - 研究テーマ選定・知財戦略の意思決定支援
 * - Sensing & Control + Think の技術体系
 * - 両利きの知財活動（独占/共創の使い分け）
 * - 事業接続と技術経営
 */

import type { PastCaseReference } from "../types/decisionNavigator";

/**
 * 過去事例のダミーデータ
 *
 * criteriaId対応:
 * - criteria-1: 出願方針（単独出願/共同出願/オープン化）
 * - criteria-2: 事業戦略との整合性（製品化優先/研究優先/バランス）
 * - criteria-3: 共創戦略（独占/選択的共有/オープン化）
 * - criteria-4: 海外展開（主要国優先/全方位/国内中心）
 */
export const DUMMY_PAST_CASES: PastCaseReference[] = [
  {
    id: "case-001",
    caseNumber: "P19-001234",
    date: "2019/03",
    summary: "画像センシングAI：単独出願で競争優位確保",
    purpose: "FA事業部への技術移管を見据え、製品化1年前に基本特許10件の権利化を完了。コア技術の独自性が高く、単独出願を選択。",
    decisions: [
      {
        criteriaId: "criteria-1",
        criteriaLabel: "出願方針は？",
        selectedOption: "単独出願",
        rationale: "技術の独自性が高く、競争優位を確保するため単独出願を優先。共同研究成果も応用部分は単独で権利化",
      },
      {
        criteriaId: "criteria-2",
        criteriaLabel: "事業戦略との整合性は？",
        selectedOption: "製品化優先",
        rationale: "FA事業部の製品化スケジュールから逆算し、移管1年前に権利化完了。事業部との連携を重視",
      },
      {
        criteriaId: "criteria-3",
        criteriaLabel: "共創戦略は？",
        selectedOption: "選択的共有",
        rationale: "基盤技術の一部は大学と共同研究を継続。ただし応用技術は独占領域として明確に区分",
      },
    ],
    outcome: "基本特許10件を単独出願、FA事業部への移管時に競争優位性を発揮",
    similarity: 0.88,
    veteranInsight: "【ベテランの経験談】技術の独自性が高い場合は迷わず単独出願。製品化1年前には権利化を完了しておくことで、事業部への移管がスムーズになります。",
  },
  {
    id: "case-002",
    caseNumber: "P20-002345",
    date: "2020/06",
    summary: "推論エンジン：大学共同出願で学術価値と事業価値を両立",
    purpose: "東京大学との共同研究成果。基盤技術は共有、応用技術は単独という取り決めで、論文発表と特許出願を両立。",
    decisions: [
      {
        criteriaId: "criteria-1",
        criteriaLabel: "出願方針は？",
        selectedOption: "共同出願",
        rationale: "大学との共同研究成果のため共同出願。ただし応用技術は別途単独出願で権利を確保",
      },
      {
        criteriaId: "criteria-3",
        criteriaLabel: "共創戦略は？",
        selectedOption: "選択的共有",
        rationale: "基盤技術は共有して価値を拡大。応用技術は独占領域として明確に線引き",
      },
      {
        criteriaId: "criteria-2",
        criteriaLabel: "事業戦略との整合性は？",
        selectedOption: "バランス",
        rationale: "学術論文発表と製品化の両方を追求。出願後に論文発表というルールを徹底",
      },
    ],
    outcome: "共同出願5件、単独出願3件。論文発表も実現し、学術価値と事業価値を両立",
    similarity: 0.75,
    veteranInsight: "【ベテランの経験談】共同研究は価値があるが、知財の取り扱いは事前に明確にすること。曖昧なまま始めると、成果が出た時に帰属で揉めます。",
  },
  {
    id: "case-003",
    caseNumber: "P21-003456",
    date: "2021/04",
    summary: "エッジAI：海外15カ国への戦略的出願",
    purpose: "グローバル市場での競争優位確保のため、米国・欧州・中国を優先し段階的に出願国を拡大。各国の審査状況を見ながら戦略的に対応。",
    decisions: [
      {
        criteriaId: "criteria-4",
        criteriaLabel: "海外展開は？",
        selectedOption: "主要国優先",
        rationale: "費用対効果を考慮し、米国・欧州・中国を優先。審査状況を見ながら段階的に拡大",
      },
      {
        criteriaId: "criteria-1",
        criteriaLabel: "出願方針は？",
        selectedOption: "単独出願",
        rationale: "競合が先行出願しているため、差別化ポイントを明確にした請求項設計で単独出願",
      },
      {
        criteriaId: "criteria-2",
        criteriaLabel: "事業戦略との整合性は？",
        selectedOption: "製品化優先",
        rationale: "グローバル製品展開に合わせた出願スケジュール。各国の市場投入時期を考慮",
      },
    ],
    outcome: "主要3カ国優先で15カ国に出願、グローバル市場での権利確保を実現",
    similarity: 0.68,
    veteranInsight: "【ベテランの経験談】海外出願は費用がかかるので、市場重要度と審査状況を見ながら段階的に進める。全部一気に出願する必要はありません。",
  },
  {
    id: "case-004",
    caseNumber: "P22-004567",
    date: "2022/02",
    summary: "センシング×制御：標準化と知財の両立戦略",
    purpose: "IEC標準化委員会への技術提案と並行して特許出願。標準必須特許化で市場影響力を確保しつつ、オープンイノベーションも推進。",
    decisions: [
      {
        criteriaId: "criteria-3",
        criteriaLabel: "共創戦略は？",
        selectedOption: "選択的共有",
        rationale: "標準化活動で技術を普及させつつ、標準必須特許として権利も確保。両利きの知財活動を実践",
      },
      {
        criteriaId: "criteria-1",
        criteriaLabel: "出願方針は？",
        selectedOption: "単独出願",
        rationale: "標準化提案前に単独出願で権利を確保。標準に採用された技術の特許価値向上を狙う",
      },
      {
        criteriaId: "criteria-2",
        criteriaLabel: "事業戦略との整合性は？",
        selectedOption: "バランス",
        rationale: "標準化による市場拡大と、特許ライセンスによる収益化の両方を追求",
      },
    ],
    outcome: "IEC標準に採用、標準必須特許3件を権利化。市場影響力とライセンス収益を両立",
    similarity: 0.82,
    veteranInsight: "【ベテランの経験談】標準化活動と知財戦略は両立できます。標準に採用された技術の特許は価値が高い。ただし、標準化活動での情報開示には注意が必要です。",
  },
  {
    id: "case-005",
    caseNumber: "P23-005678",
    date: "2023/09",
    summary: "無形資産経営：技術ノウハウの体系的管理",
    purpose: "特許だけでなく、技術ノウハウ・データ資産・人材スキルも含めた無形資産として体系的に整理。経営資源としての価値を可視化。",
    decisions: [
      {
        criteriaId: "criteria-1",
        criteriaLabel: "出願方針は？",
        selectedOption: "選択的出願",
        rationale: "全てを特許化するのではなく、ノウハウとして秘匿する技術も選別。無形資産として最適配置",
      },
      {
        criteriaId: "criteria-3",
        criteriaLabel: "共創戦略は？",
        selectedOption: "独占",
        rationale: "コアノウハウは社内に留め、競争優位の源泉として独占。データ資産も含めて管理",
      },
      {
        criteriaId: "criteria-2",
        criteriaLabel: "事業戦略との整合性は？",
        selectedOption: "バランス",
        rationale: "技術経営の観点から、事業価値創出と技術蓄積のバランスを最適化",
      },
    ],
    outcome: "無形資産管理体制を構築、技術経営の先行事例として経営層から評価",
    similarity: 0.71,
    veteranInsight: "【ベテランの経験談】特許だけが知財ではありません。ノウハウ・データ・人材も含めた無形資産として捉え、事業戦略と一体で管理することが重要です。",
  },
  {
    id: "case-006",
    caseNumber: "P24-006789",
    date: "2024/01",
    summary: "カーボンニュートラル：社会課題起点の技術開発",
    purpose: "カーボンニュートラル対応のセンシング技術を社会課題から逆算して開発。バックキャスト型の研究テーマ設定で、長期視点での知財戦略を立案。",
    decisions: [
      {
        criteriaId: "criteria-2",
        criteriaLabel: "事業戦略との整合性は？",
        selectedOption: "研究優先",
        rationale: "社会課題解決が先、事業化は後。長期テーマ（5〜7年）として位置づけ",
      },
      {
        criteriaId: "criteria-1",
        criteriaLabel: "出願方針は？",
        selectedOption: "単独出願",
        rationale: "基盤技術段階から権利化を進め、将来の事業化に備える。先願主義を意識",
      },
      {
        criteriaId: "criteria-3",
        criteriaLabel: "共創戦略は？",
        selectedOption: "選択的共有",
        rationale: "大学・研究機関との共同研究で技術を深化。社会実装に向けた共創パートナーを探索",
      },
    ],
    outcome: "基盤特許5件を出願、大学との共同研究を開始。長期視点での技術蓄積を推進",
    similarity: 0.65,
    veteranInsight: "【ベテランの経験談】社会課題起点のテーマは事業化まで時間がかかります。長期視点で知財を蓄積しつつ、共創パートナーとの関係構築を並行して進めることが重要です。",
  },
];
