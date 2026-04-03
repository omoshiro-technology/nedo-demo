/**
 * 次選択肢生成プロンプト
 *
 * ユーザーが選択を行った後、次の選択肢を動的に生成するためのプロンプト
 *
 * Phase 2: 2モード分離アーキテクチャ
 * - thinking: 思考支援（判断基準・根拠）
 * - process: プロセス支援（手順・ステップ）
 *
 * Phase 5改: 条件・事例・推論の3セットを使ったノード生成
 */

import type { DecisionContext, DecisionNavigatorSession, DecisionFlowNode, SupportMode } from "../types";
import type { ConditionOption } from "../thinkingBox/types";
import type { SimilarCase } from "../../../domain/types";
import type { Heuristic, DecisionPattern } from "../../../domain/decisionNavigator/knowledgeBase/types";
import { buildContextSummary, buildSelectionHistory } from "../contextBuilder";

// ============================================================
// システムプロンプト
// ============================================================

export const NEXT_OPTIONS_SYSTEM_PROMPT = `あなたは意思決定支援の専門家です。
ユーザーが「決定の方向性」を見定めるための選択肢を提示してください。

## 【最重要】選択肢は「検討すべき観点」や「方向性」であるべき

意思決定支援の価値は「どの観点を優先すべきかを明確にする」ことです。
**最終的な数値決定（容量、寸法、金額など）は人間が行うもの**であり、システムは「なぜその方向で進めるべきか」の根拠を示すことが役割です。

### ✅ 良い選択肢（方向性・観点・制約の明確化）
- 「法規基準を優先する」（なぜ: 〇〇法で△△が定められているため）
- 「安全性を最優先にする」（なぜ: 薬品漏洩リスクがあるため）
- 「コストを抑えつつ運用性を確保する」（なぜ: 既設配管を活用できるため）
- 「メンテナンス性を重視する」（なぜ: 定期点検が頻繁に必要なため）
- 「スペース効率を優先する」（なぜ: 既存建屋の制約があるため）

### ❌ 悪い選択肢（具体的な数値）
- 「1.5mの離隔距離を設ける」（数値は人間が決める）
- 「タンク容量を5000Lにする」（数値は人間が決める）
- 「予算を100万円に設定する」（数値は人間が決める）

## 選択肢の4つの型（optionType）

選択肢は以下のいずれかでなければならない:
1. **priority**: どの観点を優先すべきか（「安全 > コスト」「法規基準を満たす」）
2. **constraint**: 決定に必要な制約の明確化（「消防法の基準を確認」「既設配管との接続条件」）
3. **direction**: 進むべき方向性（「屋内配置で進める」「分割配置を検討する」）
4. **info_request**: 不足情報の特定（「現場の実測値が必要」「法規担当に確認が必要」）

**重要**: 具体的な数値（〇〇m、〇〇L、〇〇円など）は選択肢に含めない

## 根拠（rationale）の重視

各選択肢には必ず「なぜこの方向性を検討すべきか」の根拠を含めること:
- 法規・基準に基づく根拠
- 安全性・リスク管理の観点からの根拠
- 過去の類似事例からの学び
- 運用・メンテナンスの観点からの根拠
- コスト効率の観点からの根拠

## 軸の深堀りルール

### ✅ 許可: 観点の具体化
- 「安全性を重視」→「漏洩対策を優先」「作業者動線を確保」「緊急時対応を考慮」
- 「コスト削減」→「初期コスト重視」「ランニングコスト重視」「既設活用」

### ❌ 禁止: 具体的数値の提示
- 「〇〇を広げる」→「1.5mにする」（数値は人間が決める）
- 「容量を決める」→「5000Lにする」（数値は人間が決める）

## ゴール達成の判定

### 【重要】方向性が十分に絞り込まれたら終了

ユーザーが**十分な検討観点を選択**し、方向性が明確になった場合に goalStatus = "achieved":
- 複数の観点から優先順位が決まった
- 必要な制約・条件が明確になった
- 次のアクション（詳細設計、関係者協議など）が見えている

### goalStatus の判定基準

| 状況 | goalStatus | nextAction |
|------|------------|------------|
| 方向性が明確になった | **achieved** | **finalize** |
| まだ観点の選択中 | partial | propose_options |
| まだ何も決まっていない | unknown | propose_options |

## リスク戦略（PMBOKベース）
- avoid: リスクを完全に回避する選択
- mitigate: リスクを軽減する選択
- transfer: リスクを他者に移転する選択
- accept: リスクを受け入れる選択

## 【重要】推奨優先順位
1. **最優先（avoid, mitigate）**: 問題を回避・軽減する積極的な対策
2. **次点（transfer）**: リスクを他者に移転する選択
3. **最終手段（accept）**: 問題をそのまま受け入れる選択

## 整合性チェック
- ok: 問題なし
- conflict: 過去の選択と矛盾がある
- needs-info: 追加情報が必要`;

