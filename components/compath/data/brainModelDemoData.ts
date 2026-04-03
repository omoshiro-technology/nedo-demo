/**
 * ブレインモデル覗き見機能 - デモ用データ
 *
 * Phase 19: 判断軸ラベルをクリックした際に表示する
 * ベテランの思考プロセスを可視化するためのデモデータ
 *
 * 3D座標系: x, y は2D平面、z は奥行き（-100〜100）
 * D3.jsで遠近法（パースペクティブ）を適用して描画
 *
 * クラスター構造: 3-4個のノードクラスターを配置し、
 * パスがクラスター間を跨いで進む
 *
 * 注意: これはデモ用実装であり、後で捨てる前提
 */

export type BrainModelNode = {
  id: string;
  label: string;
  x: number; // 3D座標 (-100 〜 100)
  y: number; // 3D座標 (-100 〜 100)
  z: number; // 奥行き (-100 〜 100、正が手前)
  isOnPath: boolean;
  size: "large" | "medium" | "small";
  clusterId?: string; // 所属するクラスターID
};

export type BrainModelEdge = {
  id: string;
  from: string;
  to: string;
  isOnPath: boolean;
};

export type BrainModelPath = {
  id: string;
  criteriaId: string; // c1, c2, c3
  color: string;
  title: string;
  pathNodes: string[]; // パス上のノードID順序
  allNodes: BrainModelNode[];
  allEdges: BrainModelEdge[];
  narrative: {
    intro: string;
    steps: Array<{ nodeId: string; description: string }>;
    conclusion: string;
  };
};

/**
 * クラスター定義
 * 各クラスターは3D空間内の特定の領域を占める
 */
export type Cluster = {
  id: string;
  name: string;  // 表示名
  centerX: number;
  centerY: number;
  centerZ: number;
  radius: number;
  color: string; // クラスターの色（半透明で表示）
};

export const CLUSTERS: Cluster[] = [
  { id: "cluster-experience", name: "経験・記憶", centerX: -60, centerY: -40, centerZ: -60, radius: 30, color: "rgba(255, 107, 107, 0.08)" },  // 経験・記憶クラスター（左奥）
  { id: "cluster-analysis", name: "分析・評価", centerX: 20, centerY: 30, centerZ: -20, radius: 35, color: "rgba(78, 205, 196, 0.08)" },      // 分析クラスター（中央上）
  { id: "cluster-judgment", name: "判断・決定", centerX: 60, centerY: -20, centerZ: 40, radius: 30, color: "rgba(255, 230, 109, 0.08)" },       // 判断クラスター（右手前）
  { id: "cluster-context", name: "文脈・状況", centerX: -30, centerY: 50, centerZ: 30, radius: 25, color: "rgba(155, 89, 182, 0.08)" },        // 文脈クラスター（左上手前）
];

/**
 * クラスター内にランダムな位置を生成
 */
function randomInCluster(cluster: Cluster): { x: number; y: number; z: number } {
  const theta = Math.random() * Math.PI * 2;
  const phi = Math.acos(2 * Math.random() - 1);
  const r = cluster.radius * Math.cbrt(Math.random()); // 均等分布のため立方根

  return {
    x: cluster.centerX + r * Math.sin(phi) * Math.cos(theta),
    y: cluster.centerY + r * Math.sin(phi) * Math.sin(theta),
    z: cluster.centerZ + r * Math.cos(phi),
  };
}

/**
 * 背景ノード生成（クラスター内に分散配置）
 * 各クラスターに18-25個のノードを配置（密度を上げる）
 */
function generateClusteredBackgroundNodes(): BrainModelNode[] {
  const nodes: BrainModelNode[] = [];
  let nodeIndex = 0;

  CLUSTERS.forEach((cluster) => {
    const nodesInCluster = 18 + Math.floor(Math.random() * 8); // 18-25個

    for (let i = 0; i < nodesInCluster; i++) {
      const pos = randomInCluster(cluster);
      // ノードサイズをランダムに（small多め、medium少し）
      const sizeRand = Math.random();
      const size: "small" | "medium" = sizeRand < 0.85 ? "small" : "medium";

      nodes.push({
        id: `bg-${nodeIndex}`,
        label: "",
        x: pos.x,
        y: pos.y,
        z: pos.z,
        isOnPath: false,
        size,
        clusterId: cluster.id,
      });
      nodeIndex++;
    }
  });

  return nodes;
}

