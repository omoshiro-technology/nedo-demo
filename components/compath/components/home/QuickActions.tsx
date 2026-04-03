"use client"
type QuickActionsProps = {
  onAnalyze: () => void;
  onRecord: () => void;
  onSearch: () => void;
  onDecisionTimeline: () => void;
};

export default function QuickActions({ onAnalyze, onRecord, onSearch, onDecisionTimeline }: QuickActionsProps) {
  return (
    <div className="quick-actions">
      {/* 1. 日報を書く */}
      <button type="button" className="quick-action-card" onClick={onRecord}>
        <div className="quick-action-card__icon quick-action-card__icon--record">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
        </div>
        <h3 className="quick-action-card__title">日報を書く</h3>
        <p className="quick-action-card__desc">
          毎日の業務記録・ヒヤリハットを入力
        </p>
        <span className="quick-action-card__badge">Coming Soon</span>
      </button>

      {/* 2. ナレッジ抽出 */}
      <button type="button" className="quick-action-card" onClick={onAnalyze}>
        <div className="quick-action-card__icon quick-action-card__icon--analyze">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
          </svg>
        </div>
        <h3 className="quick-action-card__title">ナレッジ抽出</h3>
        <p className="quick-action-card__desc">
          報告書から知見を構造化し、穴を見つける
        </p>
      </button>

      {/* 3. 意思決定タイムライン */}
      <button type="button" className="quick-action-card" onClick={onDecisionTimeline}>
        <div className="quick-action-card__icon quick-action-card__icon--decision">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
        </div>
        <h3 className="quick-action-card__title">意思決定タイムライン</h3>
        <p className="quick-action-card__desc">
          議事録から決定事項を抽出し時系列で可視化
        </p>
      </button>

      {/* 4. 過去に学ぶ */}
      <button type="button" className="quick-action-card" onClick={onSearch}>
        <div className="quick-action-card__icon quick-action-card__icon--search">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
        <h3 className="quick-action-card__title">過去に学ぶ</h3>
        <p className="quick-action-card__desc">
          似た事例・対策を探して参考にする
        </p>
        <span className="quick-action-card__badge">Coming Soon</span>
      </button>
    </div>
  );
}
