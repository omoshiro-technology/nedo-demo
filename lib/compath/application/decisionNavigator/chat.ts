/**
 * チャット機能
 * - GPT-5.2を使用（env.openaiModelDefaultで設定）
 * - 選択されたノード・エッジをコンテキストとして渡す
 */

import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { generateId, getTimestamp } from "./utils";
import { SessionStore } from "./sessionStore";
import type {
  DecisionNavigatorSession,
  DecisionChatMessage,
} from "./types";

/**
 * 経験移転支援システムプロンプト
 *
 * 想定ユーザー:
 * - 火力経験者が原子力の設計に入る（スキルはあるが新領域での経験がない）
 * - 国内ナレッジを海外で使う（手順は違っても考え方・判断は転用できる）
 * - 初めての業務でもうまくやりたい
 *
 * 核心的価値:
 * - 熟達者の視点を注入し、見落としや思い込みを防ぐ
 * - 「この領域ではこういう点に注意する」を伝える
 */
const DECISION_CHAT_PROMPT = `あなたは「経験豊富な先輩技術者」として、新しい領域に挑戦するユーザーを支援します。

## あなたの役割
ユーザーは十分なスキルを持っていますが、この特定の領域での経験が少ない状況です。
あなたの役割は、**経験不足による見落としや思い込みを防ぐ**ことです。

- 「この領域では、ここに注意が必要です」と教える
- 「他の領域ではOKでも、ここでは違う理由」を説明する
- 過去の事例から「先人がどう判断したか」を伝える
- 見落としがちなポイントを先回りして指摘する

## 最重要原則
1. **経験の差を埋める**: ユーザーが気づかない「この領域特有の注意点」を伝える
2. **思い込みを正す**: 他領域の経験から来る誤った前提を見つけたら指摘する
3. **過去事例を活用**: 「以前、似た状況でこう判断した例がある」と具体的に示す
4. **判断の理由を伝える**: 「何をすべきか」だけでなく「なぜそうすべきか」を必ず説明

## 回答の指針
- **結論を先に**: 「〇〇すべきです」とまず言い切る
- **理由を添える**: 「なぜなら、この領域では〜だからです」
- **見落としを指摘**: 「ただし、〇〇も確認してください。見落としがちですが重要です」
- **過去事例があれば引用**: 「過去の事例では〜という判断がされています」

## 注意すべき見落としパターン
ユーザーが経験豊富な別領域から来ている場合、以下のような思い込みがありがちです：
- 「前の領域ではこうだったから、ここでも同じはず」→ 違いを明確に指摘
- 「これは常識だから確認不要」→ この領域固有のルールを教える
- 「細かいことは後でいい」→ 実は重要な確認事項を先回りで指摘

## 回答スタイル
- 簡潔で明確（150-300文字程度、複雑な質問は400文字まで可）
- 箇条書きで読みやすく
- 先輩として親しみやすく、でも重要な指摘は遠慮なく
- 「ご存知かもしれませんが」ではなく「この領域では」と言い切る

## 対応できる質問の例
- 「これで進めて大丈夫？」→ 見落としがないか、この領域特有の注意点を確認
- 「何に気をつけるべき？」→ 経験者だからこそ知っている落とし穴を教える
- 「前のプロジェクトではこうだった」→ この領域との違いを明確に説明
- 「よくわからない」→ 過去事例を引きながら判断の道筋を示す`;

const RISK_STRATEGY_LABELS: Record<string, string> = {
  avoid: "回避（リスク自体を排除）",
  mitigate: "軽減（影響を最小化）",
  transfer: "転嫁（第三者に移転）",
  accept: "受容（リスクを許容）",
};

/**
 * チャットメッセージを処理して応答を生成
 */
