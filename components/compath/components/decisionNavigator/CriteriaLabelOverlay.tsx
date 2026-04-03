"use client"
/**
 * CriteriaLabelOverlay - 判断軸ラベルのオーバーレイ表示
 *
 * Phase 8: 判断軸ラベル化
 * - 判断軸はノードではなく、ラベルとして表示する「問い」
 * - ReactFlowのノードとは別に、絶対位置で配置
 *
 * Phase 18: 全列アンロック方式
 * - 全ての列が最初から選択可能
 * - 進捗インジケータで選択状況を表示
 *
 * Phase 21: 行ベースレイアウト
 * - 判断軸（criteria）= 行（各行の左端にラベル表示）
 * - 選択肢（strategy）= 列（横方向に配置）
 * - 判断軸追加ボタンは最下行に配置
 */

import { memo, useMemo } from "react";
import type { CriteriaLabel, ColumnState } from "../../types/decisionNavigator";

/**
 * Phase 21: 行ベースレイアウト定数（バックエンドのLAYOUT_V2と同期）
 *
 * 重要: ラベルはReactFlowの座標系を使用し、ビューポート変換で画面座標に変換する
 * - ノードのX座標: START_X (240) から開始
 * - ラベルのX座標: ノードの左側（START_X - LABEL_OFFSET）に配置
 */
const LAYOUT_V2 = {
  /** 判断軸ラベルの幅（左端のラベルエリア） */
  LABEL_WIDTH: 200,
  /** 行間隔（縦方向、判断軸間の距離） */
  ROW_SPACING: 180,
  /** 開始X座標（選択肢の先頭位置） */
  START_X: 240,
  /** 開始Y座標（最初の行の位置） */
  START_Y: 80,
  /** ノード幅（固定） */
  NODE_WIDTH: 200,
  /** ノード最小高さ */
  NODE_MIN_HEIGHT: 80,
  /** ラベルとノードの間のギャップ */
  LABEL_GAP: 20,
};

type CriteriaLabelOverlayProps = {
  /** 判断軸ラベルの配列 */
  criteriaLabels: CriteriaLabel[];
  /** 各列の状態（Phase 21では「各行の状態」を意味） */
  columnStates: ColumnState[];
  /** 現在選択中の列インデックス（Phase 21では行インデックス） */
  currentColumnIndex: number;
  /** ReactFlowのビューポート変換（zoom, pan） */
  transform?: { x: number; y: number; zoom: number };
  /** 判断軸ラベルクリック時のコールバック（ブレインモデル覗き見機能） */
  onCriteriaLabelClick?: (criteriaId: string) => void;
  /** 判断軸追加ボタンクリック時のコールバック */
  onAddCriteria?: () => void;
  /** 判断軸追加中かどうか */
  isAddingCriteria?: boolean;
};

