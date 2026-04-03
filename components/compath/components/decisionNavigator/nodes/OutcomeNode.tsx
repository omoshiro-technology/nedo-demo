"use client"
import { memo, useMemo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData } from "../../../types/decisionNavigator";

function OutcomeNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  const pieces = data.coveragePieces ?? [];

  // カバレッジ状態を集計
  const { allCompleted, hasAnyCompleted } = useMemo(() => {
    if (pieces.length === 0) return { allCompleted: false, hasAnyCompleted: false };
    const completedCount = pieces.filter(p => p.state === "completed").length;
    return {
      allCompleted: completedCount === pieces.length,
      hasAnyCompleted: completedCount > 0,
    };
  }, [pieces]);

  // Phase 8: ロック状態を追加
  const statusClass = (() => {
    switch (data.status) {
      case "dimmed": return "dn-node--dimmed";
      case "selected": return "dn-node--selected";
      case "locked": return "dn-node--locked";
      default: return "";
    }
  })();
  const interactiveClass = selected ? "dn-node--interactive" : "";
  // 全完了時にCSS強調クラスを追加
  const completedClass = allCompleted ? "dn-node--all-completed" : "";

  // 状態に応じた説明テキスト
  const statusText = useMemo(() => {
    if (pieces.length === 0) return undefined;
    if (allCompleted) return "全ての観点を検討しました";
    if (hasAnyCompleted) return "検討が進んでいます";
    return "検討を始めましょう";
  }, [pieces.length, allCompleted, hasAnyCompleted]);

  // 全完了時はラベルを「目的達成」に変更
  const displayLabel = allCompleted ? "目的達成" : data.label;

  return (
    <div className="dn-node-wrapper">
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <div
        className={`dn-node dn-node--outcome ${statusClass} ${interactiveClass} ${completedClass}`}
        data-selectable={data.isSelectable || data.status === "selected" ? "true" : "false"}
      >
        <div className="dn-node__icon">
          {allCompleted ? (
            <svg
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
              <polyline points="22 4 12 14.01 9 11.01" />
            </svg>
          ) : (
            <span className="dn-outcome__target-icon">&#127919;</span>
          )}
        </div>
        <div className="dn-node__content">
          <div className="dn-node__label">{displayLabel}</div>

          {pieces.length > 0 && (
            <div className="dn-outcome__coverage-grid">
              {pieces.map(piece => (
                <div
                  key={piece.id}
                  className={`dn-outcome__piece dn-outcome__piece--${piece.state}`}
                  title={piece.label}
                />
              ))}
            </div>
          )}

          {statusText && (
            <div className="dn-outcome__status-text">{statusText}</div>
          )}

          {!statusText && data.description && (
            <div className="dn-node__description">{data.description}</div>
          )}
        </div>
      </div>
    </div>
  );
}

export const OutcomeNode = memo(OutcomeNodeComponent);
