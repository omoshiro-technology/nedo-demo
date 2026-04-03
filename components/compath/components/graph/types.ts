/**
 * GraphView 型定義
 */

import type { GraphNodeStatus, NodeTagInfo } from "../../types";

export type AxisNodeData = {
  label: string;
  fullLabel: string;
  levelLabel: string;
  levelId?: string;
  status: GraphNodeStatus;
  isPlaceholder?: boolean;
  chatSource?: "fact" | "speculative";
  confidence?: number;
  /** 確信度タグ情報 */
  tags?: NodeTagInfo;
};

export type MissingPoolItem = {
  id: string;
  label: string;
  levelLabel: string;
  levelId: string;
};

export type Level = {
  id: string;
  label: string;
};