// ============================================================
// プロセス支援モード: システムプロンプト
// ============================================================

export const PROCESS_SUPPORT_SYSTEM_PROMPT = `あなたはプロセス・手順支援の専門家です。
ユーザーが「次に何をすべきか」を決めるための具体的なステップを提示してください。

## 【最重要】選択肢は「次の行動」であるべき

プロセス支援の価値は「行動の明確化」と「実行順序の最適化」です。

### ❌ 悪い選択肢（抽象的・観点ベース）
- 安全性を考慮する
- コストを検討する
- 関係者と調整する
- もっと調べる

### ✅ 良い選択肢（具体的なアクション）
- 「現場の寸法を計測する」
- 「法規担当者に基準値を確認する」
- 「見積もりを3社に依頼する」
- 「上長に承認を得る」

## 選択肢の4つの型（optionType）

選択肢は以下のいずれかでなければならない:
1. **candidate_value**: 具体的な行動ステップ（「現場を確認する」「書類を作成する」）
2. **constraint**: 前提条件の確認（「許可が必要」「予算確保が先」）
3. **priority**: 実行順序の決定（「Aを先にやる」「BよりCを優先」）
4. **info_request**: 必要情報の収集（「担当者に確認」「マニュアルを参照」）

## 手順の深堀りルール

### ✅ 許可: ステップの具体化
- 「準備する」→「材料を発注する / 工具を用意する / 作業場所を確保する」
- 「確認する」→「図面を確認 / 法規を確認 / 予算を確認」
- 「申請する」→「書類作成 → 上長承認 → 提出」

### ❌ 禁止: 同語反復・抽象化
- 「準備する」→「もっと準備する / 準備を進める」
- 「確認する」→「詳しく確認 / 再確認」
- 「検討する」→「さらに検討」

## ゴール達成の判定

### 全ての必要ステップが完了 → 終了
- 目的達成に必要な全ての行動が明確になった
- → goalStatus = "achieved", nextAction = "plan_execution"

### まだ未完了ステップがある → 次のステップを提案
- まだ具体化されていないステップがある
- → goalStatus = "partial", nextAction = "propose_options"

## 実行計画の出力（goalStatus = "achieved" の場合）

\`\`\`json
{
  "finalization": {
    "summary": "実行計画のサマリー",
    "decisionValue": "最終的な実行手順",
    "rationale": "この手順を選んだ理由",
    "nextSteps": [
      "Step 1: 〇〇を行う",
      "Step 2: △△を確認する",
      "Step 3: □□を完了させる"
    ]
  }
}
\`\`\`

## リスク戦略（PMBOKベース）
- avoid: リスクを完全に回避するステップ
- mitigate: リスクを軽減するステップ
- transfer: リスクを他者に移転するステップ
- accept: リスクを受け入れて進むステップ

## 整合性チェック
- ok: 問題なし
- conflict: 前のステップと矛盾がある
- needs-info: 追加情報が必要`;

// ============================================================
// モード別システムプロンプト取得
// ============================================================

/**
 * 支援モードに応じたシステムプロンプトを取得
 */
export function getSystemPromptByMode(mode: SupportMode): string {
  switch (mode) {
    case "process":
      return PROCESS_SUPPORT_SYSTEM_PROMPT;
    case "thinking":
    default:
      return NEXT_OPTIONS_SYSTEM_PROMPT;
  }
}

// ============================================================
// ユーザープロンプト生成
// ============================================================

/**
 * 選択パスを構築（ノードの親子関係から）
 */
function buildSelectionPathFromNodes(
  session: DecisionNavigatorSession,
  currentNode: DecisionFlowNode
): string[] {
  const path: string[] = [];
  let node: DecisionFlowNode | undefined = currentNode;

  // 親を辿って選択パスを構築
  while (node) {
    if (node.type !== "start") {
      path.unshift(node.label);
    }
    node = node.parentId
      ? session.nodes.find(n => n.id === node!.parentId)
      : undefined;
  }

  return path;
}

/**
 * 次選択肢生成用のユーザープロンプトを構築
 *
 * @param context 意思決定コンテキスト
 * @param session セッション
 * @param selectedNode 選択されたノード
 * @param mode 支援モード（省略時は "thinking"）
 */
