"use client"
/**
 * DecisionLogCardBody - 意思決定ログの本文表示
 *
 * 表示内容:
 * - 決定内容
 * - 推奨理由
 * - 選択肢数
 * - 展開時: 選択肢一覧（pros/cons）、評価軸、検討履歴
 */

import type { DecisionLogContent, MissingItem } from "../../types/artifact";

type DecisionLogCardBodyProps = {
  content: DecisionLogContent;
  summary: string;
  missing: MissingItem[];
  isExpanded: boolean;
};

function TargetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export function DecisionLogCardBody({
  content,
  summary,
  missing,
  isExpanded,
}: DecisionLogCardBodyProps) {
  const { decision, options, criteria, recommendation, history } = content;

  // 推奨された選択肢を取得
  const recommendedOption = options.find((o) => o.id === recommendation.option_id);
  const optionCount = options.length;

  return (
    <div className="artifact-card-body artifact-card-body--decision-log">
      {/* サマリーセクション（常時表示） */}
      <div className="artifact-card-body__summary">
        <p className="artifact-card-body__summary-text">{summary}</p>
      </div>

      {/* 決定内容 */}
      <div className="artifact-card-body__decision-main">
        <div className="artifact-card-body__decision-label">
          <TargetIcon />
          <span>決定:</span>
        </div>
        <span className="artifact-card-body__decision-value">{decision}</span>
      </div>

      {/* 推奨理由（最初の2つ） */}
      {recommendation.rationale.length > 0 && (
        <div className="artifact-card-body__rationale-preview">
          <span className="artifact-card-body__rationale-label">推奨理由:</span>
          <ul className="artifact-card-body__rationale-list">
            {recommendation.rationale.slice(0, 2).map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
          {recommendation.rationale.length > 2 && (
            <span className="artifact-card-body__rationale-more">
              他 {recommendation.rationale.length - 2} 件
            </span>
          )}
        </div>
      )}

      {/* メトリクス */}
      <div className="artifact-card-body__metrics">
        <span className="artifact-card-body__metric">
          <span>選択肢: {optionCount}件</span>
        </span>
        {criteria.length > 0 && (
          <span className="artifact-card-body__metric">
            <span>評価軸: {criteria.length}件</span>
          </span>
        )}
        {missing.length > 0 && (
          <span className="artifact-card-body__metric artifact-card-body__metric--warning">
            <AlertIcon />
            <span>未確定: {missing.length}件</span>
          </span>
        )}
      </div>

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div className="artifact-card-body__detail">
          {/* 選択肢一覧 */}
          <div className="artifact-card-body__section">
            <h4 className="artifact-card-body__section-title">選択肢一覧</h4>
            <div className="artifact-card-body__options">
              {options.map((option) => {
                const isRecommended = option.id === recommendation.option_id;
                return (
                  <div
                    key={option.id}
                    className={`artifact-card-body__option ${
                      isRecommended ? "artifact-card-body__option--recommended" : ""
                    }`}
                  >
                    <div className="artifact-card-body__option-header">
                      <span className="artifact-card-body__option-label">{option.label}</span>
                      {isRecommended && (
                        <span className="artifact-card-body__option-badge">推奨</span>
                      )}
                    </div>
                    {option.pros.length > 0 && (
                      <div className="artifact-card-body__option-pros">
                        <span className="artifact-card-body__option-section-label">
                          <CheckIcon />
                          メリット
                        </span>
                        <ul>
                          {option.pros.map((pro, i) => (
                            <li key={i}>{pro}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {option.cons.length > 0 && (
                      <div className="artifact-card-body__option-cons">
                        <span className="artifact-card-body__option-section-label">
                          <XIcon />
                          デメリット
                        </span>
                        <ul>
                          {option.cons.map((con, i) => (
                            <li key={i}>{con}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {option.risks.length > 0 && (
                      <div className="artifact-card-body__option-risks">
                        <span className="artifact-card-body__option-section-label">
                          <AlertIcon />
                          リスク
                        </span>
                        <ul>
                          {option.risks.map((risk, i) => (
                            <li key={i}>{risk}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* 評価軸 */}
          {criteria.length > 0 && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">評価軸</h4>
              <div className="artifact-card-body__criteria">
                {criteria.map((criterion, i) => (
                  <div key={i} className="artifact-card-body__criterion">
                    <span className="artifact-card-body__criterion-name">{criterion.name}</span>
                    <span className="artifact-card-body__criterion-weight">
                      重み: {criterion.weight}
                    </span>
                    {criterion.notes && (
                      <span className="artifact-card-body__criterion-notes">{criterion.notes}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 推奨の詳細 */}
          {recommendedOption && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">推奨詳細</h4>
              <div className="artifact-card-body__recommendation-detail">
                <div className="artifact-card-body__recommendation-option">
                  推奨選択肢: {recommendedOption.label}
                </div>
                {recommendation.rationale.length > 0 && (
                  <div className="artifact-card-body__recommendation-rationale">
                    <span>理由:</span>
                    <ul>
                      {recommendation.rationale.map((r, i) => (
                        <li key={i}>{r}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {recommendation.reversal_conditions.length > 0 && (
                  <div className="artifact-card-body__recommendation-reversal">
                    <span>再検討条件:</span>
                    <ul>
                      {recommendation.reversal_conditions.map((c, i) => (
                        <li key={i}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 検討履歴 */}
          {history.length > 0 && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">検討履歴</h4>
              <div className="artifact-card-body__history">
                {history.map((item, i) => (
                  <div key={i} className="artifact-card-body__history-item">
                    <HistoryIcon />
                    <span className="artifact-card-body__history-time">
                      {new Date(item.timestamp).toLocaleString("ja-JP", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                    <span
                      className={`artifact-card-body__history-event artifact-card-body__history-event--${item.event.toLowerCase()}`}
                    >
                      {item.event === "CREATED"
                        ? "作成"
                        : item.event === "REVISED"
                          ? "修正"
                          : "採用"}
                    </span>
                    <span className="artifact-card-body__history-note">{item.note}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 未確定項目 */}
          {missing.length > 0 && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">未確定項目</h4>
              <div className="artifact-card-body__missing-list">
                {missing.map((item) => (
                  <div
                    key={item.id}
                    className={`artifact-card-body__missing-detail artifact-card-body__missing-detail--${item.severity}`}
                  >
                    <span className="artifact-card-body__missing-field">{item.field}</span>
                    <span className="artifact-card-body__missing-question">{item.question}</span>
                    {item.suggested_inputs && item.suggested_inputs.length > 0 && (
                      <div className="artifact-card-body__missing-suggestions">
                        {item.suggested_inputs.map((suggestion, i) => (
                          <span key={i} className="artifact-card-body__missing-suggestion">
                            {suggestion}
                          </span>
                        ))}
                      </div>
                    )}
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
