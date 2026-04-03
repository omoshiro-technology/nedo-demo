"use client"
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData } from "../../../types/decisionNavigator";

function StartNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  return (
    <div className="dn-node-wrapper">
      <div
        className={`dn-node dn-node--start ${selected ? "dn-node--selected" : ""}`}
      >
        <div className="dn-node__icon">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="16" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </div>
        <div className="dn-node__content">
          <div className="dn-node__label">{data.label}</div>
          {data.description && (
            <div className="dn-node__description">{data.description}</div>
          )}
        </div>
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const StartNode = memo(StartNodeComponent);