export function buildNextOptionsPrompt(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  mode: SupportMode = "thinking"
): string {
  const contextSummary = buildContextSummary(context);

  // 選択パスをノードの親子関係から構築（今回の選択を含む）
  const selectionPath = buildSelectionPathFromNodes(session, selectedNode);
  const selectionPathText = selectionPath.length > 0
    ? selectionPath.map((label, i) => `${i + 1}. ${label}`).join("\n")
    : "（まだ選択なし）";

  // プロセス支援モードの場合は別のプロンプトを使用
  if (mode === "process") {
    return buildProcessSupportUserPrompt(context, session, selectedNode, selectionPathText);
  }

  // 思考支援モード（デフォルト）
  // Phase 5: 方向性・観点の選択を支援（具体的数値は人間が決める）
  return `以下のユーザーの状況を分析し、検討すべき方向性を提案してください。

${contextSummary}

## 【最重要】具体的な数値ではなく、検討すべき方向性を提示

### 選択パス（ここまでの選択の流れ）
${selectionPathText}

## 今回の選択: 「${selectedNode.label}」
- 説明: ${selectedNode.description ?? "なし"}
- レベル: ${selectedNode.level}

## 判定ルール

### Step 1: 方向性が十分に明確になったか？

以下の条件を確認:
- 優先すべき観点が決まった（安全 vs コスト vs スピードなど）
- 必要な制約条件が明確になった
- 次のアクション（詳細設計、関係者協議など）が見えている

### Step 2: 判定

**方向性が明確になった場合**:
→ goalStatus = "achieved", nextAction = "finalize"
→ 選択肢は出さず、次のステップを提示

**まだ観点を選択中の場合**:
→ goalStatus = "partial", nextAction = "propose_options"
→ 検討すべき方向性・観点を提示

## 【必須】根拠付きの方向性

選択肢を出す場合は必ず:
✅ 方向性 + 根拠（例: 「法規基準を優先する（消防法で定められているため）」）
✅ 複数の観点から方向性を提示（安全、コスト、運用性など）
✅ 各選択肢のdescriptionで「なぜこの方向性を検討すべきか」を説明

## 【禁止】具体的数値の提示

以下のような選択肢は絶対に出さない:
❌ 「1.5mの離隔距離」「5000Lの容量」（数値は人間が決める）
❌ 「100万円の予算」「3日の工期」（数値は人間が決める）

## 【推奨】出力する選択肢の例

✅ 「法規基準を最優先にする」（根拠: 消防法第〇条で定められているため）
✅ 「安全性と保守性のバランスを取る」（根拠: 定期点検が月1回必要なため）
✅ 「既設配管との接続性を重視する」（根拠: 改造コストを抑えられるため）
✅ 「スペース効率を最大化する」（根拠: 既存建屋の制約があるため）

## 【重要】ラベルのフォーマット

選択肢のlabelフィールドでは、**重要なキーワードを必ず<mark>タグで囲む**こと:

✅ **良い例**:
- 「<mark>最悪ケース回避</mark>を優先し、樹脂量に<mark>大きめの余裕</mark>を取る」
- 「<mark>コスト削減</mark>を重視し、<mark>既設配管を活用</mark>する」
- 「<mark>法規基準</mark>を最優先にし、<mark>安全マージン</mark>を確保する」

❌ **悪い例**:
- 「最悪ケース回避を優先し、樹脂量に大きめの余裕を取る」（マークアップなし）

**マークアップすべきキーワードの例**:
- 優先事項（例: 最悪ケース回避、コスト削減、安全性優先）
- 具体的な方向性（例: 大きめの余裕、既設活用、段階的導入）
- リスク対応（例: 安全マージン、保守性重視、柔軟性確保）

## 出力形式

以下のJSON形式で出力してください:
{
  "analysis": {
    "currentGoal": "ユーザーが最終的に決めたいこと",
    "decidedSoFar": ["この選択で決まった方向性"],
    "remainingToDecide": ["まだ決まっていない観点"]
  },
  "goalStatus": "achieved | partial | unknown",
  "openGaps": ["未解決の観点"],
  "nextAction": "propose_options | finalize | ask_clarification",

  "options": [
    {
      "id": "opt-1",
      "label": "検討すべき方向性（重要キーワードはmarkタグで囲むこと）",
      "description": "なぜこの方向性を検討すべきか（根拠）",
      "optionType": "priority | constraint | direction | info_request",
      "rationale": "選ぶべき理由の詳細説明",
      "riskStrategy": "avoid | mitigate | transfer | accept",
      "risk": {
        "probability": 1-5,
        "impact": 1-5
      },
      "irreversibilityScore": 0-100
    }
  ],

  "recommendation": {
    "id": "opt-1",
    "reason": "推奨する理由（根拠を含めて説明）"
  },

  "finalization": {
    "summary": "決まった方向性のサマリー",
    "decisionDirection": "確定した方向性",
    "rationale": "この方向性を選んだ根拠",
    "nextSteps": ["次のアクション1（例: 法規担当に詳細を確認）", "次のアクション2"]
  },

  "termination": {
    "shouldTerminate": false,
    "reason": null
  },

  "consistency": {
    "status": "ok | conflict | needs-info",
    "conflictReasons": [],
    "clarificationQuestions": []
  }
}
\`\`\`

**重要:**
- nextAction = "finalize" の場合、optionsは空配列[]
- nextAction = "propose_options" の場合のみ、2〜4個の選択肢を提示
- 選択肢は全て「方向性」「制約」「情報要求」のいずれかであること
- **具体的な数値（〇〇m、〇〇L、〇〇円など）は含めない**
- finalizationは nextAction = "finalize" の時のみ設定

JSONのみを出力し、他の説明は含めないでください。`;
}

