"use client"
import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData } from "../../../types/decisionNavigator";

/**
 * リスク戦略のラベルを取得
 */
function getRiskStrategyLabel(strategy: string): string {
  const labels: Record<string, string> = {
    avoid: "回避",
    mitigate: "軽減",
    transfer: "転嫁",
    accept: "受容",
  };
  return labels[strategy] || strategy;
}

function ActionNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  const [isHovered, setIsHovered] = useState(false);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // Phase 3: 推奨パス・代替パス対応のクラス
  // Phase 8: ロック状態のクラスを追加
  const statusClass = (() => {
    switch (data.status) {
      case "recommended": return "dn-node--recommended-path";
      case "selected": return "dn-node--selected";
      case "alternative-collapsed": return "dn-node--alternative-collapsed";
      case "dimmed": return "dn-node--dimmed";
      case "locked": return "dn-node--locked";
      default: return "";
    }
  })();
  const interactiveClass = selected ? "dn-node--interactive" : "";
  // Phase 3: レーン位置のクラス（0=推奨パス、1以上=代替）
  const laneClass = typeof data.lane === "number" && data.lane > 0 ? "dn-node--alternative-lane" : "";
  // Phase 21: ホバー状態のクラス
  const hoverClass = isHovered ? "dn-node--hovered" : "";
  // Phase 23: 探索ノードの場合はボタンスタイルクラスを追加
  const explorationClass = data.isExplorationNode ? "dn-node--exploration" : "";
  // Phase 23: 探索中の場合は探索中クラスを追加
  const exploringClass = data.isExploring ? "dn-node--exploring" : "";

  // 探索ノードの場合は専用の表示
  if (data.isExplorationNode) {
    return (
      <div
        className="dn-node-wrapper"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <Handle type="target" position={Position.Left} id="left" isConnectable={false} />
        <div
          className={`dn-node dn-node--exploration ${hoverClass} ${exploringClass}`}
          data-selectable="true"
        >
          <div className="dn-node__exploration-icon">
            {data.isExploring ? "🔍" : "＋"}
          </div>
          <div className="dn-node__exploration-label">
            {data.isExploring ? "探索中..." : "新しい観点を追加"}
          </div>
          <div className="dn-node__exploration-hint">
            クリックしてAIに提案させる
          </div>
        </div>
        <Handle type="source" position={Position.Right} isConnectable={false} />
      </div>
    );
  }

  return (
    <div
      className="dn-node-wrapper"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 横方向（旧来のフロー）からの入力 */}
      <Handle type="target" position={Position.Left} id="left" isConnectable={false} />
      {/* Phase 7: 縦方向（判断軸から）の入力 */}
      <Handle type="target" position={Position.Top} id="top" isConnectable={false} />
      <div
        className={`dn-node dn-node--action ${statusClass} ${interactiveClass} ${laneClass} ${hoverClass}`}
        data-selectable={data.isSelectable || data.status === "selected" ? "true" : "false"}
      >
        {/* AI推奨バッジ（未選択の推奨オプション） */}
        {data.isRecommended && data.status !== "selected" && (
          <div className="dn-node__badge dn-node__badge--recommended">おすすめ</div>
        )}

        {/* SI技術伝承（汎知化）タグ - 右上に小さく表示 */}
        {data.isFromKnowledgeBase && (
          <div className="dn-node__kb-tag" title="SI技術伝承ナレッジベースからの情報">
            汎知化
          </div>
        )}

        <div className="dn-node__content">
          <div className="dn-node__label">{data.label}</div>
          {data.description && (
            <div className="dn-node__description">{data.description}</div>
          )}
        </div>

        {/* 選択済みチェックマーク */}
        {data.status === "selected" && (
          <div className="dn-node__check">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}

        {/* Phase 21: ホバー時の詳細ツールチップ */}
        {isHovered && (data.recommendationReason || data.riskStrategy) && (
          <div className="dn-node__tooltip">
            {data.recommendationReason && (
              <div className="dn-node__tooltip-reason">{data.recommendationReason}</div>
            )}
            {data.riskStrategy && (
              <div className="dn-node__tooltip-risk">
                リスク対応: {getRiskStrategyLabel(data.riskStrategy)}
              </div>
            )}
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  );
}

export const ActionNode = memo(ActionNodeComponent);
