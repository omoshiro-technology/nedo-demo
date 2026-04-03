"use client"
/**
 * SentinelWarningModal
 *
 * Sentinel Agent の警告をポップアップモーダルで表示
 * - 画面を埋め尽くさない中央配置のモーダル
 * - 警告をリストで表示（展開可能）
 * - 一括で確認済みにできる
 */

import { useState, useCallback } from "react";
import type { OverlookedWarning } from "../../../types/decisionNavigator";
import "./SentinelWarningModal.css";

type SentinelWarningModalProps = {
  isOpen: boolean;
  warnings: OverlookedWarning[];
  onClose: () => void;
  onAcknowledge?: (viewpoint: string) => void;
  onAcknowledgeAll?: () => void;
};

/** 重要度のスタイル */
const SEVERITY_CONFIG: Record<string, {
  icon: string;
  label: string;
  className: string;
}> = {
  critical: {
    icon: "M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z",
    label: "緊急",
    className: "swm-item--critical",
  },
  high: {
    icon: "M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z",
    label: "重要",
    className: "swm-item--high",
  },
  medium: {
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    label: "注意",
    className: "swm-item--medium",
  },
  low: {
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    label: "参考",
    className: "swm-item--low",
  },
};

export function SentinelWarningModal({
  isOpen,
  warnings,
  onClose,
  onAcknowledge,
  onAcknowledgeAll,
}: SentinelWarningModalProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleToggleExpand = useCallback((viewpoint: string) => {
    setExpandedId((prev) => (prev === viewpoint ? null : viewpoint));
  }, []);

  const handleAcknowledge = useCallback((viewpoint: string) => {
    onAcknowledge?.(viewpoint);
  }, [onAcknowledge]);

  const handleAcknowledgeAll = useCallback(() => {
    onAcknowledgeAll?.();
    onClose();
  }, [onAcknowledgeAll, onClose]);

  if (!isOpen || warnings.length === 0) {
    return null;
  }

  // 重要度でソート（critical > high > medium > low）
  const sortedWarnings = [...warnings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  // 重要度別の件数
  const countBySeverity = {
    critical: warnings.filter((w) => w.severity === "critical").length,
    high: warnings.filter((w) => w.severity === "high").length,
    medium: warnings.filter((w) => w.severity === "medium").length,
    low: warnings.filter((w) => w.severity === "low").length,
  };

  return (
    <div className="swm-overlay" onClick={onClose}>
      <div className="swm-modal" onClick={(e) => e.stopPropagation()}>
        {/* ヘッダー */}
        <div className="swm-header">
          <div className="swm-header__left">
            <span className="swm-header__icon">🛡️</span>
            <span className="swm-header__title">Sentinel Agent</span>
          </div>
          <div className="swm-header__stats">
            {countBySeverity.critical > 0 && (
              <span className="swm-stat swm-stat--critical">
                緊急 {countBySeverity.critical}
              </span>
            )}
            {countBySeverity.high > 0 && (
              <span className="swm-stat swm-stat--high">
                重要 {countBySeverity.high}
              </span>
            )}
            {(countBySeverity.medium > 0 || countBySeverity.low > 0) && (
              <span className="swm-stat swm-stat--other">
                その他 {countBySeverity.medium + countBySeverity.low}
              </span>
            )}
          </div>
          <button className="swm-close-btn" onClick={onClose} aria-label="閉じる">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 説明 */}
        <p className="swm-description">
          以下の観点を見落としている可能性があります。確認してください。
        </p>

        {/* 警告リスト */}
        <div className="swm-list">
          {sortedWarnings.map((warning) => {
            const config = SEVERITY_CONFIG[warning.severity] || SEVERITY_CONFIG.medium;
            const isExpanded = expandedId === warning.viewpoint;

            return (
              <div
                key={warning.viewpoint}
                className={`swm-item ${config.className} ${isExpanded ? "swm-item--expanded" : ""}`}
              >
                <div
                  className="swm-item__header"
                  onClick={() => handleToggleExpand(warning.viewpoint)}
                >
                  <div className="swm-item__header-left">
                    <svg
                      className="swm-item__icon"
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d={config.icon} />
                    </svg>
                    <span className="swm-item__viewpoint">{warning.viewpoint}</span>
                    <span className="swm-item__severity">{config.label}</span>
                  </div>
                  <svg
                    className={`swm-item__expand-icon ${isExpanded ? "swm-item__expand-icon--expanded" : ""}`}
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <polyline points="6 9 12 15 18 9" />
                  </svg>
                </div>

                <div className="swm-item__body">
                  <p className="swm-item__risk">{warning.risk}</p>
                  {warning.suggestion && (
                    <p className="swm-item__suggestion">{warning.suggestion}</p>
                  )}
                </div>

                {/* 展開時の詳細 */}
                {isExpanded && warning.checklist && warning.checklist.length > 0 && (
                  <div className="swm-item__details">
                    <p className="swm-item__checklist-title">確認事項:</p>
                    <ul className="swm-item__checklist">
                      {warning.checklist.map((item, index) => (
                        <li key={index} className="swm-item__checklist-item">
                          <span className="swm-item__checklist-bullet">•</span>
                          <span>{item.item}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      className="swm-item__acknowledge-btn"
                      onClick={() => handleAcknowledge(warning.viewpoint)}
                    >
                      この項目を確認済みにする
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* フッター */}
        <div className="swm-footer">
          <button className="swm-btn swm-btn--secondary" onClick={onClose}>
            後で確認
          </button>
          <button className="swm-btn swm-btn--primary" onClick={handleAcknowledgeAll}>
            すべて確認済み
          </button>
        </div>
      </div>
    </div>
  );
}
