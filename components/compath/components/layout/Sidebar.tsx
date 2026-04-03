"use client"
import { useEffect, useState } from "react";
import type { ChatSession } from "../../types/chat";
import type { AnalysisHistorySummary } from "../../types";
import { getHistoryList } from "../../api/history";

type SidebarProps = {
  isOpen: boolean;
  sessions: ChatSession[];
  currentSessionId?: string;
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onSelectHistory: (historyId: string) => void;
  onToggle: () => void;
};

function formatRelativeTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffMinutes < 1) return "たった今";
  if (diffMinutes < 60) return `${diffMinutes}分前`;
  if (diffHours < 24) return `${diffHours}時間前`;
  if (diffDays === 0) return "今日";
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString("ja-JP");
}

function groupByDate<T extends { createdAt?: string; analyzedAt?: string }>(
  items: T[]
): { label: string; items: T[] }[] {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today.getTime() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  const groups: { label: string; items: T[] }[] = [
    { label: "今日", items: [] },
    { label: "昨日", items: [] },
    { label: "過去7日間", items: [] },
    { label: "それ以前", items: [] },
  ];

  for (const item of items) {
    const dateStr = item.createdAt || item.analyzedAt || "";
    const date = new Date(dateStr);
    if (date >= today) {
      groups[0].items.push(item);
    } else if (date >= yesterday) {
      groups[1].items.push(item);
    } else if (date >= lastWeek) {
      groups[2].items.push(item);
    } else {
      groups[3].items.push(item);
    }
  }

  return groups.filter((g) => g.items.length > 0);
}

function AgentIcon({ type }: { type: string }) {
  switch (type) {
    case "knowledge_extraction":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
        </svg>
      );
    case "decision_timeline":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      );
    case "learn_from_past":
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    default:
      return (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      );
  }
}

export default function Sidebar({
  isOpen,
  sessions,
  currentSessionId,
  onNewChat,
  onSelectSession,
  onSelectHistory,
  onToggle,
}: SidebarProps) {
  const [histories, setHistories] = useState<AnalysisHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    getHistoryList()
      .then((data) => {
        if (!cancelled) {
          setHistories(data);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // セッションと履歴をマージして日付でグループ化
  const allItems = [
    ...sessions.map((s) => ({ ...s, itemType: "session" as const })),
    ...histories.map((h) => ({ ...h, itemType: "history" as const, createdAt: h.analyzedAt })),
  ].sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime());

  const groupedItems = groupByDate(allItems);

  return (
    <>
      {/* 閉じた状態のコンパクト表示 */}
      {!isOpen && (
        <aside className="sidebar sidebar--collapsed">
          <div className="sidebar__collapsed-actions">
            <button
              type="button"
              className="sidebar__icon-btn"
              onClick={onToggle}
              title="履歴を開く"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="3" y1="12" x2="21" y2="12" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <line x1="3" y1="18" x2="21" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              className="sidebar__icon-btn"
              onClick={onNewChat}
              title="新しいチャット"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="12" y1="5" x2="12" y2="19" />
                <line x1="5" y1="12" x2="19" y2="12" />
              </svg>
            </button>
          </div>
        </aside>
      )}

      {/* 展開時のサイドバー */}
      <aside className={`sidebar ${isOpen ? "sidebar--open" : "sidebar--hidden"}`}>
        <div className="sidebar__header">
          <button
            type="button"
            className="sidebar__new-btn"
            onClick={onNewChat}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            新しいチャット
          </button>
          <button
            type="button"
            className="sidebar__collapse-btn"
            onClick={onToggle}
            title="サイドバーを閉じる"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="11 17 6 12 11 7" />
              <polyline points="18 17 13 12 18 7" />
            </svg>
          </button>
        </div>

        <nav className="sidebar__list">
          {loading ? (
            <p className="sidebar__empty">読み込み中...</p>
          ) : allItems.length === 0 ? (
            <p className="sidebar__empty">履歴がありません</p>
          ) : (
            groupedItems.map((group) => (
              <div key={group.label} className="sidebar__group">
                <div className="sidebar__group-label">{group.label}</div>
                {group.items.map((item) => {
                  const isSession = item.itemType === "session";
                  const id = isSession ? (item as ChatSession).id : (item as AnalysisHistorySummary).id;
                  const title = isSession
                    ? (item as ChatSession).title
                    : (item as AnalysisHistorySummary).fileName;
                  const agentType = isSession
                    ? (item as ChatSession).agentType
                    : "knowledge_extraction";

                  return (
                    <button
                      key={id}
                      type="button"
                      className={`sidebar__item ${currentSessionId === id ? "sidebar__item--active" : ""}`}
                      onClick={() =>
                        isSession ? onSelectSession(id) : onSelectHistory(id)
                      }
                    >
                      <span className="sidebar__item-icon">
                        <AgentIcon type={agentType} />
                      </span>
                      <span className="sidebar__item-title">{title}</span>
                    </button>
                  );
                })}
              </div>
            ))
          )}
        </nav>
      </aside>
    </>
  );
}
