"use client"
import { useState } from "react";
import type {
  AgentMessage as AgentMessageType,
  AgentAction
} from "../types/agentMessage";

type AgentMessageProps = {
  message: AgentMessageType;
  onAction?: (action: AgentAction) => void;
};

export default function AgentMessage({ message, onAction }: AgentMessageProps) {
  const [expandedActionId, setExpandedActionId] = useState<string | null>(null);
  const [actionInputs, setActionInputs] = useState<Map<string, string>>(new Map());

  const handleActionClick = (action: AgentAction) => {
    if (action.type === "expand_detail") {
      // If action has actionType data, execute it immediately (like menu selection)
      if (action.data?.actionType) {
        onAction?.(action);
      } else {
        // Otherwise, expand the input form
        setExpandedActionId((prev) => (prev === action.id ? null : action.id));
      }
    } else if (action.type === "add_node" || action.type === "dismiss") {
      onAction?.(action);
    } else if (action.type === "concrete_action") {
      // Concrete actionの場合は直接実行（フォーム不要）
      onAction?.(action);
    }
  };

  const handleActionSubmit = (action: AgentAction) => {
    const input = actionInputs.get(action.id) || "";
    if (!input.trim()) return;

    onAction?.({
      ...action,
      data: { ...action.data, userInput: input.trim() }
    });

    // Clear input and collapse
    setActionInputs((prev) => {
      const next = new Map(prev);
      next.delete(action.id);
      return next;
    });
    setExpandedActionId(null);
  };

  if (message.type === "status") {
    return (
      <div className="agent-message agent-message--status">
        <div className="agent-message__role">AI エージェント</div>
        <div className="agent-message__bubble agent-message__bubble--status">
          <div className={`agent-status agent-status--${message.data.stage}`}>
            <div className="agent-status__icon">
              {message.data.stage === "analyzing" && "🔍"}
              {message.data.stage === "generating" && "⚙️"}
              {message.data.stage === "completed" && "✅"}
              {message.data.stage === "error" && "⚠️"}
            </div>
            <div className="agent-status__message">{message.data.message}</div>
          </div>
        </div>
      </div>
    );
  }

  if (message.type === "gap_analysis") {
    return (
      <div className="agent-message agent-message--gap">
        <div className="agent-message__role">AI エージェント</div>
        <div className="agent-message__bubble">
          <div className="gap-analysis">
            <div className="gap-analysis__header">
              <h4>ナレッジギャップ分析</h4>
              <span className={`priority-badge priority-badge--${message.data.priority}`}>
                {message.data.priority === "high" && "優先度: 高"}
                {message.data.priority === "medium" && "優先度: 中"}
                {message.data.priority === "low" && "優先度: 低"}
              </span>
            </div>
            <div className="gap-analysis__summary">
              <strong>{message.data.totalMissing}件</strong>の未入力の項目を検出しました。
            </div>
            <div className="gap-analysis__levels">
              {message.data.missingByLevel.map((level, idx) => (
                <div key={`${level.levelLabel}-${idx}`} className="gap-level">
                  <div className="gap-level__header">
                    <span className="gap-level__label">{level.levelLabel}</span>
                    <span className="gap-level__count">{level.count}件</span>
                  </div>
                  {level.examples.length > 0 && (
                    <ul className="gap-level__examples">
                      {level.examples.map((example, exIdx) => (
                        <li key={`${example}-${exIdx}`}>{example}</li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>
            {message.data.recommendation && (
              <div className="gap-analysis__recommendation">
                <strong>推奨:</strong> {message.data.recommendation}
              </div>
            )}
          </div>
          {message.actions && message.actions.length > 0 && (
            <div className="agent-message__actions">
              {message.actions.map((action) => (
                <button
                  key={action.id}
                  type="button"
                  className="agent-action-button"
                  onClick={() => handleActionClick(action)}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === "feedforward_suggestion") {
    const { data, actions } = message;
    const priorityLabel = {
      high: "優先度: 高",
      medium: "優先度: 中",
      low: "優先度: 低"
    }[data.priority];

    const typeLabel = {
      concern: "懸念事項",
      next_step: "次のステップ",
      recommendation: "推奨事項"
    }[data.type];

    return (
      <div className="agent-message agent-message--feedforward">
        <div className="agent-message__role">AI エージェント</div>
        <div className="agent-message__bubble">
          <div className="feedforward-suggestion">
            <div className="feedforward-suggestion__header">
              <span className="feedforward-suggestion__type">{typeLabel}</span>
              <span className={`priority-badge priority-badge--${data.priority}`}>
                {priorityLabel}
              </span>
            </div>
            <div className="feedforward-suggestion__message">{data.message}</div>
            {data.relatedNodes.length > 0 && (
              <div className="feedforward-suggestion__related">
                <span className="muted small">関連ノード:</span>
                <div className="node-tags">
                  {data.relatedNodes.map((node, idx) => (
                    <span key={`${node}-${idx}`} className="node-tag">
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.sourceExcerpt && (
              <div className="feedforward-suggestion__source">
                <span className="muted small">出典:</span>
                <blockquote>{data.sourceExcerpt}</blockquote>
              </div>
            )}
          </div>
          {actions.length > 0 && (
            <div className="agent-message__actions">
              {actions.map((action) => (
                <div key={action.id}>
                  <button
                    type="button"
                    className={`agent-action-button ${
                      action.type === "add_node" || action.type === "concrete_action" ? "agent-action-button--primary" : ""
                    }`}
                    onClick={() => handleActionClick(action)}
                  >
                    {action.label}
                  </button>
                  {expandedActionId === action.id && action.type === "expand_detail" && (
                    <div className="action-prompt-input">
                      <textarea
                        data-action-id={action.id}
                        placeholder="追記した内容を入力してください"
                        value={actionInputs.get(action.id) || ""}
                        onChange={(e) => {
                          setActionInputs((prev) => {
                            const next = new Map(prev);
                            next.set(action.id, e.target.value);
                            return next;
                          });
                        }}
                        rows={3}
                      />
                      <div className="action-prompt-buttons">
                        <button
                          type="button"
                          onClick={() => handleActionSubmit(action)}
                          disabled={!actionInputs.get(action.id)?.trim()}
                        >
                          送信
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setExpandedActionId(null)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (message.type === "feedback_suggestion") {
    const { data, actions } = message;
    const priorityLabel = {
      high: "優先度: 高",
      medium: "優先度: 中",
      low: "優先度: 低"
    }[data.priority];

    return (
      <div className="agent-message agent-message--feedback">
        <div className="agent-message__role">AI エージェント</div>
        <div className="agent-message__bubble">
          <div className="feedback-suggestion">
            <div className="feedback-suggestion__header">
              <span className="feedback-suggestion__target">{data.target}</span>
              <span className={`priority-badge priority-badge--${data.priority}`}>
                {priorityLabel}
              </span>
            </div>
            <div className="feedback-suggestion__action">
              <strong>改善提案:</strong> {data.action}
            </div>
            <div className="feedback-suggestion__rationale">{data.rationale}</div>
            {data.relatedNodes.length > 0 && (
              <div className="feedback-suggestion__related">
                <span className="muted small">関連ノード:</span>
                <div className="node-tags">
                  {data.relatedNodes.map((node, idx) => (
                    <span key={`${node}-${idx}`} className="node-tag">
                      {node}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {data.sourceExcerpt && (
              <div className="feedback-suggestion__source">
                <span className="muted small">出典:</span>
                <blockquote>{data.sourceExcerpt}</blockquote>
              </div>
            )}
          </div>
          {actions.length > 0 && (
            <div className="agent-message__actions">
              {actions.map((action) => (
                <div key={action.id}>
                  <button
                    type="button"
                    className={`agent-action-button ${
                      action.type === "add_node" || action.type === "concrete_action" ? "agent-action-button--primary" : ""
                    }`}
                    onClick={() => handleActionClick(action)}
                  >
                    {action.label}
                  </button>
                  {expandedActionId === action.id && action.type === "expand_detail" && (
                    <div className="action-prompt-input">
                      <textarea
                        data-action-id={action.id}
                        placeholder="追記した内容を入力してください"
                        value={actionInputs.get(action.id) || ""}
                        onChange={(e) => {
                          setActionInputs((prev) => {
                            const next = new Map(prev);
                            next.set(action.id, e.target.value);
                            return next;
                          });
                        }}
                        rows={3}
                      />
                      <div className="action-prompt-buttons">
                        <button
                          type="button"
                          onClick={() => handleActionSubmit(action)}
                          disabled={!actionInputs.get(action.id)?.trim()}
                        >
                          送信
                        </button>
                        <button
                          type="button"
                          className="ghost-button"
                          onClick={() => setExpandedActionId(null)}
                        >
                          キャンセル
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