export async function processChat(
  sessionId: string,
  userMessage: string
): Promise<DecisionNavigatorSession> {
  const session = await SessionStore.findById(sessionId);
  if (!session) {
    throw new Error("セッションが見つかりません");
  }

  const now = getTimestamp();

  // ユーザーメッセージを追加
  const userChatMessage: DecisionChatMessage = {
    id: generateId(),
    role: "user",
    content: userMessage,
    timestamp: now,
    type: "text",
  };

  session.chatHistory.push(userChatMessage);
  session.updatedAt = now;

  // コンテキストを構築（選択済みノード・エッジを含む詳細版）
  const context = buildDetailedContext(session);

  // 最近のチャット履歴を文字列に変換
  const recentMessages = session.chatHistory.slice(-10)
    .map((m: DecisionChatMessage) => `${m.role === "user" ? "ユーザー" : "AI"}: ${m.content}`)
    .join("\n");

  // LLM呼び出し用のコンテンツを構築
  // 会話履歴を強調し、文脈を理解しやすい構造にする
  const userContent = `## キャンバスの状態（意思決定フローチャート）
${context}

## 直前の会話履歴（重要: この流れを踏まえて回答すること）
${recentMessages || "（まだ会話はありません）"}

## 今回のユーザーの質問
${userMessage}

---
上記の会話履歴の流れを踏まえ、ユーザーの質問に回答してください。
特に「それ」「この」などの指示語が何を指すか、直前の会話から判断してください。`;

  // LLM呼び出し
  let reply = "";
  try {
    reply = await generateChatCompletion({
      systemPrompt: DECISION_CHAT_PROMPT,
      userContent,
      maxTokens: 600,
      temperature: 0.7,
    });
  } catch (error) {
    console.error("Chat LLM error:", error);
    reply = "現在AIとの通信に問題が発生しています。もう一度お試しください。";
  }

  // アシスタントメッセージを追加
  const assistantMessage: DecisionChatMessage = {
    id: generateId(),
    role: "assistant",
    content: reply,
    timestamp: getTimestamp(),
    type: "text",
  };

  session.chatHistory.push(assistantMessage);
  session.updatedAt = getTimestamp();

  // 保存
  await SessionStore.save(session);

  return session;
}

/**
 * 確定時のAI応答を生成
 */
export async function generateConfirmationResponse(
  session: DecisionNavigatorSession,
  selectedNodeLabel: string
): Promise<string> {
  const selectionPath = session.selectionHistory.map((h) => h.nodeLabel).join(" → ");

  const userContent = `ユーザーが意思決定を確定しました。

## 確定した内容
「${selectedNodeLabel}」

## 目的
${session.purpose}

## これまでの選択パス
${selectionPath}

この決定について:
1. 選択の妥当性を簡潔にコメント（1文）
2. 次に考えるべきポイントを1-2点提示

回答は100-150文字程度で簡潔に。`;

  try {
    const reply = await generateChatCompletion({
      systemPrompt: "意思決定支援AIとして、選択に対するフィードバックを提供してください。肯定的かつ建設的なトーンで。",
      userContent,
      maxTokens: 300,
      temperature: 0.7,
    });

    return reply;
  } catch (error) {
    console.error("Confirmation response error:", error);
    return "この選択で進めていきましょう。次のステップを検討する際は、お気軽にご相談ください。";
  }
}

/**
 * 目的達成のための包括的コンテキストを構築
 *
 * ユーザーの目的達成に必要な全ての情報を含める:
 * - 目的・ゴール定義
 * - 制約条件・前提条件
 * - 確認済みの事項（clarification回答）
 * - 現在の進捗状況
 * - 参照可能な過去事例
 */
