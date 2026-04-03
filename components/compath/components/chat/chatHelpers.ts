/**
 * ChatPage ヘルパー関数
 *
 * ChatPage.tsxから抽出した共通ユーティリティ
 */

import type { AgentType, ChatMessage } from "../../types/chat";
import type { ActionLogEntry } from "../../types/agent";
import { WELCOME_MESSAGES } from "../../constants/philosophy";

/**
 * アクションログのローカル追跡ヘルパー
 * ChatPage内の複数箇所で使われる localActionLogs + addLocalAction パターンを統一
 *
 * @returns [logs, addLog] - 追跡中のログ配列と、ログ追加関数のタプル
 */
export function createActionLogger(): [
  ActionLogEntry[],
  (actionType: ActionLogEntry["actionType"], target: string, msg: string, actionResult?: "ok" | "warn") => void,
] {
  const logs: ActionLogEntry[] = [];
  const addLog = (
    actionType: ActionLogEntry["actionType"],
    target: string,
    msg: string,
    actionResult: "ok" | "warn" = "ok",
  ) => {
    logs.push({
      id: `action-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      timestamp: new Date().toISOString(),
      step: logs.length + 1,
      actionType,
      target,
      result: actionResult,
      message: msg,
    });
  };
  return [logs, addLog];
}

/**
 * 推定進捗表示用のタイマー管理
 * バックエンドの処理ステップに基づいて進捗を表示する
 *
 * @param setStatus - ステータステキストの更新関数
 * @param steps - 処理ステップの配列（各ステップの名前と推定時間[秒]）
 * @returns 停止関数
 */
export const createProgressUpdater = (
  setStatus: (text: string) => void,
  steps: Array<{ name: string; estimatedSeconds: number }>
): (() => void) => {
  const totalTime = steps.reduce((sum, s) => sum + s.estimatedSeconds, 0);
  let elapsed = 0;
  let currentStepIndex = 0;
  let accumulatedTime = 0;

  // 初期表示
  setStatus(`${steps[0].name}... (1/${steps.length})`);

  const interval = setInterval(() => {
    elapsed++;

    // 現在のステップの終了時間を計算
    const currentStepEndTime = accumulatedTime + steps[currentStepIndex].estimatedSeconds;

    // ステップを進める
    if (elapsed >= currentStepEndTime && currentStepIndex < steps.length - 1) {
      accumulatedTime = currentStepEndTime;
      currentStepIndex++;
    }

    // 最後のステップの場合は経過時間も表示
    if (currentStepIndex === steps.length - 1 && elapsed > currentStepEndTime) {
      const overtime = elapsed - currentStepEndTime;
      setStatus(`${steps[currentStepIndex].name}... (${currentStepIndex + 1}/${steps.length}) ${overtime}秒`);
    } else {
      setStatus(`${steps[currentStepIndex].name}... (${currentStepIndex + 1}/${steps.length})`);
    }
  }, 1000);

  return () => clearInterval(interval);
};

/**
 * メッセージのattachedDataを含むコンテンツを構築
 * LLMに送信する際、分析結果やドキュメント内容をコンテキストとして含める
 */
export function buildMessageContent(message: ChatMessage): string {
  let content = message.content;

  // attachedDataがある場合、その内容をコンテキストとして追加
  if (message.attachedData) {
    switch (message.attachedData.type) {
      case "decision_result": {
        const result = message.attachedData.data;
        // 抽出されたテキストがあれば追加（会話コンテキスト用）
        if (result.extractedTexts && result.extractedTexts.length > 0) {
          const textsContext = result.extractedTexts
            .map((t) => `【${t.fileName}の内容】\n${t.text.slice(0, 5000)}${t.text.length > 5000 ? "...(省略)" : ""}`)
            .join("\n\n");
          content += `\n\n${textsContext}`;
        }
        // 抽出された意思決定があれば追加
        if (result.decisions.length > 0) {
          const decisionsContext = result.decisions
            .map((d, i) => `${i + 1}. [${d.status}] ${d.content}`)
            .join("\n");
          content += `\n\n【抽出された意思決定一覧】\n${decisionsContext}`;
        }
        break;
      }
      case "analysis_result": {
        const result = message.attachedData.data;
        // 要約があれば追加
        if (result.summary) {
          content += `\n\n【文書サマリー】\n${result.summary}`;
        }
        // 抽出されたグラフ情報
        if (result.graphs && result.graphs.length > 0) {
          const graphSummary = result.graphs
            .map((g, i) => `${i + 1}. ${g.axisLabel}: ノード${g.nodes.length}件`)
            .join("\n");
          content += `\n\n【抽出されたグラフ】\n${graphSummary}`;
        }
        break;
      }
      // 他のタイプは現状のままcontentのみ
    }
  }

  return content;
}

/**
 * エージェントタイプに応じたウェルカムタイトルを取得
 */
export function getAgentWelcomeTitle(agentType: AgentType): string {
  const messages = WELCOME_MESSAGES[agentType as keyof typeof WELCOME_MESSAGES] ?? WELCOME_MESSAGES.default;
  return messages.title;
}

/**
 * エージェントタイプに応じたウェルカム説明文を取得
 */
export function getAgentWelcomeDescription(agentType: AgentType): string {
  const messages = WELCOME_MESSAGES[agentType as keyof typeof WELCOME_MESSAGES] ?? WELCOME_MESSAGES.default;
  return messages.description;
}

/**
 * エージェントタイプに応じた操作説明を取得
 */
export function getAgentInstructions(agentType: AgentType): string {
  const messages = WELCOME_MESSAGES[agentType as keyof typeof WELCOME_MESSAGES] ?? WELCOME_MESSAGES.default;
  return messages.instructions;
}

// ── Message utility functions (extracted from ChatMessages.tsx) ──

/**
 * Markdown太字記法（**）の前処理
 *
 * AIの出力で ** が正しくペアになっていない場合や、
 * ReactMarkdownがパースできない場合があるため、
 * ** を完全に除去してプレーンテキストにする。
 */
export function preprocessMarkdownBold(text: string): string {
  // まず正しいペアの **text** を処理（太字のテキストだけ残す）
  let result = text.replace(/\*\*([^*\n]+)\*\*/g, "$1");
  // 残った孤立した ** を除去
  result = result.replace(/\*\*/g, "");
  return result;
}

/**
 * エラーメッセージかどうかを判定
 */
export function isErrorMessage(content: string): boolean {
  return content.startsWith("エラー:") || content.startsWith("エラー：");
}

/**
 * エラーメッセージから実際のエラー内容を抽出
 */
export function extractErrorContent(content: string): string {
  return content.replace(/^エラー[:：]\s*/, "");
}

/**
 * タイムスタンプを HH:MM 形式にフォーマット
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString("ja-JP", { hour: "2-digit", minute: "2-digit" });
}
