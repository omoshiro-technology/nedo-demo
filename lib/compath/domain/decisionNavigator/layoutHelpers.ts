/**
 * レイアウト計算ヘルパー（Layout Context）
 *
 * ノード配置、重なり回避、ツリーレイアウトの計算を一元化
 */

import type { DecisionFlowNode, DecisionFlowEdge } from "./coreTypes";
import { LAYOUT_V2 } from "./layoutConstants";

// ============================================================
// 重なり回避
// ============================================================

/**
 * 新規ノード配置時の重なり回避
 *
 * @param targetY 配置したいY座標
 * @param existingNodes 既存のノード一覧
 * @param targetX 配置するX座標
 * @param xTolerance X座標の許容範囲（この範囲内のノードと重なり判定）
 * @returns 調整後のY座標
 */
export function avoidOverlap(
  targetY: number,
  existingNodes: DecisionFlowNode[],
  targetX: number,
  xTolerance: number = 100
): number {
  const nodeHeight = LAYOUT_V2.NODE_HEIGHT_WITH_LABEL;
  const nodeMargin = LAYOUT_V2.NODE_MARGIN;
  const minGap = nodeHeight + nodeMargin;

  // 同じX座標付近のノードを抽出
  const nearbyNodes = existingNodes.filter(
    (node) => Math.abs(node.position.x - targetX) < xTolerance
  );

  if (nearbyNodes.length === 0) return targetY;

  // Y座標でソート
  const sortedNodes = [...nearbyNodes].sort(
    (a, b) => a.position.y - b.position.y
  );

  let adjustedY = targetY;

  for (const node of sortedNodes) {
    const nodeBottom = node.position.y + nodeHeight / 2;
    const targetTop = adjustedY - nodeHeight / 2;

    if (targetTop < nodeBottom + nodeMargin) {
      adjustedY = nodeBottom + minGap;
    }
  }

  return adjustedY;
}

// ============================================================
// 選択肢の縦配置計算
// ============================================================

export type CalculateOptionPositionsParams = {
  /** 基準Y座標（判断軸のY座標） */
  baseY: number;
  /** 基準X座標（判断軸のX座標） */
  baseX: number;
  /** 選択肢の数 */
  optionCount: number;
  /** 既存ノード（重なり回避用） */
  existingNodes?: DecisionFlowNode[];
  /** 重なり回避を適用するか */
  avoidCollisions?: boolean;
};

export type OptionPosition = {
  x: number;
  y: number;
  index: number;
};

/**
 * 選択肢ノードの位置を計算（中央揃え縦配置）
 */
export function calculateOptionPositions(
  params: CalculateOptionPositionsParams
): OptionPosition[] {
  const {
    baseY,
    baseX,
    optionCount,
    existingNodes = [],
    avoidCollisions = false,
  } = params;

  const positions: OptionPosition[] = [];
  const optionX = baseX + LAYOUT_V2.OPTION_X_OFFSET;
  const totalHeight = (optionCount - 1) * LAYOUT_V2.OPTION_Y_SPACING;
  const startY = baseY - totalHeight / 2;

  // 重なり回避用の累積ノードリスト
  const nodesForOverlap = [...existingNodes];

  for (let i = 0; i < optionCount; i++) {
    let optionY = startY + i * LAYOUT_V2.OPTION_Y_SPACING;

    if (avoidCollisions) {
      optionY = avoidOverlap(optionY, nodesForOverlap, optionX);
      // 次の選択肢の重なり判定用に仮ノードを追加
      nodesForOverlap.push({
        position: { x: optionX, y: optionY },
      } as DecisionFlowNode);
    }

    positions.push({
      x: optionX,
      y: optionY,
      index: i,
    });
  }

  return positions;
}

// ============================================================
// 行ベースツリーレイアウト
// ============================================================

/**
 * ブランチベースのレイアウト再計算
 *
 * Phase 28改改: 並列ブランチを視覚的に分離するレイアウト
 *
 * 設計変更:
 * - 従来: 「行」ベース（同じdepthのノードは同じ行に配置）
 * - 新規: 「ブランチ」ベース（親ノードの位置を基準に配置）
 *
 * これにより:
 * - 初期の並列な判断軸（リスク効率バランス、実績vs革新など）は従来通り行ごとに配置
 * - 探索で追加されたノードは親ノードの位置を基準に水平方向に伸びる
 * - 異なるブランチから派生した探索結果は視覚的に分離される
 *
 * アルゴリズム:
 * 1. 初期判断軸（orderReasonが"探索により追加"でない）は行ベースで配置
 * 2. 探索で追加されたノードは親ノードのY座標を基準に配置
 * 3. 重なりを回避
 */