/**
 * クラスター間エッジを生成（背景用）
 * 同一クラスター内のノード間と、隣接クラスター間をつなぐ
 * ノード数増加に伴いエッジも増やす
 */
function generateClusteredBackgroundEdges(nodes: BrainModelNode[]): BrainModelEdge[] {
  const edges: BrainModelEdge[] = [];
  let edgeIndex = 0;

  // クラスター内エッジ（連続ノード間）
  CLUSTERS.forEach((cluster) => {
    const clusterNodes = nodes.filter(n => n.clusterId === cluster.id);
    for (let i = 0; i < clusterNodes.length - 1; i++) {
      if (Math.random() < 0.55) { // 55%の確率でエッジを作成
        edges.push({
          id: `bg-edge-${edgeIndex++}`,
          from: clusterNodes[i].id,
          to: clusterNodes[i + 1].id,
          isOnPath: false,
        });
      }
    }

    // クラスター内ランダム接続（追加でネットワーク密度を上げる）
    for (let i = 0; i < clusterNodes.length; i++) {
      for (let j = i + 2; j < clusterNodes.length; j++) {
        if (Math.random() < 0.12) { // 12%の確率で離れたノード同士を接続
          edges.push({
            id: `bg-edge-${edgeIndex++}`,
            from: clusterNodes[i].id,
            to: clusterNodes[j].id,
            isOnPath: false,
          });
        }
      }
    }
  });

  // クラスター間エッジ（隣接クラスターをつなぐ）
  const clusterPairs = [
    ["cluster-experience", "cluster-analysis"],
    ["cluster-analysis", "cluster-judgment"],
    ["cluster-context", "cluster-analysis"],
    ["cluster-experience", "cluster-context"],
    ["cluster-context", "cluster-judgment"],  // 追加
    ["cluster-experience", "cluster-judgment"], // 追加
  ];

  clusterPairs.forEach(([c1, c2]) => {
    const nodes1 = nodes.filter(n => n.clusterId === c1);
    const nodes2 = nodes.filter(n => n.clusterId === c2);

    if (nodes1.length > 0 && nodes2.length > 0) {
      // 各ペアから3-5本のエッジを作成
      const edgeCount = 3 + Math.floor(Math.random() * 3);
      for (let i = 0; i < edgeCount; i++) {
        const n1 = nodes1[Math.floor(Math.random() * nodes1.length)];
        const n2 = nodes2[Math.floor(Math.random() * nodes2.length)];
        edges.push({
          id: `bg-edge-${edgeIndex++}`,
          from: n1.id,
          to: n2.id,
          isOnPath: false,
        });
      }
    }
  });

  return edges;
}

/**
 * パス1: リスク回避思考パス
 * 判断軸: 「リスク回避と効率、どちらを優先？」
 *
 * パス: 経験クラスター → 分析クラスター → 判断クラスター
 * 意味: 失敗経験からリスク感度が磨かれる
 */
