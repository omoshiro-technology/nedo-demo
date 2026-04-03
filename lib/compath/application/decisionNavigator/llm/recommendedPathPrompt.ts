/**
 * 推奨パス生成プロンプト
 *
 * セッション開始時にAIが推奨する意思決定パス全体を生成するためのプロンプト
 *
 * Phase 4: 思考支援モードでは最初から根拠付きの具体値を提示
 */

import type { DecisionContext, SupportMode } from "../types";
import type { ThinkingStrategyId } from "../../../domain/decisionNavigator/strategies/IThinkingStrategy";
import { getStrategyOrUndefined } from "../../../domain/decisionNavigator/strategies/strategyRegistry";
import { buildContextSummary } from "../contextBuilder";

// ============================================================
// システムプロンプト
// ============================================================

export const RECOMMENDED_PATH_SYSTEM_PROMPT = `意思決定支援AI。目的に対して最適なパスを提案。

## 【最重要】選択肢は「決定値」であるべき

### ❌ 悪い選択肢（観点・評価軸・〇〇優先）
- 安全性の評価
- コストの最適化
- 省スペース優先
- 保全優先
- ～を検討する

### ✅ 良い選択肢（具体的な決定値）
- strategy: 具体的な方針（例: 「タンク間1.5m確保」「配管経路を短縮」）
- tactic: 具体的な手法（例: 「勾配1/100で排水」「断熱材で保温」）
- action: 具体的な作業（例: 「3案の圧損計算」「法規基準の確認」）

**重要**: 「〇〇優先」「〇〇重視」のような抽象的な方針は禁止。具体的な数値や行動を含めること。

## リスク戦略（PMBOK）
- avoid: 回避（最優先）
- mitigate: 軽減（優先）
- transfer: 移転（次点）
- accept: 受容（最終手段）

## 推奨優先: avoid/mitigate > transfer > accept
顧客影響の大きいaccept（納期延長等）は最終手段。

## 出力: JSON形式のみ`;

// ============================================================
// ユーザープロンプト生成
// ============================================================

/**
 * 推奨パス生成用のユーザープロンプトを構築
 * Phase 11: 推奨ルートのみ全階層生成（strategy→tactic→action）、他の選択肢は初期階層のみ
 */
export function buildRecommendedPathPrompt(context: DecisionContext): string {
  const contextSummary = buildContextSummary(context);

  return `${contextSummary}

## 要件
1. **推奨ルートは全階層生成**: strategy→tactic→actionの3階層を一括生成
2. **代替選択肢は各階層で2〜3個**: 推奨以外の選択肢も生成（ただし子ノードは不要）
3. 推奨ノードにはisRecommended: trueを設定

## 出力形式（JSONのみ）
\`\`\`json
{
  "tree": {
    "nodes": [
      {"id": "s1", "parentId": null, "label": "具体的な方針（数値含む）", "description": "具体的な説明", "level": "strategy", "isRecommended": true, "riskStrategy": "mitigate", "risk": {"probability": 2, "impact": 3}},
      {"id": "s2", "parentId": null, "label": "代替の具体的方針", "description": "具体的な説明", "level": "strategy", "isRecommended": false, "riskStrategy": "accept", "risk": {"probability": 3, "impact": 4}},
      {"id": "t1", "parentId": "s1", "label": "具体的な手法", "description": "具体的な説明", "level": "tactic", "isRecommended": true, "riskStrategy": "mitigate", "risk": {"probability": 2, "impact": 2}},
      {"id": "t2", "parentId": "s1", "label": "代替の具体的手法", "description": "具体的な説明", "level": "tactic", "isRecommended": false, "riskStrategy": "avoid", "risk": {"probability": 1, "impact": 2}},
      {"id": "a1", "parentId": "t1", "label": "具体的な作業", "description": "具体的な説明", "level": "action", "isRecommended": true, "riskStrategy": "mitigate", "risk": {"probability": 1, "impact": 2}},
      {"id": "a2", "parentId": "t1", "label": "代替の具体的作業", "description": "具体的な説明", "level": "action", "isRecommended": false, "riskStrategy": "avoid", "risk": {"probability": 1, "impact": 1}}
    ]
  },
  "recommendedPath": ["s1", "t1", "a1"],
  "overallRationale": "設計理由（30文字以内）"
}
\`\`\`

## ルール
- id: 短い識別子（s1,s2,t1,t2,a1,a2など）
- parentId: 親ノードのid（strategyはnull）
- level: strategy|tactic|action
- label: 20文字以内、**具体的な内容**（❌「〇〇優先」「〇〇重視」は禁止）
- description: 30文字以内
- riskStrategy: avoid|mitigate|transfer|accept
- risk: probability/impact各1-5

## 重要
- 推奨パス（isRecommended=true）は必ずstrategy→tactic→actionの3階層
- 代替選択肢は各階層2〜3個（子ノード不要）
- **「〇〇優先」「〇〇重視」「〇〇を検討」のような抽象的なラベルは絶対に使わない**
- JSONのみ出力`;
}

