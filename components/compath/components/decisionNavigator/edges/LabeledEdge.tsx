"use client"
/**
 * LabeledEdge - ホバーで理由を表示するシンプルなエッジ
 *
 * エッジ上には小さなインジケータのみ表示し、
 * マウスホバーで理由テキストを表示する（情報過多を防ぐ）
 */

import { useState } from "react";
import {
  BaseEdge,
  EdgeLabelRenderer,
  getSmoothStepPath,
  type EdgeProps,
} from "reactflow";

export type LabeledEdgeData = {
  /** 理由テキスト */
  label?: string;
  labelColor?: string;
  labelBgColor?: string;
};

export function LabeledEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  style,
  markerEnd,
}: EdgeProps<LabeledEdgeData>) {
  const [isHovered, setIsHovered] = useState(false);

  const [edgePath, labelX, labelY] = getSmoothStepPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const fullText = data?.label;
  const labelColor = data?.labelColor || "#5b6770";

  // ラベルがなければ通常のエッジのみ
  if (!fullText) {
    return (
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
    );
  }

  return (
    <>
      <BaseEdge
        id={id}
        path={edgePath}
        style={style}
        markerEnd={markerEnd}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            position: "absolute",
            transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
            pointerEvents: "all",
            zIndex: isHovered ? 9999 : 1,
          }}
          className="nodrag nopan"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
        >
          {/* 小さなインジケータ（ホバーで理由を表示） */}
          <div
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              backgroundColor: isHovered ? labelColor : "#ffffff",
              border: `2px solid ${labelColor}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "help",
              transition: "all 0.15s ease",
              boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
            }}
          >
            <span
              style={{
                fontSize: 10,
                color: isHovered ? "#ffffff" : labelColor,
                fontWeight: 600,
              }}
            >
              ?
            </span>
          </div>

          {/* ホバー時のツールチップ */}
          {isHovered && (
            <div
              style={{
                position: "absolute",
                bottom: "calc(100% + 8px)",
                left: "50%",
                transform: "translateX(-50%)",
                minWidth: 160,
                maxWidth: 260,
                padding: "8px 12px",
                borderRadius: 6,
                backgroundColor: "#ffffff",
                color: "#374151",
                fontSize: 12,
                lineHeight: 1.5,
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                border: "1px solid #e5e7eb",
                zIndex: 9999,
              }}
            >
              {fullText}
              {/* 矢印（下向き） */}
              <div
                style={{
                  position: "absolute",
                  bottom: -7,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "7px solid transparent",
                  borderRight: "7px solid transparent",
                  borderTop: "7px solid #e5e7eb",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  bottom: -6,
                  left: "50%",
                  transform: "translateX(-50%)",
                  width: 0,
                  height: 0,
                  borderLeft: "6px solid transparent",
                  borderRight: "6px solid transparent",
                  borderTop: "6px solid #ffffff",
                }}
              />
            </div>
          )}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
