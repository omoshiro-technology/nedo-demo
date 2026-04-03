import type { DecisionNavigatorSuggestion } from "../types/chat";

export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatContext = {
  axisLabel: string;
  summary?: string;
  nodes: Array<{ label: string; levelLabel: string; status?: string; isPlaceholder?: boolean }>;
  edges: Array<{ sourceLabel: string; targetLabel: string }>;
};

export type ChatResponse = {
  reply: string;
  sources?: string[];
  decisionNavigatorSuggestion?: DecisionNavigatorSuggestion | null;
};

const API_BASE = "/api/compath";

export async function chatWithAssistant(payload: {
  messages: ChatMessage[];
  context: ChatContext;
}): Promise<string> {
  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "チャットの送信に失敗しました。");
  }

  const data = (await response.json()) as { reply: string };
  return data.reply;
}

/**
 * シンプルな対話用API（コンテキストなし）
 * @param messages 会話履歴
 * @param enableDecisionDetection 意思決定検出を有効にするか
 * @param hasDecisionTimelineResult 議事録分析結果が既にあるか（trueなら意思決定ナビ提案を抑制）
 */
export async function sendChatMessage(
  messages: ChatMessage[],
  enableDecisionDetection = true,
  hasDecisionTimelineResult = false
): Promise<ChatResponse> {
  // 空のコンテキストを渡す
  const emptyContext: ChatContext = {
    axisLabel: "",
    nodes: [],
    edges: [],
  };

  const response = await fetch(`${API_BASE}/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      context: emptyContext,
      enableDecisionDetection,
      hasDecisionTimelineResult,
    }),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message ?? "チャットの送信に失敗しました。");
  }

  return (await response.json()) as ChatResponse;
}
