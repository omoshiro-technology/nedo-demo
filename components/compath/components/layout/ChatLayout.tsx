"use client"
import { useState, type ReactNode } from "react";
import Header from "./Header";
import Sidebar from "./Sidebar";
import type { ChatSession } from "../../types/chat";

type ChatLayoutProps = {
  children: ReactNode;
  sessions: ChatSession[];
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onSelectHistory: (historyId: string) => void;
  onGoHome: () => void;
  onLoadPreset?: () => void;
};

export default function ChatLayout({
  children,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onSelectHistory,
  onGoHome,
  onLoadPreset,
}: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleToggleSidebar = () => {
    setSidebarOpen(!sidebarOpen);
  };

  return (
    <div className="chat-layout">
      <Header onGoHome={onGoHome} onLoadPreset={onLoadPreset} />
      <div className="chat-layout__body">
        <Sidebar
          isOpen={sidebarOpen}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onNewChat={onNewChat}
          onSelectSession={onSelectSession}
          onSelectHistory={onSelectHistory}
          onToggle={handleToggleSidebar}
        />
        <main className={`chat-layout__main ${!sidebarOpen ? "chat-layout__main--full" : ""}`}>
          {children}
        </main>
      </div>
    </div>
  );
}
