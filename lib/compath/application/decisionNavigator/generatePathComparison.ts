/**
 * generatePathComparison - 推奨パス比較グラフの生成
 * Phase 31: 評価軸スパイン + パスレーン構造
 *
 * チャットで収集した条件を元に、複数の推奨パスを並列表示
 */

import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  DecisionFlowEdge,
  CriteriaLabel,
} from "./types";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";

// ノードサイズ（幅は統一、高さも統一）
const NODE_WIDTH = 220;
const NODE_HEIGHT = 140;
const GAP = 40;

// X座標を計算: 列番号 × (ノード幅 + ギャップ)
const getX = (col: number) => col * (NODE_WIDTH + GAP);

// Y座標を計算: 行番号 × (ノード高さ + ギャップ)
const getY = (row: number) => row * (NODE_HEIGHT + GAP);

/** 評価軸の定義 */
type EvaluationAxis = {
  id: string;
  label: string;
  description?: string;
};

/** 推奨パスの定義 */
type RecommendedPath = {
  id: string;
  name: string;
  description: string;
  color: string;
  axisValues: Record<string, string>; // axisId -> "高" | "中" | "低"
  steps: Array<{
    label: string;
    description?: string;
    delta?: { axis: string; value: string; isPositive: boolean };
  }>;
  goalLabel: string;
  goalDescription?: string;
};

/** LLMレスポンスの型 */
type PathComparisonLLMResponse = {
  axes: EvaluationAxis[];
  paths: Array<{
    id: string;
    name: string;
    description: string;
    axisValues: Record<string, string>;
    steps: Array<{
      label: string;
      description?: string;
      delta?: { axis: string; value: string; isPositive: boolean };
    }>;
    goalLabel: string;
    goalDescription?: string;
  }>;
};

/**
 * LLMに推奨パス比較データを生成させる
 */
async function generatePathsWithLLM(
  purpose: string,
  conditions: string[]
): Promise<PathComparisonLLMResponse> {
  const systemPrompt = `あなたは意思決定支援のエキスパートです。
ユーザーの目的と収集済みの条件を元に、3つの推奨パスを生成してください。

## 出力形式
必ず以下のJSON形式で出力してください：

{
  "axes": [
    { "id": "safety", "label": "安全性", "description": "リスク回避の度合い" },
    { "id": "cost", "label": "コスト", "description": "初期投資と運用コスト" },
    { "id": "time", "label": "時間", "description": "導入・実現までの期間" }
  ],
  "paths": [
    {
      "id": "A",
      "name": "安全重視パス",
      "description": "リスクを最小化し、安定性を優先",
      "axisValues": { "safety": "高", "cost": "中", "time": "中" },
      "steps": [
        { "label": "現状分析", "description": "現行システムの課題を洗い出す" },
        { "label": "余裕設計", "description": "バッファを持たせた設計", "delta": { "axis": "安全性", "value": "+2", "isPositive": true } }
      ],
      "goalLabel": "安定運転達成",
      "goalDescription": "リスクを抑えた運用体制"
    }
  ]
}

## ルール（厳守）
- 評価軸は必ず3つ（安全性、コスト、時間など、目的に適したもの）
- 推奨パスは必ず3つ（安全重視、バランス、効率重視）
- 【重要】各パスのstepsは必ず2〜3ステップのみ（4ステップ以上は禁止）
- 各ステップのlabelは10文字以内の簡潔な名前にする
- 重要な差分がある場合のみdeltaを付与（最大1個/パス）
- 日本語で出力`;

  const userContent = `## 目的
${purpose}

## 収集済みの条件
${conditions.map((c, i) => `${i + 1}. ${c}`).join("\n")}

上記を踏まえて、3つの推奨パスを生成してください。`;

  const response = await generateChatCompletion({
    systemPrompt,
    userContent,
    temperature: 0.7,
    maxTokens: 2000,
  });

  try {
    return JSON.parse(response) as PathComparisonLLMResponse;
  } catch {
    // フォールバック
    return getDefaultPathComparison(purpose);
  }
}

/**
 * デフォルトのパス比較データ（LLM失敗時のフォールバック）
 */
