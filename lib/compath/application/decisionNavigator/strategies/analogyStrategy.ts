/**
 * アナロジー戦略（Analogy Strategy）
 *
 * 類似する過去事例・プロジェクトからパターンを抽出し、
 * 現在の意思決定に転用する思考戦略。
 *
 * ツリー構造:
 *   類似事例検索 → パターン抽出 → 現状への適用
 *
 * - "criteria" ノード = パターンカテゴリ（成功パターン、失敗パターン、適用可能性）
 * - "strategy" オプション = 過去事例から導かれたアプローチ
 * - "outcome" = 類推に基づく適応計画
 */

import type {
  IThinkingStrategy,
  StrategyDecisionContext,
  StrategySessionContext,
  StrategyGoalDistance,
  PromptSet,
} from "../../../domain/decisionNavigator/strategies/IThinkingStrategy";
import { buildContextSummary } from "../contextBuilder";

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

function countNodesByType(
  nodes: StrategySessionContext["nodes"],
  type: string
): number {
  return nodes.filter((n) => n.type === type).length;
}

// ============================================================
// 定数
// ============================================================

const ANALOGY_SYSTEM_PROMPT = `あなたは「類推（アナロジー）」に特化した意思決定支援AIです。
過去の類似事例・プロジェクト・業界の事例からパターンを抽出し、
現在の意思決定に適用するアプローチで支援します。

## 思考プロセス

1. **類似事例の特定**: 目的に対して目的の複雑さに応じて1〜4件の類似事例・状況を特定する
2. **成功/失敗パターン抽出**: 各事例から成功要因と失敗要因を抽出する
3. **適用可能性の評価**: 現在の状況・制約に照らして各パターンの適用可能性を判断する
4. **適応計画の提案**: 最も有力なパターンに基づき、現状に適応した具体的アプローチを提案する

## 出力ルール

- 必ず日本語で回答
- 応答は必ずJSON形式
- 各パターンには具体的な事例根拠を含める
- 適用可能性は現在の制約・前提条件を考慮して評価する

## JSON出力フォーマット

\`\`\`json
{
  "criteria": [
    {
      "id": "criteria-analogy-1",
      "question": "どの事例が最も参考になるか？",
      "description": "類似事例の選定理由",
      "level": "criteria",
      "options": [
        {
          "id": "option-case-a",
          "label": "事例A: ...",
          "description": "事例の概要と類似点",
          "isRecommended": true,
          "riskStrategy": "mitigate"
        }
      ]
    },
    {
      "id": "criteria-analogy-2",
      "question": "成功要因は何か？",
      "description": "パターンの成功要因分析",
      "level": "criteria",
      "options": [...]
    },
    {
      "id": "criteria-analogy-3",
      "question": "失敗を避けるには？",
      "description": "失敗パターンからの教訓",
      "level": "criteria",
      "options": [...]
    }
  ],
  "strategies": [
    {
      "id": "strategy-analogy-1",
      "label": "パターン転用アプローチ名",
      "description": "事例パターンに基づく具体的アプローチ",
      "sourceCase": "どの事例から導かれたか",
      "isRecommended": true,
      "riskStrategy": "mitigate"
    }
  ],
  "outcome": {
    "summary": "類推に基づく適応計画の要約",
    "adaptedPlan": "現状に適応させた具体的な計画",
    "keyPatterns": ["転用するパターン1", "転用するパターン2"],
    "caveats": ["適用時の注意点1", "適用時の注意点2"]
  },
  "contextUpdates": {
    "constraints": ["新たに発見された制約"],
    "assumptions": ["類推から導かれた前提"],
    "commitments": []
  }
}
\`\`\``;

// ============================================================
// Analogy Strategy
// ============================================================

