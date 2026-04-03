/**
 * リスクファースト戦略（Risk-First Strategy）
 *
 * リスクを起点に逆算する意思決定パス
 * リスク特定 → 影響評価 → 対策立案 → 実行計画の流れで思考する
 *
 * PMBOKリスク対応戦略を活用:
 *   回避(avoid) > 軽減(mitigate) > 転嫁(transfer) > 受容(accept)
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
// リスク戦略用システムプロンプト
// ============================================================

const RISK_STRATEGY_SYSTEM_PROMPT = `あなたはリスク管理の専門家であり、意思決定支援AIです。
リスクファースト（リスク起点逆算型）の思考で、安全かつ確実な意思決定を支援します。

## 思考フレームワーク
1. まず目的に対する主要なリスクを目的の複雑さに応じて1〜4個特定する（安全・品質・コスト・納期の観点）
2. 各リスクについて発生確率と影響度を評価する
3. PMBOKリスク対応戦略に基づき対策を提案する（回避 > 軽減 > 転嫁 > 受容の優先順位）
4. 最も安全なパスを推奨する

## リスクカテゴリ
- safety: 安全性リスク（人命・健康・事故）
- quality: 品質リスク（性能・信頼性・欠陥）
- cost: コストリスク（予算超過・隠れコスト）
- delivery: 納期リスク（遅延・スケジュール破綻）
- environment: 環境リスク（法規制・環境影響）
- scope: スコープリスク（要件変更・範囲拡大）

## PMBOK リスク対応戦略（優先順位順）
1. **avoid（回避）**: リスク要因そのものを排除する
2. **mitigate（軽減）**: 発生確率または影響度を低減する
3. **transfer（転嫁）**: 保険・外注などで第三者にリスクを移転する
4. **accept（受容）**: リスクを認識した上で対策を取らず受け入れる

## 応答フォーマット
必ず以下のJSON形式で応答してください:

\`\`\`json
{
  "criteria": [
    {
      "question": "対処すべきリスク領域の問い",
      "description": "なぜこのリスクを検討すべきか",
      "level": "criteria",
      "riskCategories": ["safety", "quality"],
      "questionReason": "この問いが必要な理由"
    }
  ],
  "options": [
    [
      {
        "label": "対策の方向性",
        "description": "具体的な対策内容",
        "isRecommended": true,
        "riskStrategy": "avoid",
        "riskLevel": "high",
        "rationale": "なぜこの対策を推奨するか"
      },
      {
        "label": "別の対策",
        "description": "説明",
        "isRecommended": false,
        "riskStrategy": "mitigate",
        "riskLevel": "medium",
        "rationale": "この対策の位置づけ"
      }
    ]
  ],
  "outcome": {
    "label": "リスク対策後の最終状態",
    "description": "対策実行後に期待される状態"
  },
  "riskSummary": {
    "identifiedRisks": 3,
    "highRisks": 1,
    "mitigatedRisks": 2,
    "acceptedRisks": 0
  }
}
\`\`\`

## 注意事項
- リスクの大きさは「発生確率 × 影響度」で評価する
- 安全性リスクは常に最優先で対処する
- 推奨パスは「最もリスクが低い」パスとする
- 対策のコスト対効果も考慮する
- 残存リスクがある場合は明示する`;

// ============================================================
// ゴール距離計算ヘルパー
// ============================================================

function countNodesByLevel(
  nodes: StrategySessionContext["nodes"],
  level: string
): number {
  return nodes.filter((n) => n.level === level).length;
}

function countNodesByStatus(
  nodes: StrategySessionContext["nodes"],
  status: string
): number {
  return nodes.filter((n) => n.status === status).length;
}

/**
 * リスク関連ノードのカバレッジを計算
 * criteriaノード（リスク領域）のうち、対策（strategy）が選択済みの割合
 */
