"use client"
import QuickActions from "./QuickActions";
import ActivityFeed from "./ActivityFeed";

type HomePageProps = {
  onNavigateToAnalysis: () => void;
  onNavigateToDecision: () => void;
  onRecord: () => void;
  onSearch: () => void;
  onOpenHistory: (id: string) => void;
  historyRefreshTrigger?: number;
};

export default function HomePage({
  onNavigateToAnalysis,
  onNavigateToDecision,
  onRecord,
  onSearch,
  onOpenHistory,
  historyRefreshTrigger
}: HomePageProps) {
  return (
    <div className="home-page">
      <section className="home-page__hero">
        <h1>意思決定を、もっと早く。</h1>
        <p className="home-page__lead">
          過去の判断から学び、今の判断を記録し、未来の判断を支援する。
        </p>
      </section>

      <section className="home-page__section">
        <QuickActions
          onAnalyze={onNavigateToAnalysis}
          onRecord={onRecord}
          onSearch={onSearch}
          onDecisionTimeline={onNavigateToDecision}
        />
      </section>

      <section className="home-page__section">
        <ActivityFeed
          onOpenHistory={onOpenHistory}
          refreshTrigger={historyRefreshTrigger}
        />
      </section>

      <section className="home-page__section home-page__suggestion">
        <div className="suggestion-card">
          <div className="suggestion-card__icon">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
          </div>
          <div className="suggestion-card__content">
            <h3>次にやること</h3>
            <p>「ナレッジ抽出」から報告書を取り込んで、知見を構造化してみましょう。</p>
          </div>
          <button
            type="button"
            className="suggestion-card__action"
            onClick={onNavigateToAnalysis}
          >
            ナレッジ抽出を始める
          </button>
        </div>
      </section>
    </div>
  );
}
