/**
 * フォワード戦略（Forward Strategy）
 *
 * 既存のプロセス支援モードをIThinkingStrategyとしてラップ
 * 現状→方針→手法→行動の順に前進する従来の思考パス
 */

import type {
  IThinkingStrategy,
  StrategyDecisionContext,
  StrategySessionContext,
  StrategyGoalDistance,
  PromptSet,
} from "../../../domain/decisionNavigator/strategies/IThinkingStrategy";
import {
  RECOMMENDED_PATH_SYSTEM_PROMPT,
  buildRecommendedPathPrompt,
} from "../llm/recommendedPathPrompt";

// ============================================================
// ゴール距離計算ヘルパー
// ============================================================

function countNodesByStatus(
  nodes: StrategySessionContext["nodes"],
  status: string
): number {
  return nodes.filter((n) => n.status === status).length;
}

function countNodesByLevel(
  nodes: StrategySessionContext["nodes"],
  level: string
): number {
  return nodes.filter((n) => n.level === level).length;
}

// ============================================================
// Forward Strategy
// ============================================================

export const forwardStrategy: IThinkingStrategy = {
  id: "forward",
  name: "フォワード",
  description: "現状→方針→手法→行動の順に前進する従来の意思決定パス",

  buildPromptSet(context: StrategyDecisionContext): PromptSet {
    // 既存のプロセス支援プロンプトをそのまま使用
    return {
      systemPrompt: RECOMMENDED_PATH_SYSTEM_PROMPT,
      userPrompt: buildRecommendedPathPrompt(context),
    };
  },

  calculateGoalDistance(session: StrategySessionContext): StrategyGoalDistance {
    const { nodes, selectionHistory } = session;
    const totalNodes = nodes.length;
    const selectedCount = selectionHistory.length;

    // 各レベルの充足率を計算
    const strategyNodes = countNodesByLevel(nodes, "strategy");
    const tacticNodes = countNodesByLevel(nodes, "tactic");
    const actionNodes = countNodesByLevel(nodes, "action");
    const selectedNodes = countNodesByStatus(nodes, "selected");

    // 基本進捗（選択率）
    const progressRate = totalNodes > 0 ? selectedCount / Math.max(totalNodes * 0.3, 1) : 0;

    // 明確さ: 目的が構造化されている度合い
    const clarityScore = Math.min(100, Math.round(
      (strategyNodes > 0 ? 40 : 0) +
      (tacticNodes > 0 ? 30 : 0) +
      (actionNodes > 0 ? 30 : 0)
    ));

    // リスク対応率: 選択済みノードの割合（リスク評価ノードが含まれる前提）
    const riskCoverage = Math.min(100, Math.round(progressRate * 100));

    // 制約充足率: Forward戦略では進捗に比例
    const constraintSatisfaction = Math.min(100, Math.round(progressRate * 80 + 20));

    // 行動準備度: actionレベルのノードが選択されているか
    const actionSelected = nodes.filter(
      (n) => n.level === "action" && n.status === "selected"
    ).length;
    const actionReadiness = actionNodes > 0
      ? Math.min(100, Math.round((actionSelected / actionNodes) * 100))
      : selectedCount > 0 ? 30 : 0;

    // 総合距離
    const overall = Math.max(0, 100 - Math.round(
      (clarityScore * 0.25 + riskCoverage * 0.25 + constraintSatisfaction * 0.25 + actionReadiness * 0.25)
    ));

    return {
      overall,
      dimensions: {
        clarityScore,
        riskCoverage,
        constraintSatisfaction,
        actionReadiness,
      },
    };
  },

  buildExplorePrompt(
    session: StrategySessionContext,
    selectedNodeId: string
  ): PromptSet {
    const selectedNode = session.nodes.find((n) => n.id === selectedNodeId);
    const selectedPath = session.selectionHistory.map((h) => ({
      question: h.nodeLabel,
      selectedOption: h.nodeLabel,
    }));

    return {
      systemPrompt: `あなたは意思決定支援AIです。フォワード（前進型）思考で次の判断ポイントを提案してください。
現状→方針→手法→行動の流れで、目的達成に必要な次の問いを生成します。

応答は必ずJSON形式で返してください：
\`\`\`json
{
  "isRelevant": true,
  "criteria": { "question": "次に検討すべき問い", "description": "理由" },
  "options": [
    { "label": "選択肢1", "description": "説明", "isRecommended": true, "riskStrategy": "mitigate" },
    { "label": "選択肢2", "description": "説明", "isRecommended": false, "riskStrategy": "accept" }
  ]
}
\`\`\`
目的達成に十分なら: { "isRelevant": false, "irrelevantReason": "理由" }`,

      userPrompt: `## 目的
${session.purpose}

## 現在の選択
${selectedNode ? `- ${selectedNode.level}: ${selectedNode.id}` : "（不明）"}

## これまでの選択
${selectedPath.map((p, i) => `${i + 1}. ${p.question}`).join("\n") || "（まだ選択なし）"}

## 次に決めるべきことは？
strategy→tactic→actionの流れで、まだ決めていない重要なポイントがあれば提案してください。`,
    };
  },
};
