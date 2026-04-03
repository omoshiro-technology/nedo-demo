"use client"
/**
 * BrainModelVisualization - ブレインモデル3D可視化コンポーネント
 *
 * アニメーションフェーズ:
 * 1. 初期表示: クラスターが独立して表示（整理されている感）
 * 2. 問いノードがアンダーグロウで光る
 * 3. 3つの質問へエッジがホップしながら伸びる
 * 4. 各質問から選択肢を探索（グレー破線があちこちホップ→見つかったら赤く）
 * 5. 終端ノードが点滅して到達を示す
 *
 * 注意: これはデモ用実装であり、後で捨てる前提
 */

import { useEffect, useRef, useMemo, useCallback, useState } from "react";
import * as d3 from "d3";
import type { BrainModelPath } from "../../data/brainModelDemoData";
import { CLUSTERS } from "../../data/brainModelDemoData";

type Props = {
  path: BrainModelPath;
};

// アニメーションフェーズ
type AnimationPhase =
  | "initial"           // 初期表示（クラスターのみ）
  | "questionGlow"      // 問いノードがグロウ
  | "edgeToQuestions"   // 3つの質問へエッジが伸びる
  | "searchOptions"     // 選択肢を探索（グレー破線）
  | "foundOptions"      // 選択肢が見つかった（赤くなる）
  | "complete";         // 完了（終端点滅）

// 3D座標から2D投影への変換用の型
type ProjectedNode = {
  id: string;
  label: string;
  x2d: number;
  y2d: number;
  scale: number;
  z: number;
  isOnPath: boolean;
  size: "large" | "medium" | "small";
  clusterId?: string;
  // アニメーション用フラグ
  isQuestionNode?: boolean;  // 質問ノード（パスの中間）
  isOptionNode?: boolean;    // 選択肢ノード（パスの終端）
  isOriginNode?: boolean;    // 起点ノード（問い）
};