function createRiskPath(): BrainModelPath {
  const backgroundNodes = generateClusteredBackgroundNodes();
  const backgroundEdges = generateClusteredBackgroundEdges(backgroundNodes);

  // パス上のメインノード（各クラスターに1つ + 中間ノード）
  const pathNodes: BrainModelNode[] = [
    {
      id: "risk-past-accident",
      label: "過去事故事例",
      x: -55,
      y: -35,
      z: -55,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-experience",
    },
    {
      id: "risk-mid-1",
      label: "",
      x: -20,
      y: 0,
      z: -35,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "risk-safety-margin",
      label: "安全マージン議論",
      x: 25,
      y: 35,
      z: -15,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-analysis",
    },
    {
      id: "risk-mid-2",
      label: "",
      x: 45,
      y: 10,
      z: 15,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "risk-tolerance-question",
      label: "リスク許容度",
      x: 65,
      y: -15,
      z: 45,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-judgment",
    },
  ];

  return {
    id: "path-risk",
    criteriaId: "c1",
    color: "#ff6b6b",
    title: "リスク回避思考パス",
    pathNodes: pathNodes.map(n => n.id),
    allNodes: [...pathNodes, ...backgroundNodes],
    allEdges: [
      { id: "edge-risk-1", from: "risk-past-accident", to: "risk-mid-1", isOnPath: true },
      { id: "edge-risk-2", from: "risk-mid-1", to: "risk-safety-margin", isOnPath: true },
      { id: "edge-risk-3", from: "risk-safety-margin", to: "risk-mid-2", isOnPath: true },
      { id: "edge-risk-4", from: "risk-mid-2", to: "risk-tolerance-question", isOnPath: true },
      ...backgroundEdges,
    ],
    narrative: {
      intro: "ベテランの頭の中では、まず過去に遭遇した事故や失敗の記憶が呼び起こされます。",
      steps: [
        { nodeId: "risk-past-accident", description: "「この類似案件で何が起きたか」を振り返る" },
        { nodeId: "risk-safety-margin", description: "「あの時どれだけ余裕を見たか」を確認" },
        { nodeId: "risk-tolerance-question", description: "「今回はどこまでリスクを取れるか」を判断" },
      ],
      conclusion: "その経験から、「リスクと効率のバランス」を問う質問が自然に生まれるのです。",
    },
  };
}

/**
 * パス2: トレードオフ思考パス
 * 判断軸: 「何を優先して何を犠牲にするか？」
 *
 * パス: 経験クラスター → 文脈クラスター → 分析クラスター → 判断クラスター
 * 意味: 痛い経験から優先順位が決まる
 */
function createTradeoffPath(): BrainModelPath {
  const backgroundNodes = generateClusteredBackgroundNodes();
  const backgroundEdges = generateClusteredBackgroundEdges(backgroundNodes);

  const pathNodes: BrainModelNode[] = [
    {
      id: "tradeoff-cost-overrun",
      label: "コスト超過事例",
      x: -65,
      y: -45,
      z: -60,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-experience",
    },
    {
      id: "tradeoff-mid-1",
      label: "",
      x: -45,
      y: 10,
      z: -20,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "tradeoff-context",
      label: "プロジェクト文脈",
      x: -25,
      y: 55,
      z: 25,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-context",
    },
    {
      id: "tradeoff-mid-2",
      label: "",
      x: 5,
      y: 40,
      z: 5,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "tradeoff-maintainability",
      label: "保全性の重要性",
      x: 30,
      y: 25,
      z: -10,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-analysis",
    },
    {
      id: "tradeoff-mid-3",
      label: "",
      x: 50,
      y: 5,
      z: 20,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "tradeoff-priority-question",
      label: "優先順位の問い",
      x: 70,
      y: -20,
      z: 50,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-judgment",
    },
  ];

  return {
    id: "path-tradeoff",
    criteriaId: "c2",
    color: "#4ecdc4",
    title: "トレードオフ思考パス",
    pathNodes: pathNodes.map(n => n.id),
    allNodes: [...pathNodes, ...backgroundNodes],
    allEdges: [
      { id: "edge-tradeoff-1", from: "tradeoff-cost-overrun", to: "tradeoff-mid-1", isOnPath: true },
      { id: "edge-tradeoff-2", from: "tradeoff-mid-1", to: "tradeoff-context", isOnPath: true },
      { id: "edge-tradeoff-3", from: "tradeoff-context", to: "tradeoff-mid-2", isOnPath: true },
      { id: "edge-tradeoff-4", from: "tradeoff-mid-2", to: "tradeoff-maintainability", isOnPath: true },
      { id: "edge-tradeoff-5", from: "tradeoff-maintainability", to: "tradeoff-mid-3", isOnPath: true },
      { id: "edge-tradeoff-6", from: "tradeoff-mid-3", to: "tradeoff-priority-question", isOnPath: true },
      ...backgroundEdges,
    ],
    narrative: {
      intro: "ベテランは過去のプロジェクトで「何かを優先したら何かを犠牲にした」経験を思い出します。",
      steps: [
        { nodeId: "tradeoff-cost-overrun", description: "「あのとき初期コストを削ったら後で痛い目にあった」" },
        { nodeId: "tradeoff-maintainability", description: "「結局、保全しやすさが一番大事だった」という教訓" },
        { nodeId: "tradeoff-priority-question", description: "「今回は何を優先すべきか」を問う" },
      ],
      conclusion: "痛い経験から、「何を優先し何を犠牲にするか」を問う質問が生まれるのです。",
    },
  };
}