// ============================================================
// プロセス支援モード: ユーザープロンプト
// ============================================================

/**
 * プロセス支援モード用のユーザープロンプトを構築
 */
function buildProcessSupportUserPrompt(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  selectionPathText: string
): string {
  const contextSummary = buildContextSummary(context);

  return `以下のユーザーの状況を分析し、**次にやるべき具体的なステップ**を提案してください。

${contextSummary}

## 【最重要】選択パスから完了済みステップを抽出

### 選択パス（ここまでの選択の流れ）
${selectionPathText}

### Step 1: 選択パス全体を分析し、何が完了したかを特定

選択パスの各項目を順番に見て、**累積的に何が完了したか**を抽出してください。

例:
- 「現場確認」→ 現場の状況が把握済み
- 「現場確認」→「寸法計測」→ 必要な寸法データが取得済み
- 「書類作成」→「上長承認」→ 承認プロセスが完了

### Step 2: 完了済みステップをリスト化

選択パスから読み取れる完了済みステップ:
（ここで分析結果を analysis.decidedSoFar に出力）

### Step 3: まだ残っているステップを特定

ユーザーの目的（purpose）に対して、まだ完了していないステップは何か:
（ここで分析結果を analysis.remainingToDecide に出力）

## 今回の選択: 「${selectedNode.label}」
- 説明: ${selectedNode.description ?? "なし"}
- レベル: ${selectedNode.level}

## 判定ルール

### 全ての必要ステップが完了 → 終了
- analysis.remainingToDecide が空、または重要な未完了ステップがない
- → goalStatus = "achieved", nextAction = "plan_execution"

### まだ未完了ステップがある → 次のステップを提案
- analysis.remainingToDecide に未完了ステップがある
- → goalStatus = "partial", nextAction = "propose_options"
- **ただし、すでに完了したステップは絶対に出さない！**

## 【禁止】完了済みステップの再提示

選択パスに「現場確認」が含まれている場合:
❌ 「現場を確認する」を再度出す（完了済み）
✅ 次のステップ（例: 「見積もり依頼」「書類作成」）を出す
✅ または、全て完了なら終了する

## 次に出すべき選択肢（nextAction = "propose_options" の場合のみ）

- **完了済みステップの次**の具体的なアクションを出す
- 前提条件・依存関係を考慮する
- 同語反復は絶対に出さない

## 出力形式

\`\`\`json
{
  "analysis": {
    "currentGoal": "ユーザーが最終的に達成したいこと",
    "decidedSoFar": ["完了したステップ"],
    "remainingToDecide": ["まだ残っているステップ"]
  },
  "goalStatus": "achieved | partial | unknown",
  "openGaps": ["未完了項目"],
  "nextAction": "propose_options | plan_execution | ask_clarification",

  "options": [
    {
      "id": "opt-1",
      "label": "具体的なアクション（例: 見積もりを依頼する）",
      "description": "このステップの目的と完了条件",
      "optionType": "candidate_value | constraint | priority | info_request",
      "riskStrategy": "avoid | mitigate | transfer | accept",
      "risk": {
        "probability": 1-5,
        "impact": 1-5
      },
      "irreversibilityScore": 0-100
    }
  ],

  "recommendation": {
    "id": "opt-1",
    "reason": "このステップを推奨する理由"
  },

  "finalization": {
    "summary": "実行計画のサマリー",
    "decisionValue": "最終的な実行手順",
    "rationale": "この手順を選んだ理由",
    "nextSteps": ["Step 1: 〇〇", "Step 2: △△", "Step 3: □□"]
  },

  "termination": {
    "shouldTerminate": false,
    "reason": null
  },

  "consistency": {
    "status": "ok | conflict | needs-info",
    "conflictReasons": [],
    "clarificationQuestions": []
  }
}
\`\`\`

**重要:**
- nextAction = "plan_execution" の場合、optionsは空配列[]
- nextAction = "propose_options" の場合のみ、2〜4個の選択肢を提示
- 選択肢は全て「具体的なアクション」であること
- finalizationは nextAction = "plan_execution" の時のみ設定

JSONのみを出力し、他の説明は含めないでください。`;
}

// ============================================================
// 分岐展開用プロンプト
// ============================================================

/**
 * 代替選択肢を展開するためのプロンプトを構築
 */
