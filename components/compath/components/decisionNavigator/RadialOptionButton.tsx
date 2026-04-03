"use client"
/**
 * RadialOptionButton - 放射状に配置される選択肢ボタン
 *
 * Phase 21: 放射状展開UI
 * - 角度と距離に基づいて絶対位置で配置
 * - ホバーで詳細表示
 * - クリックで選択
 * - 全ての選択肢が等距離（優劣なし）
 */

import { memo, useCallback, useState } from "react";
import type { RadialOption } from "../../types/decisionNavigator";
import { getRadialAnimationStyle } from "../../utils/radialLayout";

export type RadialOptionButtonProps = {
  option: RadialOption;
  /** 選択時のコールバック */
  onSelect: (optionId: string) => void;
  /** アニメーション開始からの遅延（ms） */
  animationDelay?: number;
  /** 選択済みかどうか */
  isSelected?: boolean;
};

function RadialOptionButtonComponent({
  option,
  onSelect,
  animationDelay = 0,
  isSelected = false,
}: RadialOptionButtonProps) {
  const [isHovered, setIsHovered] = useState(false);

  const handleClick = useCallback(() => {
    onSelect(option.id);
  }, [onSelect, option.id]);

  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
  }, []);

  // CSS変数を設定（アニメーション用）
  const animationStyle = getRadialAnimationStyle(option.angle, option.distance);

  // クラス名を構築
  const classNames = [
    "radial-option",
    option.isRecommended ? "radial-option--recommended" : "",
    isSelected ? "radial-option--selected" : "",
    isHovered ? "radial-option--hovered" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button
      type="button"
      className={classNames}
      style={{
        ...animationStyle,
        animationDelay: `${animationDelay}ms`,
      }}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      aria-label={`${option.label.replace(/<[^>]*>/g, '')}${option.isRecommended ? "（推奨）" : ""}`}
    >
      <span
        className="radial-option__label"
        dangerouslySetInnerHTML={{ __html: option.label }}
      />

      {/* 推奨バッジ */}
      {option.isRecommended && (
        <span className="radial-option__badge">推奨</span>
      )}

      {/* ホバー時の詳細表示 */}
      {isHovered && option.description && (
        <div className="radial-option__tooltip">
          <span className="radial-option__tooltip-content">
            {option.description}
          </span>
          {option.riskStrategy && (
            <span className="radial-option__tooltip-risk">
              リスク対応: {getRiskStrategyLabel(option.riskStrategy)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}

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

export const RadialOptionButton = memo(RadialOptionButtonComponent);
