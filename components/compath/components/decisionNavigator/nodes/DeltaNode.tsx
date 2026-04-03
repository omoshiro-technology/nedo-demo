"use client"
/**
 * DeltaNode - 差分表示ノード
 * Phase 31: 評価軸スパイン + パスレーン構造
 *
 * パス間のトレードオフ（差分）を小さく表示
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

type DeltaNodeData = {
  axis: string;
  value: string; // "+2", "-1" など
  isPositive?: boolean;
};

function DeltaNodeComponent({ data }: NodeProps<DeltaNodeData>) {
  const { axis, value, isPositive } = data;

  const valueClass = isPositive
    ? "dn-delta-node__value--positive"
    : "dn-delta-node__value--negative";

  return (
    <div className="dn-delta-node">
      <Handle type="target" position={Position.Bottom} isConnectable={false} />

      <div className="dn-delta-node__content">
        <span className="dn-delta-node__axis">{axis}</span>
        <span className={`dn-delta-node__value ${valueClass}`}>{value}</span>
      </div>
    </div>
  );
}

export const DeltaNode = memo(DeltaNodeComponent);