export function buildExpandAlternativesPrompt(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  parentNode: DecisionFlowNode
): string {
  const contextSummary = buildContextSummary(context);

  return `以下の分岐点に対して、代替選択肢を生成してください。

${contextSummary}

## 分岐点
- ノード: ${parentNode.label}
- 説明: ${parentNode.description ?? "なし"}
- レベル: ${parentNode.level}

## 要件
1. 現在の推奨パスとは異なる2〜3個の代替選択肢を提示
2. 各代替のリスクとトレードオフを明確にする
3. 代替を選んだ場合のコンテキスト変更を含める

## 出力形式
以下のJSON形式で出力してください:

\`\`\`json
{
  "options": [
    {
      "id": "alt-1",
      "label": "代替選択肢のラベル",
      "description": "代替選択肢の説明",
      "riskStrategy": "avoid | mitigate | transfer | accept",
      "risk": {
        "probability": 1-5,
        "impact": 1-5
      },
      "irreversibilityScore": 0-100,
      "contextUpdates": {
        "constraints": [],
        "assumptions": [],
        "commitments": []
      }
    }
  ],
  "recommendation": null,
  "termination": {
    "shouldTerminate": false
  },
  "consistency": {
    "status": "ok"
  }
}
\`\`\`

JSONのみを出力し、他の説明は含めないでください。`;
}

// ============================================================
// clarification用プロンプト
// ============================================================

/**
 * clarification質問後の再生成プロンプトを構築
 */
export function buildRegenerateAfterClarificationPrompt(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  answers: Array<{ question: string; answer: string }>
): string {
  const contextSummary = buildContextSummary(context);
  const selectionHistory = buildSelectionHistory(session);

  const answersText = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
    .join("\n\n");

  return `ユーザーからの追加情報を受けて、選択肢を再生成してください。

${contextSummary}

## 選択履歴
${selectionHistory}

## ユーザーからの追加情報
${answersText}

## 要件
1. 追加情報を考慮して、適切な選択肢を2〜4個提示
2. 情報が十分でない場合は、さらにclarificationQuestionsを返す
3. 情報が十分な場合は、consistencyをokにして選択肢を返す

## 出力形式
以下のJSON形式で出力してください:

\`\`\`json
{
  "options": [...],
  "recommendation": {...},
  "termination": {...},
  "consistency": {
    "status": "ok | needs-info",
    "clarificationQuestions": []
  }
}
\`\`\`

JSONのみを出力し、他の説明は含めないでください。`;
}

// ============================================================
// プロンプトビルダー（完全版）
// ============================================================

/**
 * 次選択肢生成用の完全なプロンプトセットを構築
 *
 * @param context 意思決定コンテキスト
 * @param session セッション
 * @param selectedNode 選択されたノード
 * @param mode 支援モード（省略時はセッションのモードを使用）
 */
export function buildNextOptionsPromptSet(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  mode?: SupportMode
): {
  systemPrompt: string;
  userPrompt: string;
} {
  // モードが指定されていない場合はセッションのモードを使用
  const effectiveMode = mode ?? session.supportMode ?? "thinking";

  return {
    systemPrompt: getSystemPromptByMode(effectiveMode),
    userPrompt: buildNextOptionsPrompt(context, session, selectedNode, effectiveMode),
  };
}

// ============================================================
// Phase 5改: 条件・事例・推論の3セット対応プロンプト
// ============================================================

/**
 * 3セット情報を含むプロンプトセットを構築
 *
 * @param context 意思決定コンテキスト
 * @param session セッション
 * @param selectedNode 選択されたノード
 * @param threeSetData 3セットデータ（条件・事例・推論 + Phase 7: ナレッジ）
 * @param mode 支援モード
 */
export function buildNextOptionsPromptSetWithThreeSets(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  threeSetData: {
    conditions: ConditionOption[];
    pastCases: SimilarCase[];
    inferredPriorities: string[];
    // Phase 7: 蓄積されたナレッジ
    knowledge?: {
      heuristics: Heuristic[];
      successPatterns: DecisionPattern[];
      failurePatterns: DecisionPattern[];
    };
  },
  mode?: SupportMode
): {
  systemPrompt: string;
  userPrompt: string;
} {
  const effectiveMode = mode ?? session.supportMode ?? "thinking";

  // Phase 7: ナレッジがある場合はシステムプロンプトにナレッジ拡張を追加
  const knowledgeExtension = threeSetData.knowledge
    ? KNOWLEDGE_ENHANCED_SYSTEM_PROMPT_EXTENSION
    : "";

  return {
    systemPrompt: getSystemPromptByMode(effectiveMode) + THREE_SET_SYSTEM_PROMPT_EXTENSION + knowledgeExtension,
    userPrompt: buildNextOptionsPromptWithThreeSets(
      context,
      session,
      selectedNode,
      threeSetData,
      effectiveMode
    ),
  };
}

