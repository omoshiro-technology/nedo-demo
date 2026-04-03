import { useState, useCallback } from "react";
import type {
  AgentType,
  ChatMessage,
  ChatSession,
  ChatState,
  AttachedData,
} from "../types/chat";
import type { ActionLogEntry } from "../types/agent";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function getAgentTitle(agentType: AgentType): string {
  switch (agentType) {
    case "knowledge_extraction":
      return "文書構造解析";
    case "unified_analysis":
      return "議事録分析";
    case "daily_report":
      return "日報";
    default:
      return "新しいチャット";
  }
}

const initialState: ChatState = {
  currentSession: null,
  selectedAgent: null,
  sessions: [],
  sidebarOpen: true,
};

export function useChatState() {
  const [state, setState] = useState<ChatState>(initialState);

  /** サイドバーの開閉をトグル */
  const toggleSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: !prev.sidebarOpen }));
  }, []);

  /** サイドバーを閉じる */
  const closeSidebar = useCallback(() => {
    setState((prev) => ({ ...prev, sidebarOpen: false }));
  }, []);

  /** エージェントを選択（セッション開始前の状態） */
  const selectAgent = useCallback((agentType: AgentType) => {
    setState((prev) => ({
      ...prev,
      selectedAgent: agentType,
      currentSession: null,
    }));
  }, []);

  /** 新しいセッションを開始 */
  const startSession = useCallback((agentType: AgentType): ChatSession => {
    const now = new Date().toISOString();
    const session: ChatSession = {
      id: generateId(),
      agentType,
      title: getAgentTitle(agentType),
      messages: [],
      createdAt: now,
      updatedAt: now,
    };
    setState((prev) => ({
      ...prev,
      currentSession: session,
      selectedAgent: agentType,
      sessions: [session, ...prev.sessions],
    }));
    return session;
  }, []);

  /** メッセージを追加 */
  const addMessage = useCallback(
    (
      content: string,
      role: "user" | "assistant",
      attachedData?: AttachedData,
      uploadedFiles?: string[],
      actionLogs?: ActionLogEntry[]
    ) => {
      console.log("[useChatState] addMessage called with actionLogs:", actionLogs);
      const message: ChatMessage = {
        id: generateId(),
        role,
        content,
        timestamp: Date.now(),
        attachedData,
        uploadedFiles,
        actionLogs,
      };
      console.log("[useChatState] message created:", message);

      setState((prev) => {
        if (!prev.currentSession) {
          console.log("[useChatState] No currentSession, skipping addMessage");
          return prev;
        }

        const updatedSession: ChatSession = {
          ...prev.currentSession,
          messages: [...prev.currentSession.messages, message],
          updatedAt: new Date().toISOString(),
          // 最初のユーザーメッセージでタイトルを更新
          title:
            prev.currentSession.messages.length === 0 && role === "user"
              ? content.slice(0, 30) + (content.length > 30 ? "..." : "")
              : prev.currentSession.title,
        };

        console.log("[useChatState] Message added, new messages count:", updatedSession.messages.length);
        console.log("[useChatState] Last message actionLogs:", updatedSession.messages[updatedSession.messages.length - 1].actionLogs);

        return {
          ...prev,
          currentSession: updatedSession,
          sessions: prev.sessions.map((s) =>
            s.id === updatedSession.id ? updatedSession : s
          ),
        };
      });

      return message;
    },
    []
  );

  /** セッションを選択（履歴から） */
  const selectSession = useCallback((sessionId: string) => {
    setState((prev) => {
      const session = prev.sessions.find((s) => s.id === sessionId);
      if (!session) return prev;
      return {
        ...prev,
        currentSession: session,
        selectedAgent: session.agentType,
      };
    });
  }, []);

  /** ホームに戻る（セッション選択解除） */
  const goHome = useCallback(() => {
    setState((prev) => ({
      ...prev,
      currentSession: null,
      selectedAgent: null,
    }));
  }, []);

  /** セッションを削除 */
  const deleteSession = useCallback((sessionId: string) => {
    setState((prev) => ({
      ...prev,
      sessions: prev.sessions.filter((s) => s.id !== sessionId),
      currentSession:
        prev.currentSession?.id === sessionId ? null : prev.currentSession,
    }));
  }, []);

  /** セッションのタイトルを更新 */
  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setState((prev) => ({
      ...prev,
      currentSession:
        prev.currentSession?.id === sessionId
          ? { ...prev.currentSession, title }
          : prev.currentSession,
      sessions: prev.sessions.map((s) =>
        s.id === sessionId ? { ...s, title } : s
      ),
    }));
  }, []);

  return {
    state,
    toggleSidebar,
    closeSidebar,
    selectAgent,
    startSession,
    addMessage,
    selectSession,
    goHome,
    deleteSession,
    updateSessionTitle,
  };
}
