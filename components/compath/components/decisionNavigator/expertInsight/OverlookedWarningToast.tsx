"use client"
/**
 * OverlookedWarningToast
 *
 * 見落としやすい観点をトースト形式で警告表示
 * - 若手が見落としやすい観点を事前に提示
 * - チェックリストで確認を促す
 */

import { useState, useEffect } from "react";
import type { OverlookedWarning } from "../../../types/decisionNavigator";

type OverlookedWarningToastProps = {
  warnings: OverlookedWarning[];
  onDismiss?: (viewpoint: string) => void;
  onCheckItem?: (viewpoint: string, itemIndex: number, checked: boolean) => void;
  autoHideDelay?: number; // ミリ秒、0で自動非表示なし
  position?: "top-right" | "top-left" | "bottom-right" | "bottom-left";
};

/** 重要度のスタイル */
const SEVERITY_STYLES: Record<string, { className: string; icon: string }> = {
  critical: {
    className: "owt--critical",
    icon: "M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z",
  },
  high: {
    className: "owt--high",
    icon: "M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z",
  },
  medium: {
    className: "owt--medium",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
  },
  low: {
    className: "owt--low",
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
  },
};

/** 警告ごとのユニークキーを生成 */
function getWarningKey(warning: OverlookedWarning, index: number): string {
  return `${warning.viewpoint}-${warning.risk.slice(0, 20)}-${index}`;
}

export function OverlookedWarningToast({
  warnings,
  onDismiss,
  onCheckItem,
  autoHideDelay = 0,
  position = "top-right",
}: OverlookedWarningToastProps) {
  // インデックス付きでユニークキーを管理
  const [visibleWarningKeys, setVisibleWarningKeys] = useState<Set<string>>(
    new Set(warnings.map((w, i) => getWarningKey(w, i)))
  );
  const [expandedWarningKeys, setExpandedWarningKeys] = useState<Set<string>>(new Set());
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean[]>>({});

  // 新しい警告が追加されたら表示
  useEffect(() => {
    const newKeys = warnings
      .map((w, i) => getWarningKey(w, i))
      .filter((key) => !visibleWarningKeys.has(key));
    if (newKeys.length > 0) {
      setVisibleWarningKeys((prev) => {
        const next = new Set(prev);
        newKeys.forEach((key) => next.add(key));
        return next;
      });
    }
  }, [warnings]);

  // 自動非表示（重要度がlow/mediumの場合のみ）
  useEffect(() => {
    if (autoHideDelay <= 0) return;

    const timers: NodeJS.Timeout[] = [];
    warnings.forEach((warning, index) => {
      if (warning.severity === "low" || warning.severity === "medium") {
        const key = getWarningKey(warning, index);
        const timer = setTimeout(() => {
          handleDismiss(key, warning.viewpoint);
        }, autoHideDelay);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach((timer) => clearTimeout(timer));
    };
  }, [warnings, autoHideDelay]);

  const handleDismiss = (key: string, viewpoint: string) => {
    setVisibleWarningKeys((prev) => {
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
    onDismiss?.(viewpoint);
  };

  const handleToggleExpand = (key: string) => {
    setExpandedWarningKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  };

  const handleCheckItem = (key: string, viewpoint: string, itemIndex: number, checked: boolean) => {
    setCheckedItems((prev) => {
      const items = prev[key] || [];
      const next = [...items];
      next[itemIndex] = checked;
      return { ...prev, [key]: next };
    });
    onCheckItem?.(viewpoint, itemIndex, checked);
  };

  // インデックス付きでフィルタリング
  const visibleWarningsWithKeys = warnings
    .map((w, i) => ({ warning: w, key: getWarningKey(w, i) }))
    .filter(({ key }) => visibleWarningKeys.has(key));

  if (visibleWarningsWithKeys.length === 0) {
    return null;
  }

  return (
    <div className={`owt-container owt-container--${position}`}>
      {visibleWarningsWithKeys.map(({ warning, key }) => {
        const severityStyle = SEVERITY_STYLES[warning.severity] || SEVERITY_STYLES.medium;
        const isExpanded = expandedWarningKeys.has(key);
        const itemChecks = checkedItems[key] || [];

        return (
          <div
            key={key}
            className={`owt ${severityStyle.className}`}
            role="alert"
          >
            {/* ヘッダー */}
            <div className="owt__header">
              <div className="owt__header-left">
                <svg
                  className="owt__icon"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d={severityStyle.icon} />
                </svg>
                <span className="owt__title">見落とし注意</span>
              </div>
              <button
                className="owt__close-btn"
                onClick={() => handleDismiss(key, warning.viewpoint)}
                aria-label="閉じる"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* コンテンツ */}
            <div className="owt__content">
              <p className="owt__viewpoint">{warning.viewpoint}</p>
              <p className="owt__risk">{warning.risk}</p>
              <p className="owt__suggestion">{warning.suggestion}</p>
            </div>

            {/* チェックリスト（存在する場合） */}
            {warning.checklist && warning.checklist.length > 0 && (
              <>
                <button
                  className="owt__expand-btn"
                  onClick={() => handleToggleExpand(key)}
                >
                  <span>確認チェックリスト ({warning.checklist.length}項目)</span>
                  <svg
                    className={`owt__expand-icon ${isExpanded ? "owt__expand-icon--expanded" : ""}`}
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </button>

                {isExpanded && (
                  <ul className="owt__checklist">
                    {warning.checklist.map((item, index) => (
                      <li key={index} className="owt__checklist-item">
                        <label className="owt__checklist-label">
                          <input
                            type="checkbox"
                            className="owt__checkbox"
                            checked={itemChecks[index] || false}
                            onChange={(e) =>
                              handleCheckItem(key, warning.viewpoint, index, e.target.checked)
                            }
                          />
                          <span className="owt__checklist-text">{item.item}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}

            {/* 進捗バー（チェックリストがある場合） */}
            {warning.checklist && warning.checklist.length > 0 && (
              <div className="owt__progress">
                <div
                  className="owt__progress-bar"
                  style={{
                    width: `${(itemChecks.filter(Boolean).length / warning.checklist.length) * 100}%`,
                  }}
                />
                <span className="owt__progress-text">
                  {itemChecks.filter(Boolean).length} / {warning.checklist.length} 確認済み
                </span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
