"use client"
import { useEffect, useState } from "react";
import type { AnalysisHistorySummary } from "../../types";
import { getHistoryList } from "../../api/history";

type ActivityFeedProps = {
  onOpenHistory: (id: string) => void;
  refreshTrigger?: number;
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
  if (diffDays === 1) return "昨日";
  if (diffDays < 7) return `${diffDays}日前`;
  return date.toLocaleDateString("ja-JP");
}

function AnalysisIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  );
}

export default function ActivityFeed({ onOpenHistory, refreshTrigger }: ActivityFeedProps) {
  const [histories, setHistories] = useState<AnalysisHistorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    getHistoryList()
      .then((data) => {
        if (!cancelled) {
          setHistories(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "履歴の取得に失敗しました");
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [refreshTrigger]);

  if (loading) {
    return (
      <div className="activity-feed activity-feed--empty">
        <p className="muted">読み込み中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="activity-feed activity-feed--empty">
        <p className="muted">{error}</p>
      </div>
    );
  }

  if (histories.length === 0) {
    return (
      <div className="activity-feed activity-feed--empty">
        <p className="muted">まだ分析結果がありません</p>
        <p className="muted">「ナレッジ抽出」から文書を分析してみましょう</p>
      </div>
    );
  }

  return (
    <div className="activity-feed">
      <h2 className="activity-feed__title">最近の分析結果</h2>
      <ul className="activity-feed__list">
        {histories.slice(0, 5).map((history) => (
          <li key={history.id} className="activity-feed__item">
            <span className="activity-feed__icon activity-feed__icon--analysis">
              <AnalysisIcon />
            </span>
            <div className="activity-feed__content">
              <span className="activity-feed__item-title">{history.fileName}</span>
              <span className="activity-feed__item-desc">
                {history.documentType}
                {history.qualityScore != null && ` ・ 品質: ${history.qualityScore}%`}
                {history.missingCount != null && history.missingCount > 0 && (
                  <span style={{ color: "var(--accent-2)" }}> ・ 欠損: {history.missingCount}件</span>
                )}
              </span>
            </div>
            <button
              type="button"
              className="activity-feed__open-btn"
              onClick={() => onOpenHistory(history.id)}
            >
              開く
            </button>
            <span className="activity-feed__time">
              {formatRelativeTime(history.analyzedAt)}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
