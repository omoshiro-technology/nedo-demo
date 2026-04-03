"use client"
/**
 * 実行計画パネル
 * - 選択完了後に表示
 * - 実行計画アイテムのリスト表示
 * - 各アイテムのステータス切り替え
 * - リスクと対策の表示
 * - 進捗バー
 */

import { useState, useMemo } from "react";
import type {
  ExecutionPlan,
  ExecutionPlanItem,
  ExecutionItemStatus,
} from "../../types/decisionNavigator";

type ExecutionPlanPanelProps = {
  plan: ExecutionPlan;
  onUpdateItemStatus: (itemId: string, status: ExecutionItemStatus) => Promise<void>;
  onRegenerate: () => Promise<void>;
  isLoading?: boolean;
};

const PRIORITY_LABELS: Record<ExecutionPlanItem["priority"], string> = {
  high: "高",
  medium: "中",
  low: "低",
};

const PRIORITY_COLORS: Record<ExecutionPlanItem["priority"], string> = {
  high: "ep-priority--high",
  medium: "ep-priority--medium",
  low: "ep-priority--low",
};

const STATUS_LABELS: Record<ExecutionItemStatus, string> = {
  pending: "未着手",
  in_progress: "進行中",
  completed: "完了",
};

export function ExecutionPlanPanel({
  plan,
  onUpdateItemStatus,
  onRegenerate,
  isLoading = false,
}: ExecutionPlanPanelProps) {
  const [expandedRisks, setExpandedRisks] = useState(false);
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);

  // 進捗計算
  const progress = useMemo(() => {
    const completed = plan.items.filter((i) => i.status === "completed").length;
    const total = plan.items.length;
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [plan.items]);

  // ステータス更新ハンドラ
  const handleStatusChange = async (itemId: string, status: ExecutionItemStatus) => {
    setUpdatingItemId(itemId);
    try {
      await onUpdateItemStatus(itemId, status);
    } finally {
      setUpdatingItemId(null);
    }
  };

  // 次のステータスを取得
  const getNextStatus = (current: ExecutionItemStatus): ExecutionItemStatus => {
    switch (current) {
      case "pending":
        return "in_progress";
      case "in_progress":
        return "completed";
      case "completed":
        return "pending";
    }
  };

  return (
    <div className="ep-panel">
      {/* ヘッダー */}
      <div className="ep-header">
        <div className="ep-header__title">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M9 11l3 3L22 4" />
            <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
          </svg>
          <h3>実行計画</h3>
        </div>
        <button
          type="button"
          className="ep-header__regenerate"
          onClick={onRegenerate}
          disabled={isLoading}
          title="実行計画を再生成"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M23 4v6h-6" />
            <path d="M1 20v-6h6" />
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
          </svg>
        </button>
      </div>

      {/* サマリー */}
      <div className="ep-summary">
        <p>{plan.summary}</p>
      </div>

      {/* 進捗バー */}
      <div className="ep-progress">
        <div className="ep-progress__bar">
          <div
            className="ep-progress__fill"
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="ep-progress__label">
          {plan.items.filter((i) => i.status === "completed").length} / {plan.items.length} 完了
          <span className="ep-progress__percent">({progress}%)</span>
        </div>
      </div>

      {/* タスクリスト */}
      <div className="ep-items">
        {plan.items.map((item) => (
          <div
            key={item.id}
            className={`ep-item ${item.status === "completed" ? "ep-item--completed" : ""}`}
          >
            <button
              type="button"
              className={`ep-item__checkbox ${item.status === "completed" ? "ep-item__checkbox--checked" : ""} ${item.status === "in_progress" ? "ep-item__checkbox--progress" : ""}`}
              onClick={() => handleStatusChange(item.id, getNextStatus(item.status))}
              disabled={isLoading || updatingItemId === item.id}
              title={`ステータス: ${STATUS_LABELS[item.status]}`}
            >
              {updatingItemId === item.id ? (
                <span className="ep-item__spinner" />
              ) : item.status === "completed" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              ) : item.status === "in_progress" ? (
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <polyline points="12 6 12 12 16 14" />
                </svg>
              ) : (
                <span className="ep-item__empty" />
              )}
            </button>

            <div className="ep-item__content">
              <div className="ep-item__header">
                <span className="ep-item__order">{item.order}</span>
                <span className="ep-item__title">{item.title}</span>
                <span className={`ep-priority ${PRIORITY_COLORS[item.priority]}`}>
                  {PRIORITY_LABELS[item.priority]}
                </span>
              </div>
              <p className="ep-item__description">{item.description}</p>
              {item.estimatedDuration && (
                <span className="ep-item__duration">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="10" />
                    <polyline points="12 6 12 12 16 14" />
                  </svg>
                  {item.estimatedDuration}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* リスクセクション */}
      {plan.risks.length > 0 && (
        <div className="ep-risks">
          <button
            type="button"
            className="ep-risks__toggle"
            onClick={() => setExpandedRisks(!expandedRisks)}
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              className={expandedRisks ? "ep-risks__chevron--open" : ""}
            >
              <polyline points="6 9 12 15 18 9" />
            </svg>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            リスクと対策 ({plan.risks.length})
          </button>

          {expandedRisks && (
            <div className="ep-risks__list">
              {plan.risks.map((risk, index) => (
                <div key={index} className="ep-risk">
                  <div className="ep-risk__description">
                    <strong>リスク:</strong> {risk.description}
                  </div>
                  <div className="ep-risk__mitigation">
                    <strong>対策:</strong> {risk.mitigation}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className="ep-loading">
          <span className="ep-loading__spinner" />
          <span>処理中...</span>
        </div>
      )}
    </div>
  );
}
