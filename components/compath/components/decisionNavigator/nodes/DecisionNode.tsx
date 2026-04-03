"use client"
import { memo } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { FlowNodeData } from "../../../types/decisionNavigator";

function DecisionNodeComponent({ data, selected }: NodeProps<FlowNodeData>) {
  // 選択後圧縮: 表示モード判定
  const isCompact = data.level === "criteria" && data.isColumnCompleted;
  const isEnhanced = data.level === "strategy" && data.status === "selected" && data.isColumnCompleted;

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
  // Phase 23: 問いノード（criteria）の場合は専用クラスを追加
  const criteriaClass = data.level === "criteria" ? "dn-node--criteria" : "";
  // AI推奨の未選択オプション（視覚的ヒント）
  const recommendedClass = data.isRecommended && data.status === "available" ? "dn-node--ai-recommended" : "";
  // 選択後圧縮: コンパクト/強調クラス
  const compactClass = isCompact ? "dn-node--compact-criteria" : "";
  const enhancedClass = isEnhanced ? "dn-node--enhanced-selected" : "";

  // 問いノード（criteria）の場合のみwrapperクラスを適用
  const wrapperClass = data.level === "criteria" ? "dn-node-wrapper dn-node-wrapper--criteria" : "dn-node-wrapper";

  return (
    <div className={wrapperClass}>
      <Handle type="target" position={Position.Left} isConnectable={false} />

      {/* Phase 24: パス名ラベル（ノードの上に大きく表示、コンパクト時は非表示） */}
      {!isCompact && data.level === "criteria" && data.pathName && (
        <div className="dn-node__path-label">
          {data.pathName}
        </div>
      )}

      <div
        className={`dn-node dn-node--decision ${statusClass} ${interactiveClass} ${laneClass} ${criteriaClass} ${recommendedClass} ${compactClass} ${enhancedClass}`}
        data-selectable={data.isSelectable || data.status === "selected" ? "true" : "false"}
      >
        <div className="dn-node__content">
          {/* コンパクト表示: 問い文を1行に圧縮 + トグルヒント */}
          {isCompact ? (
            <>
              <div
                className="dn-node__label dn-node__label--compact"
                dangerouslySetInnerHTML={{ __html: data.label }}
              />
              {(data.hiddenAlternativeCount ?? 0) > 0 && (
                <div className="dn-node__toggle-hint">
                  ▼ +{data.hiddenAlternativeCount}件
                </div>
              )}
            </>
          ) : isEnhanced ? (
            /* 強調表示: チェックバッジ + ラベル大きく + description表示 */
            <>
              <div className="dn-node__selected-badge">選択済み</div>
              <div
                className="dn-node__label dn-node__label--enhanced"
                dangerouslySetInnerHTML={{ __html: data.label }}
              />
              {data.description && (
                <div
                  className="dn-node__description"
                  dangerouslySetInnerHTML={{ __html: data.description }}
                />
              )}
            </>
          ) : (
            /* 通常表示: 既存のまま */
            <>
              <div
                className="dn-node__label"
                dangerouslySetInnerHTML={{ __html: data.label }}
              />
              {data.description && (
                <div
                  className="dn-node__description"
                  dangerouslySetInnerHTML={{ __html: data.description }}
                />
              )}
            </>
          )}
        </div>

        {/* SI技術伝承（汎知化）タグ - 右上に小さく表示（コンパクト時は非表示） */}
        {!isCompact && data.isFromKnowledgeBase && (
          <div className="dn-node__kb-tag" title="SI技術伝承ナレッジベースからの情報">
            汎知化
          </div>
        )}

        {/* AI推奨バッジ（未選択の推奨オプション） */}
        {data.isRecommended && data.status === "available" && (
          <div className="dn-node__recommended-badge">おすすめ</div>
        )}

        {/* 選択済みチェックマーク（通常モード時のみ、enhancedはバッジで代替） */}
        {!isEnhanced && data.status === "selected" && (
          <div className="dn-node__check">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        )}
      </div>

      {/* ゴール接続 or 問いに対する理由（コンパクト時は非表示） */}
      {!isCompact && data.level === "criteria" && (data.goalConnection || data.questionReason) && (
        <div className="dn-node__reason-label">
          {data.goalConnection || data.questionReason}
        </div>
      )}

      {/* 横方向（メインライン）への出力 */}
      <Handle type="source" position={Position.Right} id="right" isConnectable={false} />
      {/* Phase 7: 縦方向（選択肢）への出力 */}
      <Handle type="source" position={Position.Bottom} id="bottom" isConnectable={false} />
    </div>
  );
}

export const DecisionNode = memo(DecisionNodeComponent);
