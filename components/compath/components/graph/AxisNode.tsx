"use client"
/**
 * グラフノードコンポーネント
 */

import { Handle, Position, type NodeProps } from "reactflow";
import type { NodeConfidenceTag } from "../../types";
import type { AxisNodeData } from "./types";

/** 確信度タグのラベルと色 */
const CONFIDENCE_TAG_CONFIG: Record<NodeConfidenceTag, { label: string; className: string }> = {
  confirmed: { label: "確定", className: "confidence-badge--confirmed" },
  estimated: { label: "推定", className: "confidence-badge--estimated" },
  unknown: { label: "不明", className: "confidence-badge--unknown" }
};

export function AxisNode({ data, selected }: NodeProps<AxisNodeData>) {
  const isLowConfidence = data.confidence !== undefined && data.confidence < 50;
  const tagConfig = data.tags?.confidenceTag ? CONFIDENCE_TAG_CONFIG[data.tags.confidenceTag] : null;

  return (
    <div className="axis-node-wrapper">
      {/* 左側は終点専用（受け側） */}
      <Handle type="target" position={Position.Left} isConnectable />
      <div
        className={`axis-node ${data.isPlaceholder ? "is-placeholder" : ""} ${
          data.status === "missing" ? "is-missing" : ""
        } ${data.chatSource === "fact" ? "is-chat-fact" : ""} ${
          data.chatSource === "speculative" ? "is-chat-speculative" : ""
        } ${selected ? "is-selected" : ""} ${isLowConfidence ? "is-low-confidence" : ""}`}
        title={data.fullLabel + (isLowConfidence ? " (参考)" : "") + (data.tags?.reason ? ` - ${data.tags.reason}` : "")}
      >
        {isLowConfidence && <span className="axis-node__badge">参考</span>}
        <div className="axis-node__level">{data.levelLabel}</div>
        <div className="axis-node__label">{data.label}</div>
        {/* 確信度タグバッジ */}
        {tagConfig && (
          <div className={`confidence-badge ${tagConfig.className}`}>
            {tagConfig.label}
          </div>
        )}
      </div>
      {/* 右側は始点専用（出し側） */}
      <Handle type="source" position={Position.Right} isConnectable />
    </div>
  );
}

export const nodeTypes = {
  axisNode: AxisNode
};