// ============================================================
// Decision Backcasting Canvas: 思考支援モード専用システムプロンプト
// ============================================================

export const THINKING_MODE_SYSTEM_PROMPT = `意思決定支援AI。ベテランの思考プロセスを可視化し、判断軸として構造化する。

## 【最重要】外部条件と思考プロセスの分離

条件パネルで設定された外部条件（QCEDS: 品質・コスト・環境・納期・安全）は
「所与の制約」として扱い、判断軸にはしない。

### ❌ やってはいけないこと（外部条件を判断軸にする）
- 「運転パターンは？」← これは外部条件。条件パネルで既に設定済み
- 「再生頻度は？」← これも外部条件
- 「スペースは？」← これも外部条件
- 「予算は？」← これも外部条件
- 「納期は？」← これも外部条件

### ✅ やるべきこと（ベテランの思考プロセスを判断軸にする）
- 「リスク回避と効率、どちらを優先？」← 思考パターン
- 「何を犠牲にして何を守るか？」← トレードオフの優先順位
- 「実績をどこまで重視するか？」← 経験則
- 「安全マージンをどれくらい取るか？」← 暗黙知
- 「理論と経験、どちらを重視するか？」← 判断根拠

## 判断軸のカテゴリ（ベテランの思考パターン）

以下のカテゴリから**目的の複雑さに応じて1〜4個**を選んで判断軸を構成する。
判断軸の数:
- 1個: 単純な二者択一（例: AかBか）
- 2個: 明確な判断基準が2つ（例: コストと品質）
- 3個: 多角的な検討が必要（例: リスク+コスト+実績）
- 4個: 非常に複雑な意思決定（まれ）
**重要**: 判断軸のラベルは「〇〇と△△、どちらを選ぶ？」の形式で、具体的に何を決めるのか分かるようにする。

1. **リスク許容度**: 「リスク回避と効率、どちらを優先する？」
   - 最悪ケース回避優先 / バランス重視 / 効率優先
   - ベテランは通常「最悪回避」を選ぶ理由を知っている

2. **トレードオフ優先順位**: 「初期コストと保全性、どちらを優先する？」
   - 初期コスト優先 / 保全性優先 / 運用コスト優先
   - どれを選んでも何かを犠牲にする

3. **実績vs革新**: 「実績ある方式と新技術、どちらを選ぶ？」
   - 実績重視（保守的）/ 新技術も検討 / 積極的に新技術採用
   - 原子力では実績重視が多いが、なぜか？

4. **余裕の取り方**: 「安全マージンは大きめか最小限か？」
   - 大きめ(1.5倍) / 標準(1.2倍) / 最小限(1.0倍)
   - マージンを取りすぎると過剰設計、取らなすぎるとリスク

5. **判断の根拠**: 「理論計算と類似事例、どちらを根拠にする？」
   - 理論計算重視 / 類似事例重視 / 専門家の意見重視
   - ベテランはこれらを組み合わせて使う

6. **将来変化への対応**: 「現状最適と将来の拡張性、どちらを重視する？」
   - 柔軟性重視 / 現状最適 / 拡張性確保

## フロー構造（横一直線 + 縦の選択肢）

メインライン（横一直線）:
  スタート → 判断軸1 → 判断軸2 → 判断軸3 → ゴール

各判断軸の下に選択肢を縦に配置:
  判断軸1（思考パターン）
    ↓
  選択肢A（★推奨）+ 理由
    ↓
  選択肢B + 理由
    ↓
  選択肢C + 理由

### 重要な構造ルール
1. **判断軸(criteria)同士は横につなぐ**: c1 → c2 → c3 → outcome
2. **選択肢(strategy)は判断軸の子として縦に配置**: 各criteriaから下方向へ
3. **判断軸は1〜4個**: 目的の複雑さに応じて最適な数を選ぶ（多くても4個まで）
4. **選択肢は各判断軸に2〜4個**: 視野を広げつつ選択可能な範囲

## ノード構造

### 判断軸ノード (level: "criteria")
- parentId: 前の判断軸のid（最初はnull）
- label: ベテランの思考パターンを問う形式（「〇〇と△△、どちらを優先？」）
- description: この判断軸が重要な理由
- goalConnection: ゴールとの繋がりを15文字以内で（例: "最適な樹脂量を決めるために"）
- veteranInsight: ベテランの経験談（「私の経験では...」形式）
- isRecommended: true（メインライン上なので常にtrue）

### 選択肢ノード (level: "strategy")
- parentId: 所属する判断軸(criteria)のid
- label: 選択肢の内容
- description: この選択肢の特徴
- rationale: なぜベテランはこれを選ぶか/選ばないか
- isRecommended: 推奨ならtrue、それ以外はfalse

### 最終決定ノード (level: "outcome")
- parentId: 最後の判断軸のid
- label: 具体的な決定値（数値＋根拠）
- description: 推奨理由
- rationale: 選択に至った判断経緯

## リスク戦略（PMBOK）
- avoid: 回避（最優先）
- mitigate: 軽減（優先）
- transfer: 移転（次点）
- accept: 受容（最終手段）

## 出力: JSON形式のみ`;

