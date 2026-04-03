"use client"
import { useState, useEffect } from "react";
import type { DerivedKnowledge } from "../utils/knowledgeExtractor";
import type { AnalysisResult } from "../types";

type KnowledgeDashboardProps = {
  analysis: AnalysisResult;
  derived: DerivedKnowledge;
  onClose: () => void;
};

export default function KnowledgeDashboard({
  analysis,
  derived,
  onClose
}: KnowledgeDashboardProps) {
  const [activeTab, setActiveTab] = useState<"overview" | "feedforward" | "feedback">("overview");
  const [expandedSections, setExpandedSections] = useState<Set<string>>(
    new Set(["insights"])
  );
  const [expandedActions, setExpandedActions] = useState<Set<number>>(new Set());
  const [actionInputs, setActionInputs] = useState<Map<number, string>>(new Map());

  // ポップアップ表示中はbodyのスクロールを無効化
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    const originalPaddingRight = document.body.style.paddingRight;

    // スクロールバーの幅を計算
    const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;

    // bodyのスクロールを無効化し、スクロールバー分のpaddingを追加してレイアウトシフトを防ぐ
    document.body.style.overflow = "hidden";
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = originalOverflow;
      document.body.style.paddingRight = originalPaddingRight;
    };
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  // メトリクス計算（品質指標を使用）
  const quality = derived.quality;
  const highPriorityItems =
    derived.feedforward.filter((f) => f.priority === "high").length +
    derived.feedback.filter((f) => f.priority === "high").length;

  return (
    <div className="dashboard-overlay" role="dialog" aria-modal="true">
      <div className="dashboard-v2">
        {/* ヘッダー */}
        <div className="dashboard-v2__header">
          <div className="dashboard-v2__title-area">
            <h2 className="dashboard-v2__title">ナレッジダッシュボード</h2>
            <p className="dashboard-v2__subtitle">{analysis.meta.fileName || "解析結果"}</p>
          </div>
          <button
            type="button"
            className="dashboard-v2__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            ✕
          </button>
        </div>

        {/* メトリクスサマリー */}
        <div className="dashboard-v2__metrics">
          <div className="metric-card">
            <div className="metric-card__icon">⭐</div>
            <div className="metric-card__content">
              <div className="metric-card__label">ナレッジ品質</div>
              <div className="metric-card__value">{quality.qualityScore.toFixed(0)}%</div>
              <div className="metric-card__bar">
                <div
                  className="metric-card__bar-fill"
                  style={{ width: `${quality.qualityScore}%` }}
                />
              </div>
              <div className="metric-card__sub">
                重要レベル充足度: {quality.breakdown.criticalLevelsFulfillment.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">🔄</div>
            <div className="metric-card__content">
              <div className="metric-card__label">学習サイクル</div>
              <div className="metric-card__value">{quality.learningCycleScore.toFixed(0)}%</div>
              <div className="metric-card__bar">
                <div
                  className="metric-card__bar-fill"
                  style={{ width: `${quality.learningCycleScore}%` }}
                />
              </div>
              <div className="metric-card__sub">
                PDCA完成度
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">📊</div>
            <div className="metric-card__content">
              <div className="metric-card__label">記入完成度</div>
              <div className="metric-card__value">{quality.completionRate.toFixed(0)}%</div>
              <div className="metric-card__bar">
                <div
                  className="metric-card__bar-fill"
                  style={{ width: `${quality.completionRate}%` }}
                />
              </div>
              <div className="metric-card__sub">
                全ノード充足率
              </div>
            </div>
          </div>

          <div className="metric-card">
            <div className="metric-card__icon">🎯</div>
            <div className="metric-card__content">
              <div className="metric-card__label">実行可能性</div>
              <div className="metric-card__value">{quality.breakdown.actionabilityScore.toFixed(0)}%</div>
              <div className="metric-card__bar">
                <div
                  className="metric-card__bar-fill"
                  style={{ width: `${quality.breakdown.actionabilityScore}%` }}
                />
              </div>
              <div className="metric-card__sub">
                ノウハウ具体性
              </div>
            </div>
          </div>
        </div>

        {/* タブナビゲーション */}
        <div className="dashboard-v2__tabs">
          <button
            type="button"
            className={`dashboard-v2__tab ${activeTab === "overview" ? "is-active" : ""}`}
            onClick={() => setActiveTab("overview")}
          >
            <span className="dashboard-v2__tab-icon">📋</span>
            概要
          </button>
          <button
            type="button"
            className={`dashboard-v2__tab ${activeTab === "feedforward" ? "is-active" : ""}`}
            onClick={() => setActiveTab("feedforward")}
          >
            <span className="dashboard-v2__tab-icon">🔮</span>
            フィードフォワード
            {derived.feedforward.length > 0 && (
              <span className="dashboard-v2__tab-badge">{derived.feedforward.length}</span>
            )}
          </button>
          <button
            type="button"
            className={`dashboard-v2__tab ${activeTab === "feedback" ? "is-active" : ""}`}
            onClick={() => setActiveTab("feedback")}
          >
            <span className="dashboard-v2__tab-icon">🎯</span>
            改善提案
            {derived.feedback.length > 0 && (
              <span className="dashboard-v2__tab-badge">{derived.feedback.length}</span>
            )}
          </button>
        </div>

        {/* コンテンツエリア */}
        <div className="dashboard-v2__content">
          {activeTab === "overview" && (
            <div className="dashboard-v2__overview">
              {/* 示唆 */}
              <CollapsibleSection
                title="重要な示唆"
                icon="💡"
                count={derived.insights.length}
                isExpanded={expandedSections.has("insights")}
                onToggle={() => toggleSection("insights")}
              >
                {derived.insights.length > 0 ? (
                  <div className="insights-list">
                    {derived.insights.map((item, idx) => (
                      <div key={`ins-${idx}`} className="insight-item">
                        <div className="insight-item__marker" />
                        <div className="insight-item__text">{item}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">示唆が見つかりませんでした</p>
                )}
              </CollapsibleSection>

              {/* 情報の欠損 */}
              <CollapsibleSection
                title="情報の欠損"
                icon="❓"
                count={derived.missingDetails.length}
                isExpanded={expandedSections.has("tacit")}
                onToggle={() => toggleSection("tacit")}
              >
                {derived.missingDetails.length > 0 ? (
                  <div className="tacit-list">
                    {derived.missingDetails.map((detail, idx) => (
                      <div key={`tc-${idx}`} className="tacit-item tacit-item--enhanced">
                        <div className="tacit-item__icon">⚠️</div>
                        <div className="tacit-item__content">
                          <div className="tacit-item__label">{detail.label}</div>
                          <div className="tacit-item__question">❓ {detail.question}</div>
                          <div className="tacit-item__risk">
                            <span className="tacit-item__risk-label">放置リスク:</span> {detail.risk}
                          </div>
                          <div className="tacit-item__value">
                            <span className="tacit-item__value-label">補完価値:</span> {detail.value}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">欠損情報はありません</p>
                )}
              </CollapsibleSection>

              {/* ノウハウ */}
              <CollapsibleSection
                title="実効性のあるノウハウ"
                icon="🧭"
                count={derived.knowHow.length}
                isExpanded={expandedSections.has("knowhow")}
                onToggle={() => toggleSection("knowhow")}
              >
                {derived.knowHow.length > 0 ? (
                  <div className="knowhow-grid">
                    {derived.knowHow.slice(0, 6).map((item, idx) => (
                      <div key={`kh-${idx}`} className="knowhow-card">
                        <div className="knowhow-card__icon">✓</div>
                        <div className="knowhow-card__text">{item}</div>
                      </div>
                    ))}
                  </div>
                ) : derived.knowHowAbsenceReason ? (
                  <div className="absence-reason">
                    <div className="absence-reason__icon">💡</div>
                    <div className="absence-reason__text">{derived.knowHowAbsenceReason}</div>
                  </div>
                ) : (
                  <p className="empty-state">ノウハウが見つかりませんでした</p>
                )}
              </CollapsibleSection>

              {/* 因果チェーン */}
              <CollapsibleSection
                title="因果チェーン"
                icon="🔗"
                count={derived.episodes.length}
                isExpanded={expandedSections.has("episodes")}
                onToggle={() => toggleSection("episodes")}
              >
                {derived.episodes.length > 0 ? (
                  <div className="causal-chain">
                    {derived.episodes.slice(0, 6).map((episode, idx) => (
                      <div key={`ep-${idx}`} className="causal-chain__item">
                        <div className="causal-chain__number">{idx + 1}</div>
                        <div className="causal-chain__path">{episode}</div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">因果チェーンが見つかりませんでした</p>
                )}
              </CollapsibleSection>

              {/* 出典（原文） */}
              {analysis.fullText && (
                <CollapsibleSection
                  title="出典"
                  icon="📄"
                  count={undefined}
                  isExpanded={expandedSections.has("source")}
                  onToggle={() => toggleSection("source")}
                >
                  <div className="source-text">
                    <div className="source-text__meta">
                      <div className="source-text__filename">{analysis.meta.fileName}</div>
                      <div className="source-text__stats">
                        {analysis.meta.textLength.toLocaleString()}文字 | {analysis.meta.pageCount}ページ
                      </div>
                    </div>
                    <div className="source-text__content">
                      {analysis.fullText}
                    </div>
                  </div>
                </CollapsibleSection>
              )}
            </div>
          )}

          {activeTab === "feedforward" && (
            <div className="dashboard-v2__feedforward">
              <div className="tab-intro">
                <div className="tab-intro__icon">🔮</div>
                <div className="tab-intro__content">
                  <h3>フィードフォワード</h3>
                  <p>過去のパターンから、次に起こりうる懸念点や推奨アクションを予測します</p>
                </div>
              </div>

              {derived.feedforward.length > 0 ? (
                <div className="feedforward-cards">
                  {derived.feedforward.map((item, idx) => (
                    <div
                      key={`ff-${idx}`}
                      className={`feedforward-card priority-${item.priority}`}
                    >
                      <div className="feedforward-card__header">
                        <div className="feedforward-card__type">
                          {item.type === "concern" && "⚠️ 懸念点"}
                          {item.type === "next_step" && "💡 次のステップ"}
                          {item.type === "recommendation" && "📌 推奨"}
                        </div>
                        <div className={`priority-badge priority-${item.priority}`}>
                          {item.priority === "high" && "高"}
                          {item.priority === "medium" && "中"}
                          {item.priority === "low" && "低"}
                        </div>
                      </div>
                      <div className="feedforward-card__message">{item.message}</div>
                      {item.sourceExcerpt && (
                        <div className="feedforward-card__source">
                          <div className="feedforward-card__source-label">出典:</div>
                          <div>{item.sourceExcerpt}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-large">
                  <div className="empty-state-large__icon">✨</div>
                  <div className="empty-state-large__title">フィードフォワード情報はありません</div>
                  <div className="empty-state-large__desc">
                    現在のグラフ構造からは特筆すべき懸念点は検出されませんでした
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === "feedback" && (
            <div className="dashboard-v2__feedback">
              <div className="tab-intro">
                <div className="tab-intro__icon">🎯</div>
                <div className="tab-intro__content">
                  <h3>改善提案</h3>
                  <p>
                    発生した問題から、誰に何をフィードバックすべきかを分析・提案します
                  </p>
                </div>
              </div>

              {derived.feedback.length > 0 ? (
                <div className="feedback-cards">
                  {derived.feedback.map((item, idx) => (
                    <div key={`fb-${idx}`} className={`feedback-card priority-${item.priority}`}>
                      <div className="feedback-card__header">
                        <div className="feedback-card__target">
                          <span className="feedback-card__icon">👤</span>
                          {item.target}
                        </div>
                        <div className={`priority-badge priority-${item.priority}`}>
                          {item.priority === "high" && "高"}
                          {item.priority === "medium" && "中"}
                          {item.priority === "low" && "低"}
                        </div>
                      </div>
                      <div className="feedback-card__action">
                        <div className="feedback-card__action-label">アクション</div>
                        <div className="feedback-card__action-text">{item.action}</div>
                      </div>
                      <div className="feedback-card__rationale">{item.rationale}</div>
                      {item.sourceExcerpt && (
                        <div className="feedback-card__source">
                          <div className="feedback-card__source-label">出典:</div>
                          <div>{item.sourceExcerpt}</div>
                        </div>
                      )}
                      <div className="feedback-card__action-prompt">
                        {!expandedActions.has(idx) && (
                          <button
                            type="button"
                            className="action-prompt-button"
                            onClick={() => {
                              setExpandedActions((prev) => {
                                const next = new Set(prev);
                                next.add(idx);
                                return next;
                              });
                              // 次のレンダリング後にフォーカスを移動
                              setTimeout(() => {
                                const textarea = document.querySelector(
                                  `.action-prompt-input textarea[data-feedback-idx="${idx}"]`
                                ) as HTMLTextAreaElement;
                                textarea?.focus();
                              }, 0);
                            }}
                          >
                            📝 今すぐ追記する
                          </button>
                        )}
                        {expandedActions.has(idx) && (
                          <div className="action-prompt-input">
                            <textarea
                              data-feedback-idx={idx}
                              placeholder="追記した内容を入力してください（例：温度測定基準を-10℃に設定、測定日を対策後1ヶ月とした）"
                              value={actionInputs.get(idx) || ""}
                              onChange={(e) => {
                                setActionInputs((prev) => {
                                  const next = new Map(prev);
                                  next.set(idx, e.target.value);
                                  return next;
                                });
                              }}
                              rows={3}
                            />
                            <div className="action-prompt-buttons">
                              <button
                                type="button"
                                className="action-save-button"
                                onClick={() => {
                                  const content = actionInputs.get(idx);
                                  if (content && content.trim()) {
                                    // TODO: 実際の保存処理（将来的にはAPIに送信など）
                                    alert(`追記内容を記録しました:\n${content}`);
                                    setExpandedActions((prev) => {
                                      const next = new Set(prev);
                                      next.delete(idx);
                                      return next;
                                    });
                                  }
                                }}
                                disabled={!actionInputs.get(idx)?.trim()}
                              >
                                記録する
                              </button>
                              <button
                                type="button"
                                className="action-cancel-button"
                                onClick={() => {
                                  setExpandedActions((prev) => {
                                    const next = new Set(prev);
                                    next.delete(idx);
                                    return next;
                                  });
                                }}
                              >
                                キャンセル
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="empty-state-large">
                  <div className="empty-state-large__icon">✅</div>
                  <div className="empty-state-large__title">改善提案はありません</div>
                  <div className="empty-state-large__desc">
                    現在のグラフからは特筆すべき改善点は検出されませんでした
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* フッター（警告のみ表示） */}
        {analysis.warnings.length > 0 && (
          <div className="dashboard-v2__footer">
            <div className="dashboard-v2__warnings">
              <span className="dashboard-v2__warnings-icon">⚠️</span>
              <div className="dashboard-v2__warnings-list">
                {analysis.warnings.slice(0, 3).map((warning, idx) => (
                  <span key={`warn-${idx}`} className="dashboard-v2__warning-item">
                    {warning}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

type CollapsibleSectionProps = {
  title: string;
  icon: string;
  count: number | undefined;
  isExpanded: boolean;
  onToggle: () => void;
  children: React.ReactNode;
};

function CollapsibleSection({
  title,
  icon,
  count,
  isExpanded,
  onToggle,
  children
}: CollapsibleSectionProps) {
  return (
    <div className={`collapsible-section ${isExpanded ? "is-expanded" : ""}`}>
      <button type="button" className="collapsible-section__header" onClick={onToggle}>
        <div className="collapsible-section__title">
          <span className="collapsible-section__icon">{icon}</span>
          <span className="collapsible-section__label">{title}</span>
          {count !== undefined && (
            <span className="collapsible-section__count">{count}件</span>
          )}
        </div>
        <span className="collapsible-section__toggle">
          {isExpanded ? "▼" : "▶"}
        </span>
      </button>
      {isExpanded && <div className="collapsible-section__content">{children}</div>}
    </div>
  );
}
