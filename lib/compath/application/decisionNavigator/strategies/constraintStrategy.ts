/**
 * 制約ファースト戦略（Constraint-First Strategy）
 *
 * 制約を先に洗い出し、その制約空間の中で最適解を探索する思考パス
 * ツリー構造: 制約列挙 → 絞り込み → 候補評価
 *
 * - criteria ノード: 主要な制約カテゴリ（法規制約, 安全要件, コスト上限 等）
 * - strategy ノード: 各制約の対処方法
 * - outcome ノード: 制約を満たす実行可能な解
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

// ============================================================
// システムプロンプト
// ============================================================

const CONSTRAINT_SYSTEM_PROMPT = `あなたは制約ファースト思考の意思決定支援AIです。
制約を先に洗い出し、その制約空間の中で最適解を見つけるアプローチを取ります。

## 思考の流れ

1. **ハード制約の特定**: 絶対に違反できない制約を洗い出す
   - 法規制約（法令、規格、基準）
   - 安全要件（安全基準、リスク許容限度）
   - 予算上限（投資限度額、コスト制約）
   - 納期（プロジェクト期限、マイルストーン）

2. **ソフト制約の特定**: 可能な限り満たしたい制約を洗い出す
   - パフォーマンス目標（効率、処理能力）
   - 品質基準（精度、信頼性、耐久性）
   - 運用性（保全性、操作性）
   - 将来拡張性

3. **各制約の対処方法**: 制約ごとに満たす方法を提案
   - 直接充足: 制約をそのまま満たす方法
   - 代替充足: 別の手段で同等の効果を達成
   - 緩和交渉: ステークホルダーと制約の緩和を交渉

4. **実行可能解の生成**: 全制約を考慮した解を提案

## ノード構造

### 制約カテゴリ (level: "criteria")
- 主要な制約カテゴリを表す
- parentId: 前の制約カテゴリのid（最初はnull）
- label: 制約カテゴリ名（例: 「法規制約: 高圧ガス保安法の適合」）
- description: この制約が重要な理由
- goalConnection: ゴールとの繋がりを15文字以内で（「〇〇を決めるために」形式）
- constraintType: "hard" | "soft"
- isRecommended: true（メインライン上）

### 対処方法 (level: "strategy")
- 各制約をどう満たすかの選択肢
- parentId: 所属する制約カテゴリのid
- label: 対処方法（例: 「耐圧設計1.5倍で基準クリア」）
- description: 対処方法の具体的内容
- rationale: なぜこの方法を選ぶか
- isRecommended: 推奨ならtrue

### 実行可能解 (level: "outcome")
- 全制約を満たす解
- parentId: 最後の制約カテゴリのid
- label: 具体的な解（数値・仕様を含む）
- description: 解の概要
- rationale: 全制約をどう満たしているかの説明

## リスク戦略（PMBOK）
- avoid: 回避（最優先）
- mitigate: 軽減（優先）
- transfer: 移転（次点）
- accept: 受容（最終手段）

## 出力: JSON形式のみ`;

// ============================================================
// Constraint-First Strategy
// ============================================================

export const constraintStrategy: IThinkingStrategy = {
  id: "constraint",
  name: "制約ファースト",
  description: "制約を先に洗い出し、制約空間の中で最適解を探索する",

  buildPromptSet(context: StrategyDecisionContext): PromptSet {
    const contextSummary = buildContextSummary(context);

    const constraintsText =
      context.constraints.length > 0
        ? context.constraints.map((c) => `- ${c}`).join("\n")
        : "（まだ制約は特定されていません）";

    const userPrompt = `${contextSummary}

## 【最重要】制約を先に洗い出し、制約空間で最適解を見つける

ユーザーが「${context.purpose}」を決めたいと言っています。

### 既知の制約条件
${constraintsText}

### タスク
制約ファースト思考で意思決定ツリーを構築してください:

1. **ハード制約の列挙**: 絶対に違反できない制約を目的の複雑さに応じて1〜3カテゴリ特定
   - 法規制約（法令、規格、基準）
   - 安全要件（安全基準、リスク許容限度）
   - 予算上限・納期（投資限度額、プロジェクト期限）

2. **ソフト制約の列挙**: 可能な限り満たしたい制約を1〜2カテゴリ特定
   - パフォーマンス目標、品質基準
   - 運用性、将来拡張性

3. **各制約の対処方法**: 制約ごとに2〜3個の対処方法を提案
   - 満たす方法（直接充足、代替充足、緩和交渉）

4. **実行可能解**: 全制約を考慮した具体的な解を提示

## 出力形式（JSONのみ）
\`\`\`json
{
  "goal": "全制約を満たす実行可能な決定が完了した状態",
  "criteriaOrder": [
    {"criteriaId": "c1", "order": 1, "thinkingPattern": "hard-constraint", "reason": "法規制約は最優先で確認すべき", "isPreSelected": false},
    {"criteriaId": "c2", "order": 2, "thinkingPattern": "hard-constraint", "reason": "安全要件は法規の次に重要", "isPreSelected": false},
    {"criteriaId": "c3", "order": 3, "thinkingPattern": "soft-constraint", "reason": "ハード制約を満たした上でパフォーマンスを最適化", "isPreSelected": false}
  ],
  "tree": {
    "nodes": [
      {"id": "c1", "parentId": null, "label": "法規制約: 適用法令の特定", "description": "適用される法令・規格を確認", "level": "criteria", "isRecommended": true, "constraintType": "hard", "goalConnection": "法的適合性を確保するために"},
      {"id": "c2", "parentId": "c1", "label": "安全要件: 安全基準の確認", "description": "安全基準とリスク許容限度を確認", "level": "criteria", "isRecommended": true, "constraintType": "hard", "goalConnection": "安全基準を満たすために"},
      {"id": "c3", "parentId": "c2", "label": "品質基準: パフォーマンス目標", "description": "要求性能と品質水準を確認", "level": "criteria", "isRecommended": true, "constraintType": "soft", "goalConnection": "要求性能を確認するために"},

      {"id": "s1a", "parentId": "c1", "label": "基準値1.5倍で設計", "description": "法令基準の1.5倍の安全率で設計", "level": "strategy", "isRecommended": true, "riskStrategy": "avoid", "rationale": "法令基準を十分に上回ることでリスクを回避"},
      {"id": "s1b", "parentId": "c1", "label": "基準値ちょうどで設計", "description": "法令基準をぎりぎり満たす設計", "level": "strategy", "isRecommended": false, "riskStrategy": "accept", "rationale": "コスト最小だが余裕がなく変更に弱い"},

      {"id": "s2a", "parentId": "c2", "label": "多重安全対策を適用", "description": "冗長設計で安全性を確保", "level": "strategy", "isRecommended": true, "riskStrategy": "mitigate", "rationale": "単一故障でも安全を維持できる設計"},
      {"id": "s2b", "parentId": "c2", "label": "標準安全対策のみ", "description": "業界標準レベルの安全対策", "level": "strategy", "isRecommended": false, "riskStrategy": "accept", "rationale": "コスト抑制できるが冗長性が不足"},

      {"id": "s3a", "parentId": "c3", "label": "目標値+10%で設計", "description": "要求性能を上回る設計", "level": "strategy", "isRecommended": true, "riskStrategy": "mitigate", "rationale": "余裕を持たせることで運用中の性能低下に対応"},
      {"id": "s3b", "parentId": "c3", "label": "目標値ちょうどで設計", "description": "要求性能をぴったり満たす設計", "level": "strategy", "isRecommended": false, "riskStrategy": "accept", "rationale": "コスト最適だが劣化時に基準割れリスク"},

      {"id": "o1", "parentId": "c3", "label": "全制約充足の最適解", "description": "全制約を満たす具体的な仕様", "level": "outcome", "isRecommended": true, "riskStrategy": "mitigate", "rationale": "ハード制約を確実に満たし、ソフト制約も高水準で達成"}
    ]
  },
  "recommendedPath": ["c1", "c2", "c3", "o1"],
  "overallRationale": "制約を優先度順に確認し、全て満たす実行可能解を導出"
}
\`\`\`

## ルール
- id: 短い識別子（c1, c2, c3, s1a, s1b, o1など）
- parentId:
  - criteria: 前のcriteriaのid（最初はnull）← メインラインを形成
  - strategy: 所属するcriteriaのid ← 下に縦配置
  - outcome: 最後のcriteriaのid ← メインラインの最後
- level:
  - "criteria": 制約カテゴリ（ハード制約 → ソフト制約の順）
  - "strategy": 各制約の対処方法
  - "outcome": 全制約を満たす実行可能解
- label:
  - criteria: 「制約カテゴリ: 具体的な制約内容」の形式
  - strategy: 具体的な対処方法（数値を含む）
  - outcome: 具体的な解（数値・仕様を含む）
- description: 30文字以内
- constraintType: criteria のみ "hard" | "soft"
- rationale: strategy と outcome に必須
- isRecommended: 推奨パス上のノードはtrue
- riskStrategy: avoid|mitigate|transfer|accept（strategy と outcome に必須）

## 重要
- **ハード制約を先に、ソフト制約を後に配置する**
- **各制約カテゴリにgoalConnectionを必ず付ける**（「〇〇を決めるために」形式、15文字以内）
- **各制約カテゴリに2〜3個の対処方法を提案する**
- **「〇〇優先」「〇〇重視」のような抽象的なラベルは使わない**
- **具体的な数値や基準を含めること**
- **recommendedPathには制約カテゴリとoutcomeのみ**
- JSONのみ出力`;

    return {
      systemPrompt: CONSTRAINT_SYSTEM_PROMPT,
      userPrompt,
    };
  },

  calculateGoalDistance(session: StrategySessionContext): StrategyGoalDistance {
    const { nodes, selectionHistory } = session;
    const totalNodes = nodes.length;
    const selectedCount = selectionHistory.length;

    // 各レベルのノード数を計算
    const criteriaNodes = countNodesByLevel(nodes, "criteria");
    const strategyNodes = countNodesByLevel(nodes, "strategy");
    const outcomeNodes = countNodesByLevel(nodes, "outcome");
    const selectedNodes = countNodesByStatus(nodes, "selected");

    // 基本進捗（選択率）
    const progressRate =
      totalNodes > 0 ? selectedCount / Math.max(totalNodes * 0.3, 1) : 0;

    // ------------------------------------------------------------------
    // constraintSatisfaction: メイン指標（制約特定・解決の度合い）
    // 制約ファースト戦略では最も重要な指標
    // ------------------------------------------------------------------
    // criteria（制約カテゴリ）が存在する = 制約が特定されている
    // strategy（対処方法）が選択されている = 制約が解決されている
    const constraintIdentified = criteriaNodes > 0 ? 40 : 0;
    const strategySelected = nodes.filter(
      (n) => n.level === "strategy" && n.status === "selected"
    ).length;
    const constraintResolved =
      criteriaNodes > 0
        ? Math.min(40, Math.round((strategySelected / criteriaNodes) * 40))
        : 0;
    const outcomeReached =
      outcomeNodes > 0 && nodes.some((n) => n.level === "outcome" && n.status === "selected")
        ? 20
        : 0;
    const constraintSatisfaction = Math.min(
      100,
      constraintIdentified + constraintResolved + outcomeReached
    );

    // ------------------------------------------------------------------
    // clarityScore: 制約列挙の完全性
    // ------------------------------------------------------------------
    // criteria ノードが多いほど制約が網羅的に列挙されている
    const clarityBase = Math.min(60, criteriaNodes * 20);
    // 選択された strategy があるとさらに明確
    const clarityFromSelections = Math.min(
      40,
      Math.round(progressRate * 40)
    );
    const clarityScore = Math.min(100, clarityBase + clarityFromSelections);

    // ------------------------------------------------------------------
    // riskCoverage: 安全・リスク関連の制約対応度
    // ------------------------------------------------------------------
    // 制約カテゴリのうち選択済み戦略がある割合
    const criteriaWithSelectedStrategy = new Set(
      nodes
        .filter((n) => n.level === "strategy" && n.status === "selected" && n.parentId)
        .map((n) => n.parentId)
    ).size;
    const riskCoverage =
      criteriaNodes > 0
        ? Math.min(100, Math.round((criteriaWithSelectedStrategy / criteriaNodes) * 100))
        : selectedCount > 0
          ? 20
          : 0;

    // ------------------------------------------------------------------
    // actionReadiness: 解の実行可能性（outcome到達度）
    // ------------------------------------------------------------------
    const outcomeSelected = nodes.filter(
      (n) => n.level === "outcome" && n.status === "selected"
    ).length;
    const actionReadiness =
      outcomeNodes > 0
        ? Math.min(100, Math.round((outcomeSelected / outcomeNodes) * 100))
        : strategyNodes > 0 && strategySelected > 0
          ? Math.min(40, Math.round((strategySelected / strategyNodes) * 40))
          : 0;

    // ------------------------------------------------------------------
    // 総合距離: constraintSatisfaction に重み付け（50%）
    // ------------------------------------------------------------------
    const overall = Math.max(
      0,
      100 -
        Math.round(
          constraintSatisfaction * 0.50 +
            clarityScore * 0.15 +
            riskCoverage * 0.20 +
            actionReadiness * 0.15
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
        constraintIdentifiedCount: criteriaNodes,
        constraintResolvedCount: strategySelected,
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

    // 既に特定された制約カテゴリを収集
    const existingConstraints = session.nodes
      .filter((n) => n.level === "criteria")
      .map((n) => n.id);

    return {
      systemPrompt: `あなたは制約ファースト思考の意思決定支援AIです。
既に特定された制約に加えて、まだ考慮されていない制約を探索します。

## 探索の観点
- 法規制約で見落としているものはないか？
- 安全要件で未確認のものはないか？
- コスト・納期の隠れた制約はないか？
- 技術的制約（物理的限界、材料特性）はないか？
- 運用上の制約（保全、操作性、人員）はないか？
- 環境・社会的制約（環境規制、近隣対策）はないか？

応答は必ずJSON形式で返してください：
\`\`\`json
{
  "isRelevant": true,
  "criteria": { "question": "まだ考慮されていない制約は何か？", "description": "理由", "constraintType": "hard" },
  "options": [
    { "label": "具体的な対処方法1", "description": "説明", "isRecommended": true, "riskStrategy": "mitigate" },
    { "label": "具体的な対処方法2", "description": "説明", "isRecommended": false, "riskStrategy": "accept" }
  ]
}
\`\`\`
全制約が十分に網羅されている場合: { "isRelevant": false, "irrelevantReason": "理由" }`,

      userPrompt: `## 目的
${session.purpose}

## 現在の選択
${selectedNode ? `- ${selectedNode.level}: ${selectedNode.id}` : "（不明）"}

## これまでの選択
${selectedPath.map((p, i) => `${i + 1}. ${p.question}`).join("\n") || "（まだ選択なし）"}

## 既に特定された制約カテゴリ
${existingConstraints.length > 0 ? existingConstraints.map((id) => `- ${id}`).join("\n") : "（まだ制約カテゴリなし）"}

## 質問
上記の制約以外に、まだ考慮されていない制約はありますか？
以下の観点で見落としがないか確認してください:
- 法規・規格（適用法令、業界規格、認証要件）
- 安全・環境（安全基準、環境規制、防災要件）
- コスト・スケジュール（予算制約、調達リードタイム）
- 技術・物理（技術的限界、材料特性、スペース制約）
- 運用・保全（操作要件、保全計画、人員配置）

新しい制約が見つかれば、その対処方法とともに提案してください。`,
    };
  },
};
