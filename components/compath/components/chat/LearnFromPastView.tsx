"use client"
import { useState } from "react";
import type { LearnFromPastResult, SimilarCase, NextAction, DecisionPatternType } from "../../types";
import {
  getStatusLabel,
  getStatusColor,
  getPriorityLabel,
  getPriorityColor,
  getRiskSeverityLabel,
  getRiskSeverityColor,
} from "../../utils/labelUtils";

type LearnFromPastViewProps = {
  result: LearnFromPastResult;
  onSendToChat?: (message: string) => void;
};

function getPatternLabel(pattern: DecisionPatternType): string {
  switch (pattern) {
    case "agreement":
      return "合意";
    case "decision":
      return "決定";
    case "change":
      return "変更";
    case "adoption":
      return "採用";
    case "cancellation":
      return "中止";
    default:
      return "その他";
  }
}

function SimilarCaseCard({ caseItem, index }: { caseItem: SimilarCase; index: number }) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div
      className={`learn-case-card ${!isExpanded ? "learn-case-card--clickable" : ""}`}
      onClick={() => !isExpanded && setIsExpanded(true)}
    >
      <div className="learn-case-card__header">
        <span className="learn-case-card__number">#{index + 1}</span>
        <span className="learn-case-card__similarity">類似度: {caseItem.similarity}%</span>
        <span className="learn-case-card__date">{caseItem.decisionDate}</span>
        <button
          type="button"
          className="learn-case-card__toggle"
          onClick={(e) => {
            e.stopPropagation();
            setIsExpanded(!isExpanded);
          }}
        >
          {isExpanded ? "▲" : "▼"}
        </button>
      </div>

      <div className="learn-case-card__content">
        <p className="learn-case-card__decision">「{caseItem.content}」</p>
      </div>

      <div className="learn-case-card__meta">
        <span
          className="learn-case-card__status"
          style={{ backgroundColor: getStatusColor(caseItem.status) }}
        >
          {getStatusLabel(caseItem.status)}
        </span>
        <span className="learn-case-card__pattern">{getPatternLabel(caseItem.patternType)}</span>
      </div>

      {isExpanded && (
        <div className="learn-case-card__detail">
          {caseItem.adoptedConclusion && (
            <div className="learn-case-card__section">
              <div className="learn-case-card__section-header">採用された結論</div>
              <p className="learn-case-card__section-content">{caseItem.adoptedConclusion}</p>
            </div>
          )}

          {caseItem.perspectives && caseItem.perspectives.length > 0 && (
            <div className="learn-case-card__section">
              <div className="learn-case-card__section-header">観点</div>
              <div className="learn-case-card__perspectives">
                {caseItem.perspectives.map((p, idx) => (
                  <span key={idx} className="learn-case-card__perspective-tag">{p}</span>
                ))}
              </div>
            </div>
          )}

          <div className="learn-case-card__source">
            出典: {caseItem.sourceFileName}
          </div>
        </div>
      )}
    </div>
  );
}