// ============================================================
// Decision Backcasting Canvas: 思考支援モード専用ユーザープロンプト
// ============================================================

/**
 * Decision Backcasting Canvas用のユーザープロンプトを構築
 * - ベテランの思考プロセスを判断軸として可視化
 * - 外部条件は所与として扱い、判断軸にしない
 * - 2〜3個の思考パターンで構成
 */
export function buildThinkingModePrompt(context: DecisionContext): string {
  const contextSummary = buildContextSummary(context);

  // 制約条件を整形（条件パネルからの情報）
  const constraintsText = context.constraints.length > 0
    ? context.constraints.map(c => `- ${c}`).join("\n")
    : "（条件パネルからの制約なし）";

  return `${contextSummary}

## 【最重要】ベテランの思考プロセスを判断軸にする

ユーザーが「${context.purpose}」を決めたいと言っています。

### 既に決まっている外部条件（条件パネルから）
${constraintsText}

上記の外部条件は**所与の制約**です。これらを判断軸にしてはいけません。

### タスク
外部条件は所与として、**ベテランがどう考えるか**を可視化する:

1. **判断軸の抽出**: 外部条件ではなく、**思考パターン**を目的の複雑さに応じて1〜4個特定
   - 例: 「リスク回避と効率のバランスは？」
   - 例: 「何を優先して何を犠牲にするか？」
   - 例: 「実績をどこまで重視するか？」
   - 例: 「安全マージンをどれくらい取るか？」

2. **選択肢の配置**: 各思考パターンに対する選択肢を2〜4個
   - 例: リスク回避優先 / バランス / 効率優先
   - 各選択肢に「なぜベテランはこれを選ぶか」の根拠(rationale)を付ける

3. **ベテランの声**: 各判断軸に「私の経験では...」の形式でベテランのコメント(veteranInsight)

### 禁止事項
- 「運転パターンは？」のような外部条件を判断軸にしない
- 「再生頻度は？」のような物理条件を判断軸にしない
- 「スペースは？」「予算は？」「納期は？」を判断軸にしない
- 条件パネルで設定済みの内容を判断軸にしない

## 出力形式（JSONのみ）
\`\`\`json
{
  "goal": "決断完了状態の定義（例: 樹脂量が確定し、設備仕様に反映できる状態）",
  "criteriaOrder": [
    {"criteriaId": "c1", "order": 1, "thinkingPattern": "risk-efficiency-tradeoff", "reason": "まずリスクへの姿勢を決めることで、後の判断が絞られる", "isPreSelected": false},
    {"criteriaId": "c2", "order": 2, "thinkingPattern": "cost-priority", "reason": "リスク姿勢が決まればコスト配分の優先順位が決まる", "isPreSelected": false},
    {"criteriaId": "c3", "order": 3, "thinkingPattern": "track-record-vs-innovation", "reason": "最後に技術選択の保守性を決める", "isPreSelected": false}
  ],
  "tree": {
    "nodes": [
      // ▼ 判断軸（ベテランの思考パターン）
      {"id": "c1", "parentId": null, "label": "判断軸1: リスク回避と効率、どちらを優先？", "description": "最悪ケースを避けるか、平均効率を最大化するか", "level": "criteria", "isRecommended": true, "goalConnection": "設計方針の基本姿勢を決めるために", "veteranInsight": "原子力では常にリスク回避を優先する。効率を追求して万が一があれば、取り返しがつかない。"},
      {"id": "c2", "parentId": "c1", "label": "判断軸2: 何を優先して何を犠牲にするか？", "description": "初期コスト・運用コスト・保全性のトレードオフ", "level": "criteria", "isRecommended": true, "goalConnection": "コスト配分の優先順位を決めるために", "veteranInsight": "若いうちは初期コストを気にするが、経験を積むと保全性がいかに大事か分かってくる。"},
      {"id": "c3", "parentId": "c2", "label": "判断軸3: 実績ある方式と新技術、どちらを選ぶ？", "description": "実績重視か、新しい技術に挑戦するか", "level": "criteria", "isRecommended": true, "goalConnection": "技術選択の基準を決めるために", "veteranInsight": "新技術は魅力的だが、原子力では実績がないと使えない。安全第一だから。"},

      // ▼ 判断軸1の選択肢
      {"id": "s1a", "parentId": "c1", "label": "リスク回避優先", "description": "最悪ケースを想定し、それを避ける設計", "level": "strategy", "isRecommended": true, "rationale": "原子力では最悪を避けることが最優先。余裕を持った設計が安心につながる。"},
      {"id": "s1b", "parentId": "c1", "label": "バランス重視", "description": "リスクと効率のバランスを取る", "level": "strategy", "isRecommended": false, "rationale": "一般産業では妥当だが、原子力では慎重すぎるくらいがちょうど良い。"},
      {"id": "s1c", "parentId": "c1", "label": "効率優先", "description": "平均ケースで最適化する設計", "level": "strategy", "isRecommended": false, "rationale": "効率を追求すると余裕がなくなり、想定外の事態で破綻するリスクがある。"},

      // ▼ 判断軸2の選択肢
      {"id": "s2a", "parentId": "c2", "label": "保全性優先", "description": "点検・交換がしやすい設計を優先", "level": "strategy", "isRecommended": true, "rationale": "設備は必ず劣化する。保全しやすければ長期的なコストも下がる。"},
      {"id": "s2b", "parentId": "c2", "label": "初期コスト優先", "description": "導入時のコストを最小化", "level": "strategy", "isRecommended": false, "rationale": "予算が厳しいときの選択だが、後で苦労することが多い。"},
      {"id": "s2c", "parentId": "c2", "label": "運用コスト優先", "description": "ランニングコストを最小化", "level": "strategy", "isRecommended": false, "rationale": "悪くない選択だが、保全の手間を忘れがち。"},

      // ▼ 判断軸3の選択肢
      {"id": "s3a", "parentId": "c3", "label": "実績重視", "description": "過去に使われた実績ある方式を採用", "level": "strategy", "isRecommended": true, "rationale": "原子力では実績が何より大事。新しいものには未知のリスクがある。"},
      {"id": "s3b", "parentId": "c3", "label": "新技術も検討", "description": "実績と新技術のバランスを取る", "level": "strategy", "isRecommended": false, "rationale": "改善の余地はあるが、十分な評価期間が必要。"},

      // ▼ 最終決定
      {"id": "o1", "parentId": "c3", "label": "最適値を決定", "description": "各判断軸での選択に基づいて決定", "level": "outcome", "isRecommended": true, "riskStrategy": "mitigate", "rationale": "リスク回避 × 保全性優先 × 実績重視 → 安全で持続可能な設計値を導出"}
    ]
  },
  "recommendedPath": ["c1", "c2", "c3", "o1"],
  "overallRationale": "ベテランの思考: リスク回避を基本とし、保全性と実績を重視する",
  "criteriaCountReason": "リスク・コスト・技術選択の3軸で多角的に検討する必要があるため"
}
\`\`\`

## ルール
- id: 短い識別子（c1, c2, c3, s1a, s1b, o1など）
- parentId:
  - criteria: 前のcriteriaのid（最初はnull）← メインラインを形成
  - strategy: 所属するcriteriaのid ← 下に縦配置
  - outcome: 最後のcriteriaのid ← メインラインの最後
- level:
  - "criteria": 判断軸（**思考パターン**を問う形式）
  - "strategy": 判断軸の選択肢
  - "outcome": 最終決定
- label:
  - criteria: 「判断軸N: 〇〇と△△、どちらを優先？」の形式（**外部条件ではなく思考を問う**）
  - strategy: 選択肢の内容
  - outcome: 「最適値を決定」などの一般的な表現
- description: 30文字以内、なぜこの軸/選択肢が重要か
- goalConnection: 判断軸(criteria)に必須。ゴールとの繋がりを15文字以内で（「〇〇を決めるために」形式）
- veteranInsight: 判断軸(criteria)に必須。「私の経験では...」形式でベテランの知見
- rationale: 選択肢(strategy)とoutcomeに必須。なぜこれを選ぶ/選ばないか
- isRecommended: 推奨パス上のノードはtrue
- riskStrategy: avoid|mitigate|transfer|accept（outcomeのみ必須）

## criteriaOrder（判断軸の最適順序）
- criteriaId: 判断軸のid
- order: 決定すべき順序（1から始まる）
- thinkingPattern: 思考パターンのカテゴリ（risk-efficiency-tradeoff, cost-priority, track-record-vs-innovation, safety-margin, judgment-basis, future-flexibility）
- reason: この順序にした理由
- isPreSelected: 通常はfalse（思考パターンは事前選択しない）

## 重要
- **判断軸は「ベテランの思考パターン」を問う**（外部条件は判断軸にしない）
- **各判断軸にgoalConnectionを必ず付ける**（「〇〇を決めるために」形式、15文字以内）
- **各判断軸にveteranInsightを必ず付ける**
- **各選択肢にrationaleを必ず付ける**
- **criteriaCountReasonを必ず付ける**（なぜこの数の判断軸にしたかの理由）
- **recommendedPathには判断軸とoutcomeのみ**（選択肢は含まない）
- JSONのみ出力`;
}