function calculateRiskCoverage(
  session: StrategySessionContext
): number {
  const criteriaNodes = session.nodes.filter((n) => n.level === "criteria");
  if (criteriaNodes.length === 0) return 0;

  // criteriaの子ノード（strategy）で選択済みのものをカウント
  const addressedCriteria = criteriaNodes.filter((criteria) => {
    const childStrategies = session.nodes.filter(
      (n) => n.parentId === criteria.id && n.level === "strategy"
    );
    return childStrategies.some((s) => s.status === "selected");
  });

  return Math.min(100, Math.round((addressedCriteria.length / criteriaNodes.length) * 100));
}

// ============================================================
// Risk-First Strategy
// ============================================================

export const riskStrategy: IThinkingStrategy = {
  id: "risk",
  name: "リスクファースト",
  description: "リスクを起点に逆算し、安全かつ確実な意思決定パスを構築する",

  buildPromptSet(context: StrategyDecisionContext): PromptSet {
    const contextSummary = buildContextSummary({
      purpose: context.purpose,
      currentSituation: context.currentSituation,
      documentSummary: context.documentSummary,
      constraints: context.constraints,
      assumptions: context.assumptions,
      commitments: context.commitments,
      selectedPath: context.selectedPath,
    });

    const userPrompt = `## 意思決定コンテキスト

${contextSummary}

## リスクファースト分析の指示

上記の目的を達成するにあたり、以下の手順で分析してください:

1. **リスク特定**: この目的に対する主要なリスクを目的の複雑さに応じて1〜4個特定してください
   - 安全性(safety)、品質(quality)、コスト(cost)、納期(delivery)、環境(environment)、スコープ(scope)の観点
   - 各リスクの発生確率と影響度を評価

2. **対策立案**: 各リスクに対してPMBOK戦略に基づく対策を提案してください
   - 回避(avoid) > 軽減(mitigate) > 転嫁(transfer) > 受容(accept) の優先順で検討
   - 最も安全な選択肢を推奨(isRecommended: true)としてマーク

3. **最終状態**: リスク対策を実行した後の期待される状態を示してください

${context.selectedPath.length > 0 ? `\n## これまでの選択\n${context.selectedPath.map((p, i) => `${i + 1}. ${p}`).join("\n")}` : ""}

JSON形式で応答してください。`;

    return {
      systemPrompt: RISK_STRATEGY_SYSTEM_PROMPT,
      userPrompt,
    };
  },

  calculateGoalDistance(session: StrategySessionContext): StrategyGoalDistance {
    const { nodes, selectionHistory } = session;
    const totalNodes = nodes.length;
    const selectedCount = selectionHistory.length;

    // --------------------------------------------------------
    // riskCoverage: リスクカバレッジ（主要指標・重み大）
    //   criteriaノード（リスク領域）に対して対策が選択されている割合
    // --------------------------------------------------------
    const riskCoverage = totalNodes > 0
      ? calculateRiskCoverage(session)
      : 0;

    // --------------------------------------------------------
    // clarityScore: リスク特定の明確さ
    //   criteriaノードが存在し、問いが構造化されているか
    // --------------------------------------------------------
    const criteriaCount = countNodesByLevel(nodes, "criteria");
    const strategyCount = countNodesByLevel(nodes, "strategy");
    const outcomeCount = countNodesByLevel(nodes, "outcome");

    const clarityScore = Math.min(100, Math.round(
      (criteriaCount > 0 ? 30 : 0) +
      (criteriaCount >= 2 ? 20 : 0) +
      (strategyCount > 0 ? 30 : 0) +
      (outcomeCount > 0 ? 20 : 0)
    ));

    // --------------------------------------------------------
    // constraintSatisfaction: リスク軽減計画の制約充足度
    //   選択されたstrategyノードの割合をベースに計算
    // --------------------------------------------------------
    const selectedStrategies = nodes.filter(
      (n) => n.level === "strategy" && n.status === "selected"
    ).length;
    const constraintSatisfaction = strategyCount > 0
      ? Math.min(100, Math.round((selectedStrategies / strategyCount) * 80 + (outcomeCount > 0 ? 20 : 0)))
      : selectedCount > 0 ? 20 : 0;

    // --------------------------------------------------------
    // actionReadiness: 対策実行の準備度
    //   actionノードの選択状態 + outcomeの有無
    // --------------------------------------------------------
    const actionNodes = countNodesByLevel(nodes, "action");
    const selectedActions = nodes.filter(
      (n) => n.level === "action" && n.status === "selected"
    ).length;
    const actionReadiness = actionNodes > 0
      ? Math.min(100, Math.round((selectedActions / actionNodes) * 80 + (outcomeCount > 0 ? 20 : 0)))
      : outcomeCount > 0 ? 40 : (selectedCount > 0 ? 15 : 0);

    // --------------------------------------------------------
    // 総合距離: riskCoverageを重み50%、他を各約17%
    // --------------------------------------------------------
    const overall = Math.max(0, 100 - Math.round(
      riskCoverage * 0.50 +
      clarityScore * 0.15 +
      constraintSatisfaction * 0.15 +
      actionReadiness * 0.20
    ));

    return {
      overall,
      dimensions: {
        clarityScore,
        riskCoverage,
        constraintSatisfaction,
        actionReadiness,
      },
      strategySpecific: {
        identifiedRiskCount: criteriaCount,
        addressedRiskCount: Math.round(riskCoverage * criteriaCount / 100),
        mitigationPlanCount: selectedStrategies,
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

    const contextText = session.decisionContext
      ? buildContextSummary({
          purpose: session.decisionContext.purpose,
          currentSituation: session.decisionContext.currentSituation,
          documentSummary: session.decisionContext.documentSummary,
          constraints: session.decisionContext.constraints,
          assumptions: session.decisionContext.assumptions,
          commitments: session.decisionContext.commitments,
          selectedPath: session.decisionContext.selectedPath,
        })
      : `【目的】\n${session.purpose}`;

    return {
      systemPrompt: `あなたはリスク管理の専門家であり、意思決定支援AIです。
リスクファースト思考で、まだ見落としているリスクや追加の対策を提案してください。

## 探索の観点
- 現在の対策で見落としているリスクはないか？
- 二次リスク（対策による新たなリスク）は発生しないか？
- リスク間の相互作用や連鎖はないか？
- より上位のPMBOK戦略（回避・軽減）に切り替えられないか？

## 応答フォーマット
必ず以下のJSON形式で応答してください:
\`\`\`json
{
  "isRelevant": true,
  "criteria": { "question": "追加で検討すべきリスクの問い", "description": "理由", "riskCategories": ["safety"] },
  "options": [
    { "label": "対策1", "description": "説明", "isRecommended": true, "riskStrategy": "avoid", "rationale": "推奨理由" },
    { "label": "対策2", "description": "説明", "isRecommended": false, "riskStrategy": "mitigate", "rationale": "理由" }
  ]
}
\`\`\`
十分にリスクが対処されている場合: { "isRelevant": false, "irrelevantReason": "理由" }`,

      userPrompt: `## 意思決定コンテキスト

${contextText}

## 現在のノード
${selectedNode ? `- レベル: ${selectedNode.level ?? "不明"}\n- ID: ${selectedNode.id}\n- タイプ: ${selectedNode.type}` : "（不明）"}

## これまでの選択
${selectedPath.map((p, i) => `${i + 1}. [${p.level}] ${p.question}`).join("\n") || "（まだ選択なし）"}

## 他に考慮すべきリスクはありますか？
以下の観点で追加のリスクや対策を検討してください:
- 見落としているリスクカテゴリ（安全・品質・コスト・納期・環境・スコープ）
- 既存の対策から派生する二次リスク
- リスク間の相互影響
- より安全な代替対策（PMBOKの上位戦略への切り替え）`,
    };
  },
};
