"use client"
/**
 * PathStepNode - パスステップノード
 * Phase 31: 評価軸スパイン + パスレーン構造
 *
 * パス内の各ステップを表示
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

type PathStepNodeData = {
  label: string;
  description?: string;
  pathId: string;
  pathColor: string;
  stepIndex: number;
  isSelected?: boolean;
  isDimmed?: boolean;
};

function PathStepNodeComponent({ data }: NodeProps<PathStepNodeData>) {
  const { label, description, pathColor, isSelected, isDimmed } = data;

  const nodeClass = [
    "dn-path-step-node",
    isSelected && "dn-path-step-node--selected",
    isDimmed && "dn-path-step-node--dimmed",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={nodeClass}
      style={{ borderColor: pathColor }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />

      <div className="dn-path-step-node__content">
        <div className="dn-path-step-node__label">{label}</div>
        {description && (
          <div className="dn-path-step-node__description">{description}</div>
        )}
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} />
      {/* 差分ノードへの接続用 */}
      <Handle type="source" position={Position.Top} id="delta" isConnectable={false} />
    </div>
  );
}

export const PathStepNode = memo(PathStepNodeComponent);
