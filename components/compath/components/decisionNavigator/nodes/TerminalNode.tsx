"use client"
/**
 * TerminalNode
 *
 * 終端ノード - 意思決定フローの終了を示す円形ノード
 * - 目的達成または選択完了を視覚的に表現
 * - ユーザーが「ここで終了」を選択した場合に表示
 */

import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData } from "../../../types/decisionNavigator";

function TerminalNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  const selectedClass = data.status === "selected" ? "dn-node--selected" : "";
  const interactiveClass = selected ? "dn-node--interactive" : "";

  return (
    <div className="dn-node-wrapper">
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div
        className={`dn-node dn-node--terminal ${selectedClass} ${interactiveClass}`}
        data-selectable={data.isSelectable ? "true" : "false"}
      >
        <div className="dn-node__terminal-icon">
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            {/* チェックマーク付き円 */}
            <circle cx="12" cy="12" r="10" />
            <path d="M9 12l2 2 4-4" />
          </svg>
        </div>
        <div className="dn-node__terminal-label">
          {data.label || "終了"}
        </div>
      </div>
    </div>
  );
}

export const TerminalNode = memo(TerminalNodeComponent);