/**
 * 3セット対応のシステムプロンプト拡張
 */
const THREE_SET_SYSTEM_PROMPT_EXTENSION = `

## 【Phase 5改】条件・事例・推論の3セットを活用した選択肢生成

選択肢を生成する際は、以下の3つの情報源を必ず考慮してください：

### 1. 条件（Conditions）
ユーザーの入力や文脈から抽出された暗黙的・明示的な条件です。
- **法規制約**: 法律や規制で定められた基準
- **安全性条件**: 安全確保のための必須事項
- **コスト条件**: 予算や費用に関する制約
- **時間条件**: 納期やスケジュールの制約

### 2. 過去事例（Past Cases）
類似の過去案件からの知見です。
- 成功事例から学ぶべきパターン
- 失敗事例から避けるべきパターン
- 類似案件での決定値の参考

### 3. AI推論（Inferred Priorities）
目的と条件から推論される優先事項です。
- トレードオフの解決方針
- 見落としがちな観点の補完
- 業界標準やベストプラクティス

## 選択肢生成のルール

**各選択肢は以下のいずれかに基づいて生成すること：**
1. 条件を満たす具体的な値
2. 過去事例で採用された値
3. AI推論に基づく推奨値

**根拠を明確にすること：**
- 「法規基準（〇〇法）に基づく」
- 「過去事例（案件A）で採用」
- 「安全性と保守性のバランスを考慮」

**ノード選択ごとに絞り込むこと：**
- 選択された条件に合致しない選択肢は除外
- 選択ごとに候補が収束していく`;

/**
 * Phase 7: ナレッジ強化用のシステムプロンプト拡張
 */
const KNOWLEDGE_ENHANCED_SYSTEM_PROMPT_EXTENSION = `

## 【Phase 7】蓄積されたナレッジの活用

選択肢を生成する際は、以下の蓄積されたナレッジを**必ず考慮**してください：

### ヒューリスティクス（経験則）
過去の意思決定から抽出された「IF〜THEN〜」形式の経験則です。
- **高い信頼度**のヒューリスティクスは優先的に適用
- 条件が合致する場合は、そのルールに従った選択肢を提示
- 例外条件がある場合は注意事項として明記

### 成功パターン
過去に成功した意思決定パターンです。
- 類似の状況では成功パターンに沿った選択肢を推奨
- 成功の要因と条件を根拠として明記
- 推奨選択肢の信頼度向上に活用

### 失敗パターン（警告）
過去に失敗した意思決定パターンです。
- **失敗パターンに該当する選択肢は警告**を表示
- 失敗の原因と回避策を明記
- 同じ失敗を繰り返さないよう注意喚起

## ナレッジ活用のルール

1. **ヒューリスティクスの優先適用**
   - 条件が合致するヒューリスティクスがあれば、それに基づく選択肢を最優先
   - 選択肢のdescriptionに「経験則：〇〇」と根拠を明記

2. **成功パターンの参照**
   - 類似状況の成功パターンがあれば、その経験を活かした選択肢を提示
   - 「過去の成功事例に基づく」と明記

3. **失敗パターンの回避**
   - 失敗パターンに該当する選択肢には警告を付与
   - riskStrategyを"avoid"にして、リスクを明示

4. **ナレッジの信頼度反映**
   - 高信頼度のナレッジに基づく選択肢はconfidenceを高く設定
   - 低信頼度の場合は「参考情報」として扱う`;

/**
 * 3セット情報を含むユーザープロンプトを構築（Phase 7: ナレッジ対応）
 */
