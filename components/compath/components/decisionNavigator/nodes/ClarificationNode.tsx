"use client"
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData } from "../../../types/decisionNavigator";

function ClarificationNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  const statusClass = data.status === "dimmed" ? "dn-node--dimmed" : "";
  const selectedClass = data.status === "selected" ? "dn-node--selected" : "";
  const interactiveClass = selected ? "dn-node--interactive" : "";

  return (
    <div className="dn-node-wrapper">
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div
        className={`dn-node dn-node--clarification ${statusClass} ${selectedClass} ${interactiveClass}`}
        data-selectable={data.isSelectable || data.status === "selected" ? "true" : "false"}
      >
        {/* クエスチョンアイコン */}
        <div className="dn-node__clarification-icon">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 17h-2v-2h2v2zm2.07-7.75l-.9.92C13.45 12.9 13 13.5 13 15h-2v-.5c0-1.1.45-2.1 1.17-2.83l1.24-1.26c.37-.36.59-.86.59-1.41 0-1.1-.9-2-2-2s-2 .9-2 2H8c0-2.21 1.79-4 4-4s4 1.79 4 4c0 .88-.36 1.68-.93 2.25z" />
          </svg>
        </div>

        <div className="dn-node__content">
          <div className="dn-node__label">{data.label}</div>
        </div>

        {/* 選択済みチェックマーク */}
        {data.status === "selected" && (
          <div className="dn-node__check">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const ClarificationNode = memo(ClarificationNodeComponent);