function CriteriaLabelOverlayComponent({
  criteriaLabels,
  columnStates,
  currentColumnIndex,
  transform = { x: 0, y: 0, zoom: 1 },
  onCriteriaLabelClick,
  onAddCriteria,
  isAddingCriteria = false,
}: CriteriaLabelOverlayProps) {
  // Phase 21: 各ラベルの位置を計算（行ベースレイアウト）
  // - X座標: ノードの左側に配置（ReactFlow座標系）
  // - Y座標: 行インデックスに基づく（columnIndex は実質 rowIndex）
  // 重要: ノードと同じ座標系を使用し、ビューポート変換で画面座標に変換
  const labelPositions = useMemo(() => {
    return criteriaLabels.map((label) => {
      // Phase 21: ラベルはノードの左側に配置（ReactFlow座標系）
      // ノードのSTART_Xの左側にラベル幅+ギャップ分オフセット
      const x = LAYOUT_V2.START_X - LAYOUT_V2.LABEL_WIDTH - LAYOUT_V2.LABEL_GAP;
      const y = LAYOUT_V2.START_Y + label.columnIndex * LAYOUT_V2.ROW_SPACING;
      return { x, y };
    });
  }, [criteriaLabels]);

  // [DEBUG] オーバーレイで受け取ったcolumnStatesをログ出力
  console.log("[CriteriaLabelOverlay] columnStates:", columnStates);
  console.log("[CriteriaLabelOverlay] criteriaLabels count:", criteriaLabels.length);

  if (criteriaLabels.length === 0) {
    return null;
  }

  return (
    <div
      className="criteria-label-overlay"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "hidden",
      }}
    >
      {criteriaLabels.map((label, index) => {
        const position = labelPositions[index];
        // columnIndex は実質 rowIndex（Phase 21）
        const rowState = columnStates[label.columnIndex] ?? "active";
        const isCompleted = rowState === "completed";
        // Phase 18: 全行アンロックなので locked は使わない
        const isActive = rowState === "active";

        // Phase 21: ビューポート変換を適用
        // ラベルは左端固定なので、X方向はパンのみ適用（ズームで幅は変化）
        const screenX = position.x * transform.zoom + transform.x;
        const screenY = position.y * transform.zoom + transform.y;

        // クリックハンドラー（ブレインモデル覗き見機能）
        const handleLabelClick = () => {
          if (onCriteriaLabelClick) {
            onCriteriaLabelClick(label.id);
          }
        };

        return (
          <div
            key={label.id}
            className={`criteria-label criteria-label--row-layout ${isActive ? "criteria-label--active" : ""} ${isCompleted ? "criteria-label--completed" : ""} ${onCriteriaLabelClick ? "criteria-label--clickable" : ""}`}
            style={{
              position: "absolute",
              left: screenX,
              top: screenY,
              // Phase 21: ラベルは左揃え、縦方向は中央揃え
              transform: `translate(0, -50%) scale(${transform.zoom})`,
              transformOrigin: "left center",
              pointerEvents: onCriteriaLabelClick ? "auto" : "none",
              cursor: onCriteriaLabelClick ? "pointer" : "default",
              width: `${LAYOUT_V2.LABEL_WIDTH}px`,
              maxWidth: `${LAYOUT_V2.LABEL_WIDTH}px`,
            }}
            onClick={handleLabelClick}
            role={onCriteriaLabelClick ? "button" : undefined}
            tabIndex={onCriteriaLabelClick ? 0 : undefined}
            onKeyDown={onCriteriaLabelClick ? (e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                handleLabelClick();
              }
            } : undefined}
          >
            {/* 行インデックス表示（完了時はチェックマーク） */}
            <div className="criteria-label__index">
              {isCompleted ? "✓" : label.columnIndex + 1}
            </div>

            {/* 問い（メイン） */}
            <div className="criteria-label__question">{label.question}</div>

            {/* 補足説明 */}
            {label.description && (
              <div className="criteria-label__description">{label.description}</div>
            )}

            {/* Phase 18: 進捗ヒント（未選択の場合のみ） */}
            {isActive && (
              <div className="criteria-label__status criteria-label__status--selectable">
                選択可能
              </div>
            )}
          </div>
        );
      })}

      {/* Phase 21: 判断軸追加ボタン（最後の行の下に配置） */}
      {onAddCriteria && criteriaLabels.length > 0 && (() => {
        // 最後の行の下に配置（ReactFlow座標系）
        const lastRowIndex = criteriaLabels.length;
        const addButtonX = LAYOUT_V2.START_X - LAYOUT_V2.LABEL_WIDTH - LAYOUT_V2.LABEL_GAP;
        const addButtonY = LAYOUT_V2.START_Y + lastRowIndex * LAYOUT_V2.ROW_SPACING;
        const screenX = addButtonX * transform.zoom + transform.x;
        const screenY = addButtonY * transform.zoom + transform.y;

        return (
          <button
            type="button"
            className={`add-criteria-button add-criteria-button--row-layout ${isAddingCriteria ? "add-criteria-button--loading" : ""}`}
            style={{
              position: "absolute",
              left: screenX,
              top: screenY,
              transform: `translate(0, -50%) scale(${transform.zoom})`,
              transformOrigin: "left center",
              pointerEvents: "auto",
            }}
            onClick={onAddCriteria}
            disabled={isAddingCriteria}
            title="判断軸を追加"
          >
            {isAddingCriteria ? (
              <>
                <span className="add-criteria-button__spinner" />
                追加中...
              </>
            ) : (
              <>
                <span className="add-criteria-button__icon">＋</span>
                判断軸を追加
              </>
            )}
          </button>
        );
      })()}
    </div>
  );
}

export const CriteriaLabelOverlay = memo(CriteriaLabelOverlayComponent);
