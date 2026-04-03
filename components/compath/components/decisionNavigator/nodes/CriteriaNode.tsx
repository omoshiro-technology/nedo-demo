"use client"
/**
 * CriteriaNode - 判断軸ノード（放射状展開UI）
 *
 * Phase 21: 放射状展開UI
 * - 展開前（collapsed）: 問いのみ表示、ホバーで展開
 * - 展開中（expanded）: 放射状に選択肢が表示
 * - 決定後（decided）: 選択内容が表示、エッジが自動接続
 *
 * 状態遷移:
 * [collapsed] ──ホバー──→ [expanded] ──クリック──→ [decided]
 *      ↑                       │                        │
 *      └──マウスアウト────────┘                        │
 *      ↑                                                │
 *      └──────────────再クリック──────────────────────┘
 */

import { memo, useCallback, useRef, useState, useEffect } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { CriteriaNodeData, RadialOption } from "../../../types/decisionNavigator";
import { RadialOptionButton } from "../RadialOptionButton";
import { RADIAL_LAYOUT } from "../../../utils/radialLayout";

function CriteriaNodeComponent({ data, selected }: NodeProps<CriteriaNodeData>) {
  const {
    question,
    description,
    goalConnection,
    expandState,
    selectedOptionId,
    options,
    criteriaId,
    onOptionSelect,
    onExpandStateChange,
  } = data;

  // ホバータイマー（意図的な展開のため）
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isHovering, setIsHovering] = useState(false);

  // 選択済みの選択肢を取得
  const selectedOption = selectedOptionId
    ? options.find((o) => o.id === selectedOptionId)
    : undefined;

  // ホバー開始
  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);

    // 展開前の状態でのみホバーで展開
    if (expandState === "collapsed" && onExpandStateChange) {
      // 少し遅延を入れて意図的なホバーかを判定
      hoverTimerRef.current = setTimeout(() => {
        onExpandStateChange(criteriaId, "expanded");
      }, 150); // 150msの遅延
    }
  }, [expandState, criteriaId, onExpandStateChange]);

  // ホバー終了
  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);

    // タイマーをクリア
    if (hoverTimerRef.current) {
      clearTimeout(hoverTimerRef.current);
      hoverTimerRef.current = null;
    }

    // 展開中の状態でマウスアウトすると折りたたむ
    if (expandState === "expanded" && onExpandStateChange) {
      onExpandStateChange(criteriaId, "collapsed");
    }
  }, [expandState, criteriaId, onExpandStateChange]);

  // クリーンアップ
  useEffect(() => {
    return () => {
      if (hoverTimerRef.current) {
        clearTimeout(hoverTimerRef.current);
      }
    };
  }, []);

  // 選択肢クリック
  const handleOptionSelect = useCallback(
    (optionId: string) => {
      if (onOptionSelect) {
        onOptionSelect(criteriaId, optionId);
      }
    },
    [criteriaId, onOptionSelect]
  );

  // 決定済みノードをクリックして再展開
  const handleDecidedClick = useCallback(() => {
    if (expandState === "decided" && onExpandStateChange) {
      onExpandStateChange(criteriaId, "expanded");
    }
  }, [expandState, criteriaId, onExpandStateChange]);

  // クラス名を構築
  const classNames = [
    "criteria-node",
    `criteria-node--${expandState}`,
    selected ? "criteria-node--selected" : "",
    isHovering ? "criteria-node--hovering" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div
      className={classNames}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 入力ハンドル（他ノードからの接続用） */}
      <Handle
        type="target"
        position={Position.Left}
        id="left"
        isConnectable={false}
      />

      {/* 展開前の状態 */}
      {expandState === "collapsed" && (
        <div className="criteria-node__collapsed">
          {goalConnection && (
            <div className="criteria-node__goal-connection">
              {goalConnection}
            </div>
          )}
          <div className="criteria-node__question">{question}</div>
          {description && (
            <div className="criteria-node__description">{description}</div>
          )}
          <div className="criteria-node__hint">
            ホバーして選択肢を表示
          </div>
        </div>
      )}

      {/* 展開中の状態 */}
      {expandState === "expanded" && (
        <div className="criteria-node__expanded">
          {/* 中心に問いを表示 */}
          <div className="criteria-node__center">
            <div className="criteria-node__question">{question}</div>
          </div>

          {/* 放射状選択肢 */}
          <div className="criteria-node__radial-options">
            {options.map((option, index) => (
              <RadialOptionButton
                key={option.id}
                option={option}
                onSelect={handleOptionSelect}
                animationDelay={index * 50} // 順番にアニメーション
                isSelected={option.id === selectedOptionId}
              />
            ))}
          </div>
        </div>
      )}

      {/* 決定後の状態 - 問いのみ表示（選択結果は右側の別ノードに表示） */}
      {expandState === "decided" && (
        <div
          className="criteria-node__decided"
          onClick={handleDecidedClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleDecidedClick();
            }
          }}
          role="button"
          tabIndex={0}
          title="クリックして変更"
        >
          <div className="criteria-node__question">{question}</div>
          {description && (
            <div className="criteria-node__description">{description}</div>
          )}
          <div className="criteria-node__change-hint">
            ✓ 選択済み（クリックで変更）
          </div>
        </div>
      )}

      {/* 出力ハンドル（他ノードへの接続用） */}
      <Handle
        type="source"
        position={Position.Right}
        id="right"
        isConnectable={false}
      />
      {/* 下方向への接続（次の判断軸への誘導エッジ用） */}
      <Handle
        type="source"
        position={Position.Bottom}
        id="bottom"
        isConnectable={false}
      />
    </div>
  );
}

export const CriteriaNode = memo(CriteriaNodeComponent);
