/**
 * Chat Strategy Interface
 * LLMモードとRAGモードを切り替え可能にするためのStrategy Pattern
 */

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

export type ChatContext = {
  axisLabel: string;
  summary?: string;
  nodes: Array<{
    label: string;
    levelLabel: string;
    status?: string;
    isPlaceholder?: boolean;
  }>;
  edges: Array<{
    sourceLabel: string;
    targetLabel: string;
  }>;
};

export type ChatRequest = {
  messages: ChatMessage[];
  context: ChatContext;
};

/**
 * RAGモード時に返される参照元ナレッジ情報
 */
export type KnowledgeSource = {
  id: string;
  title: string;
  excerpt: string;
  similarity: number;
};

export type ChatResponse = {
  reply: string;
  /** RAGモード時のみ: 回答に使用した参照元ナレッジ */
  sources?: KnowledgeSource[];
};

/**
 * Chat Strategy Interface
 * LLMモードとRAGモードで異なる実装を提供
 */
export interface ChatStrategy {
  generateResponse(request: ChatRequest): Promise<ChatResponse>;
}
