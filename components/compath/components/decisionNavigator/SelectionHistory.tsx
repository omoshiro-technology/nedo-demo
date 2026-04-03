"use client"
import { useState } from "react";
import type {
  SelectionHistoryEntry,
  DecisionLevel,
  PendingSelection,
} from "../../types/decisionNavigator";

type SelectionHistoryProps = {
  history: SelectionHistoryEntry[];
  pendingSelection?: PendingSelection;
  onJumpTo: (index: number) => void;
  onUndo: () => void;
  onConfirm: (summary?: string) => void;
};

const LEVEL_LABELS: Record<DecisionLevel, string> = {
  strategy: "大方針",
  tactic: "戦術",
  action: "アクション",
  "sub-action": "詳細アクション",
  followup: "フォローアップ",
};

export function SelectionHistory({
  history,
  pendingSelection,
  onJumpTo,
  onUndo,
  onConfirm,
}: SelectionHistoryProps) {
  const [summaryInput, setSummaryInput] = useState("");
  const [isConfirming, setIsConfirming] = useState(false);

  const handleConfirm = async () => {
    setIsConfirming(true);
    try {
      await onConfirm(summaryInput.trim() || undefined);
      setSummaryInput("");
    } finally {
      setIsConfirming(false);
    }
  };

  // スタートノードを除いた履歴（決定記録として表示するもの）
  const confirmedHistory = history.filter((_, index) => index > 0);

  return (
    <div className="dn-history">
      {/* 目的セクション */}
      {history.length > 0 && (
        <div className="dn-history__purpose">
          <div className="dn-history__purpose-label">目的</div>
          <div className="dn-history__purpose-text">
            {history[0]?.nodeLabel}
          </div>
        </div>
      )}

      {/* 決定記録ヘッダー */}
      <div className="dn-history__header">
        <h3>決定記録</h3>
        {confirmedHistory.length > 0 && (
          <button
            type="button"
            className="dn-history__undo-btn"
            onClick={onUndo}
            title="前の決定を取り消す"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M3 7v6h6" />
              <path d="M3 13a9 9 0 1 0 2.6-6.4L3 7" />
            </svg>
            取消
          </button>
        )}
      </div>

      {/* 確定済み履歴 */}
      {confirmedHistory.length === 0 && !pendingSelection && (
        <div className="dn-history__empty">
          <p>決定記録はまだありません</p>
          <p className="dn-history__empty-hint">
            選択肢を選んで確定すると記録されます
          </p>
        </div>
      )}

      {confirmedHistory.length > 0 && (
        <div className="dn-history__list">
          {confirmedHistory.map((entry, index) => (
            <div key={entry.id} className="dn-history__item">
              <div className="dn-history__connector">
                <div className="dn-history__dot dn-history__dot--confirmed" />
                {(index < confirmedHistory.length - 1 || pendingSelection) && (
                  <div className="dn-history__line" />
                )}
              </div>
              <div className="dn-history__content">
                <button
                  type="button"
                  className="dn-history__label-btn"
                  onClick={() => onJumpTo(index + 1)}
                >
                  <span className="dn-history__index">{index + 1}</span>
                  <span className="dn-history__summary">
                    {entry.summary || entry.nodeLabel}
                  </span>
                </button>
                <div className="dn-history__meta">
                  <span className="dn-history__level">
                    {LEVEL_LABELS[entry.level]}
                  </span>
                  <span className="dn-history__time">
                    {new Date(entry.confirmedAt || entry.selectedAt).toLocaleTimeString(
                      "ja-JP",
                      {
                        hour: "2-digit",
                        minute: "2-digit",
                      }
                    )}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 確定待ちの選択 */}
      {pendingSelection && (
        <div className="dn-history__pending">
          <div className="dn-history__pending-header">
            <div className="dn-history__connector">
              <div className="dn-history__dot dn-history__dot--pending" />
            </div>
            <span className="dn-history__pending-label">現在の選択</span>
          </div>

          <div className="dn-history__pending-content">
            <div className="dn-history__pending-node">
              {pendingSelection.nodeLabel}
            </div>

            <div className="dn-history__pending-input">
              <label htmlFor="summary-input">決定サマリー（任意）</label>
              <input
                id="summary-input"
                type="text"
                value={summaryInput}
                onChange={(e) => setSummaryInput(e.target.value)}
                placeholder="例：納期延長で対応する"
                disabled={isConfirming}
              />
            </div>

            <div className="dn-history__pending-actions">
              <button
                type="button"
                className="dn-history__confirm-btn"
                onClick={handleConfirm}
                disabled={isConfirming}
              >
                {isConfirming ? "確定中..." : "この内容で確定"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