function buildNextOptionsPromptWithThreeSets(
  context: DecisionContext,
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode,
  threeSetData: {
    conditions: ConditionOption[];
    pastCases: SimilarCase[];
    inferredPriorities: string[];
    knowledge?: {
      heuristics: Heuristic[];
      successPatterns: DecisionPattern[];
      failurePatterns: DecisionPattern[];
    };
  },
  mode: SupportMode
): string {
  const contextSummary = buildContextSummary(context);

  // 選択パスをノードの親子関係から構築
  const selectionPath = buildSelectionPathFromNodes(session, selectedNode);
  const selectionPathText = selectionPath.length > 0
    ? selectionPath.map((label, i) => `${i + 1}. ${label}`).join("\n")
    : "（まだ選択なし）";

  // 3セット情報をテキスト化
  const conditionsText = formatConditions(threeSetData.conditions);
  const pastCasesText = formatPastCases(threeSetData.pastCases);
  const inferredText = formatInferredPriorities(threeSetData.inferredPriorities);

  // Phase 7: ナレッジをテキスト化
  const knowledgeText = formatKnowledge(threeSetData.knowledge);

  // Phase 5改改改: 前提条件と選択理由をテキスト化
  const preconditionsText = formatPreconditions(session.preconditions);
  const selectionRationaleText = formatSelectionRationale(session, selectedNode);

  if (mode === "process") {
    return buildProcessSupportPromptWithThreeSets(
      contextSummary,
      selectionPathText,
      selectedNode,
      conditionsText,
      pastCasesText,
      inferredText,
      preconditionsText,
      selectionRationaleText,
      knowledgeText
    );
  }

  // 思考支援モード
  return `以下のユーザーの状況と3セット情報を分析し、選択肢を生成してください。

${contextSummary}

## 【重要】ユーザーの前提条件
${preconditionsText}

## 選択パス（ここまでの選択の流れ）
${selectionPathText}

## 今回の選択: 「${selectedNode.label}」
- 説明: ${selectedNode.description ?? "なし"}
- レベル: ${selectedNode.level}
- リスク戦略: ${selectedNode.riskStrategy ?? "未設定"}
${selectionRationaleText}

---

## 【3セット情報】

### 1. 条件（ユーザー入力から抽出）
${conditionsText}

### 2. 過去事例（類似案件）
${pastCasesText}

### 3. AI推論（推奨事項）
${inferredText}

${knowledgeText}

---

## 選択肢生成の指示

1. **3セット情報を考慮**して選択肢を生成する
2. 各選択肢の**根拠を明確に**記述する（どの情報源に基づくか）
3. **ノード選択ごとに絞り込む**：今回の選択「${selectedNode.label}」を考慮し、合致しない選択肢は除外
4. 具体的な数値を選んだ場合は goalStatus = "achieved" で終了

## 判定ルール

### 今回の選択に具体的な数値/値が含まれている場合:
→ goalStatus = "achieved", nextAction = "finalize"
→ options は空配列

### 方向性のみの場合:
→ goalStatus = "partial", nextAction = "propose_options"
→ 3セット情報に基づいた具体値を2〜4個提示

## 出力形式

\`\`\`json
{
  "analysis": {
    "currentGoal": "ユーザーが決めたいこと",
    "decidedSoFar": ["この選択で決まったこと"],
    "remainingToDecide": ["まだ決まっていないこと"],
    "appliedConditions": ["適用された条件"],
    "referencedCases": ["参照した過去事例"]
  },
  "goalStatus": "achieved | partial | unknown",
  "openGaps": ["未解決項目"],
  "nextAction": "propose_options | finalize",

  "options": [
    {
      "id": "opt-1",
      "label": "具体的な決定値",
      "description": "この値の根拠（どの情報源に基づくか）",
      "optionType": "candidate_value | constraint | priority | info_request",
      "source": "condition | past_case | inference",
      "riskStrategy": "avoid | mitigate | transfer | accept",
      "risk": { "probability": 1-5, "impact": 1-5 },
      "irreversibilityScore": 0-100
    }
  ],

  "recommendation": { "id": "opt-1", "reason": "推奨理由" },

  "finalization": {
    "summary": "決定内容",
    "decisionValue": "確定した値",
    "rationale": "選択の根拠（3セット情報を参照）",
    "tolerance": "許容範囲",
    "nextSteps": ["実行ステップ"]
  },

  "termination": { "shouldTerminate": false, "reason": null },
  "consistency": { "status": "ok | conflict | needs-info" }
}
\`\`\`

JSONのみを出力してください。`;
}

/**
 * プロセス支援モード用の3セット対応プロンプト（Phase 7: ナレッジ対応）
 */
function buildProcessSupportPromptWithThreeSets(
  contextSummary: string,
  selectionPathText: string,
  selectedNode: DecisionFlowNode,
  conditionsText: string,
  pastCasesText: string,
  inferredText: string,
  preconditionsText: string,
  selectionRationaleText: string,
  knowledgeText: string
): string {
  return `以下のユーザーの状況と3セット情報を分析し、次のステップを提案してください。

${contextSummary}

## 【重要】ユーザーの前提条件
${preconditionsText}

## 選択パス
${selectionPathText}

## 今回の選択: 「${selectedNode.label}」
- リスク戦略: ${selectedNode.riskStrategy ?? "未設定"}
${selectionRationaleText}

---

## 【3セット情報】

### 1. 条件（前提条件・制約）
${conditionsText}

### 2. 過去事例（類似案件の手順）
${pastCasesText}

### 3. AI推論（推奨ステップ）
${inferredText}

${knowledgeText}

---

## 選択肢生成の指示

1. 3セット情報と**ユーザーの前提条件**を考慮して**次のアクション**を提案
2. 完了済みステップは除外
3. 選択理由に沿った方向性を維持
4. 蓄積されたナレッジがあれば、それに基づいた推奨を優先
5. 全ステップ完了なら goalStatus = "achieved"

JSONのみを出力してください。`;
}

/**
 * 条件をテキスト形式に変換
 */
