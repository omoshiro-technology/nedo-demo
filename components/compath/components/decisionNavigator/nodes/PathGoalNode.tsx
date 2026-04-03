"use client"
/**
 * PathGoalNode - パスゴールノード
 * Phase 31: 評価軸スパイン + パスレーン構造
 *
 * 各パスの結果・ゴールを表示
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

type PathGoalNodeData = {
  label: string;
  description?: string;
  pathId: string;
  pathColor: string;
  isSelected?: boolean;
  isDimmed?: boolean;
};

function PathGoalNodeComponent({ data }: NodeProps<PathGoalNodeData>) {
  const { label, description, pathColor, isSelected, isDimmed } = data;

  const nodeClass = [
    "dn-path-goal-node",
    isSelected && "dn-path-goal-node--selected",
    isDimmed && "dn-path-goal-node--dimmed",
  ].filter(Boolean).join(" ");

  return (
    <div
      className={nodeClass}
      style={{ backgroundColor: pathColor }}
    >
      <Handle type="target" position={Position.Left} isConnectable={false} />

      <div className="dn-path-goal-node__content">
        <div className="dn-path-goal-node__icon">🎯</div>
        <div className="dn-path-goal-node__text">
          <div className="dn-path-goal-node__label">{label}</div>
          {description && (
            <div className="dn-path-goal-node__description">{description}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export const PathGoalNode = memo(PathGoalNodeComponent);
