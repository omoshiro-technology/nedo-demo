"use client"
import type { GraphNode } from "../types";

type MissingListProps = {
  nodes: GraphNode[];
};

export default function MissingList({ nodes }: MissingListProps) {
  const missingNodes = nodes.filter((node) => node.status === "missing");

  return (
    <div className="missing-list">
      <h4>未入力の項目</h4>
      {missingNodes.length === 0 ? (
        <p className="muted">未入力の項目は見つかりませんでした。</p>
      ) : (
        <ul>
          {missingNodes.map((node) => (
            <li key={node.id}>
              <span className="missing-list__label">{node.levelLabel}</span>
              <span className="missing-list__value">{node.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