/**
 * パス3: 実績重視思考パス
 * 判断軸: 「実績をどこまで重視するか？」
 *
 * パス: 経験クラスター → 分析クラスター → 文脈クラスター → 判断クラスター
 * 意味: 冒険の結果から慎重さが生まれる
 */
function createTrackRecordPath(): BrainModelPath {
  const backgroundNodes = generateClusteredBackgroundNodes();
  const backgroundEdges = generateClusteredBackgroundEdges(backgroundNodes);

  const pathNodes: BrainModelNode[] = [
    {
      id: "track-new-tech-failure",
      label: "新技術失敗事例",
      x: -60,
      y: -50,
      z: -65,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-experience",
    },
    {
      id: "track-mid-1",
      label: "",
      x: -25,
      y: -10,
      z: -40,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "track-evaluation-criteria",
      label: "実績評価基準",
      x: 15,
      y: 30,
      z: -20,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-analysis",
    },
    {
      id: "track-mid-2",
      label: "",
      x: -5,
      y: 45,
      z: 10,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "track-business-context",
      label: "ビジネス文脈",
      x: -20,
      y: 55,
      z: 30,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-context",
    },
    {
      id: "track-mid-3",
      label: "",
      x: 25,
      y: 20,
      z: 35,
      isOnPath: true,
      size: "medium",
    },
    {
      id: "track-innovation-question",
      label: "実績vs革新",
      x: 60,
      y: -10,
      z: 50,
      isOnPath: true,
      size: "large",
      clusterId: "cluster-judgment",
    },
  ];

  return {
    id: "path-track-record",
    criteriaId: "c3",
    color: "#ffe66d",
    title: "実績重視思考パス",
    pathNodes: pathNodes.map(n => n.id),
    allNodes: [...pathNodes, ...backgroundNodes],
    allEdges: [
      { id: "edge-track-1", from: "track-new-tech-failure", to: "track-mid-1", isOnPath: true },
      { id: "edge-track-2", from: "track-mid-1", to: "track-evaluation-criteria", isOnPath: true },
      { id: "edge-track-3", from: "track-evaluation-criteria", to: "track-mid-2", isOnPath: true },
      { id: "edge-track-4", from: "track-mid-2", to: "track-business-context", isOnPath: true },
      { id: "edge-track-5", from: "track-business-context", to: "track-mid-3", isOnPath: true },
      { id: "edge-track-6", from: "track-mid-3", to: "track-innovation-question", isOnPath: true },
      ...backgroundEdges,
    ],
    narrative: {
      intro: "ベテランは、新しい技術に飛びついて失敗した記憶を持っています。",
      steps: [
        { nodeId: "track-new-tech-failure", description: "「あの新技術、導入したけど結局トラブル続きだった」" },
        { nodeId: "track-evaluation-criteria", description: "「実績がある方法には理由がある」という認識" },
        { nodeId: "track-innovation-question", description: "「今回は実績を取るか、革新を取るか」を問う" },
      ],
      conclusion: "冒険の結果から、「実績と革新のバランス」を問う質問が生まれるのです。",
    },
  };
}

// パスデータをキャッシュ（毎回ランダム生成しない）
let cachedPaths: BrainModelPath[] | null = null;

/**
 * 全パスデータを取得（初回のみ生成）
 */
function getAllPaths(): BrainModelPath[] {
  if (!cachedPaths) {
    cachedPaths = [
      createRiskPath(),
      createTradeoffPath(),
      createTrackRecordPath(),
    ];
  }
  return cachedPaths;
}

/**
 * criteriaId からパスデータを取得
 */
export function getBrainModelPath(criteriaId: string): BrainModelPath | undefined {
  return getAllPaths().find(p => p.criteriaId === criteriaId);
}

/**
 * デフォルトのパスを取得（c1がない場合のフォールバック）
 */
export function getDefaultBrainModelPath(): BrainModelPath {
  return getAllPaths()[0];
}

/**
 * 全パスデータ（エクスポート用）
 */
export const BRAIN_MODEL_PATHS = getAllPaths();
