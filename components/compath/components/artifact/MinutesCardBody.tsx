"use client"
/**
 * MinutesCardBody - 議事録分析結果の本文表示
 *
 * 表示内容:
 * - 決定事項数（確定/グレー）
 * - アクションアイテム数
 * - 主要な決定事項（上位3件）
 * - 展開時: 全決定事項、フィルター、アクション一覧
 */

import type { MinutesContent, MissingItem } from "../../types/artifact";

type MinutesCardBodyProps = {
  content: MinutesContent;
  summary: string;
  missing: MissingItem[];
  isExpanded: boolean;
};

function CheckCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function AlertCircleIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
    </svg>
  );
}

export function MinutesCardBody({
  content,
  summary,
  missing,
  isExpanded,
}: MinutesCardBodyProps) {
  const { meeting, discussion, action_items } = content;

  // 決定事項を集計
  const allDecisions = discussion.flatMap((d) => d.decisions);
  const openQuestions = discussion.flatMap((d) => d.open_questions);
  const confirmedCount = allDecisions.length;
  const grayCount = openQuestions.length;

  // 上位の決定事項（最大3件）
  const topDecisions = allDecisions.slice(0, 3);
  // 上位の未確定事項（最大2件）
  const topOpenQuestions = openQuestions.slice(0, 2);

  // オープンなアクション数
  const openActionCount = action_items.filter((a) => a.status === "OPEN").length;

  return (
    <div className="artifact-card-body artifact-card-body--minutes">
      {/* サマリーセクション（常時表示） */}
      <div className="artifact-card-body__summary">
        <p className="artifact-card-body__summary-text">{summary}</p>
      </div>

      {/* メトリクス */}
      <div className="artifact-card-body__metrics">
        <span className="artifact-card-body__metric">
          <CheckCircleIcon />
          <span>決定事項: {confirmedCount + grayCount}件</span>
          <span className="artifact-card-body__metric-detail">
            （確定: {confirmedCount} / グレー: {grayCount}）
          </span>
        </span>
        {action_items.length > 0 && (
          <span className="artifact-card-body__metric">
            <ClipboardIcon />
            <span>アクション: {action_items.length}件</span>
            {openActionCount > 0 && (
              <span className="artifact-card-body__metric-detail">
                （未完了: {openActionCount}）
              </span>
            )}
          </span>
        )}
      </div>

      {/* 主要な決定事項 */}
      <div className="artifact-card-body__decisions-preview">
        {topDecisions.map((decision, i) => (
          <div key={i} className="artifact-card-body__decision-item artifact-card-body__decision-item--confirmed">
            <CheckCircleIcon />
            <span>{decision}</span>
          </div>
        ))}
        {topOpenQuestions.map((question, i) => (
          <div key={`q-${i}`} className="artifact-card-body__decision-item artifact-card-body__decision-item--gray">
            <AlertCircleIcon />
            <span>{question}</span>
          </div>
        ))}
        {allDecisions.length + openQuestions.length > 5 && (
          <span className="artifact-card-body__decisions-more">
            他 {allDecisions.length + openQuestions.length - 5} 件
          </span>
        )}
      </div>

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div className="artifact-card-body__detail">
          {/* 会議情報 */}
          {meeting.title && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">会議情報</h4>
              <div className="artifact-card-body__meeting-info">
                <span className="artifact-card-body__meeting-title">{meeting.title}</span>
                {meeting.date && (
                  <span className="artifact-card-body__meeting-date">{meeting.date}</span>
                )}
                {meeting.attendees.length > 0 && (
                  <span className="artifact-card-body__meeting-attendees">
                    参加者: {meeting.attendees.join(", ")}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 議論トピック */}
          <div className="artifact-card-body__section">
            <h4 className="artifact-card-body__section-title">議論トピック</h4>
            <div className="artifact-card-body__topics">
              {discussion.map((topic, i) => (
                <div key={i} className="artifact-card-body__topic">
                  <h5 className="artifact-card-body__topic-title">{topic.topic}</h5>
                  {topic.decisions.length > 0 && (
                    <div className="artifact-card-body__topic-decisions">
                      {topic.decisions.map((d, j) => (
                        <div key={j} className="artifact-card-body__decision-item artifact-card-body__decision-item--confirmed">
                          <CheckCircleIcon />
                          <span>{d}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {topic.open_questions.length > 0 && (
                    <div className="artifact-card-body__topic-questions">
                      {topic.open_questions.map((q, j) => (
                        <div key={j} className="artifact-card-body__decision-item artifact-card-body__decision-item--gray">
                          <AlertCircleIcon />
                          <span>{q}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* アクションアイテム */}
          {action_items.length > 0 && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">アクションアイテム</h4>
              <div className="artifact-card-body__actions">
                {action_items.map((item, i) => (
                  <div
                    key={i}
                    className={`artifact-card-body__action-item artifact-card-body__action-item--${item.status.toLowerCase()}`}
                  >
                    <span className="artifact-card-body__action-who">{item.who}</span>
                    <span className="artifact-card-body__action-what">{item.what}</span>
                    {item.due && (
                      <span className="artifact-card-body__action-due">期限: {item.due}</span>
                    )}
                    <span className={`artifact-card-body__action-status artifact-card-body__action-status--${item.status.toLowerCase()}`}>
                      {item.status === "OPEN" ? "未完了" : "完了"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 未確定項目 */}
          {missing.length > 0 && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">確認が必要な項目</h4>
              <div className="artifact-card-body__missing-list">
                {missing.map((item) => (
                  <div
                    key={item.id}
                    className={`artifact-card-body__missing-detail artifact-card-body__missing-detail--${item.severity}`}
                  >
                    <span className="artifact-card-body__missing-question">{item.question}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
