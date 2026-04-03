/**
 * DecisionNavigator デモ用ヘルパー関数
 *
 * components/chat/decisionNavigatorDummyData.ts から分離
 * 事前収集条件からシミュレーション条件を生成するロジック
 */

import type { SimulationCondition } from "../types/decisionNavigator";
import type { KnowledgeTransferConditions } from "../types/chat";

/**
 * 事前収集条件から技術独自性の表示値を取得
 */
function getTechnologyUniquenessValue(preCollectedConditions?: KnowledgeTransferConditions): string {
  if (!preCollectedConditions?.startupFrequency) return "中程度";
  switch (preCollectedConditions.startupFrequency) {
    case "low": return "低（競合と類似）";
    case "medium": return "中程度";
    case "high": return "高（独自技術）";
    default: return "中程度";
  }
}

/**
 * 事前収集条件から事業接続時期の表示値を取得
 */
function getBusinessTimelineValue(preCollectedConditions?: KnowledgeTransferConditions): string {
  if (!preCollectedConditions?.recoveryTimeTarget) return "1〜2年後";
  switch (preCollectedConditions.recoveryTimeTarget) {
    case "strict": return "1年以内（急ぎ）";
    case "moderate": return "1〜2年後";
    case "flexible": return "3年以上（研究段階）";
    default: return "1〜2年後";
  }
}

/**
 * 事前収集条件から共創機会の表示値を取得
 */
function getCollaborationOpportunityValue(preCollectedConditions?: KnowledgeTransferConditions): string {
  if (!preCollectedConditions?.spaceConstraint) return "検討中";
  switch (preCollectedConditions.spaceConstraint) {
    case "tight": return "単独推進（リソース制約）";
    case "standard": return "検討中";
    case "ample": return "積極的に共創";
    default: return "検討中";
  }
}

/**
 * シミュレーション条件のダミーデータを生成
 * チャットで選択された条件のみをアクティブとして返す
 */
export function createDummyConditions(
  preCollectedConditions?: KnowledgeTransferConditions
): SimulationCondition[] {
  const conditions: SimulationCondition[] = [];

  if (preCollectedConditions?.startupFrequency) {
    conditions.push({
      id: "cond-1",
      criteriaId: "c1",
      label: "技術独自性",
      value: getTechnologyUniquenessValue(preCollectedConditions),
      options: ["低（競合と類似）", "中程度", "高（独自技術）"],
      isPreSelected: true,
    });
  }

  if (preCollectedConditions?.recoveryTimeTarget) {
    conditions.push({
      id: "cond-2",
      criteriaId: "c2",
      label: "事業接続時期",
      value: getBusinessTimelineValue(preCollectedConditions),
      options: ["1年以内（急ぎ）", "1〜2年後", "3年以上（研究段階）"],
      isPreSelected: true,
    });
  }

  if (preCollectedConditions?.spaceConstraint) {
    conditions.push({
      id: "cond-3",
      criteriaId: "c3",
      label: "共創機会",
      value: getCollaborationOpportunityValue(preCollectedConditions),
      options: ["単独推進（リソース制約）", "検討中", "積極的に共創"],
      isPreSelected: true,
    });
  }

  return conditions;
}

/**
 * 全ての利用可能な条件を生成（詳細設定モーダル用）
 */
export function createAllAvailableConditions(
  preCollectedConditions?: KnowledgeTransferConditions
): SimulationCondition[] {
  return [
    {
      id: "cond-1",
      criteriaId: "c1",
      label: "技術独自性",
      value: getTechnologyUniquenessValue(preCollectedConditions),
      options: ["低（競合と類似）", "中程度", "高（独自技術）"],
      isPreSelected: !!preCollectedConditions?.startupFrequency,
    },
    {
      id: "cond-2",
      criteriaId: "c2",
      label: "事業接続時期",
      value: getBusinessTimelineValue(preCollectedConditions),
      options: ["1年以内（急ぎ）", "1〜2年後", "3年以上（研究段階）"],
      isPreSelected: !!preCollectedConditions?.recoveryTimeTarget,
    },
    {
      id: "cond-3",
      criteriaId: "c3",
      label: "共創機会",
      value: getCollaborationOpportunityValue(preCollectedConditions),
      options: ["単独推進（リソース制約）", "検討中", "積極的に共創"],
      isPreSelected: !!preCollectedConditions?.spaceConstraint,
    },
  ];
}
