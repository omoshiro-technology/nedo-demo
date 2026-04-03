"use client"
/**
 * ローディングプレースホルダーノード
 *
 * 次の選択肢を探索中に、子ノード位置に表示されるプレースホルダー
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";

type LoadingPlaceholderData = {
  label?: string;
};

function LoadingPlaceholderNodeComponent({ data }: NodeProps<LoadingPlaceholderData>) {
  return (
    <div className="dn-node dn-node--placeholder">
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div className="dn-node__loading-placeholder">
        <span className="dn-node__spinner" />
        <span>{data.label || "探索中..."}</span>
      </div>
    </div>
  );
}

export const LoadingPlaceholderNode = memo(LoadingPlaceholderNodeComponent);
