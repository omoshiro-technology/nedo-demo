/**
 * GraphView レイアウト定数
 */

export const LEVEL_SPACING = 360;
export const NODE_SPACING = 190;
export const COLUMN_OFFSET = 20;
export const BASE_EDGE_WIDTH = 1.6;
export const EDGE_INTERACTION_WIDTH = 20;

export const BASE_EDGE_STYLE = {
  stroke: "#1f7a6d",
  strokeWidth: BASE_EDGE_WIDTH,
  opacity: 0.9,
  strokeDasharray: "4 2",
  pointerEvents: "visibleStroke",
  zIndex: 5
} as const;
