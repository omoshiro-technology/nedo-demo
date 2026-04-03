/**
 * バックキャスト戦略（Backcast Strategy）
 *
 * ゴール（理想状態）から逆算して、その実現に必要な条件・判断・行動を洗い出す。
 * ツリー構造: outcome(ゴール) → required_condition(必要条件) → action(具体的行動)
 *
 * 「ゴールが達成されるためには何が真でなければならないか？」を問い続ける逆算思考。
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

function countNodesByLevel(
  nodes: StrategySessionContext["nodes"],
  level: string
): number {
  return nodes.filter((n) => n.level === level).length;
}

function countSelectedNodesByLevel(
  nodes: StrategySessionContext["nodes"],
  level: string
): number {
  return nodes.filter((n) => n.level === level && n.status === "selected").length;
}

// ============================================================
// システムプロンプト
// ============================================================

const BACKCAST_SYSTEM_PROMPT = `意思決定支援AI。ゴールから逆算し、実現に必要な条件と行動を構造化する。

## 【最重要】ゴール逆算思考（バックキャスティング）

あなたの役割は「ゴールが達成された状態」を明確に定義し、
そこから逆算して「何が真でなければならないか」を段階的に分解することです。

### 思考の流れ（逆順）
1. **ゴール定義**: 理想状態を具体的に描く（数値・状態・条件を含む）
2. **必要条件の特定**: ゴール達成に不可欠な条件（判断軸）を目的の複雑さに応じて1〜4個洗い出す
3. **各条件の選択肢**: 条件を満たすための具体的な手段を2〜3個ずつ提示
4. **行動計画**: 選択肢を実現するための具体的な行動

### ❌ やってはいけないこと
- 現状から順に考える（フォワード思考）
- 抽象的な方針（「〇〇優先」「〇〇重視」）で止める
- ゴールを曖昧にしたまま条件を並べる

### ✅ やるべきこと
- まずゴール（理想状態）を鮮明に描く
- 「このゴールが達成されるには、何が成立している必要があるか？」と問う
- 各必要条件に具体的な数値・基準を含める
- 選択肢は「決定値」で表現する（方針ではなく具体的な行動・数値）

## フロー構造（横一直線 + 縦の選択肢）

メインライン（横一直線）:
  判断軸1(必要条件) → 判断軸2(必要条件) → 判断軸3(必要条件) → outcome(ゴール実現)

各判断軸の下に選択肢を縦に配置:
  判断軸1（必要条件）
    ↓
  選択肢A（★推奨）+ 理由
    ↓
  選択肢B + 理由
    ↓
  選択肢C + 理由

### 構造ルール
1. **判断軸(criteria)同士は横につなぐ**: c1 → c2 → c3 → outcome
2. **選択肢(strategy)は判断軸の子として縦に配置**
3. **判断軸は1〜4個**: ゴール達成に不可欠な必要条件（目的の複雑さに応じて最適な数）
4. **選択肢は各判断軸に2〜3個**: 条件を満たす具体的手段

## ノード構造

### 判断軸ノード (level: "criteria")
- parentId: 前の判断軸のid（最初はnull）
- label: 「ゴール実現に必要な条件」を問う形式
- description: なぜこの条件が不可欠か
- goalConnection: ゴールとの繋がりを15文字以内で（「〇〇を決めるために」形式）
- veteranInsight: 「ゴールから逆算すると...」形式の知見
- isRecommended: true（メインライン上）

### 選択肢ノード (level: "strategy")
- parentId: 所属する判断軸(criteria)のid
- label: 条件を満たす具体的手段（数値・行動を含む）
- description: この手段の特徴
- rationale: なぜこの手段がゴール達成に有効か/不十分か
- isRecommended: 推奨ならtrue

### 最終決定ノード (level: "outcome")
- parentId: 最後の判断軸のid
- label: ゴール実現に向けた具体的アクションプラン
- description: 全条件を満たした場合の到達状態
- rationale: 逆算プロセスの要約

## リスク戦略（PMBOK）
- avoid: 回避（最優先）
- mitigate: 軽減（優先）
- transfer: 移転（次点）
- accept: 受容（最終手段）

## 出力: JSON形式のみ`;

// ============================================================
// Backcast Strategy
// ============================================================

export const backcastStrategy: IThinkingStrategy = {
  id: "backcast",
  name: "バックキャスト",
  description: "ゴールから逆算し、実現に必要な条件と行動を構造化する逆算型思考",

  buildPromptSet(context: StrategyDecisionContext): PromptSet {
    const contextSummary = buildContextSummary(context);

    const constraintsText = context.constraints.length > 0
      ? context.constraints.map((c) => `- ${c}`).join("\n")
      : "（制約条件なし）";

    const userPrompt = `${contextSummary}

## 【最重要】ゴールから逆算して必要条件を構造化する

ユーザーが「${context.purpose}」を達成したいと言っています。

### 既に決まっている制約条件
${constraintsText}

### タスク（バックキャスト思考）

**ステップ1: ゴールの明確化**
「${context.purpose}」が完全に達成された状態を、具体的な数値・条件・状態で定義してください。
（例: 「設備仕様が確定し、発注書に記載できる状態」）

**ステップ2: 必要条件の逆算**
ゴールから逆算して、「ゴールが成立するために必ず真でなければならない条件」を目的の複雑さに応じて1〜4個特定してください。
- 各条件は独立しており、全てが満たされないとゴールに到達できない
- 「なぜこの条件が不可欠か」の理由を明記

**ステップ3: 各条件の具体的手段**
各必要条件に対して、それを満たすための具体的な手段を2〜3個提示してください。
- 手段は「決定値」で表現する（抽象的な方針ではなく具体的な行動・数値）
- 推奨手段には根拠を付ける

### 禁止事項
- 現状から順に考えない（必ずゴールから逆算する）
- 「〇〇優先」「〇〇重視」のような抽象的なラベルは使わない
- ゴールを曖昧にしたまま進めない

## 出力形式（JSONのみ）
\`\`\`json
{
  "goal": "ゴールが達成された状態の具体的な定義",
  "criteriaOrder": [
    {"criteriaId": "c1", "order": 1, "thinkingPattern": "backcast-required-condition", "reason": "ゴール達成に最も根本的な条件だから", "isPreSelected": false},
    {"criteriaId": "c2", "order": 2, "thinkingPattern": "backcast-required-condition", "reason": "c1が満たされた上で次に必要な条件だから", "isPreSelected": false},
    {"criteriaId": "c3", "order": 3, "thinkingPattern": "backcast-required-condition", "reason": "最終的にゴールを完成させる条件だから", "isPreSelected": false}
  ],
  "tree": {
    "nodes": [
      {"id": "c1", "parentId": null, "label": "必要条件1: ゴール実現に〇〇が確定しているか？", "description": "なぜこの条件が不可欠か", "level": "criteria", "isRecommended": true, "goalConnection": "ゴール実現の前提を確認するために", "veteranInsight": "ゴールから逆算すると、まずこれが決まらないと先に進めない。"},
      {"id": "c2", "parentId": "c1", "label": "必要条件2: 〇〇の基準が明確か？", "description": "なぜこの条件が不可欠か", "level": "criteria", "isRecommended": true, "goalConnection": "品質基準を明確にするために", "veteranInsight": "ゴールから逆算すると、この基準がないと品質を担保できない。"},
      {"id": "c3", "parentId": "c2", "label": "必要条件3: 〇〇の実行体制が整っているか？", "description": "なぜこの条件が不可欠か", "level": "criteria", "isRecommended": true, "goalConnection": "実行可能性を担保するために", "veteranInsight": "ゴールから逆算すると、体制が整わないと実行に移せない。"},

      {"id": "s1a", "parentId": "c1", "label": "具体的手段A（数値・行動を含む）", "description": "手段の特徴", "level": "strategy", "isRecommended": true, "rationale": "ゴール達成への寄与が最も大きい。"},
      {"id": "s1b", "parentId": "c1", "label": "具体的手段B", "description": "手段の特徴", "level": "strategy", "isRecommended": false, "rationale": "条件は満たせるが、コスト面で劣る。"},

      {"id": "s2a", "parentId": "c2", "label": "具体的手段A", "description": "手段の特徴", "level": "strategy", "isRecommended": true, "rationale": "基準を最も確実に満たせる。"},
      {"id": "s2b", "parentId": "c2", "label": "具体的手段B", "description": "手段の特徴", "level": "strategy", "isRecommended": false, "rationale": "達成可能だがリスクが残る。"},

      {"id": "s3a", "parentId": "c3", "label": "具体的手段A", "description": "手段の特徴", "level": "strategy", "isRecommended": true, "rationale": "実行体制を最も確実に構築できる。"},
      {"id": "s3b", "parentId": "c3", "label": "具体的手段B", "description": "手段の特徴", "level": "strategy", "isRecommended": false, "rationale": "時間はかかるが堅実な方法。"},

      {"id": "o1", "parentId": "c3", "label": "ゴール実現のアクションプラン", "description": "全条件を満たした到達状態", "level": "outcome", "isRecommended": true, "riskStrategy": "mitigate", "rationale": "必要条件を全て満たすことでゴールに到達する逆算パス"}
    ]
  },
  "recommendedPath": ["c1", "c2", "c3", "o1"],
  "overallRationale": "ゴールから逆算した3つの必要条件を満たすパス"
}
\`\`\`

## ルール
- id: 短い識別子（c1, c2, c3, s1a, s1b, o1など）
- parentId:
  - criteria: 前のcriteriaのid（最初はnull）← メインラインを形成
  - strategy: 所属するcriteriaのid ← 下に縦配置
  - outcome: 最後のcriteriaのid ← メインラインの最後
- level:
  - "criteria": 必要条件（ゴール達成に不可欠な条件を問う形式）
  - "strategy": 必要条件を満たす具体的手段
  - "outcome": ゴール実現のアクションプラン
- label:
  - criteria: 「必要条件N: 〇〇が成立しているか？」の形式
  - strategy: 具体的な手段（数値・行動を含む）
  - outcome: ゴール実現に向けた具体的な計画
- description: 30文字以内
- veteranInsight: 判断軸(criteria)に必須。「ゴールから逆算すると...」形式
- rationale: 選択肢(strategy)とoutcomeに必須。ゴール達成への寄与度
- isRecommended: 推奨パス上のノードはtrue
- riskStrategy: avoid|mitigate|transfer|accept（outcomeのみ必須）

## criteriaOrder（必要条件の逆算順序）
- criteriaId: 判断軸のid
- order: ゴールから逆算した優先順序（1=最も根本的な条件）
- thinkingPattern: "backcast-required-condition"
- reason: なぜこの順序で条件を満たすべきか
- isPreSelected: 通常はfalse

## 重要
- **必ずゴールから逆算する**（現状からの前進ではない）
- **判断軸は「ゴール実現に不可欠な必要条件」を問う**
- **各判断軸にgoalConnectionを必ず付ける**（「〇〇を決めるために」形式、15文字以内）
- **各判断軸にveteranInsightを必ず付ける**（「ゴールから逆算すると...」形式）
- **各選択肢にrationaleを必ず付ける**（ゴール達成への寄与度）
- **recommendedPathには判断軸とoutcomeのみ**（選択肢は含まない）
- JSONのみ出力`;

    return {
      systemPrompt: BACKCAST_SYSTEM_PROMPT,
      userPrompt,
    };
  },

  calculateGoalDistance(session: StrategySessionContext): StrategyGoalDistance {
    const { nodes, selectionHistory, goalState } = session;

    // ---- clarityScore: ゴールの明確さ ----
    // ゴール定義が存在するか + ノード数による構造化度合い
    const hasGoalState = goalState != null;
    const totalNodes = nodes.length;
    const criteriaCount = countNodesByLevel(nodes, "criteria");
    const outcomeCount = countNodesByLevel(nodes, "outcome");

    const clarityScore = Math.min(100, Math.round(
      (hasGoalState ? 30 : 0) +
      (criteriaCount > 0 ? Math.min(30, criteriaCount * 15) : 0) +
      (outcomeCount > 0 ? 20 : 0) +
      (totalNodes > 3 ? 20 : totalNodes > 0 ? 10 : 0)
    ));

    // ---- riskCoverage: リスク関連ノードの選択率 ----
    // バックキャスト戦略ではcriteria(必要条件)の選択がリスク対応に相当
    const selectedCriteria = countSelectedNodesByLevel(nodes, "criteria");
    const riskCoverage = criteriaCount > 0
      ? Math.min(100, Math.round((selectedCriteria / criteriaCount) * 100))
      : selectionHistory.length > 0 ? 30 : 0;

    // ---- constraintSatisfaction: 必要条件の充足率 ----
    // 選択済みstrategyノード数 / 全criteria数（各criteriaに1つ選択が必要）
    const selectedStrategies = countSelectedNodesByLevel(nodes, "strategy");
    const constraintSatisfaction = criteriaCount > 0
      ? Math.min(100, Math.round((selectedStrategies / criteriaCount) * 100))
      : selectionHistory.length > 0 ? 20 : 0;

    // ---- actionReadiness: 行動への準備度 ----
    // outcomeが選択されているか + strategyの選択率
    const selectedOutcome = countSelectedNodesByLevel(nodes, "outcome");
    const strategyCount = countNodesByLevel(nodes, "strategy");
    const strategySelectionRate = strategyCount > 0
      ? selectedStrategies / strategyCount
      : 0;

    const actionReadiness = Math.min(100, Math.round(
      (selectedOutcome > 0 ? 50 : 0) +
      (strategySelectionRate * 50)
    ));

    // ---- overall: 総合距離（0=ゴール到達, 100=最も遠い） ----
    const weightedScore =
      clarityScore * 0.20 +
      riskCoverage * 0.25 +
      constraintSatisfaction * 0.30 +
      actionReadiness * 0.25;

    const overall = Math.max(0, 100 - Math.round(weightedScore));

    return {
      overall,
      dimensions: {
        clarityScore,
        riskCoverage,
        constraintSatisfaction,
        actionReadiness,
      },
      strategySpecific: {
        /** ゴールから逆算した必要条件の充足数 */
        requiredConditionsMet: selectedCriteria,
        /** 必要条件の総数 */
        requiredConditionsTotal: criteriaCount,
        /** 全条件に対する手段選択率 (0-100) */
        meansSelectionRate: Math.round(strategySelectionRate * 100),
      },
    };
  },

  buildExplorePrompt(
    session: StrategySessionContext,
    selectedNodeId: string
  ): PromptSet {
    const selectedNode = session.nodes.find((n) => n.id === selectedNodeId);
    const selectedPath = session.selectionHistory.map((h) => ({
      label: h.nodeLabel,
      level: h.level,
    }));

    // 未選択のcriteria(必要条件)があるか確認
    const allCriteria = session.nodes.filter((n) => n.level === "criteria");
    const selectedCriteriaIds = new Set(
      session.selectionHistory
        .filter((h) => h.level === "criteria")
        .map((h) => h.nodeId)
    );
    const unmetConditions = allCriteria
      .filter((c) => !selectedCriteriaIds.has(c.id))
      .map((c) => c.id);

    return {
      systemPrompt: `あなたは意思決定支援AIです。バックキャスト（ゴール逆算型）思考で次の問いを提案してください。
常に「ゴールが達成されるためには、他にどんな条件が成立していなければならないか？」を軸に考えます。

応答は必ずJSON形式で返してください：
\`\`\`json
{
  "isRelevant": true,
  "criteria": { "question": "ゴール達成にまだ足りない必要条件", "description": "なぜこの条件が不可欠か" },
  "options": [
    { "label": "具体的手段1", "description": "説明", "isRecommended": true, "riskStrategy": "mitigate" },
    { "label": "具体的手段2", "description": "説明", "isRecommended": false, "riskStrategy": "accept" }
  ]
}
\`\`\`
ゴール達成に十分な条件が揃っている場合: { "isRelevant": false, "irrelevantReason": "理由" }`,

      userPrompt: `## 目的（ゴール）
${session.purpose}

## 現在の選択
${selectedNode ? `- ${selectedNode.level}: ${selectedNode.id}` : "（不明）"}

## これまでに満たした条件
${selectedPath.map((p, i) => `${i + 1}. [${p.level}] ${p.label}`).join("\n") || "（まだ選択なし）"}

## 未充足の必要条件
${unmetConditions.length > 0 ? unmetConditions.map((id) => `- ${id}`).join("\n") : "（現在のツリー上では全て選択済み）"}

## 次に検討すべきこと
ゴール「${session.purpose}」が達成されるために、まだ検討されていない必要条件はありますか？
「この条件が成立していなければゴールに到達できない」という観点で、追加の条件を提案してください。`,
    };
  },
};