function formatConditions(conditions: ConditionOption[]): string {
  if (conditions.length === 0) {
    return "（条件なし）";
  }

  return conditions
    .map((c) => `- **${c.label}** [${c.category}]: ${c.description}`)
    .join("\n");
}

/**
 * 過去事例をテキスト形式に変換
 */
function formatPastCases(pastCases: SimilarCase[]): string {
  if (pastCases.length === 0) {
    return "（類似事例なし）";
  }

  return pastCases
    .slice(0, 3) // 最大3件
    .map((c) => `- **${c.sourceFileName}** (類似度${c.similarity}%): ${c.content.slice(0, 100)}...`)
    .join("\n");
}

/**
 * 推論された優先事項をテキスト形式に変換
 */
function formatInferredPriorities(priorities: string[]): string {
  if (priorities.length === 0) {
    return "（推論なし）";
  }

  return priorities.map((p) => `- ${p}`).join("\n");
}

/**
 * Phase 7: ナレッジをテキスト形式に変換
 */
function formatKnowledge(knowledge?: {
  heuristics: Heuristic[];
  successPatterns: DecisionPattern[];
  failurePatterns: DecisionPattern[];
}): string {
  if (!knowledge) {
    return "";
  }

  const sections: string[] = [];

  // ヒューリスティクス（経験則）
  if (knowledge.heuristics.length > 0) {
    const heuristicsLines = knowledge.heuristics.map((h) => {
      const reliability = h.reliability.score >= 80 ? "★高信頼" : h.reliability.score >= 60 ? "☆中信頼" : "○参考";
      return `- **${h.rule}** [${reliability}]\n  説明: ${h.description}\n  適用領域: ${h.domain.join(", ")}`;
    });
    sections.push(`### ヒューリスティクス（経験則）\n${heuristicsLines.join("\n\n")}`);
  }

  // 成功パターン
  if (knowledge.successPatterns.length > 0) {
    const successLines = knowledge.successPatterns.map((p) => {
      const conditions = p.applicableConditions
        .map((c) => `${c.dimension}: ${c.condition}`)
        .join(", ");
      const lessons = p.lessons.slice(0, 2).join("; ");
      return `- **${p.name}** (発生${p.occurrences}回, 信頼度${p.reliability}%)\n  条件: ${conditions}\n  教訓: ${lessons}`;
    });
    sections.push(`### 成功パターン（参考にすべき）\n${successLines.join("\n\n")}`);
  }

  // 失敗パターン
  if (knowledge.failurePatterns.length > 0) {
    const failureLines = knowledge.failurePatterns.map((p) => {
      const conditions = p.applicableConditions
        .map((c) => `${c.dimension}: ${c.condition}`)
        .join(", ");
      const lessons = p.lessons.slice(0, 2).join("; ");
      return `- **⚠️ ${p.name}** (発生${p.occurrences}回)\n  条件: ${conditions}\n  教訓: ${lessons}\n  推奨: ${p.recommendations[0] ?? "回避を検討"}`;
    });
    sections.push(`### 失敗パターン（注意: 回避すべき）\n${failureLines.join("\n\n")}`);
  }

  if (sections.length === 0) {
    return "";
  }

  return `## 【Phase 7】蓄積されたナレッジ

以下は過去の意思決定から学習した知見です。選択肢生成時に考慮してください。

${sections.join("\n\n")}`;
}

// ============================================================
// Phase 5改改改: 前提条件と選択理由のフォーマット
// ============================================================

/**
 * 前提条件をテキスト形式に変換
 */
function formatPreconditions(
  preconditions?: { conditions: Array<{ label: string; category: string; detail?: string }>; additionalContext?: string }
): string {
  if (!preconditions) {
    return "（前提条件なし）";
  }

  const lines: string[] = [];

  // 条件をカテゴリ別にグループ化
  const conditions = preconditions.conditions;
  if (conditions.length > 0) {
    for (const c of conditions) {
      const detail = c.detail ? `: ${c.detail}` : "";
      lines.push(`- **${c.label}** [${c.category}]${detail}`);
    }
  }

  // 補足条件
  if (preconditions.additionalContext?.trim()) {
    lines.push(`- **補足**: ${preconditions.additionalContext}`);
  }

  if (lines.length === 0) {
    return "（前提条件なし）";
  }

  return `以下の前提条件は**全て満たす必要があります**。選択肢はこれらに適合するものを優先してください。

${lines.join("\n")}`;
}

/**
 * 選択理由をテキスト形式に変換
 */
function formatSelectionRationale(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): string {
  // 直近の選択履歴から理由を取得
  const lastSelection = session.selectionHistory
    .filter((h) => h.nodeId === selectedNode.id)
    .pop();

  if (!lastSelection?.rationale) {
    return "";
  }

  return `- **選択理由**: 「${lastSelection.rationale}」

この選択理由を踏まえて、次の選択肢を生成してください。`;
}
