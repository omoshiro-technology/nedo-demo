"use client"
/**
 * PathHeaderNode - パスヘッダーノード
 * Phase 31: 評価軸スパイン + パスレーン構造
 *
 * 各推奨パスの開始点。パス名と概要を表示
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

type PathHeaderNodeData = {
  label: string;
  description?: string;
  pathId: string;
  pathColor: string;
  isSelected?: boolean;
  isFocused?: boolean;
};

function PathHeaderNodeComponent({ data }: NodeProps<PathHeaderNodeData>) {
  const { label, description, pathColor, isSelected, isFocused } = data;

  const nodeClass = [
    "dn-path-header-node",
    isSelected && "dn-path-header-node--selected",
    isFocused && "dn-path-header-node--focused",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={nodeClass}
      style={{ borderLeftColor: pathColor }}
    >
      <Handle type="target" position={Position.Top} isConnectable={false} />

      <div className="dn-path-header-node__content">
        <div
          className="dn-path-header-node__indicator"
          style={{ backgroundColor: pathColor }}
        />
        <div className="dn-path-header-node__text">
          <div className="dn-path-header-node__label">{label}</div>
          {description && (
            <div className="dn-path-header-node__description">{description}</div>
          )}
        </div>
      </div>

      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const PathHeaderNode = memo(PathHeaderNodeComponent);
