"use client"
/**
 * ProactiveWarningBanner
 *
 * Sentinel Agent のプロアクティブ警告表示
 * - ユーザーが選択する前に重要な警告を自動表示
 * - QCDES観点からの見落とし警告
 * - 過去事例からの教訓
 */

import { useState, useEffect, useCallback } from "react";
import type { OverlookedWarning } from "../../../types/decisionNavigator";
import "./ProactiveWarningBanner.css";

type ProactiveWarningBannerProps = {
  sessionId: string;
  currentNodeId?: string;
  purpose?: string;
  warnings: OverlookedWarning[];
  onAcknowledge?: (warningId: string) => void;
  onDismiss?: (warningId: string) => void;
  onViewDetails?: (warning: OverlookedWarning) => void;
  isLoading?: boolean;
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
    className: "pwb-warning--critical",
  },
  high: {
    icon: "M12 2L1 21h22L12 2zm1 14h-2v2h2v-2zm0-8h-2v6h2V8z",
    label: "重要",
    className: "pwb-warning--high",
  },
  medium: {
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z",
    label: "注意",
    className: "pwb-warning--medium",
  },
  low: {
    icon: "M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z",
    label: "参考",
    className: "pwb-warning--low",
  },
};

/** QCDES カテゴリのラベル */
const QCDES_LABELS: Record<string, string> = {
  quality: "品質",
  cost: "コスト",
  delivery: "納期",
  environment: "環境",
  safety: "安全",
};

