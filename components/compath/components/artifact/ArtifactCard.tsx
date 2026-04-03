"use client"
/**
 * ArtifactCard - 成果物の統一カードコンポーネント
 *
 * チャット内に表示される成果物カード。
 * タイプに応じて適切なBodyコンポーネントを表示し、
 * 採用/修正/詳細ボタンで操作可能。
 */

import { useState } from "react";
import type {
  Artifact,
  ArtifactType,
  FTAContent,
  MinutesContent,
  DecisionLogContent,
} from "../../types/artifact";
import { ArtifactCardHeader } from "./ArtifactCardHeader";
import { ArtifactCardFooter } from "./ArtifactCardFooter";
import { FTACardBody } from "./FTACardBody";
import { MinutesCardBody } from "./MinutesCardBody";
import { DecisionLogCardBody } from "./DecisionLogCardBody";

type ArtifactCardProps = {
  artifact: Artifact;
  onAccept?: () => void;
  onRevise?: (instruction: string) => void;
  onOpenDetail?: () => void;
  detailButtonLabel?: string;
  defaultExpanded?: boolean;
};

// 型ガード関数
function isFTAContent(
  content: Artifact["content"],
  type: ArtifactType
): content is FTAContent {
  return type === "FTA";
}

function isMinutesContent(
  content: Artifact["content"],
  type: ArtifactType
): content is MinutesContent {
  return type === "MINUTES";
}

function isDecisionLogContent(
  content: Artifact["content"],
  type: ArtifactType
): content is DecisionLogContent {
  return type === "DECISION_LOG";
}

export function ArtifactCard({
  artifact,
  onAccept,
  onRevise,
  onOpenDetail,
  detailButtonLabel,
  defaultExpanded = false,
}: ArtifactCardProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const { type, title, status, version, summary, content, missing } = artifact;

  const handleToggleExpand = () => {
    setIsExpanded((prev) => !prev);
  };

  // タイプ別のBody描画
  const renderBody = () => {
    if (isFTAContent(content, type)) {
      return (
        <FTACardBody
          content={content}
          summary={summary}
          missing={missing}
          isExpanded={isExpanded}
        />
      );
    }

    if (isMinutesContent(content, type)) {
      return (
        <MinutesCardBody
          content={content}
          summary={summary}
          missing={missing}
          isExpanded={isExpanded}
        />
      );
    }

    if (isDecisionLogContent(content, type)) {
      return (
        <DecisionLogCardBody
          content={content}
          summary={summary}
          missing={missing}
          isExpanded={isExpanded}
        />
      );
    }

    // フォールバック
    return (
      <div className="artifact-card-body">
        <p>{summary}</p>
      </div>
    );
  };

  // 詳細ボタンのラベル
  const getDetailLabel = () => {
    if (detailButtonLabel) return detailButtonLabel;
    switch (type) {
      case "FTA":
        return "グラフを開く";
      case "MINUTES":
        return "詳細を開く";
      case "DECISION_LOG":
        return "ナビで開く";
      default:
        return "詳細を開く";
    }
  };

  return (
    <div
      className={`artifact-card artifact-card--${type.toLowerCase()} artifact-card--${status}`}
    >
      <ArtifactCardHeader
        type={type}
        title={title}
        status={status}
        version={version}
        isExpanded={isExpanded}
        onToggleExpand={handleToggleExpand}
      />

      {renderBody()}

      <ArtifactCardFooter
        status={status}
        onAccept={onAccept}
        onRevise={onRevise}
        onOpenDetail={onOpenDetail}
        detailButtonLabel={getDetailLabel()}
      />
    </div>
  );
}

// indexからのre-export用
export { ArtifactCardHeader } from "./ArtifactCardHeader";
export { ArtifactCardFooter } from "./ArtifactCardFooter";
export { FTACardBody } from "./FTACardBody";
export { MinutesCardBody } from "./MinutesCardBody";
export { DecisionLogCardBody } from "./DecisionLogCardBody";
