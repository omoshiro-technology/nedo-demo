"use client"
/**
 * BrainModelPeekPopover - ブレインモデル覗き見ポップアップ
 *
 * Phase 19: 判断軸ラベルをクリックした際に表示されるポップアップ
 * ベテランの思考プロセスを宇宙空間的なビジュアルで可視化
 *
 * 注意: これはデモ用実装であり、後で捨てる前提
 */

import { useEffect, useCallback, useMemo } from "react";
import { getBrainModelPath, getDefaultBrainModelPath } from "../../data/brainModelDemoData";
import { BrainModelVisualization } from "./BrainModelVisualization";

type Props = {
  isOpen: boolean;
  criteriaId: string | null;
  onClose: () => void;
};

export function BrainModelPeekPopover({ isOpen, criteriaId, onClose }: Props) {
  // パスデータを取得
  const path = useMemo(() => {
    if (!criteriaId) return getDefaultBrainModelPath();
    return getBrainModelPath(criteriaId) || getDefaultBrainModelPath();
  }, [criteriaId]);

  // パスカラーをCSS変数として設定
  const style = useMemo(() => ({
    "--path-color": path.color,
    "--path-color-rgb": hexToRgb(path.color),
  } as React.CSSProperties), [path.color]);

  // Escキーで閉じる
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      // スクロール禁止
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [isOpen, handleKeyDown]);

  // オーバーレイクリックで閉じる
  const handleOverlayClick = useCallback(() => {
    onClose();
  }, [onClose]);

  // ポップアップ内クリックはイベント伝播を止める
  const handlePopupClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div className="brain-peek-overlay" onClick={handleOverlayClick} />

      {/* ポップアップ */}
      <div className="brain-peek-popup" style={style} onClick={handlePopupClick}>
        {/* ヘッダー */}
        <div className="brain-peek-header">
          <div className="brain-peek-title">
            <span className="brain-peek-title-icon">🧠</span>
            {path.title}
            <span className="brain-peek-subtitle">ベテランの思考パス</span>
          </div>
          <button
            type="button"
            className="brain-peek-close"
            onClick={onClose}
            aria-label="閉じる"
          >
            <span>閉じる</span>
            <span>✕</span>
          </button>
        </div>

        {/* キャンバス */}
        <BrainModelVisualization path={path} />

        {/* ナラティブ */}
        <div className="brain-narrative" style={style}>
          <div className="brain-narrative-header">
            <span className="brain-narrative-icon">💭</span>
            <span>ベテランの頭の中では...</span>
          </div>

          <p className="brain-narrative-intro">{path.narrative.intro}</p>

          <ol className="brain-narrative-steps">
            {path.narrative.steps.map((step, index) => (
              <li key={step.nodeId} className="brain-narrative-step">
                <span className="brain-narrative-step-number">{index + 1}</span>
                <span className="brain-narrative-step-text">{step.description}</span>
              </li>
            ))}
          </ol>

          <div className="brain-narrative-conclusion">
            {path.narrative.conclusion}
          </div>
        </div>

        {/* フッター */}
        <div className="brain-peek-footer">
          <button
            type="button"
            className="brain-peek-confirm"
            onClick={onClose}
          >
            なるほど！
          </button>
        </div>
      </div>
    </>
  );
}

/**
 * HEXカラーをRGB形式に変換
 */
function hexToRgb(hex: string): string {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    return `${parseInt(result[1], 16)}, ${parseInt(result[2], 16)}, ${parseInt(result[3], 16)}`;
  }
  return "255, 107, 107"; // フォールバック
}