export function ProactiveWarningBanner({
  sessionId,
  currentNodeId,
  purpose,
  warnings,
  onAcknowledge,
  onDismiss,
  onViewDetails,
  isLoading = false,
}: ProactiveWarningBannerProps) {
  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);

  // 表示する警告をフィルタリング（dismissed を除外）
  const visibleWarnings = warnings.filter((w) => !dismissedIds.has(w.viewpoint));

  // 重要度でソート（critical > high > medium > low）
  const sortedWarnings = [...visibleWarnings].sort((a, b) => {
    const order = { critical: 0, high: 1, medium: 2, low: 3 };
    return (order[a.severity] ?? 4) - (order[b.severity] ?? 4);
  });

  // 表示する警告数を制限（showAll でなければ最大3件）
  const displayWarnings = showAll ? sortedWarnings : sortedWarnings.slice(0, 3);
  const hasMore = sortedWarnings.length > 3;

  // 警告を確認済みにする
  const handleAcknowledge = useCallback((warningId: string) => {
    onAcknowledge?.(warningId);
    setDismissedIds((prev) => new Set(prev).add(warningId));
  }, [onAcknowledge]);

  // 警告を閉じる
  const handleDismiss = useCallback((warningId: string) => {
    onDismiss?.(warningId);
    setDismissedIds((prev) => new Set(prev).add(warningId));
  }, [onDismiss]);

  // 詳細を表示/非表示
  const toggleExpand = useCallback((warningId: string) => {
    setExpandedId((prev) => (prev === warningId ? null : warningId));
  }, []);

  // ノードが変わったらexpandedIdをリセット
  useEffect(() => {
    setExpandedId(null);
  }, [currentNodeId]);

  // 表示する警告がない場合
  if (visibleWarnings.length === 0 && !isLoading) {
    return null;
  }

  // 重要度別の件数
  const countBySeverity = {
    critical: visibleWarnings.filter((w) => w.severity === "critical").length,
    high: visibleWarnings.filter((w) => w.severity === "high").length,
    medium: visibleWarnings.filter((w) => w.severity === "medium").length,
    low: visibleWarnings.filter((w) => w.severity === "low").length,
  };

  return (
    <div className="pwb-container" role="alert" aria-live="polite">
      {/* ヘッダー */}
      <div className="pwb-header">
        <div className="pwb-header__left">
          <span className="pwb-header__icon">🛡️</span>
          <span className="pwb-header__title">Sentinel Agent</span>
          <span className="pwb-header__subtitle">見落とし警告</span>
        </div>
        <div className="pwb-header__stats">
          {countBySeverity.critical > 0 && (
            <span className="pwb-stat pwb-stat--critical">
              緊急 {countBySeverity.critical}
            </span>
          )}
          {countBySeverity.high > 0 && (
            <span className="pwb-stat pwb-stat--high">
              重要 {countBySeverity.high}
            </span>
          )}
          {countBySeverity.medium + countBySeverity.low > 0 && (
            <span className="pwb-stat pwb-stat--other">
              その他 {countBySeverity.medium + countBySeverity.low}
            </span>
          )}
        </div>
      </div>

      {/* ローディング */}
      {isLoading && (
        <div className="pwb-loading">
          <div className="pwb-loading__spinner" />
          <span>警告を分析中...</span>
        </div>
      )}

      {/* 警告リスト */}
      <div className="pwb-warnings">
        {displayWarnings.map((warning) => {
          const config = SEVERITY_CONFIG[warning.severity] || SEVERITY_CONFIG.medium;
          const isExpanded = expandedId === warning.viewpoint;
          const qcdesLabel = QCDES_LABELS[warning.viewpoint.toLowerCase()] || warning.viewpoint;

          return (
            <div
              key={warning.viewpoint}
              className={`pwb-warning ${config.className} ${isExpanded ? "pwb-warning--expanded" : ""}`}
            >
              {/* 警告ヘッダー */}
              <div className="pwb-warning__header">
                <div className="pwb-warning__header-left">
                  <svg
                    className="pwb-warning__icon"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                  >
                    <path d={config.icon} />
                  </svg>
                  <span className="pwb-warning__category">
                    {qcdesLabel}
                  </span>
                  <span className="pwb-warning__severity">
                    {config.label}
                  </span>
                </div>
                <div className="pwb-warning__actions">
                  <button
                    className="pwb-warning__btn pwb-warning__btn--expand"
                    onClick={() => toggleExpand(warning.viewpoint)}
                    aria-label={isExpanded ? "閉じる" : "詳細を見る"}
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      style={{ transform: isExpanded ? "rotate(180deg)" : "none" }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  <button
                    className="pwb-warning__btn pwb-warning__btn--dismiss"
                    onClick={() => handleDismiss(warning.viewpoint)}
                    aria-label="閉じる"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* 警告内容 */}
              <div className="pwb-warning__body">
                <p className="pwb-warning__risk">{warning.risk}</p>
                {warning.suggestion && (
                  <p className="pwb-warning__suggestion">{warning.suggestion}</p>
                )}
              </div>

              {/* 展開時の詳細 */}
              {isExpanded && warning.checklist && warning.checklist.length > 0 && (
                <div className="pwb-warning__details">
                  <p className="pwb-warning__checklist-title">確認事項:</p>
                  <ul className="pwb-warning__checklist">
                    {warning.checklist.map((item, index) => (
                      <li key={index} className="pwb-warning__checklist-item">
                        <span className="pwb-warning__checklist-bullet">•</span>
                        <span>{item.item}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="pwb-warning__footer">
                    <button
                      className="pwb-warning__btn pwb-warning__btn--acknowledge"
                      onClick={() => handleAcknowledge(warning.viewpoint)}
                    >
                      確認済み
                    </button>
                    {onViewDetails && (
                      <button
                        className="pwb-warning__btn pwb-warning__btn--details"
                        onClick={() => onViewDetails(warning)}
                      >
                        詳細を見る
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* もっと見る */}
      {hasMore && (
        <button
          className="pwb-show-more"
          onClick={() => setShowAll(!showAll)}
        >
          {showAll ? "折りたたむ" : `他 ${sortedWarnings.length - 3} 件を表示`}
        </button>
      )}
    </div>
  );
}