function NextActionItem({
  action,
  index,
  checked,
  onCheck,
  onAskAI,
}: {
  action: NextAction;
  index: number;
  checked: boolean;
  onCheck: () => void;
  onAskAI?: (action: NextAction) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasDetails = action.whyImportant || action.rationale || action.risk;

  return (
    <div className={`learn-action-item ${checked ? "is-checked" : ""}`}>
      <div className="learn-action-item__main">
        <label className="learn-action-item__checkbox" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={checked}
            onChange={onCheck}
          />
          <span className="learn-action-item__number">{index + 1}.</span>
          <span className="learn-action-item__content">{action.content}</span>
        </label>
        <div className="learn-action-item__meta">
          <span
            className="learn-action-item__priority"
            style={{ backgroundColor: getPriorityColor(action.priority) }}
          >
            優先度: {getPriorityLabel(action.priority)}
          </span>
          {action.risk && (
            <span
              className="learn-action-item__risk-badge"
              style={{ backgroundColor: getRiskSeverityColor(action.risk.severity) }}
            >
              リスク: {getRiskSeverityLabel(action.risk.severity)}
            </span>
          )}
          {hasDetails && (
            <button
              type="button"
              className="learn-action-item__expand-btn"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? "詳細を隠す" : "詳細を表示"}
            </button>
          )}
        </div>
      </div>

      {isExpanded && hasDetails && (
        <div className="learn-action-item__detail">
          {action.whyImportant && (
            <div className="learn-action-item__section">
              <div className="learn-action-item__section-label">なぜ必要？</div>
              <p className="learn-action-item__section-content">{action.whyImportant}</p>
            </div>
          )}

          {action.rationale && (
            <div className="learn-action-item__section">
              <div className="learn-action-item__section-label">根拠</div>
              <p className="learn-action-item__section-content">{action.rationale}</p>
            </div>
          )}

          {action.risk && (
            <div className="learn-action-item__section learn-action-item__section--risk">
              <div className="learn-action-item__section-label">リスク</div>
              <p className="learn-action-item__section-content">{action.risk.description}</p>
              {action.risk.mitigation && (
                <p className="learn-action-item__mitigation">→ {action.risk.mitigation}</p>
              )}
            </div>
          )}

          {onAskAI && (
            <button
              type="button"
              className="learn-action-item__ai-button"
              onClick={() => onAskAI(action)}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              このアクションについてAIに相談する
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function LearnFromPastView({ result, onSendToChat }: LearnFromPastViewProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState<"cases" | "actions">("cases");
  const [checkedActions, setCheckedActions] = useState<Record<string, boolean>>({});

  const handleActionCheck = (actionId: string) => {
    setCheckedActions((prev) => ({
      ...prev,
      [actionId]: !prev[actionId],
    }));
  };

  const handleAskAI = (action: NextAction) => {
    if (onSendToChat) {
      const prompt = action.aiPromptHint || `「${action.content}」について詳しく教えてください`;
      onSendToChat(prompt);
    }
  };

  const hasNoCases = result.similarCases.length === 0;

  return (
    <div className="learn-result-view">
      <div className="learn-result-view__header">
        <div className="learn-result-view__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.3-4.3" />
          </svg>
          <span>過去に学ぶ - 検索結果</span>
        </div>
        <button
          type="button"
          className="learn-result-view__toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "閉じる" : "詳細を表示"}
        </button>
      </div>

      <div className="learn-result-view__summary">
        <div className="learn-result-view__query">
          <strong>入力した状況:</strong> {result.userSituation}
        </div>
        <div className="learn-result-view__stats">
          <span className="learn-result-view__stat">
            <strong>{result.similarCases.length}</strong> 件の類似事例
          </span>
          <span className="learn-result-view__stat">
            <strong>{result.nextActions.length}</strong> 件のアクション提案
          </span>
          {result.metadata.searchedCount > 0 && (
            <span className="learn-result-view__stat learn-result-view__stat--muted">
              {result.metadata.searchedCount} 件の履歴から検索
            </span>
          )}
        </div>
      </div>

      {isExpanded && (
        <div className="learn-result-view__detail">
          {hasNoCases ? (
            <div className="learn-result-view__empty">
              <p>類似する過去の意思決定が見つかりませんでした。</p>
              <p className="learn-result-view__empty-hint">
                まず「意思決定タイムライン」で文書を分析し、決定履歴を蓄積してください。
              </p>
            </div>
          ) : (
            <>
              <div className="learn-result-view__tabs">
                <button
                  type="button"
                  className={`learn-result-view__tab ${activeTab === "cases" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("cases")}
                >
                  類似事例 ({result.similarCases.length})
                </button>
                <button
                  type="button"
                  className={`learn-result-view__tab ${activeTab === "actions" ? "is-active" : ""}`}
                  onClick={() => setActiveTab("actions")}
                >
                  次のアクション ({result.nextActions.length})
                </button>
              </div>

              {activeTab === "cases" && (
                <div className="learn-result-view__cases">
                  {result.similarCases.map((caseItem, idx) => (
                    <SimilarCaseCard key={caseItem.id} caseItem={caseItem} index={idx} />
                  ))}
                </div>
              )}

              {activeTab === "actions" && (
                <div className="learn-result-view__actions">
                  <p className="learn-result-view__actions-intro">
                    過去の事例から導かれる次のステップ:
                  </p>
                  {result.nextActions.map((action, idx) => (
                    <NextActionItem
                      key={action.id}
                      action={action}
                      index={idx}
                      checked={checkedActions[action.id] || false}
                      onCheck={() => handleActionCheck(action.id)}
                      onAskAI={onSendToChat ? handleAskAI : undefined}
                    />
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