export function recalculateTreeLayout(
  nodes: DecisionFlowNode[],
  edges: DecisionFlowEdge[]
): DecisionFlowNode[] {
  // ゴールノードとスタートノードは別処理
  const layoutNodes = nodes.filter(
    n => n.type !== "outcome" && n.level !== "outcome" && n.type !== "start"
  );

  if (layoutNodes.length === 0) return nodes;

  const minGap = LAYOUT_V2.NODE_HEIGHT_WITH_LABEL + LAYOUT_V2.NODE_MARGIN;

  // 親子関係を構築
  const parentMap = new Map<string, string>();
  for (const edge of edges) {
    const targetNode = nodes.find(n => n.id === edge.target);
    if (targetNode?.type === "outcome" || targetNode?.level === "outcome") {
      continue;
    }
    parentMap.set(edge.target, edge.source);
  }

  // 判断軸ノード（criteria）を特定
  const criteriaNodes = layoutNodes.filter(n => n.level === "criteria");

  // 初期判断軸（探索で追加されていない）とその直接の選択肢を特定
  // これらは従来通り「行」ベースで配置
  const initialCriteriaIds = new Set<string>();
  for (const node of layoutNodes) {
    // criteriaノードで、parentIdがstrategyノードでなければ初期判断軸
    // または、parentIdがnullか、スタートノードを指している場合
    if (node.level === "criteria") {
      const parent = layoutNodes.find(n => n.id === node.parentId);
      if (!parent || parent.type === "start" || parent.level !== "strategy") {
        initialCriteriaIds.add(node.id);
      }
    }
  }

  // 各ノードがどの「ブランチ」に属するかを特定
  // ブランチ = 初期判断軸のID（探索で派生したノードは、元の初期判断軸に紐づく）
  const nodeBranchMap = new Map<string, string>();

  function findBranchForNode(nodeId: string, visited: Set<string> = new Set()): string {
    if (nodeBranchMap.has(nodeId)) {
      return nodeBranchMap.get(nodeId)!;
    }

    // 循環参照を検出
    if (visited.has(nodeId)) {
      nodeBranchMap.set(nodeId, nodeId);
      return nodeId;
    }
    visited.add(nodeId);

    const node = layoutNodes.find(n => n.id === nodeId);
    if (!node) return "";

    // 初期判断軸なら自身がブランチのルート
    if (initialCriteriaIds.has(nodeId)) {
      nodeBranchMap.set(nodeId, nodeId);
      return nodeId;
    }

    // 親を辿ってブランチを特定（node.parentIdを優先、なければparentMapを参照）
    const parentId = node.parentId || parentMap.get(nodeId);
    if (parentId && parentId !== nodeId) {
      const branch = findBranchForNode(parentId, visited);
      nodeBranchMap.set(nodeId, branch);
      return branch;
    }

    // 親が見つからない場合は自身のIDをブランチとする
    nodeBranchMap.set(nodeId, nodeId);
    return nodeId;
  }

  // 全ノードのブランチを特定
  for (const node of layoutNodes) {
    findBranchForNode(node.id, new Set());
  }

  // ブランチごとにノードをグループ化
  const branchNodesMap = new Map<string, DecisionFlowNode[]>();
  for (const node of layoutNodes) {
    const branch = nodeBranchMap.get(node.id) ?? "";
    if (!branchNodesMap.has(branch)) {
      branchNodesMap.set(branch, []);
    }
    branchNodesMap.get(branch)!.push(node);
  }

  // 各ノードの新しい位置を計算
  const nodePositions = new Map<string, { x: number; y: number }>();

  // まず、初期判断軸を行ベースで配置
  const initialCriteria = criteriaNodes.filter(c => initialCriteriaIds.has(c.id));
  initialCriteria.sort((a, b) => (a.depth ?? 0) - (b.depth ?? 0));

  let rowY = LAYOUT_V2.START_Y;
  for (const criteria of initialCriteria) {
    nodePositions.set(criteria.id, { x: criteria.position.x, y: rowY });

    // この判断軸の直接の選択肢を配置
    const directChildren = layoutNodes.filter(
      n => n.parentId === criteria.id && n.level === "strategy"
    );
    const optionCount = directChildren.length;
    const totalHeight = (optionCount - 1) * minGap;
    const startY = rowY - totalHeight / 2;

    directChildren.sort((a, b) => a.position.y - b.position.y);
    for (let i = 0; i < directChildren.length; i++) {
      const optionY = startY + i * minGap;
      nodePositions.set(directChildren[i].id, {
        x: directChildren[i].position.x,
        y: optionY,
      });
    }

    // 次の行のY座標を計算
    const childrenMaxY = directChildren.length > 0
      ? Math.max(...directChildren.map(c => nodePositions.get(c.id)?.y ?? rowY))
      : rowY;
    rowY = childrenMaxY + LAYOUT_V2.ROW_SPACING;
  }

  // 次に、探索で追加されたノードを親ベースで配置
  // 設計原則:
  // - 判断軸（criteria）: 親ノード（選択肢）のX座標 + オフセット、親のY座標を継承
  // - 選択肢（strategy）: 親ノード（判断軸）のX座標 + オフセット、親のY座標を中心に縦配置
  function processExplorationNodes() {
    const processed = new Set<string>(nodePositions.keys());
    let changed = true;
    let iterations = 0;
    const maxIterations = 100; // 無限ループ防止

    while (changed && iterations < maxIterations) {
      changed = false;
      iterations++;

      for (const node of layoutNodes) {
        if (processed.has(node.id)) continue;

        const parentId = node.parentId;
        if (!parentId || !nodePositions.has(parentId)) continue;

        const parentPos = nodePositions.get(parentId)!;
        const parentNode = layoutNodes.find(n => n.id === parentId);

        // 判断軸ノード（criteria）の場合: 親（選択肢）の右側に配置
        if (node.level === "criteria") {
          // X座標: 親の位置 + オフセット（選択肢の右側）
          const criteriaX = parentPos.x + LAYOUT_V2.OPTION_X_OFFSET;
          // Y座標: 親のY座標を継承
          const criteriaY = parentPos.y;

          nodePositions.set(node.id, { x: criteriaX, y: criteriaY });
          processed.add(node.id);
          changed = true;

          console.log(`[Layout] Criteria ${node.id} -> parentX=${parentPos.x}, newX=${criteriaX}, y=${criteriaY}`);
          continue;
        }

        // 選択肢ノード（strategy）の場合: 同じ親を持つ兄弟と一緒に配置
        if (node.level === "strategy") {
          // 同じ親を持つ兄弟ノード（未処理のもの）を取得
          const siblings = layoutNodes.filter(
            n => n.parentId === parentId && !processed.has(n.id) && n.level === "strategy"
          );
          const siblingCount = siblings.length;

          if (siblingCount > 0) {
            // X座標: 親（判断軸）の位置 + オフセット
            const optionX = parentPos.x + LAYOUT_V2.OPTION_X_OFFSET;
            // Y座標: 親のY座標を中心に縦配置
            const totalHeight = (siblingCount - 1) * minGap;
            const startY = parentPos.y - totalHeight / 2;

            // Y座標でソートして配置
            siblings.sort((a, b) => a.position.y - b.position.y);
            for (let i = 0; i < siblings.length; i++) {
              const sibling = siblings[i];
              const siblingY = startY + i * minGap;
              nodePositions.set(sibling.id, {
                x: optionX,
                y: siblingY,
              });
              processed.add(sibling.id);
              changed = true;

              console.log(`[Layout] Strategy ${sibling.id} -> parentX=${parentPos.x}, newX=${optionX}, y=${siblingY}`);
            }
          }
        }
      }
    }

    if (iterations >= maxIterations) {
      console.warn(`[Layout] processExplorationNodes reached max iterations (${maxIterations})`);
    }
  }

  processExplorationNodes();

  // 位置を反映
  const updatedNodes = nodes.map(node => {
    const newPos = nodePositions.get(node.id);
    if (newPos) {
      return { ...node, position: newPos };
    }
    return node;
  });

  return updatedNodes;
}

// ============================================================
// ゴールノード位置計算
// ============================================================

export type CalculateGoalPositionParams = {
  nodes: DecisionFlowNode[];
  /** X方向の追加オフセット */
  xOffset?: number;
};

/**
 * ゴールノードの位置を計算（最右端、中央）
 */
export function calculateGoalPosition(
  params: CalculateGoalPositionParams
): { x: number; y: number } {
  const { nodes, xOffset = 350 } = params;

  let maxX = 0;
  let minY = Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    if (node.type !== "outcome" && node.level !== "outcome" && node.type !== "start") {
      maxX = Math.max(maxX, node.position.x);
      minY = Math.min(minY, node.position.y);
      maxY = Math.max(maxY, node.position.y);
    }
  }

  return {
    x: maxX + xOffset,
    y: (minY + maxY) / 2,
  };
}