function getDefaultPathComparison(purpose: string): PathComparisonLLMResponse {
  return {
    axes: [
      { id: "safety", label: "安全性", description: "リスク回避の度合い" },
      { id: "cost", label: "コスト", description: "初期投資と運用コスト" },
      { id: "time", label: "時間", description: "導入までの期間" },
    ],
    paths: [
      {
        id: "A",
        name: "安全重視パス",
        description: "リスクを最小化し、安定性を優先するアプローチ",
        axisValues: { safety: "高", cost: "高", time: "長" },
        steps: [
          { label: "詳細リスク分析", description: "潜在リスクを徹底的に洗い出す" },
          { label: "余裕設計の適用", description: "バッファを持たせた設計", delta: { axis: "安全性", value: "+2", isPositive: true } },
        ],
        goalLabel: "安定運転の実現",
        goalDescription: "リスクを最小化した安定運用",
      },
      {
        id: "B",
        name: "バランスパス",
        description: "安全性とコストのバランスを取るアプローチ",
        axisValues: { safety: "中", cost: "中", time: "中" },
        steps: [
          { label: "重要リスクの特定", description: "優先度の高いリスクに絞って対策" },
          { label: "段階的な導入", description: "フェーズを分けて実装" },
        ],
        goalLabel: "バランスの取れた運用",
        goalDescription: "コストと安全性の両立",
      },
      {
        id: "C",
        name: "効率重視パス",
        description: "コストと時間を最適化するアプローチ",
        axisValues: { safety: "中", cost: "低", time: "短" },
        steps: [
          { label: "最小構成での導入", description: "必要最小限の機能から開始" },
          { label: "運用中の調整", description: "実運用で問題が出たら対応", delta: { axis: "コスト", value: "-1", isPositive: true } },
        ],
        goalLabel: "迅速な立ち上げ",
        goalDescription: "最短で運用開始",
      },
    ],
  };
}

/**
 * パス比較用のノード・エッジを生成
 * @param purpose 目的
 * @param inputConditions 収集済みの条件（オプション）
 */
