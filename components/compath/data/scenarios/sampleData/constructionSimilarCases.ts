/**
 * 建設プロジェクトシナリオ用 類似事例データ
 *
 * ゼネコン・デベロッパー向け: 工期・品質・コスト判断の過去事例
 */

import type { SimilarCase } from "../../../types/similarCase";

/** 建設プロジェクト類似事例データ */
export const CONSTRUCTION_SIMILAR_CASES: SimilarCase[] = [
  {
    id: "const-case-001",
    title: "外注増員による工期回復事例",
    customerName: "大成建設",
    industry: "manufacturing",
    equipmentType: "construction_management" as SimilarCase["equipmentType"],
    summary: "RC造高層ビル工事で発生した1ヶ月の工期遅延に対し、外注作業班の追加投入と工程の並行化により2週間の工期回復を実現。",
    background: "都心再開発プロジェクト（RC造25階建て）にて、長雨による作業中止と資材調達遅延が重なり1ヶ月の工期遅延が発生。違約金リスクと品質維持の両立が求められた。",
    adoptedSolution: {
      name: "外注増員＋並行作業前倒し",
      description: "外注作業班3班を追加投入し、躯体工事と設備工事の並行作業を前倒しで実施。品質管理体制も同時に強化し、増員に伴う品質リスクを抑制。",
    },
    otherOptions: [
      {
        name: "工期延長の発注者協議",
        notAdoptedReason: "テナント入居時期が確定しており、工期延長は違約金リスクが大きかった",
      },
      {
        name: "工法変更（PC化）",
        notAdoptedReason: "設計変更の手続きに時間がかかり、結果的に工期短縮効果が限定的と判断",
      },
    ],
    outcomes: [
      "追加費用500万円で外注3班を投入し、2週間の工期回復に成功",
      "中間検査を追加実施し、品質問題ゼロを達成",
      "テナント入居スケジュールへの影響を回避",
    ],
    lessons: [
      "外注増員時は事前に品質管理体制を整備してから投入すること",
      "並行作業の前倒しは干渉チェックを十分に行うこと",
      "工期遅延の初期段階で対策を講じることが費用対効果で優れる",
    ],
    kpiPriority: "availability",
    similarityScore: 90,
    matchReasons: [
      "同構造（RC造高層）",
      "同課題（工期遅延）",
      "外注増員による回復策",
    ],
    metadata: {
      year: 2019,
      region: "東京",
      scale: "大規模",
      projectDuration: "30ヶ月",
    },
  },
  {
    id: "const-case-002",
    title: "品質基準未達への対応で工期延長を選択した事例",
    customerName: "清水建設",
    industry: "manufacturing",
    equipmentType: "construction_management" as SimilarCase["equipmentType"],
    summary: "コンクリート圧縮強度が基準値を下回る品質問題が発生。品質確保を最優先とし、工期を2週間延長して全数検査と補修を実施。",
    background: "オフィスビル新築工事（SRC造18階建て）において、冬季打設のコンクリートで複数ロットの強度不足が判明。工期を優先して進めるか、品質を確保して工期延長するかの判断が必要となった。",
    adoptedSolution: {
      name: "品質優先・工期延長",
      description: "品質基準未達の箇所を全数特定し、炭素繊維巻立て工法で補強。養生管理基準を改訂し、以降の打設品質を確保。発注者に品質報告書を提出し、工期延長の了承を得た。",
    },
    otherOptions: [
      {
        name: "現行ペースで施工継続",
        notAdoptedReason: "品質不具合の手戻りコストは工期延長コストの3倍以上と試算され、リスクが大きかった",
      },
      {
        name: "構造設計の見直し（強度要件緩和）",
        notAdoptedReason: "構造安全性に関わる基準であり、緩和は認められなかった",
      },
    ],
    outcomes: [
      "工期2週間延長を発注者が了承、追加費用は折半",
      "補強工事により構造安全性を完全確保",
      "養生管理基準の改訂により、以降の品質問題ゼロ",
    ],
    lessons: [
      "品質問題は早期に発注者へ報告することが信頼関係の維持に不可欠",
      "冬季打設の養生管理は気象データに基づく判断が必要",
      "品質不具合の手戻りコストは事前の予防コストの数倍に達する",
    ],
    kpiPriority: "cost",
    similarityScore: 85,
    matchReasons: [
      "同課題（コンクリート品質）",
      "品質優先判断",
      "養生管理の改善",
    ],
    metadata: {
      year: 2020,
      region: "大阪",
      scale: "大規模",
      projectDuration: "24ヶ月",
    },
  },
  {
    id: "const-case-003",
    title: "地中障害物発見に伴う設計変更と費用協議の事例",
    customerName: "三井不動産",
    industry: "manufacturing",
    equipmentType: "construction_management" as SimilarCase["equipmentType"],
    summary: "基礎杭施工中に予見不可能な地中障害物（旧建物基礎）を発見。設計変更により杭配置を変更し、追加費用は契約約款に基づき発注者負担とした。",
    background: "複合商業施設の新築工事（RC造地上12階・地下2階）にて、場所打ち杭施工中に旧建物のコンクリートフーチングを発見。事前のボーリング調査では把握できなかった障害物であり、杭の再配置が必要となった。",
    adoptedSolution: {
      name: "杭偏心＋基礎梁補強",
      description: "障害物を回避するため杭位置を偏心させ、基礎梁の配筋を補強。構造計算をやり直し、安全性を確認の上で施工を再開。障害物の撤去は行わず、コストと工期を最小化。",
    },
    otherOptions: [
      {
        name: "障害物の撤去",
        notAdoptedReason: "撤去費用500万円・期間2週間で、杭偏心案より費用・工期ともに不利",
      },
      {
        name: "杭の追加打設",
        notAdoptedReason: "杭の追加は構造計算の大幅変更が必要で、承認に時間がかかりすぎた",
      },
    ],
    outcomes: [
      "追加費用300万円（発注者負担）で設計変更を完了",
      "全体工期への影響を1週間に抑制",
      "契約変更手続きも円滑に完了",
    ],
    lessons: [
      "地中障害物発見時は写真・測量データを詳細に記録することが費用協議の鍵",
      "契約約款の条項を正確に理解し、適切な費用負担の根拠を示すこと",
      "事前調査では把握しきれないリスクへの予備費確保が重要",
    ],
    kpiPriority: "flexibility",
    similarityScore: 82,
    matchReasons: [
      "同課題（地中障害物）",
      "設計変更対応",
      "費用協議の事例",
    ],
    metadata: {
      year: 2021,
      region: "名古屋",
      scale: "大規模",
      projectDuration: "28ヶ月",
    },
  },
  {
    id: "const-case-004",
    title: "近隣騒音クレーム対応で低騒音工法を採用した事例",
    customerName: "鹿島建設",
    industry: "manufacturing",
    equipmentType: "construction_management" as SimilarCase["equipmentType"],
    summary: "住宅密集地での杭打ち工事に対する近隣住民の騒音クレームが多発。低騒音・低振動工法への変更と作業時間短縮で住民理解を獲得。",
    background: "駅前再開発プロジェクト（RC造20階建て）にて、鋼管杭の打設時に近隣住民から騒音・振動のクレームが多発。住民説明会を開催したが理解が得られず、施工方法の見直しが必要となった。",
    adoptedSolution: {
      name: "低騒音工法＋作業時間短縮",
      description: "鋼管杭の打撃工法から回転圧入工法に変更し、騒音を大幅に低減。作業時間を9:00-17:00に限定し、防音パネルを増設。定期的な近隣説明会を実施し、工事の進捗と対策状況を報告。",
    },
    otherOptions: [
      {
        name: "防音壁の増設のみ",
        notAdoptedReason: "防音壁だけでは騒音値の低減が不十分で、住民の理解を得られなかった",
      },
      {
        name: "夜間工事へのシフト",
        notAdoptedReason: "夜間の騒音は条例でより厳しい規制があり、逆効果",
      },
    ],
    outcomes: [
      "騒音クレーム件数を月15件から月2件に削減（87%減）",
      "低騒音工法への変更で追加コスト月額40万円発生",
      "近隣住民との良好な関係構築に成功",
    ],
    lessons: [
      "近隣対策は着工前の説明会から始めることが重要",
      "クレーム発生後の対応より事前の予防措置が費用対効果で優れる",
      "定期的な情報提供と対話が住民理解の鍵となる",
    ],
    kpiPriority: "availability",
    similarityScore: 75,
    matchReasons: [
      "近隣対策事例",
      "工法変更の判断",
      "住宅密集地での施工",
    ],
    metadata: {
      year: 2023,
      region: "横浜",
      scale: "大規模",
      projectDuration: "36ヶ月",
    },
  },
];
