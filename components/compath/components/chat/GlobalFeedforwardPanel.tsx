"use client"
/**
 * グローバルフィードフォワード表示
 *
 * Phase 14: チャットメッセージとしてコンパクトに表示
 * - シンプルなリスト形式
 * - クリックで参照元決定事項をハイライト
 * - スクロール不要なコンパクトデザイン
 * - クリップボードコピー機能
 */

import { useState, useCallback } from "react";
import type { GlobalFeedforward, GlobalFeedforwardAction } from "../../types";

type Props = {
  globalFeedforward: GlobalFeedforward;
  /** アクションクリック時に参照元決定事項をハイライトするコールバック */
  onHighlightDecision?: (decisionId: string, decisionContent: string) => void;
};

/**
 * 優先度マーカー
 */
function getPriorityMarker(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "⚪";
    default:
      return "⚪";
  }
}

/**
 * 優先度ラベル（テキスト用）
 */
function getPriorityLabel(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return "中";
  }
}

export function GlobalFeedforwardPanel({ globalFeedforward, onHighlightDecision }: Props) {
  const [copyTooltip, setCopyTooltip] = useState<string | null>(null);
  const [selectedActionId, setSelectedActionId] = useState<string | null>(null);

  const handleActionClick = useCallback((action: GlobalFeedforwardAction) => {
    // 選択状態をトグル
    if (selectedActionId === action.id) {
      setSelectedActionId(null);
    } else {
      setSelectedActionId(action.id);
      // 参照元の決定事項をハイライト（primary優先）
      const primaryRef = action.referencedDecisions?.find(r => r.relevance === "primary");
      const refToHighlight = primaryRef || action.referencedDecisions?.[0];
      if (refToHighlight && onHighlightDecision) {
        onHighlightDecision(refToHighlight.decisionId, refToHighlight.decisionContent);
      }
    }
  }, [selectedActionId, onHighlightDecision]);

  const handleCopyList = useCallback(async () => {
    // ToDoテンプレート形式でリストを生成
    // 「誰が」「何を」「いつまでに」を明確にし、担当者は穴埋め形式
    const lines: string[] = [];
    lines.push("【次にやること - ToDoリスト】");
    lines.push("");

    globalFeedforward.actions.forEach((action, index) => {
      const priorityLabel = getPriorityLabel(action.priority);
      const deadlineText = action.deadline || "＿＿＿＿";
      lines.push(`${index + 1}. [${priorityLabel}]`);
      lines.push(`   □ 担当: ＿＿＿＿＿＿`);
      lines.push(`   □ 内容: ${action.action}`);
      lines.push(`   □ 期限: ${deadlineText}`);
      lines.push("");
    });

    if (globalFeedforward.globalInsights) {
      lines.push(`※ ${globalFeedforward.globalInsights}`);
    }

    const text = lines.join("\n");

    try {
      await navigator.clipboard.writeText(text);
      setCopyTooltip("コピーしました");
      setTimeout(() => setCopyTooltip(null), 2000);
    } catch {
      setCopyTooltip("コピーに失敗しました");
      setTimeout(() => setCopyTooltip(null), 2000);
    }
  }, [globalFeedforward]);

  const totalCount = globalFeedforward.actions.length;

  return (
    <div className="feedforward-list">
      <div className="feedforward-list__header-row">
        <div className="feedforward-list__header">
          🎯 次にやること（{totalCount}件）
        </div>
        <button
          type="button"
          className="feedforward-list__copy-btn"
          onClick={handleCopyList}
          title="リストをコピー"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
          </svg>
          {copyTooltip && (
            <span className="feedforward-list__copy-tooltip">{copyTooltip}</span>
          )}
        </button>
      </div>

      {globalFeedforward.globalInsights && (
        <p className="feedforward-list__insight">
          {globalFeedforward.globalInsights}
        </p>
      )}

      <ul className="feedforward-list__items">
        {globalFeedforward.actions.map((action) => {
          const isSelected = selectedActionId === action.id;
          const hasReferences = action.referencedDecisions && action.referencedDecisions.length > 0;
          return (
            <li
              key={action.id}
              className={`feedforward-list__item ${isSelected ? "feedforward-list__item--selected" : ""} ${hasReferences ? "feedforward-list__item--clickable" : ""}`}
              onClick={() => hasReferences && handleActionClick(action)}
              role={hasReferences ? "button" : undefined}
              tabIndex={hasReferences ? 0 : undefined}
              onKeyDown={(e) => {
                if (hasReferences && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  handleActionClick(action);
                }
              }}
            >
              <span className="feedforward-list__priority">
                {getPriorityMarker(action.priority)}
              </span>
              <span className="feedforward-list__text">
                {action.action}
                {action.deadline && (
                  <span className="feedforward-list__deadline">
                    （{action.deadline}）
                  </span>
                )}
              </span>
              {hasReferences && (
                <span className="feedforward-list__link-icon" title="クリックで参照元を表示">
                  🔗
                </span>
              )}
            </li>
          );
        })}
      </ul>

      {globalFeedforward.veteranVoice && (
        <div className="feedforward-list__veteran">
          💬 「{globalFeedforward.veteranVoice.quote}」
          <span className="feedforward-list__veteran-source">
            ─ {globalFeedforward.veteranVoice.quoteSource.speakerRole}
          </span>
        </div>
      )}
    </div>
  );
}