export function BrainModelVisualization({ path }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);

  // アニメーションフェーズ
  const [phase, setPhase] = useState<AnimationPhase>("initial");
  const [edgeProgress, setEdgeProgress] = useState(0); // 0-1のエッジ描画進捗
  const [searchProgress, setSearchProgress] = useState(0); // 探索の進捗
  const [foundEdges, setFoundEdges] = useState<Set<string>>(new Set()); // 見つかったエッジ

  // 回転角度の状態
  const [rotationY, setRotationY] = useState(0);
  const [rotationX, setRotationX] = useState(0.2);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [autoRotate, setAutoRotate] = useState(false); // 初期は自動回転オフ

  // ズームレベル
  const [zoom, setZoom] = useState(2.5);

  // パースペクティブ設定
  const perspective = 300;

  // パスカラーをCSS変数として設定
  const style = useMemo(() => ({
    "--path-color": path.color,
  } as React.CSSProperties), [path.color]);

  // アニメーションシーケンスを開始
  useEffect(() => {
    const timers: NodeJS.Timeout[] = [];

    // Phase 1: 初期表示（0.5秒待機）
    timers.push(setTimeout(() => {
      setPhase("questionGlow");
    }, 500));

    // Phase 2: 問いノードがグロウ（1秒後）
    timers.push(setTimeout(() => {
      setPhase("edgeToQuestions");
    }, 1500));

    // Phase 3: エッジが伸びるアニメーション（1.5秒かけて）
    let edgeStart = 0;
    timers.push(setTimeout(() => {
      edgeStart = performance.now();
      const animateEdge = () => {
        const elapsed = performance.now() - edgeStart;
        const progress = Math.min(1, elapsed / 1500);
        setEdgeProgress(progress);
        if (progress < 1) {
          requestAnimationFrame(animateEdge);
        } else {
          setPhase("searchOptions");
        }
      };
      animateEdge();
    }, 1500));

    // Phase 4: 探索アニメーション（3秒後から2.5秒かけて）
    // グレー破線で探索 → 徐々に見つかって赤くなる
    timers.push(setTimeout(() => {
      let searchStart = performance.now();
      const animateSearch = () => {
        const elapsed = performance.now() - searchStart;
        const progress = Math.min(1, elapsed / 2500);
        setSearchProgress(progress);

        // 徐々にエッジを見つける（各質問ノードから順番に）
        // search-{questionIndex}-{edgeIndex} の形式
        if (progress > 0.25) {
          // 最初の質問ノードから1つ見つかる
          setFoundEdges(new Set(["search-0-0"]));
        }
        if (progress > 0.4) {
          // 2番目の質問ノードから1つ見つかる
          setFoundEdges(new Set(["search-0-0", "search-1-0"]));
        }
        if (progress > 0.55) {
          // 3番目の質問ノードから1つ見つかる + 追加
          setFoundEdges(new Set(["search-0-0", "search-0-1", "search-1-0", "search-2-0"]));
        }
        if (progress > 0.7) {
          // さらに見つかる
          setFoundEdges(new Set([
            "search-0-0", "search-0-1", "search-0-2",
            "search-1-0", "search-1-1",
            "search-2-0", "search-2-1",
          ]));
        }
        if (progress > 0.85) {
          // 全て見つかる
          setFoundEdges(new Set([
            "search-0-0", "search-0-1", "search-0-2",
            "search-1-0", "search-1-1", "search-1-2",
            "search-2-0", "search-2-1", "search-2-2",
          ]));
        }

        if (progress < 1) {
          requestAnimationFrame(animateSearch);
        } else {
          setPhase("foundOptions");
        }
      };
      animateSearch();
    }, 3000));

    // Phase 5: 完了（6秒後）
    timers.push(setTimeout(() => {
      setPhase("complete");
      setAutoRotate(true); // 完了後は自動回転開始
    }, 6000));

    return () => {
      timers.forEach(clearTimeout);
    };
  }, []);

  // 3D座標を2D投影に変換
  const project3Dto2D = useCallback((
    x: number, y: number, z: number,
    rotY: number, rotX: number,
    currentZoom: number
  ): { x2d: number; y2d: number; scale: number } => {
    const cosY = Math.cos(rotY);
    const sinY = Math.sin(rotY);
    const x1 = x * cosY - z * sinY;
    const z1 = x * sinY + z * cosY;

    const cosX = Math.cos(rotX);
    const sinX = Math.sin(rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;

    const depth = perspective + z2;
    const projectionScale = perspective / Math.max(depth, 50);

    return {
      x2d: x1 * projectionScale * currentZoom,
      y2d: y1 * projectionScale * currentZoom,
      scale: projectionScale * currentZoom,
    };
  }, [perspective]);

  // ノードを投影（アニメーション用フラグ付き）
  const projectedNodes = useMemo((): ProjectedNode[] => {
    const pathNodeIds = path.pathNodes || [];
    const originId = pathNodeIds[0]; // 最初のノードが起点
    const questionIds = pathNodeIds.slice(1, 4); // 2-4番目が質問
    const optionIds = pathNodeIds.slice(4); // 5番目以降が選択肢

    return path.allNodes.map(node => {
      const { x2d, y2d, scale } = project3Dto2D(
        node.x, node.y, node.z,
        rotationY, rotationX, zoom
      );
      return {
        id: node.id,
        label: node.label,
        x2d,
        y2d,
        scale,
        z: node.z,
        isOnPath: node.isOnPath,
        size: node.size,
        clusterId: node.clusterId,
        isOriginNode: node.id === originId,
        isQuestionNode: questionIds.includes(node.id),
        isOptionNode: optionIds.includes(node.id),
      };
    }).sort((a, b) => a.scale - b.scale);
  }, [path.allNodes, path.pathNodes, rotationY, rotationX, zoom, project3Dto2D]);

  // エッジデータにノード参照を追加
  const edgesWithNodes = useMemo(() => {
    return path.allEdges.map(edge => {
      const fromNode = projectedNodes.find(n => n.id === edge.from);
      const toNode = projectedNodes.find(n => n.id === edge.to);
      return { ...edge, fromNode, toNode };
    }).filter(e => e.fromNode && e.toNode)
      .sort((a, b) => {
        const aDepth = Math.min(a.fromNode!.scale, a.toNode!.scale);
        const bDepth = Math.min(b.fromNode!.scale, b.toNode!.scale);
        return aDepth - bDepth;
      });
  }, [path.allEdges, projectedNodes]);

  // ノードサイズを計算
  const getNodeRadius = useCallback((size: "large" | "medium" | "small", scale: number): number => {
    const baseSize = size === "large" ? 5 : size === "medium" ? 3 : 2;
    return baseSize * Math.sqrt(scale) * 0.6;
  }, []);

  // クラスター情報を投影
  const projectedClusters = useMemo(() => {
    return CLUSTERS.map(cluster => {
      const { x2d, y2d, scale } = project3Dto2D(
        cluster.centerX, cluster.centerY, cluster.centerZ,
        rotationY, rotationX, zoom
      );
      return {
        ...cluster,
        x2d,
        y2d,
        scale,
        projectedRadius: cluster.radius * scale * 0.9,
      };
    }).sort((a, b) => a.scale - b.scale);
  }, [rotationY, rotationX, zoom, project3Dto2D]);

  // 起点ノード（問い）から3つの質問ノードへのエッジ
  const originToQuestionsEdges = useMemo(() => {
    const originNode = projectedNodes.find(n => n.isOriginNode);
    const questionNodes = projectedNodes.filter(n => n.isOnPath && n.size === "large" && n.label && !n.isOriginNode);

    if (!originNode || questionNodes.length === 0) return [];

    return questionNodes.slice(0, 3).map((qNode, index) => ({
      id: `origin-to-q-${index}`,
      fromX: originNode.x2d,
      fromY: originNode.y2d,
      toX: qNode.x2d,
      toY: qNode.y2d,
      targetClusterId: qNode.clusterId,
    }));
  }, [projectedNodes]);

  // 探索用エッジを生成（クラスター内で閉じる）
  const searchEdges = useMemo(() => {
    const edges: Array<{
      id: string;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      found: boolean;
      clusterId?: string;
    }> = [];

    // パス上のラベル付きノード（質問ノード、起点以外）を取得
    const questionNodes = projectedNodes.filter(n => n.isOnPath && n.size === "large" && n.label && !n.isOriginNode);

    questionNodes.forEach((qNode, qIndex) => {
      // このノードが属するクラスターを特定
      const nodeClusterId = qNode.clusterId;

      // 同じクラスター内の背景ノードを取得
      const sameClusterBgNodes = projectedNodes.filter(n =>
        !n.isOnPath && n.clusterId === nodeClusterId
      );

      // クラスター内に背景ノードがない場合は全体から選ぶ
      const targetNodes = sameClusterBgNodes.length > 0
        ? sameClusterBgNodes
        : projectedNodes.filter(n => !n.isOnPath);

      // 各質問から3つの方向へ探索（同一クラスター内）
      for (let i = 0; i < 3; i++) {
        const targetIdx = (qIndex * 3 + i) % Math.max(1, targetNodes.length);
        const target = targetNodes[targetIdx];
        if (target) {
          edges.push({
            id: `search-${qIndex}-${i}`,
            fromX: qNode.x2d,
            fromY: qNode.y2d,
            toX: target.x2d,
            toY: target.y2d,
            found: foundEdges.has(`search-${qIndex}-${i}`),
            clusterId: nodeClusterId,
          });
        }
      }
    });

    return edges;
  }, [projectedNodes, foundEdges]);

  // D3.jsで描画
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;

    const svg = d3.select(svgRef.current);
    const container = containerRef.current;
    const width = container.clientWidth;
    const height = container.clientHeight;
    const centerX = width / 2;
    const centerY = height / 2;

    svg.selectAll("*").remove();

    const defs = svg.append("defs");

    // グローフィルター
    const glowFilter = defs.append("filter")
      .attr("id", "glow")
      .attr("x", "-50%")
      .attr("y", "-50%")
      .attr("width", "200%")
      .attr("height", "200%");

    glowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "6")
      .attr("result", "coloredBlur");

    const feMerge = glowFilter.append("feMerge");
    feMerge.append("feMergeNode").attr("in", "coloredBlur");
    feMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // 強いグローフィルター（アンダーグロウ用）
    const underglowFilter = defs.append("filter")
      .attr("id", "underglow")
      .attr("x", "-200%")
      .attr("y", "-200%")
      .attr("width", "500%")
      .attr("height", "500%");

    underglowFilter.append("feGaussianBlur")
      .attr("stdDeviation", "20")
      .attr("result", "coloredBlur");

    const underglowMerge = underglowFilter.append("feMerge");
    underglowMerge.append("feMergeNode").attr("in", "coloredBlur");
    underglowMerge.append("feMergeNode").attr("in", "coloredBlur");
    underglowMerge.append("feMergeNode").attr("in", "SourceGraphic");

    // 点滅用フィルター
    const pulseFilter = defs.append("filter")
      .attr("id", "pulse")
      .attr("x", "-100%")
      .attr("y", "-100%")
      .attr("width", "300%")
      .attr("height", "300%");

    pulseFilter.append("feGaussianBlur")
      .attr("stdDeviation", "8")
      .attr("result", "coloredBlur");

    const pulseMerge = pulseFilter.append("feMerge");
    pulseMerge.append("feMergeNode").attr("in", "coloredBlur");
    pulseMerge.append("feMergeNode").attr("in", "SourceGraphic");

    const g = svg.append("g")
      .attr("transform", `translate(${centerX}, ${centerY})`);

    // クラスター境界を描画
    projectedClusters.forEach(cluster => {
      g.append("ellipse")
        .attr("cx", cluster.x2d)
        .attr("cy", cluster.y2d)
        .attr("rx", cluster.projectedRadius)
        .attr("ry", cluster.projectedRadius * 0.8)
        .attr("fill", cluster.color)
        .attr("stroke", cluster.color.replace("0.08", "0.15"))
        .attr("stroke-width", 1)
        .attr("stroke-dasharray", "4 4");

      const labelFontSize = Math.max(9, 11 * cluster.scale * 0.6);
      g.append("text")
        .attr("x", cluster.x2d)
        .attr("y", cluster.y2d - cluster.projectedRadius - 8)
        .attr("text-anchor", "middle")
        .attr("fill", "rgba(255, 255, 255, 0.4)")
        .attr("font-size", `${labelFontSize}px`)
        .attr("font-weight", "400")
        .text(cluster.name);
    });

    // 背景エッジを描画
    edgesWithNodes
      .filter(e => !e.isOnPath)
      .forEach(edge => {
        if (!edge.fromNode || !edge.toNode) return;

        const midX = (edge.fromNode.x2d + edge.toNode.x2d) / 2;
        const midY = (edge.fromNode.y2d + edge.toNode.y2d) / 2;
        const offset = 15 * Math.min(edge.fromNode.scale, edge.toNode.scale);

        g.append("path")
          .attr("d", `M ${edge.fromNode.x2d} ${edge.fromNode.y2d} Q ${midX} ${midY - offset} ${edge.toNode.x2d} ${edge.toNode.y2d}`)
          .attr("fill", "none")
          .attr("stroke", "rgba(255, 255, 255, 0.08)")
          .attr("stroke-width", Math.max(0.5, 1 * Math.min(edge.fromNode.scale, edge.toNode.scale) * 0.3));
      });

    // Phase 4: 探索エッジを描画（グレー破線→赤）
    if (phase === "searchOptions" || phase === "foundOptions" || phase === "complete") {
      searchEdges.forEach(edge => {
        const midX = (edge.fromX + edge.toX) / 2;
        const midY = (edge.fromY + edge.toY) / 2;
        const offset = 20;

        // foundOptions/complete フェーズでは全て見つかった状態
        const isFound = edge.found;
        const isAllFound = phase === "foundOptions" || phase === "complete";

        // グレー破線（未発見）か、赤い実線（発見済み）か
        if (isFound || isAllFound) {
          // 見つかったエッジ: 赤い実線 + グロー
          g.append("path")
            .attr("d", `M ${edge.fromX} ${edge.fromY} Q ${midX} ${midY - offset} ${edge.toX} ${edge.toY}`)
            .attr("fill", "none")
            .attr("stroke", path.color)
            .attr("stroke-width", 2)
            .attr("stroke-opacity", 0.3)
            .attr("filter", "url(#glow)");

          g.append("path")
            .attr("d", `M ${edge.fromX} ${edge.fromY} Q ${midX} ${midY - offset} ${edge.toX} ${edge.toY}`)
            .attr("fill", "none")
            .attr("stroke", path.color)
            .attr("stroke-width", 1.2)
            .attr("stroke-dasharray", "8 4")
            .attr("class", "brain-edge-animated");

          // 終端に光る点を追加（発見マーカー）
          g.append("circle")
            .attr("cx", edge.toX)
            .attr("cy", edge.toY)
            .attr("r", 4)
            .attr("fill", path.color)
            .attr("filter", "url(#glow)")
            .attr("class", phase === "complete" ? "brain-pulse" : "");
        } else {
          // 未発見エッジ: グレー破線でホップ
          g.append("path")
            .attr("d", `M ${edge.fromX} ${edge.fromY} Q ${midX} ${midY - offset} ${edge.toX} ${edge.toY}`)
            .attr("fill", "none")
            .attr("stroke", "rgba(255, 255, 255, 0.25)")
            .attr("stroke-width", 0.8)
            .attr("stroke-dasharray", "4 4")
            .attr("class", "brain-edge-searching")
            .attr("opacity", Math.min(1, searchProgress * 1.5));
        }
      });
    }

    // Phase 3: 起点ノードから3つの質問ノードへ分散するエッジを描画
    if (phase === "edgeToQuestions" || phase === "searchOptions" || phase === "foundOptions" || phase === "complete") {
      originToQuestionsEdges.forEach((edge, index) => {
        // 各エッジの描画進捗を計算（3本同時に伸びる）
        const edgeCount = originToQuestionsEdges.length;
        const edgeStart = index / edgeCount;
        const edgeEnd = (index + 1) / edgeCount;
        const localProgress = Math.max(0, Math.min(1, (edgeProgress - edgeStart * 0.3) / (1 - edgeStart * 0.3)));

        if (localProgress <= 0) return;

        const dx = edge.toX - edge.fromX;
        const dy = edge.toY - edge.fromY;
        const midX = edge.fromX + dx * 0.5;
        const midY = edge.fromY + dy * 0.5;
        // 各エッジに異なるオフセットを与えて分散感を出す
        const offset = 30 + index * 10;

        const strokeWidth = 1.2;

        // 部分的なパスを計算
        const endX = edge.fromX + dx * localProgress;
        const endY = edge.fromY + dy * localProgress;
        const partialMidX = edge.fromX + (midX - edge.fromX) * localProgress;
        const partialMidY = edge.fromY + (midY - offset - edge.fromY) * localProgress;

        // グロー
        g.append("path")
          .attr("d", `M ${edge.fromX} ${edge.fromY} Q ${partialMidX} ${partialMidY} ${endX} ${endY}`)
          .attr("fill", "none")
          .attr("stroke", path.color)
          .attr("stroke-width", strokeWidth * 3)
          .attr("stroke-opacity", 0.2)
          .attr("filter", "url(#glow)");

        // メイン
        g.append("path")
          .attr("d", `M ${edge.fromX} ${edge.fromY} Q ${partialMidX} ${partialMidY} ${endX} ${endY}`)
          .attr("fill", "none")
          .attr("stroke", path.color)
          .attr("stroke-width", strokeWidth)
          .attr("stroke-linecap", "round")
          .attr("stroke-dasharray", "12 6")
          .attr("class", "brain-edge-animated");
      });
    }

    // 背景ノードを描画
    projectedNodes
      .filter(n => !n.isOnPath)
      .forEach(node => {
        const radius = getNodeRadius(node.size, node.scale);
        const opacity = 0.15 + node.scale * 0.1;

        g.append("circle")
          .attr("cx", node.x2d)
          .attr("cy", node.y2d)
          .attr("r", radius)
          .attr("fill", `rgba(255, 255, 255, ${opacity})`);
      });

    // パス上のノードを描画
    projectedNodes
      .filter(n => n.isOnPath)
      .forEach(node => {
        const radius = getNodeRadius(node.size, node.scale);

        // Phase別の表示制御
        const showNode = phase !== "initial" || node.isOriginNode;
        const isGlowing = (phase === "questionGlow" && node.isOriginNode) ||
                          (phase === "complete" && (node.isQuestionNode || node.isOptionNode));
        const isPulsing = phase === "complete" && node.isOptionNode;

        if (!showNode && phase === "initial") {
          // 初期状態では薄く表示
          g.append("circle")
            .attr("cx", node.x2d)
            .attr("cy", node.y2d)
            .attr("r", radius)
            .attr("fill", `rgba(255, 255, 255, 0.1)`);
          return;
        }

        // アンダーグロウ（問いノードが光る）
        if (isGlowing) {
          g.append("circle")
            .attr("cx", node.x2d)
            .attr("cy", node.y2d)
            .attr("r", radius * 5)
            .attr("fill", path.color)
            .attr("opacity", 0.3)
            .attr("filter", "url(#underglow)")
            .attr("class", "brain-underglow");
        }

        // 点滅（終端ノード）
        if (isPulsing) {
          g.append("circle")
            .attr("cx", node.x2d)
            .attr("cy", node.y2d)
            .attr("r", radius * 3)
            .attr("fill", path.color)
            .attr("opacity", 0.5)
            .attr("filter", "url(#pulse)")
            .attr("class", "brain-pulse");
        }

        // 外側のグロー
        g.append("circle")
          .attr("cx", node.x2d)
          .attr("cy", node.y2d)
          .attr("r", radius * 2.5)
          .attr("fill", path.color)
          .attr("opacity", 0.12)
          .attr("filter", "url(#glow)");

        // 中間のグロー
        g.append("circle")
          .attr("cx", node.x2d)
          .attr("cy", node.y2d)
          .attr("r", radius * 1.5)
          .attr("fill", path.color)
          .attr("opacity", 0.25);

        // メインノード
        g.append("circle")
          .attr("cx", node.x2d)
          .attr("cy", node.y2d)
          .attr("r", radius)
          .attr("fill", path.color)
          .attr("filter", "url(#glow)");

        // ラベル
        if (node.label) {
          const fontSize = Math.max(10, 13 * Math.sqrt(node.scale) * 0.7);

          g.append("text")
            .attr("x", node.x2d)
            .attr("y", node.y2d + radius + fontSize + 4)
            .attr("text-anchor", "middle")
            .attr("fill", "#fff")
            .attr("font-size", `${fontSize}px`)
            .attr("font-weight", "600")
            .attr("style", `
              paint-order: stroke fill;
              stroke: rgba(0, 0, 0, 0.9);
              stroke-width: 3px;
              stroke-linecap: round;
              stroke-linejoin: round;
            `)
            .text(node.label);
        }
      });

  }, [projectedNodes, edgesWithNodes, path.color, getNodeRadius, projectedClusters, phase, edgeProgress, searchProgress, searchEdges, originToQuestionsEdges]);

  // 自動回転アニメーション
  useEffect(() => {
    if (!autoRotate) return;

    let lastTime = performance.now();

    const animate = (currentTime: number) => {
      const delta = (currentTime - lastTime) / 1000;
      lastTime = currentTime;

      setRotationY(prev => prev + delta * 0.12);

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [autoRotate]);

  // マウスドラッグで回転
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    setIsDragging(true);
    setAutoRotate(false);
    setDragStart({ x: e.clientX, y: e.clientY });
  }, []);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return;

    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    setRotationY(prev => prev + dx * 0.005);
    setRotationX(prev => Math.max(-Math.PI / 3, Math.min(Math.PI / 3, prev + dy * 0.005)));

    setDragStart({ x: e.clientX, y: e.clientY });
  }, [isDragging, dragStart]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // マウスホイールでズーム
  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    setZoom(prev => Math.max(0.8, Math.min(5, prev * delta)));
  }, []);

  // リセットボタン
  const handleReset = useCallback(() => {
    setRotationY(0);
    setRotationX(0.2);
    setZoom(2.5);
    setAutoRotate(true);
  }, []);

  // 自動回転トグル
  const toggleAutoRotate = useCallback(() => {
    setAutoRotate(prev => !prev);
  }, []);

  // ズームイン/アウトボタン
  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(5, prev * 1.2));
  }, []);

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(0.8, prev / 1.2));
  }, []);

  // フェーズ表示テキスト
  const phaseText = useMemo(() => {
    switch (phase) {
      case "initial": return "知識ネットワークを読み込み中...";
      case "questionGlow": return "問いを認識...";
      case "edgeToQuestions": return "関連する判断軸を探索中...";
      case "searchOptions": return "選択肢を探索中...";
      case "foundOptions": return "選択肢を発見！";
      case "complete": return "";
      default: return "";
    }
  }, [phase]);

  return (
    <div
      ref={containerRef}
      className="brain-model-canvas"
      style={style}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onWheel={handleWheel}
    >
      {/* 星屑背景 */}
      <div className="brain-stars" />

      {/* フェーズ表示 */}
      {phaseText && (
        <div className="brain-phase-indicator">
          <span className="brain-phase-text">{phaseText}</span>
        </div>
      )}

      {/* 操作ヒント・コントロール */}
      <div className="brain-model-controls">
        <span className="brain-model-hint">ドラッグで回転 / ホイールで拡大縮小</span>
        <button
          type="button"
          className="brain-model-reset"
          onClick={handleZoomOut}
          title="縮小"
        >
          −
        </button>
        <button
          type="button"
          className="brain-model-reset"
          onClick={handleZoomIn}
          title="拡大"
        >
          +
        </button>
        <button
          type="button"
          className="brain-model-reset"
          onClick={toggleAutoRotate}
          title={autoRotate ? "自動回転を停止" : "自動回転を開始"}
        >
          {autoRotate ? "⏸" : "▶"}
        </button>
        <button
          type="button"
          className="brain-model-reset"
          onClick={handleReset}
          title="表示をリセット"
        >
          リセット
        </button>
      </div>

      {/* SVGキャンバス */}
      <svg
        ref={svgRef}
        className="brain-model-svg"
        style={{ cursor: isDragging ? "grabbing" : "grab" }}
      />
    </div>
  );
}