export async function generatePathComparisonGraph(
  purpose: string,
  inputConditions?: string[]
): Promise<{
  nodes: DecisionFlowNode[];
  edges: DecisionFlowEdge[];
  criteriaLabels: CriteriaLabel[];
  startNodeId: string;
}> {
  const now = getTimestamp();

  // 条件を収集
  const conditions = inputConditions ?? [];

  // LLMでパス比較データを生成
  const pathData = await generatePathsWithLLM(purpose, conditions);

  const nodes: DecisionFlowNode[] = [];
  const edges: DecisionFlowEdge[] = [];
  const criteriaLabels: CriteriaLabel[] = [];

  // グリッド配置:
  // 行0: 評価軸, 行1-3: パス（安全/バランス/効率）
  // 列0: スタート, 列1: パスヘッダー, 列2-3: ステップ, 列4: ゴール

  // 1. スタートノード（行2=バランスパスと同じ高さ）
  const startNode: DecisionFlowNode = {
    id: "start",
    type: "start",
    level: "strategy",
    label: "スタート",
    description: purpose,
    status: "selected",
    position: { x: getX(0), y: getY(2) },
    createdAt: now,
    source: "ai_generated",
  };
  nodes.push(startNode);

  // 2. 評価軸ノード（行0、列2から開始=ステップと揃える）
  pathData.axes.forEach((axis, index) => {
    const axisNode: DecisionFlowNode = {
      id: `axis-${axis.id}`,
      type: "axis",
      level: "strategy",
      label: axis.label,
      description: axis.description,
      status: "available",
      position: {
        x: getX(2 + index), // 列2, 3, 4
        y: getY(0),         // 行0
      },
      createdAt: now,
      source: "ai_generated",
    };
    nodes.push(axisNode);
  });

  // 3. 各パスのノードとエッジを生成
  const pathColors = ["#16a34a", "#2563eb", "#f97316"];

  pathData.paths.forEach((path, pathIndex) => {
    const pathRow = pathIndex + 1; // 行1, 2, 3
    const pathColor = pathColors[pathIndex] || "#64748b";

    // ステップ数を最大2に制限
    const limitedSteps = path.steps.slice(0, 2);
    console.log(`[PathComparison] Path ${path.id}: ${path.steps.length} steps -> ${limitedSteps.length} steps (limited)`);

    // パスヘッダーノード（列1）
    const headerNode: DecisionFlowNode = {
      id: `path-${path.id}`,
      type: "pathHeader",
      level: "criteria",
      label: path.name,
      description: path.description,
      status: "available",
      isSelectable: true,
      position: {
        x: getX(1),       // 列1
        y: getY(pathRow), // 行1, 2, 3
      },
      createdAt: now,
      source: "ai_generated",
      pathId: path.id,
      pathColor: pathColor,
    };
    nodes.push(headerNode);

    // スタート → パスヘッダーのエッジ
    edges.push({
      id: `edge-start-${path.id}`,
      source: "start",
      target: `path-${path.id}`,
      type: "pathEdge",
      sourceHandle: "right",
      targetHandle: "left",
    });

    // 評価軸 → パスヘッダーのエッジ（値をラベルに）
    pathData.axes.forEach((axis) => {
      const value = path.axisValues[axis.id] || "中";
      edges.push({
        id: `edge-axis-${axis.id}-${path.id}`,
        source: `axis-${axis.id}`,
        target: `path-${path.id}`,
        type: "axisLink",
        label: value,
        sourceHandle: "bottom",
        targetHandle: "top",
      });
    });

    // ステップノード（列2, 3）
    let prevNodeId = `path-${path.id}`;
    limitedSteps.forEach((step, stepIndex) => {
      const stepCol = 2 + stepIndex; // 列2, 3
      const stepNode: DecisionFlowNode = {
        id: `${path.id}-step-${stepIndex}`,
        type: "pathStep",
        level: "strategy",
        label: step.label,
        description: step.description,
        status: "available",
        position: {
          x: getX(stepCol),
          y: getY(pathRow),
        },
        createdAt: now,
        source: "ai_generated",
        pathId: path.id,
        pathColor: pathColor,
      };
      nodes.push(stepNode);

      // 前のノード → ステップのエッジ
      edges.push({
        id: `edge-${prevNodeId}-${stepNode.id}`,
        source: prevNodeId,
        target: stepNode.id,
        type: "pathEdge",
        sourceHandle: "right",
        targetHandle: "left",
      });

      // 差分ノード（あれば）- ステップの上に配置
      if (step.delta && stepIndex === 0) {
        const deltaNode: DecisionFlowNode = {
          id: `${path.id}-delta-${stepIndex}`,
          type: "delta",
          level: "strategy",
          label: `${step.delta.axis} ${step.delta.value}`,
          status: "available",
          position: {
            x: getX(stepCol),
            y: getY(pathRow) - 50,
          },
          createdAt: now,
          source: "ai_generated",
        };
        nodes.push(deltaNode);

        edges.push({
          id: `edge-delta-${deltaNode.id}`,
          source: stepNode.id,
          target: deltaNode.id,
          type: "available",
          sourceHandle: "delta",
          targetHandle: "bottom",
        });
      }

      prevNodeId = stepNode.id;
    });

    // ゴールノード（列4）
    const goalCol = 2 + limitedSteps.length; // ステップの次
    const goalNode: DecisionFlowNode = {
      id: `${path.id}-goal`,
      type: "pathGoal",
      level: "outcome",
      label: path.goalLabel,
      description: path.goalDescription,
      status: "available",
      isSelectable: true,
      position: {
        x: getX(goalCol),
        y: getY(pathRow),
      },
      createdAt: now,
      source: "ai_generated",
      pathId: path.id,
      pathColor: pathColor,
    };
    nodes.push(goalNode);

    // 最後のステップ → ゴールのエッジ
    edges.push({
      id: `edge-${prevNodeId}-${goalNode.id}`,
      source: prevNodeId,
      target: goalNode.id,
      type: "pathEdge",
      sourceHandle: "right",
      targetHandle: "left",
    });
  });

  return { nodes, edges, criteriaLabels, startNodeId: "start" };
}
