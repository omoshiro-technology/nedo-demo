/**
 * 放射状レイアウトの計算ユーティリティ
 *
 * Phase 21: 判断軸ノードの選択肢を放射状に配置するための計算ロジック
 * - 全ての選択肢が中心から等距離に配置（優劣なし）
 * - 選択肢数に応じて角度を均等に分配
 */

import type { RadialOption, RiskStrategy } from "../types/decisionNavigator";

/**
 * 放射状レイアウトの定数
 */
export const RADIAL_LAYOUT = {
  /** 中心からの距離（px） */
  DISTANCE: 120,
  /** 最小角度間隔（度） */
  MIN_ANGLE_GAP: 30,
  /** 開始角度（右方向=0度、上方向=-90度） */
  START_ANGLE: -90,
  /** 展開アニメーション時間（ms） */
  EXPAND_DURATION: 300,
  /** 最大選択肢数（これを超えると距離を調整） */
  MAX_OPTIONS_BEFORE_ADJUST: 6,
  /** 選択肢が多い場合の追加距離（px） */
  EXTRA_DISTANCE_PER_OPTION: 10,
} as const;

/**
 * 選択肢の数とインデックスに応じて配置角度を計算
 *
 * @param count - 選択肢の総数
 * @param index - 選択肢のインデックス（0から開始）
 * @returns 配置角度（度、-180〜180の範囲）
 *
 * @example
 * // 3つの選択肢の場合
 * calculateRadialAngle(3, 0) // => -90 (上)
 * calculateRadialAngle(3, 1) // => -30 (右上)
 * calculateRadialAngle(3, 2) // => 30 (右下)
 */
export function calculateRadialAngle(count: number, index: number): number {
  if (count <= 0 || index < 0 || index >= count) {
    return 0;
  }

  // 1つだけの場合は右方向
  if (count === 1) {
    return 0;
  }

  // 2つの場合は上下45度
  if (count === 2) {
    return index === 0 ? -45 : 45;
  }

  // 3つ以上の場合は均等配置
  // 角度範囲を計算（最大180度、選択肢数に応じて調整）
  const angleRange = Math.min(180, count * RADIAL_LAYOUT.MIN_ANGLE_GAP);

  // 開始角度（中心から上方向を起点に左右に広がる）
  const startAngle = RADIAL_LAYOUT.START_ANGLE - angleRange / 2;

  // ステップ角度
  const step = angleRange / (count - 1);

  return startAngle + step * index;
}

/**
 * 選択肢の数に応じた最適な距離を計算
 *
 * @param count - 選択肢の総数
 * @returns 中心からの距離（px）
 */
export function calculateRadialDistance(count: number): number {
  if (count <= RADIAL_LAYOUT.MAX_OPTIONS_BEFORE_ADJUST) {
    return RADIAL_LAYOUT.DISTANCE;
  }

  // 選択肢が多い場合は距離を広げて重なりを防ぐ
  const extraOptions = count - RADIAL_LAYOUT.MAX_OPTIONS_BEFORE_ADJUST;
  return RADIAL_LAYOUT.DISTANCE + extraOptions * RADIAL_LAYOUT.EXTRA_DISTANCE_PER_OPTION;
}

/**
 * 角度からX,Y座標を計算
 *
 * @param angle - 角度（度）
 * @param distance - 中心からの距離（px）
 * @returns { x, y } 座標（中心を原点とする）
 */
export function angleToCoordinates(angle: number, distance: number): { x: number; y: number } {
  const rad = (angle * Math.PI) / 180;
  return {
    x: Math.cos(rad) * distance,
    y: Math.sin(rad) * distance,
  };
}

/**
 * 選択肢の配列から放射状配置情報付きの配列を生成
 *
 * @param options - 選択肢の配列（label, description, isRecommendedなど）
 * @returns RadialOption[] - 角度と距離が付与された選択肢配列
 */
export function createRadialOptions(
  options: Array<{
    id: string;
    label: string;
    description?: string;
    isRecommended?: boolean;
    riskStrategy?: RiskStrategy;
  }>
): RadialOption[] {
  const count = options.length;
  const distance = calculateRadialDistance(count);

  return options.map((option, index) => ({
    ...option,
    angle: calculateRadialAngle(count, index),
    distance,
  }));
}

/**
 * 放射状アニメーション用のCSS変数を生成
 *
 * @param angle - 角度（度）
 * @param distance - 距離（px）
 * @returns CSSカスタムプロパティのオブジェクト
 */
export function getRadialAnimationStyle(
  angle: number,
  distance: number
): React.CSSProperties {
  const { x, y } = angleToCoordinates(angle, distance);

  return {
    "--radial-angle": `${angle}deg`,
    "--radial-distance": `${distance}px`,
    "--radial-x": `${x}px`,
    "--radial-y": `${y}px`,
    "--expand-duration": `${RADIAL_LAYOUT.EXPAND_DURATION}ms`,
  } as React.CSSProperties;
}

/**
 * 選択肢ボタンの最終位置スタイルを生成
 *
 * @param angle - 角度（度）
 * @param distance - 距離（px）
 * @returns CSSプロパティ
 */
export function getRadialPositionStyle(
  angle: number,
  distance: number
): React.CSSProperties {
  const { x, y } = angleToCoordinates(angle, distance);

  return {
    transform: `translate(${x}px, ${y}px)`,
  };
}
