"use client"
/**
 * ActionsLog: エージェントの実行ログを表示するコンポーネント
 *
 * 最新5件のアクションをリアルタイム表示し、「何をしているか」を可視化
 */

import {
  type ActionLogEntry,
  ACTION_TYPE_LABELS,
} from "../../types/agent";

type ActionsLogProps = {
  actions: ActionLogEntry[];
  maxItems?: number;
  className?: string;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
};

export function ActionsLog({
  actions,
  maxItems = 5,
  className = "",
  collapsed = false,
  onToggleCollapse,
}: ActionsLogProps) {
  // 最新のアクションを上に表示（最大maxItems件）
  const displayActions = actions.slice(-maxItems).reverse();

  if (displayActions.length === 0) {
    return null;
  }

  return (
    <div className={`actions-log ${className} ${collapsed ? "actions-log--collapsed" : ""}`}>
      {/* ヘッダー */}
      <div className="actions-log__header" onClick={onToggleCollapse}>
        <span className="actions-log__title">
          <LogIcon />
          実行ログ
        </span>
        <span className="actions-log__count">
          {actions.length}件
        </span>
        {onToggleCollapse && (
          <span className={`actions-log__toggle ${collapsed ? "actions-log__toggle--collapsed" : ""}`}>
            <ChevronIcon />
          </span>
        )}
      </div>

      {/* ログリスト */}
      {!collapsed && (
        <div className="actions-log__list">
          {displayActions.map((action, index) => (
            <ActionLogItem
              key={action.id}
              action={action}
              isLatest={index === 0}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// =============================================================================
// ActionLogItem: 個別のログエントリ
// =============================================================================

type ActionLogItemProps = {
  action: ActionLogEntry;
  isLatest: boolean;
};

function ActionLogItem({ action, isLatest }: ActionLogItemProps) {
  const timestamp = new Date(action.timestamp);
  const timeStr = timestamp.toLocaleTimeString("ja-JP", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div
      className={`actions-log__item actions-log__item--${action.result} ${isLatest ? "actions-log__item--latest" : ""}`}
    >
      {/* タイムスタンプ */}
      <span className="actions-log__time">{timeStr}</span>

      {/* 結果アイコン */}
      <span className={`actions-log__result actions-log__result--${action.result}`}>
        {action.result === "ok" && <OkIcon />}
        {action.result === "warn" && <WarnIcon />}
        {action.result === "fail" && <FailIcon />}
      </span>

      {/* アクションタイプ */}
      <span className="actions-log__type">
        {ACTION_TYPE_LABELS[action.actionType]}
      </span>

      {/* メッセージ */}
      <span className="actions-log__message" title={action.message}>
        {action.message}
      </span>

      {/* エラー詳細（失敗時のみ） */}
      {action.result === "fail" && action.errorDetail && (
        <span className="actions-log__error" title={action.errorDetail}>
          {action.errorDetail}
        </span>
      )}
    </div>
  );
}

// =============================================================================
// アイコンコンポーネント
// =============================================================================

function LogIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function ChevronIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

function OkIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function FailIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}