export const analogyStrategy: IThinkingStrategy = {
  id: "analogy",
  name: "アナロジー（類推）",
  description: "類似する過去事例やプロジェクトからパターンを抽出し、現在の意思決定に転用する",

  buildPromptSet(context: StrategyDecisionContext): PromptSet {
    const contextSummary = buildContextSummary(context as any);

    const constraintBlock =
      context.constraints.length > 0
        ? `\n## 現在の制約条件\n${context.constraints.map((c) => `- ${c}`).join("\n")}`
        : "";

    const assumptionBlock =
      context.assumptions.length > 0
        ? `\n## 前提条件\n${context.assumptions.map((a) => `- ${a}`).join("\n")}`
        : "";

    const commitmentBlock =
      context.commitments.length > 0
        ? `\n## 確定事項\n${context.commitments.map((c) => `- ${c}`).join("\n")}`
        : "";

    const selectedPathBlock =
      context.selectedPath.length > 0
        ? `\n## これまでの選択パス\n${context.selectedPath.map((p, i) => `${i + 1}. ${p}`).join("\n")}`
        : "";

    const userPrompt = `## 意思決定コンテキスト

${contextSummary}
${constraintBlock}${assumptionBlock}${commitmentBlock}${selectedPathBlock}

## 指示

上記の目的に対して、以下のアナロジー（類推）アプローチで意思決定を支援してください：

1. **類似事例を目的の複雑さに応じて1〜4件特定**してください
   - 同じ業界、異なる業界問わず、構造的に類似する事例を選ぶ
   - 各事例について、現在の目的との類似点を明確に述べる

2. **各事例から成功パターンと失敗パターンを抽出**してください
   - 成功要因: 何が成功に寄与したか
   - 失敗要因: 何が失敗につながったか、あるいはリスクだったか

3. **現在の状況への適用可能性を評価**してください
   - 制約条件や前提条件を考慮し、各パターンがどの程度適用できるかを判断
   - 適用にあたっての調整点や注意点を記述

4. **最も有力なパターンに基づく適応計画を提案**してください
   - 過去の成功パターンを現状に合わせてアレンジした具体的アプローチ

JSON形式で出力してください。`;

    return {
      systemPrompt: ANALOGY_SYSTEM_PROMPT,
      userPrompt,
    };
  },

  calculateGoalDistance(session: StrategySessionContext): StrategyGoalDistance {
    const { nodes, selectionHistory } = session;
    const totalNodes = nodes.length;
    const selectedCount = selectionHistory.length;

    // --- 各ノード種別のカウント ---
    const criteriaNodes = countNodesByType(nodes, "criteria");
    const strategyNodes = countNodesByLevel(nodes, "strategy");
    const outcomeNodes = countNodesByType(nodes, "outcome");
    const selectedNodes = countNodesByStatus(nodes, "selected");

    // --- パターン一致率に基づく明確さ ---
    // criteriaノード（パターンカテゴリ）がどれだけ存在・選択されているか
    const criteriaSelected = nodes.filter(
      (n) => n.type === "criteria" && n.status === "selected"
    ).length;
    const criteriaProgress =
      criteriaNodes > 0 ? criteriaSelected / criteriaNodes : 0;

    // 明確さ: パターンがどの程度特定されているか
    const clarityScore = Math.min(
      100,
      Math.round(
        (criteriaNodes > 0 ? 30 : 0) +
          (criteriaProgress * 40) +
          (strategyNodes > 0 ? 20 : 0) +
          (outcomeNodes > 0 ? 10 : 0)
      )
    );

    // --- 過去の失敗パターン対応率 ---
    // 選択を通じてリスクがどの程度カバーされているか
    const progressRate =
      totalNodes > 0
        ? selectedCount / Math.max(totalNodes * 0.4, 1)
        : 0;
    const riskCoverage = Math.min(
      100,
      Math.round(
        criteriaProgress * 60 + Math.min(progressRate, 1) * 40
      )
    );

    // --- パターン適用可能性（制約充足率）---
    // 選択の深さと選択済みノードの比率で判定
    const strategySelected = nodes.filter(
      (n) => n.level === "strategy" && n.status === "selected"
    ).length;
    const strategyProgress =
      strategyNodes > 0 ? strategySelected / strategyNodes : 0;
    const constraintSatisfaction = Math.min(
      100,
      Math.round(
        strategyProgress * 50 +
          criteriaProgress * 30 +
          (selectedCount > 0 ? 20 : 0)
      )
    );

    // --- 行動準備度（主要指標）---
    // 適応計画（outcome）が生成され、具体的な戦略が選択されているか
    const outcomeSelected = nodes.filter(
      (n) => n.type === "outcome" && n.status === "selected"
    ).length;
    const actionReadiness = Math.min(
      100,
      Math.round(
        (outcomeNodes > 0 && outcomeSelected > 0 ? 40 : 0) +
          (strategyProgress * 30) +
          (criteriaProgress * 20) +
          (selectedCount >= 3 ? 10 : selectedCount >= 1 ? 5 : 0)
      )
    );

    // --- 戦略固有指標: パターン転用率 ---
    const patternTransferRate = Math.min(
      100,
      Math.round(
        (criteriaProgress * 0.4 + strategyProgress * 0.4 + (outcomeSelected > 0 ? 0.2 : 0)) * 100
      )
    );

    // 総合距離 (0=ゴール到達)
    const overall = Math.max(
      0,
      100 -
        Math.round(
          clarityScore * 0.2 +
            riskCoverage * 0.2 +
            constraintSatisfaction * 0.2 +
            actionReadiness * 0.4
        )
    );

    return {
      overall,
      dimensions: {
        clarityScore,
        riskCoverage,
        constraintSatisfaction,
        actionReadiness,
      },
      strategySpecific: {
        patternTransferRate,
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
      level: h.level,
    }));

    const contextBlock = session.decisionContext
      ? buildContextSummary(session.decisionContext as any)
      : `【目的】\n${session.purpose}`;

    return {
      systemPrompt: `あなたは「類推（アナロジー）」に特化した意思決定支援AIです。
過去の類似事例や他業界のパターンから学び、現在の意思決定に活かすアプローチで支援します。

ユーザーの選択に基づき、さらに参考になる類似事例や未検討のパターンがないか探索してください。

## 探索の観点
- まだ検討されていない業界・領域からの類似事例
- 選択された事例のより深い成功/失敗パターン
- 現在の制約下での適用可能性の再評価
- 複数パターンの組み合わせによる新しいアプローチ

応答は必ずJSON形式で返してください：
\`\`\`json
{
  "isRelevant": true,
  "criteria": { "question": "次に検討すべき問い", "description": "この問いが重要な理由" },
  "options": [
    { "label": "選択肢1", "description": "説明", "isRecommended": true, "riskStrategy": "mitigate" },
    { "label": "選択肢2", "description": "説明", "isRecommended": false, "riskStrategy": "accept" }
  ]
}
\`\`\`
目的達成に十分な類推パターンが得られている場合:
\`\`\`json
{ "isRelevant": false, "irrelevantReason": "理由" }
\`\`\``,

      userPrompt: `## 意思決定コンテキスト
${contextBlock}

## 現在の選択
${selectedNode ? `- ${selectedNode.type}${selectedNode.level ? ` (${selectedNode.level})` : ""}: ${selectedNode.id}` : "（不明）"}

## これまでの選択履歴
${selectedPath.map((p, i) => `${i + 1}. [${p.level}] ${p.question}`).join("\n") || "（まだ選択なし）"}

## 次に探索すべきアナロジーは？

以下の観点で、まだ検討されていない類似事例やパターンがあれば提案してください：
- 他にどのような類似事例が参考になるか？
- 選択済みパターンの適用をさらに具体化できるか？
- 見落としている失敗パターンはないか？
- 異なる業界・領域から転用できるアプローチはあるか？`,
    };
  },
};
