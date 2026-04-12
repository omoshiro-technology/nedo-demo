"use client"
import { useState, useCallback } from "react";
import ChatLayout from "./components/layout/ChatLayout";
import ChatPage from "./components/chat/ChatPage";
import { useChatState } from "./hooks/useChatState";
import type { AnalysisHistory } from "./types";
import { getHistoryById } from "./api/history";
import { DemoScenarioProvider } from "./data/DemoScenarioContext";

export default function App() {
  const {
    state,
    selectAgent,
    startSession,
    addMessage,
    selectSession,
    goHome,
  } = useChatState();

  const [historyRefreshTrigger, setHistoryRefreshTrigger] = useState(0);
  const [loadedHistory, setLoadedHistory] = useState<AnalysisHistory | null>(null);
  const [presetRequest, setPresetRequest] = useState(0);

  const handleHistoryRefresh = useCallback(() => {
    setHistoryRefreshTrigger((prev) => prev + 1);
  }, []);

  const handleNewChat = useCallback(() => {
    setLoadedHistory(null);
    goHome();
  }, [goHome]);

  const handleSelectSession = useCallback(
    (sessionId: string) => {
      setLoadedHistory(null);
      selectSession(sessionId);
    },
    [selectSession]
  );

  const handleSelectHistory = useCallback(
    async (historyId: string) => {
      try {
        const history = await getHistoryById(historyId);
        setLoadedHistory(history);
        // Start a new session for viewing history
        selectAgent("knowledge_extraction");
        startSession("knowledge_extraction");
      } catch (error) {
        console.error("履歴の読み込みに失敗しました:", error);
      }
    },
    [selectAgent, startSession]
  );

  return (
    <DemoScenarioProvider>
      <ChatLayout
        sessions={state.sessions}
        currentSessionId={state.currentSession?.id}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onSelectHistory={handleSelectHistory}
        onGoHome={handleNewChat}
        onLoadPreset={() => setPresetRequest(prev => prev + 1)}
      >
        <ChatPage
          selectedAgent={state.selectedAgent}
          messages={state.currentSession?.messages ?? []}
          onSelectAgent={selectAgent}
          onAddMessage={addMessage}
          onStartSession={startSession}
          onHistoryRefresh={handleHistoryRefresh}
          loadedHistory={loadedHistory}
          presetRequest={presetRequest}
        />
      </ChatLayout>
    </DemoScenarioProvider>
  );
}