function buildDetailedContext(session: DecisionNavigatorSession): string {
  const lines: string[] = [];

  // ============================================================
  // 1. 目的とゴール（最重要）
  // ============================================================
  lines.push(`## ユーザーの目的`);
  lines.push(session.purpose);
  lines.push(``);

  // ゴール定義があれば追加
  if (session.goalDefinition) {
    const goalTypeLabels: Record<string, string> = {
      numeric_value: "数値を決定する",
      process_plan: "手順を策定する",
      categorical_value: "選択肢から選ぶ",
      unknown: "未定義",
    };
    lines.push(`### ゴールの種類`);
    lines.push(`${goalTypeLabels[session.goalDefinition.type] || session.goalDefinition.type}`);
    if (session.goalDefinition.unitHints?.length) {
      lines.push(`（単位: ${session.goalDefinition.unitHints.join(", ")}）`);
    }
    lines.push(``);
  }

  // ゴール達成状態
  if (session.goalState) {
    const statusLabels: Record<string, string> = {
      achieved: "✓ 達成済み",
      partial: "△ 部分的に達成",
      unknown: "○ 進行中",
    };
    lines.push(`### 達成状態: ${statusLabels[session.goalState.status] || session.goalState.status}`);
    if (session.goalState.decisionValue) {
      lines.push(`確定値: ${session.goalState.decisionValue}`);
    }
    if (session.goalState.reason) {
      lines.push(`判定理由: ${session.goalState.reason}`);
    }
    lines.push(``);
  }

  // ============================================================
  // 2. 制約条件・前提条件（重要）
  // ============================================================
  const context = session.decisionContext;
  if (context) {
    if (context.constraints?.length) {
      lines.push(`## 制約条件（必ず守るべきこと）`);
      for (const constraint of context.constraints) {
        lines.push(`- ${constraint}`);
      }
      lines.push(``);
    }

    if (context.assumptions?.length) {
      lines.push(`## 前提条件（確認済みの事実）`);
      for (const assumption of context.assumptions) {
        lines.push(`- ${assumption}`);
      }
      lines.push(``);
    }

    if (context.commitments?.length) {
      lines.push(`## 確定事項（すでに決めたこと）`);
      for (const commitment of context.commitments) {
        lines.push(`- ${commitment}`);
      }
      lines.push(``);
    }

    if (context.currentSituation) {
      lines.push(`## 現状・背景`);
      lines.push(context.currentSituation);
      lines.push(``);
    }
  }

  // 前提条件データ（preconditions）
  if (session.preconditions?.conditions?.length) {
    const selectedConditions = session.preconditions.conditions.filter(c => c.isSelected);
    if (selectedConditions.length > 0) {
      lines.push(`## ユーザーが設定した前提条件`);
      for (const cond of selectedConditions) {
        lines.push(`- ${cond.label}${cond.detail ? `: ${cond.detail}` : ""}`);
      }
      lines.push(``);
    }
  }

  // シミュレーション条件
  if (session.simulationConditions?.length) {
    lines.push(`## シミュレーション条件`);
    for (const cond of session.simulationConditions) {
      lines.push(`- ${cond.label}: ${cond.value}`);
    }
    lines.push(``);
  }

  // ============================================================
  // 3. 参考資料（文書）
  // ============================================================
  if (session.documentSource?.extractedContext) {
    lines.push(`## 参照文書（${session.documentSource.fileName}）`);
    // 長すぎる場合は要約
    const docText = session.documentSource.extractedContext;
    if (docText.length > 1000) {
      lines.push(docText.slice(0, 1000) + "...");
    } else {
      lines.push(docText);
    }
    lines.push(``);
  }

  // ============================================================
  // 3.5 熟達者の視点（経験移転の核心）
  // ============================================================
  // veteranInsight: 判断軸に関するベテランの経験談
  // rationale: 選択肢に関する「なぜこれを選ぶ/選ばないか」
  // overlookedWarnings: 見落とし警告
  const insightsAndWarnings: string[] = [];

  for (const node of session.nodes) {
    // ベテランの経験談（判断軸向け）
    if (node.veteranInsight) {
      insightsAndWarnings.push(`【${node.label}について】${node.veteranInsight}`);
    }
    // 選択肢の理由（なぜこれを選ぶ/選ばないか）
    if (node.rationale) {
      insightsAndWarnings.push(`【${node.label}の判断理由】${node.rationale}`);
    }
    // 見落とし警告
    if (node.overlookedWarnings?.length) {
      for (const warning of node.overlookedWarnings) {
        // OverlookedWarning型: viewpoint, risk, suggestion
        const warningText = `${warning.viewpoint}: ${warning.risk}`;
        insightsAndWarnings.push(`【注意】${warningText}${warning.suggestion ? ` → ${warning.suggestion}` : ""}`);
      }
    }
    // decisionPropertyからの情報
    if (node.decisionProperty) {
      const dp = node.decisionProperty;
      // rationale（判断の理由）- primaryが主な理由
      if (dp.rationale?.primary) {
        insightsAndWarnings.push(`【判断の背景】${dp.rationale.primary}`);
      }
      // viewpoints（観点）- nameが観点名
      if (dp.viewpoints?.length) {
        const viewpointNames = dp.viewpoints.map(v => v.name).join(", ");
        insightsAndWarnings.push(`【考慮すべき観点】${viewpointNames}`);
      }
    }
  }

  if (insightsAndWarnings.length > 0) {
    lines.push(`## 熟達者の視点（この領域での経験から）`);
    // 最大5件まで表示
    for (const insight of insightsAndWarnings.slice(0, 5)) {
      lines.push(`- ${insight}`);
    }
    if (insightsAndWarnings.length > 5) {
      lines.push(`（他 ${insightsAndWarnings.length - 5} 件の知見があります）`);
    }
    lines.push(``);
  }

  // ============================================================
  // 4. 現在の進捗状況
  // ============================================================

  // 推奨パス（AIが提案したルート）
  const recommendedNodes = session.nodes.filter((n) => n.status === "recommended" || n.isRecommended);
  if (recommendedNodes.length > 0) {
    lines.push(`## AIが推奨するルート（オレンジ色のパス）`);
    // レベル順にソート（strategy → tactic → action）
    const levelOrder: Record<string, number> = { strategy: 0, tactic: 1, action: 2 };
    const sortedRecommended = [...recommendedNodes].sort(
      (a, b) => (levelOrder[a.level] ?? 99) - (levelOrder[b.level] ?? 99)
    );
    for (const node of sortedRecommended) {
      const badges: string[] = [];
      if (node.riskStrategy) {
        badges.push(RISK_STRATEGY_LABELS[node.riskStrategy] || node.riskStrategy);
      }
      if (node.riskLevel) badges.push(`リスク:${node.riskLevel}`);

      lines.push(`- **${node.label}**${badges.length > 0 ? ` [${badges.join(", ")}]` : ""}`);
      if (node.description) {
        lines.push(`  ${node.description}`);
      }
      if (node.recommendationReason) {
        lines.push(`  推奨理由: ${node.recommendationReason}`);
      }
    }
    lines.push(``);
  }

  // 選択済みノードの詳細（ユーザーが確定したもの）
  const selectedNodes = session.nodes.filter((n) => n.status === "selected");
  if (selectedNodes.length > 0) {
    lines.push(`## ユーザーが選択済みの決定事項（緑色のパス）`);
    for (const node of selectedNodes) {
      const details: string[] = [];
      if (node.riskStrategy) {
        details.push(`戦略: ${RISK_STRATEGY_LABELS[node.riskStrategy] || node.riskStrategy}`);
      }
      if (node.confidence) {
        details.push(`確度: ${node.confidence}%`);
      }
      if (node.riskLevel) {
        details.push(`リスク: ${node.riskLevel}`);
      }

      lines.push(`- **${node.label}**`);
      if (node.description) {
        lines.push(`  説明: ${node.description}`);
      }
      if (details.length > 0) {
        lines.push(`  ${details.join(" | ")}`);
      }
    }
    lines.push(``);
  }

  // 選択済みエッジ（選択理由を含む）
  const selectedEdges = session.edges.filter((e) => e.type === "selected" && e.rationale);
  if (selectedEdges.length > 0) {
    lines.push(`## 選択の理由`);
    for (const edge of selectedEdges) {
      const targetNode = session.nodes.find((n) => n.id === edge.target);
      if (targetNode && edge.rationale) {
        lines.push(`- ${targetNode.label}: ${edge.rationale}`);
      }
    }
    lines.push(``);
  }

  // 選択履歴（パス）
  if (session.selectionHistory.length > 0) {
    lines.push(`## 選択パス履歴`);
    const pathLabels = session.selectionHistory.map((h) => h.nodeLabel);
    lines.push(pathLabels.join(" → "));
    lines.push(``);
  }

  // 現在表示されている全ての選択肢（available, recommended, dimmed）
  const currentNode = session.nodes.find((n) => n.id === session.currentNodeId);
  if (currentNode) {
    // 現在のノードの子ノード（次の選択肢）を取得
    const childNodes = session.nodes.filter(
      (n) => n.parentId === currentNode.id &&
             (n.status === "available" || n.status === "recommended" || n.status === "dimmed")
    );

    if (childNodes.length > 0) {
      lines.push(`## 現在キャンバスに表示されている選択肢`);
      lines.push(`（「${currentNode.label}」の次のステップとして以下が検討可能）`);
      lines.push(``);

      for (const node of childNodes) {
        const badges: string[] = [];
        if (node.status === "recommended" || node.isRecommended) badges.push("★推奨パス");
        if (node.riskStrategy) {
          badges.push(RISK_STRATEGY_LABELS[node.riskStrategy] || node.riskStrategy);
        }
        if (node.confidence) badges.push(`確度${node.confidence}%`);
        if (node.riskLevel) badges.push(`リスク:${node.riskLevel}`);
        if (node.hasPastCase) badges.push(`過去事例${node.pastCaseCount || 0}件`);

        lines.push(`- **${node.label}**${badges.length > 0 ? ` [${badges.join(", ")}]` : ""}`);
        if (node.description) {
          lines.push(`  ${node.description}`);
        }

        // structuredRationale内のQCDES影響（あれば）
        if (node.structuredRationale?.qcdesImpact) {
          const impacts: string[] = [];
          const q = node.structuredRationale.qcdesImpact;
          if (q.quality) impacts.push(`品質:${q.quality.impact}(${q.quality.description})`);
          if (q.cost) impacts.push(`コスト:${q.cost.impact}(${q.cost.description})`);
          if (q.delivery) impacts.push(`納期:${q.delivery.impact}(${q.delivery.description})`);
          if (q.safety) impacts.push(`安全:${q.safety.impact}(${q.safety.description})`);
          if (impacts.length > 0) {
            lines.push(`  QCDES影響: ${impacts.join(", ")}`);
          }
        }

        // structuredRationale内の顧客影響（あれば）
        if (node.structuredRationale?.customerImpact) {
          const cImpacts: string[] = [];
          const c = node.structuredRationale.customerImpact;
          if (c.relationship) cImpacts.push(`顧客関係:${c.relationship.impact}(${c.relationship.description})`);
          if (c.satisfaction) cImpacts.push(`顧客満足:${c.satisfaction.impact}(${c.satisfaction.description})`);
          if (cImpacts.length > 0) {
            lines.push(`  顧客影響: ${cImpacts.join(", ")}`);
          }
        }
      }
    }
  }

  // ============================================================
  // 5. 過去事例（参考情報）
  // ============================================================
  const nodesWithPastCases = session.nodes.filter(n => n.hasPastCase && n.pastCases?.length);
  if (nodesWithPastCases.length > 0) {
    lines.push(`## 参照可能な過去事例`);
    for (const node of nodesWithPastCases) {
      if (node.pastCases) {
        for (const pastCase of node.pastCases.slice(0, 2)) { // 最大2件
          lines.push(`- ${pastCase.sourceFileName || "過去事例"}`);
          if (pastCase.content) {
            // contentが長い場合は最初の100文字まで
            const contentPreview = pastCase.content.length > 100
              ? pastCase.content.slice(0, 100) + "..."
              : pastCase.content;
            lines.push(`  ${contentPreview}`);
          }
        }
      }
    }
    lines.push(``);
  }

  // ============================================================
  // 6. フローチャート構造（簡潔に）
  // ============================================================
  const visibleNodes = session.nodes.filter(
    (n) => n.status !== "locked" && n.status !== "alternative-collapsed"
  );
  if (visibleNodes.length > 0) {
    lines.push(`## 現在のフローチャート構造`);
    for (const node of visibleNodes) {
      const statusLabel =
        node.status === "selected" ? "✓確定" :
        node.status === "recommended" ? "★推奨" :
        node.status === "available" ? "○選択可" :
        node.status === "dimmed" ? "△代替" : "";
      lines.push(`- ${node.label} [${statusLabel}]`);
    }
  }

  return lines.join("\n");
}
