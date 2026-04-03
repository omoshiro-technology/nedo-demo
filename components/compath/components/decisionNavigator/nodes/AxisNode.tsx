"use client"
/**
 * AxisNode - 評価軸ノード
 * Phase 31: 評価軸スパイン + パスレーン構造
 *
 * 上部に固定配置され、各パスがどの軸でどの評価を持つかを示す
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

type AxisNodeData = {
  label: string;
  description?: string;
};

function AxisNodeComponent({ data }: NodeProps<AxisNodeData>) {
  return (
    <div className="dn-axis-node">
      <div className="dn-axis-node__label">{data.label}</div>
      {data.description && (
        <div className="dn-axis-node__description">{data.description}</div>
      )}
      <Handle type="source" position={Position.Bottom} isConnectable={false} />
    </div>
  );
}

export const AxisNode = memo(AxisNodeComponent);