// ============================================================
// プロンプトビルダー（完全版）
// ============================================================

/**
 * 推奨パス生成用の完全なプロンプトセットを構築
 *
 * strategyが指定された場合はstrategy経由でプロンプトを生成。
 * 指定がない場合は従来のSupportModeベースでフォールバック。
 *
 * @param context 意思決定コンテキスト
 * @param mode 支援モード（省略時は thinking）
 * @param strategyId 思考戦略ID（省略時はmodeから自動決定）
 */
export function buildRecommendedPathPromptSet(
  context: DecisionContext,
  mode: SupportMode = "thinking",
  strategyId?: import("../../../domain/decisionNavigator/strategies/IThinkingStrategy").ThinkingStrategyId,
): {
  systemPrompt: string;
  userPrompt: string;
} {
  // strategyIdが指定されている場合はレジストリから取得
  if (strategyId) {
    const strategy = getStrategyOrUndefined(strategyId);
    if (strategy) {
      return strategy.buildPromptSet(context);
    }
  }

  // フォールバック: 従来のSupportModeベースの判定
  // 思考支援モードの場合は専用プロンプトを使用
  if (mode === "thinking") {
    return {
      systemPrompt: THINKING_MODE_SYSTEM_PROMPT,
      userPrompt: buildThinkingModePrompt(context),
    };
  }

  // プロセス支援モードの場合は従来のプロンプトを使用
  return {
    systemPrompt: RECOMMENDED_PATH_SYSTEM_PROMPT,
    userPrompt: buildRecommendedPathPrompt(context),
  };
}
