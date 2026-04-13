/**
 * 意思決定ナビゲーターのレイアウト定数
 *
 * 全てのノード配置計算で共通で使用する定数を一元管理
 *
 * フロー方向: 左→右（横方向）
 * - X軸: depth（深さ）に応じて右方向へ
 * - Y軸: lane（レーン）に応じて下方向へ
 */

export const LAYOUT = {
  /** 横方向のノード間隔（depth間隔、左→右フロー用） */
  NODE_SPACING_X: 300,

  /** 縦方向のレーン間隔（代替選択肢は下方向に配置） */
  LANE_SPACING_Y: 220,

  /** 開始X座標（スタートノードの位置） */
  START_X: 0,

  /** 開始Y座標（推奨パス=レーン0の位置） */
  START_Y: 0,

  /** ノード幅（CSSと統一: width: 220px） */
  NODE_WIDTH: 220,

  /** ノード高さ（CSSと統一: height: 140px） */
  NODE_HEIGHT: 140,

  // 後方互換性のためのエイリアス（徐々に削除予定）
  /** @deprecated START_X を使用 */
  LEFT_X: 0,
  /** @deprecated NODE_SPACING_X を使用 */
  NODE_SPACING_Y: 220,
  /** @deprecated LANE_SPACING_Y を使用 */
  LANE_SPACING_X: 300,
} as const;

/**
 * 聞き出しセッション用のレイアウト定数
 * （ノード数が少ないため、やや狭めの間隔）
 */
export const CLARIFICATION_LAYOUT = {
  /** 横方向のノード間隔 */
  NODE_SPACING_X: 280,

  /** 縦方向のノード間隔 */
  NODE_SPACING_Y: 300,
} as const;

export type LayoutConstants = typeof LAYOUT;
export type ClarificationLayoutConstants = typeof CLARIFICATION_LAYOUT;

/**
 * Phase 8/21: 行ベースレイアウト
 *
 * レイアウト構造（Phase 21で90度回転）:
 * - 判断軸（criteria）: 各行の左端にラベルとして表示
 * - 選択肢（strategy）: 行の中で横方向に並ぶ
 * - ゴールノード: 常に最右端に固定表示
 *
 * 新しい概念:
 * - 行（row）= 1つの判断軸
 * - 列（column）= 選択肢の位置（行内での横方向の位置）
 * - スタートノードは廃止
 * - 全行がアンロック状態（Phase 18: どこからでも選択可能）
 */
export const LAYOUT_V2 = {
  /** 判断軸ラベルの幅（左端のラベルエリア） */
  LABEL_WIDTH: 200,

  /** 判断軸ラベルの左端からの開始位置 */
  LABEL_START_X: 20,

  /** 行間隔（縦方向、判断軸間の距離） */
  ROW_SPACING: 280,

  /** 列間隔（横方向、選択肢間の距離） */
  OPTION_SPACING: 250,

  /** 開始X座標（選択肢の先頭位置、ラベル幅の後） */
  START_X: 240,

  /** 開始Y座標（最初の行の位置） */
  START_Y: 80,

  /** ゴールノードの追加X方向オフセット（最後の選択肢からの距離） */
  GOAL_X_OFFSET: 100,

  /** ノード幅（固定） */
  NODE_WIDTH: 200,

  /** ノード最小高さ */
  NODE_MIN_HEIGHT: 80,

  /** 最大選択肢数（これを超えると折りたたみ） */
  MAX_OPTIONS_VISIBLE: 5,

  // ============================================================
  // ノード配置用定数（Graph Building Context）
  // ============================================================

  /** 判断軸から選択肢へのX方向オフセット */
  OPTION_X_OFFSET: 220,

  /** 選択肢間の縦間隔 */
  OPTION_Y_SPACING: 90,

  /** 探索ノードのX方向オフセット（選択肢からの距離） */
  EXPLORATION_X_OFFSET: 240,

  /** ノードの高さ（理由ラベル含む、重なり判定用） */
  NODE_HEIGHT_WITH_LABEL: 100,

  /** ノード間の最小マージン */
  NODE_MARGIN: 40,
} as const;

export type LayoutV2Constants = typeof LAYOUT_V2;
