"use client"
/**
 * ArtifactCardHeader - 成果物カードのヘッダー部品
 *
 * 表示要素:
 * - タイプアイコン（FTA / 議事録 / 意思決定ログ）
 * - タイトル
 * - ステータスバッジ（draft / accepted）
 * - バージョン
 * - 展開トグル
 */

import type { ArtifactType, ArtifactStatus } from "../../types/artifact";

type ArtifactCardHeaderProps = {
  type: ArtifactType;
  title: string;
  status: ArtifactStatus;
  version: number;
  isExpanded: boolean;
  onToggleExpand: () => void;
};

const TYPE_CONFIG: Record<ArtifactType, { icon: string; label: string }> = {
  FTA: { icon: "chart-tree", label: "FTA分析結果" },
  MINUTES: { icon: "clipboard-list", label: "議事録分析結果" },
  DECISION_LOG: { icon: "target", label: "意思決定ログ" },
};

const STATUS_CONFIG: Record<ArtifactStatus, { label: string; className: string }> = {
  draft: { label: "下書き", className: "artifact-card-header__status--draft" },
  accepted: { label: "採用済み", className: "artifact-card-header__status--accepted" },
};

function TypeIcon({ type }: { type: ArtifactType }) {
  switch (type) {
    case "FTA":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M12 3v18M3 9l9-6 9 6M3 15l9 6 9-6" />
        </svg>
      );
    case "MINUTES":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
          <rect x="9" y="3" width="6" height="4" rx="1" />
          <path d="M9 12h6M9 16h6" />
        </svg>
      );
    case "DECISION_LOG":
      return (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="6" />
          <circle cx="12" cy="12" r="2" />
        </svg>
      );
    default:
      return null;
  }
}

function ExpandIcon({ isExpanded }: { isExpanded: boolean }) {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      style={{
        transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)",
        transition: "transform 0.2s ease",
      }}
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

export function ArtifactCardHeader({
  type,
  title,
  status,
  version,
  isExpanded,
  onToggleExpand,
}: ArtifactCardHeaderProps) {
  const typeConfig = TYPE_CONFIG[type];
  const statusConfig = STATUS_CONFIG[status];

  return (
    <div className="artifact-card-header">
      <div className="artifact-card-header__left">
        <span className={`artifact-card-header__type artifact-card-header__type--${type.toLowerCase()}`}>
          <TypeIcon type={type} />
          <span className="artifact-card-header__type-label">{typeConfig.label}</span>
        </span>
        <span className={`artifact-card-header__status ${statusConfig.className}`}>
          {statusConfig.label}
        </span>
        <span className="artifact-card-header__version">v{version}</span>
      </div>

      <div className="artifact-card-header__right">
        <button
          className="artifact-card-header__toggle"
          onClick={onToggleExpand}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? "折りたたむ" : "展開する"}
        >
          <ExpandIcon isExpanded={isExpanded} />
        </button>
      </div>

      <div className="artifact-card-header__title">{title}</div>
    </div>
  );
}
