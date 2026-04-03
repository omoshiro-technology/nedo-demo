/**
 * ノード生成ファクトリー（Graph Building Context）
 *
 * 判断軸ノード、選択肢ノード、探索ノード、エッジの生成を一元化
 * 各ユースケース（generateRecommendedPath, addCriteria, exploreNext, recordSelection）で共通利用
 */

import type {
  DecisionFlowNode,
  DecisionFlowEdge,
  DecisionEdgeType,
  RiskStrategy,
} from "./coreTypes";
import { LAYOUT_V2 } from "./layoutConstants";

// ============================================================
// 共通ユーティリティ
// ============================================================

/**
 * タイムスタンプを生成
 */
export function getTimestamp(): string {
  return new Date().toISOString();
}

/**
 * ユニークIDを生成
 */
export function generateId(): string {
  return `node-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

// ============================================================
// 判断軸ノード（Criteria Node）
// ============================================================

export type CreateCriteriaNodeParams = {
  id: string;
  question: string;
  description?: string;
  /** 行インデックス（depth） */
  rowIndex: number;
  /** 親ノードID（探索で追加された場合） */
  parentId?: string;
  /** 位置（指定がなければ自動計算） */
  position?: { x: number; y: number };
  /** なぜこの問いをするか（探索ノード用） */
  questionReason?: string;
  /** ベテランの経験談 */
  veteranInsight?: string;
  /** 番号付きラベルにするか（「1. 質問」形式） */
  withNumber?: boolean;
  /** レーン位置 */
  lane?: number;
};

/**
 * 判断軸ノードを生成
 */
export function createCriteriaNode(params: CreateCriteriaNodeParams): DecisionFlowNode {
  const {
    id,
    question,
    description,
    rowIndex,
    parentId,
    position,
    questionReason,
    veteranInsight,
    withNumber = true,
    lane = 0,
  } = params;

  // 位置の計算（指定がなければデフォルト）
  const nodePosition = position ?? {
    x: LAYOUT_V2.START_X,
    y: LAYOUT_V2.START_Y + rowIndex * LAYOUT_V2.ROW_SPACING,
  };

  // ラベル（番号付きか否か）
  const label = withNumber ? `${rowIndex + 1}. ${question}` : question;

  return {
    id,
    type: "decision",
    level: "criteria",
    label,
    description,
    status: "available",
    pathRole: "recommended",
    isRecommended: true,
    isSelectable: true,
    lane,
    depth: rowIndex,
    position: nodePosition,
    parentId,
    createdAt: getTimestamp(),
    source: "ai_generated",
    questionReason,
    veteranInsight,
  };
}

// ============================================================
// 選択肢ノード（Option/Strategy Node）
// ============================================================

export type CreateOptionNodeParams = {
  id: string;
  label: string;
  description?: string;
  /** 親の判断軸ノードID */
  parentId: string;
  /** 行インデックス（depth） */
  rowIndex: number;
  /** 選択肢インデックス（縦配置用） */
  optionIndex: number;
  /** 選択肢総数（中央配置計算用） */
  totalOptions: number;
  /** 基準Y座標（判断軸のY座標） */
  baseY: number;
  /** 推奨かどうか */
  isRecommended?: boolean;
  /** リスク戦略 */
  riskStrategy?: RiskStrategy;
  /** 選択理由 */
  rationale?: string;
  /** 位置（指定がなければ自動計算） */
  position?: { x: number; y: number };
  /** X座標のベース（判断軸のX座標） */
  baseX?: number;
};

/**
 * 選択肢ノードを生成
 */
export function createOptionNode(params: CreateOptionNodeParams): DecisionFlowNode {
  const {
    id,
    label,
    description,
    parentId,
    rowIndex,
    optionIndex,
    totalOptions,
    baseY,
    isRecommended = false,
    riskStrategy,
    rationale,
    position,
    baseX = LAYOUT_V2.START_X,
  } = params;

  // 位置の計算（指定がなければ自動計算）
  let nodePosition: { x: number; y: number };
  if (position) {
    nodePosition = position;
  } else {
    // 選択肢を判断軸の右側に縦配置（中央揃え）
    const totalHeight = (totalOptions - 1) * LAYOUT_V2.OPTION_Y_SPACING;
    const startY = baseY - totalHeight / 2;
    nodePosition = {
      x: baseX + LAYOUT_V2.OPTION_X_OFFSET,
      y: startY + optionIndex * LAYOUT_V2.OPTION_Y_SPACING,
    };
  }

  const now = getTimestamp();

  return {
    id,
    type: "action",
    level: "strategy",
    label,
    description,
    rationale,
    isRecommended,
    riskStrategy,
    status: "available",
    pathRole: isRecommended ? "recommended" : "alternative",
    recommendationReason: isRecommended ? description : undefined,
    isSelectable: true,
    lane: optionIndex + 1,
    depth: rowIndex,
    position: nodePosition,
    parentId,
    createdAt: now,
    selectedAt: undefined,
    source: "ai_generated",
  };
}

// ============================================================
// 探索ノード（Exploration Node）
// ============================================================

export type CreateExplorationNodeParams = {
  /** 親ノードID（選択肢ノード） */
  parentNodeId: string;
  /** 親ノードの位置 */
  parentPosition: { x: number; y: number };
  /** 行インデックス（depth） */
  rowIndex: number;
  /** レーン位置 */
  lane?: number;
};

/**
 * 探索ノードを生成
 */
export function createExplorationNode(params: CreateExplorationNodeParams): DecisionFlowNode {
  const {
    parentNodeId,
    parentPosition,
    rowIndex,
    lane = 0,
  } = params;

  const explorationNodeId = `exploration-${parentNodeId}`;

  return {
    id: explorationNodeId,
    type: "action",
    level: "strategy",
    label: "＋ 新しい観点を追加",
    description: "AIが新しい判断軸を提案します",
    status: "available",
    pathRole: undefined,
    isRecommended: false,
    isSelectable: true,
    isExplorationNode: true,
    lane,
    depth: rowIndex,
    position: {
      x: parentPosition.x + LAYOUT_V2.EXPLORATION_X_OFFSET,
      y: parentPosition.y,
    },
    parentId: parentNodeId,
    createdAt: getTimestamp(),
    source: "ai_generated",
  };
}

// ============================================================
// エッジ（Edge）
// ============================================================

export type CreateEdgeParams = {
  source: string;
  target: string;
  type: DecisionEdgeType;
  sourceHandle?: string;
  targetHandle?: string;
  animated?: boolean;
  /** エッジラベル（遷移理由、例：「この選択を踏まえて〜」） */
  label?: string;
};

/**
 * エッジを生成
 */
export function createEdge(params: CreateEdgeParams): DecisionFlowEdge {
  const {
    source,
    target,
    type,
    sourceHandle = "right",
    targetHandle = "left",
    animated,
    label,
  } = params;

  return {
    id: `edge-${source}-${target}`,
    source,
    target,
    type,
    sourceHandle,
    targetHandle,
    animated,
    label,
  };
}

// ============================================================
// 複合ファクトリー（よく使うパターン）
// ============================================================

export type CreateOptionWithExplorationParams = CreateOptionNodeParams & {
  /** 探索ノードを追加するか（推奨ノードのみ） */
  addExploration?: boolean;
};

export type CreateOptionWithExplorationResult = {
  optionNode: DecisionFlowNode;
  explorationNode?: DecisionFlowNode;
  edges: DecisionFlowEdge[];
};

/**
 * 選択肢ノードと探索ノード、エッジをまとめて生成
 */
export function createOptionWithExploration(
  params: CreateOptionWithExplorationParams
): CreateOptionWithExplorationResult {
  const { addExploration = false, ...optionParams } = params;

  const optionNode = createOptionNode(optionParams);
  const edges: DecisionFlowEdge[] = [];

  // 判断軸→選択肢のエッジ
  edges.push(createEdge({
    source: optionParams.parentId,
    target: optionNode.id,
    type: optionParams.isRecommended ? "selected" : "available",
  }));

  // 推奨ノードに探索ノードを追加
  let explorationNode: DecisionFlowNode | undefined;
  if (addExploration && optionParams.isRecommended) {
    explorationNode = createExplorationNode({
      parentNodeId: optionNode.id,
      parentPosition: optionNode.position,
      rowIndex: optionParams.rowIndex,
      lane: optionParams.optionIndex + 2,
    });

    edges.push(createEdge({
      source: optionNode.id,
      target: explorationNode.id,
      type: "available",
    }));
  }

  return { optionNode, explorationNode, edges };
}
