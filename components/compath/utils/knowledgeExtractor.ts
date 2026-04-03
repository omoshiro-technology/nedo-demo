import type { GraphNode, GraphResult, AxisLevel } from "../types";

export type MissingNodeDetail = {
  label: string;
  question: string;
  risk: string;
  value: string;
};

export type KnowledgeQuality = {
  completionRate: number;
  qualityScore: number;
  learningCycleScore: number;
  breakdown: {
    criticalLevelsFulfillment: number;
    causalChainCompleteness: number;
    actionabilityScore: number;
    verificationScore: number;
  };
};

export type DerivedKnowledge = {
  episodes: string[];
  knowHow: string[];
  knowHowAbsenceReason: string;
  tacit: string[];
  questions: string[];
  missingDetails: MissingNodeDetail[];
  decisions: string[];
  insights: string[];
  feedforward: FeedforwardSuggestion[];
  feedback: FeedbackSuggestion[];
  quality: KnowledgeQuality;
};

export type FeedforwardSuggestion = {
  type: "concern" | "next_step" | "recommendation";
  message: string;
  relatedNodes: string[];
  priority: "high" | "medium" | "low";
  sourceExcerpt?: string;
};

export type FeedbackSuggestion = {
  target: string;
  action: string;
  rationale: string;
  relatedNodes: string[];
  priority: "high" | "medium" | "low";
  sourceExcerpt?: string;
};

type Edge = { source: string; target: string; label?: string };

/**
 * グラフからナレッジを抽出する
 */
export function extractKnowledge(
  graph: GraphResult | undefined,
  summary: string,
  fullText?: string
): DerivedKnowledge {
  if (!graph) {
    return {
      episodes: [],
      knowHow: [],
      knowHowAbsenceReason: "",
      tacit: [],
      questions: [],
      missingDetails: [],
      decisions: [],
      insights: [],
      feedforward: [],
      feedback: [],
      quality: {
        completionRate: 0,
        qualityScore: 0,
        learningCycleScore: 0,
        breakdown: {
          criticalLevelsFulfillment: 0,
          causalChainCompleteness: 0,
          actionabilityScore: 0,
          verificationScore: 0
        }
      }
    };
  }

  const labelMap = new Map(graph.nodes.map((n) => [n.id, n.label]));
  const nodeMap = new Map(graph.nodes.map((n) => [n.id, n]));

  // 1. エピソード: 因果チェーンを抽出（最も長い経路を優先）
  const episodes = extractCausalChains(graph.edges, labelMap, nodeMap, graph.levels);

  // 2. ノウハウ: 実効性のある対策を抽出
  const knowHowResult = extractActionableKnowHow(graph.nodes);
  const knowHow = knowHowResult.items;
  const knowHowAbsenceReason = knowHowResult.absenceReason;

  // 3. 暗黙知: 重要度の高い欠損ノードを抽出（問いと対応させる）
  const missingDetails = extractCriticalMissingNodesWithDetails(graph.nodes, graph.edges, labelMap);
  const tacit = missingDetails.map((item) => item.label);
  const questions = missingDetails.map((item) => item.question);

  // 5. 意思決定: 対策ノードから決定事項を抽出
  const decisions = extractDecisions(graph.nodes);

  // 6. 示唆: グラフ構造から重要な気づきを抽出
  const insights = extractInsights(graph.nodes, graph.edges, labelMap, graph.levels);

  // 7. フィードフォワード: 先回りの推論（現時点では欠損パターンベース）
  const feedforward = generateFeedforward(graph.nodes, graph.edges, labelMap, fullText);

  // 8. フィードバック: 事後分析からのフィードバック示唆
  const feedback = generateFeedback(graph.nodes, graph.edges, labelMap, fullText);

  // 9. ナレッジ品質評価
  const quality = calculateKnowledgeQuality(graph.nodes, graph.edges, episodes, knowHow);

  return {
    episodes,
    knowHow,
    knowHowAbsenceReason,
    tacit,
    questions,
    missingDetails,
    decisions,
    insights,
    feedforward,
    feedback,
    quality
  };
}

/**
 * ナレッジ品質を総合評価
 * 重要レベルの充足度と学習サイクルの両方を考慮
 */
function calculateKnowledgeQuality(
  nodes: GraphNode[],
  edges: Edge[],
  episodes: string[],
  knowHow: string[]
): KnowledgeQuality {
  // 1. 重要レベルの充足度（根本原因・恒久対策・効果検証）
  const criticalLevels = ["根本原因", "恒久対策", "効果検証", "横展開"];
  const criticalNodes = nodes.filter((n) => criticalLevels.includes(n.levelLabel));
  const criticalPresent = criticalNodes.filter((n) => n.status !== "missing");
  const criticalLevelsFulfillment =
    criticalNodes.length > 0 ? (criticalPresent.length / criticalNodes.length) * 100 : 0;

  // 2. 因果チェーンの完全性（現象→原因→対策の流れ）
  const hasPhenomenon = nodes.some((n) => n.levelLabel === "現象" && n.status !== "missing");
  const hasRootCause = nodes.some(
    (n) => (n.levelLabel === "根本原因" || n.levelLabel === "原因") && n.status !== "missing"
  );
  const hasPermanentAction = nodes.some(
    (n) => (n.levelLabel === "恒久対策" || n.levelLabel === "対策") && n.status !== "missing"
  );

  let causalChainCompleteness = 0;
  if (hasPhenomenon) causalChainCompleteness += 33.3;
  if (hasRootCause) causalChainCompleteness += 33.3;
  if (hasPermanentAction) causalChainCompleteness += 33.4;

  // 3. 実行可能性スコア（ノウハウの具体性）
  const totalCountermeasures = nodes.filter(
    (n) => (n.levelLabel === "対策" || n.levelLabel === "恒久対策") && n.status !== "missing"
  ).length;
  const actionabilityScore =
    totalCountermeasures > 0 ? (knowHow.length / totalCountermeasures) * 100 : 0;

  // 4. 検証・横展開スコア（学習サイクル）
  const hasVerification = nodes.some((n) => n.levelLabel === "効果検証" && n.status !== "missing");
  const hasHorizontalDeployment = nodes.some(
    (n) => n.levelLabel === "横展開" && n.status !== "missing"
  );

  let verificationScore = 0;
  if (hasVerification) verificationScore += 50;
  if (hasHorizontalDeployment) verificationScore += 50;

  // 5. 学習サイクルスコア（PDCA/SECIの回転度）
  // Plan(原因分析) → Do(対策実施) → Check(検証) → Act(横展開)
  let learningCycleScore = 0;
  if (hasRootCause) learningCycleScore += 25; // Plan
  if (hasPermanentAction) learningCycleScore += 25; // Do
  if (hasVerification) learningCycleScore += 25; // Check
  if (hasHorizontalDeployment) learningCycleScore += 25; // Act

  // 6. 総合品質スコア（重要度を加味した加重平均）
  const qualityScore =
    criticalLevelsFulfillment * 0.4 + // 重要レベル充足度 40%
    causalChainCompleteness * 0.3 + // 因果チェーン完全性 30%
    actionabilityScore * 0.15 + // 実行可能性 15%
    verificationScore * 0.15; // 検証・横展開 15%

  // 7. 基本完成度（全ノードベース）
  const totalNodes = nodes.length;
  const presentNodes = nodes.filter((n) => n.status !== "missing").length;
  const completionRate = totalNodes > 0 ? (presentNodes / totalNodes) * 100 : 0;

  return {
    completionRate,
    qualityScore,
    learningCycleScore,
    breakdown: {
      criticalLevelsFulfillment,
      causalChainCompleteness,
      actionabilityScore,
      verificationScore
    }
  };
}

/**
 * 因果チェーンを抽出（最長経路優先）
 */
function extractCausalChains(
  edges: Edge[],
  labelMap: Map<string, string>,
  nodeMap: Map<string, GraphNode>,
  levels: AxisLevel[]
): string[] {
  if (edges.length === 0) return [];

  // グラフを隣接リストに変換
  const adjList = new Map<string, string[]>();
  edges.forEach((e) => {
    if (!adjList.has(e.source)) adjList.set(e.source, []);
    adjList.get(e.source)!.push(e.target);
  });

  // レベル順序マップ
  const levelOrder = new Map(levels.map((l, idx) => [l.label, idx]));

  // DFSで最長パスを見つける
  const allPaths: string[][] = [];
  const visited = new Set<string>();

  function dfs(nodeId: string, path: string[]) {
    visited.add(nodeId);
    path.push(nodeId);

    const neighbors = adjList.get(nodeId) || [];
    if (neighbors.length === 0) {
      // 終端ノードに到達
      allPaths.push([...path]);
    } else {
      for (const next of neighbors) {
        if (!visited.has(next)) {
          dfs(next, path);
        }
      }
    }

    path.pop();
    visited.delete(nodeId);
  }

  // 全ての開始ノード（入次数0）から探索
  const targetNodes = new Set(edges.map((e) => e.target));
  const startNodes = Array.from(new Set(edges.map((e) => e.source))).filter(
    (s) => !targetNodes.has(s)
  );

  startNodes.forEach((start) => {
    dfs(start, []);
  });

  // パスを長さ順にソート（長い順）
  allPaths.sort((a, b) => b.length - a.length);

  // 上位12パスを文字列化
  const episodes = allPaths.slice(0, 12).map((path) => {
    return path
      .map((id) => labelMap.get(id) ?? id)
      .filter((label) => !/未記入|missing/i.test(label))
      .join(" → ");
  });

  return episodes.filter((e) => e.includes("→"));
}

/**
 * 実効性のある対策（動詞を含む、具体的な）を抽出
 * ノウハウが見つからない理由も返す
 */
function extractActionableKnowHow(nodes: GraphNode[]): {
  items: string[];
  absenceReason: string;
} {
  const actionVerbs = [
    "実施",
    "対応",
    "改善",
    "修正",
    "導入",
    "設計",
    "検証",
    "調整",
    "見直",
    "確認",
    "追加",
    "変更",
    "削除",
    "更新"
  ];

  const countermeasureNodes = nodes.filter((n) => n.levelLabel === "対策" && n.status !== "missing");

  if (countermeasureNodes.length === 0) {
    return {
      items: [],
      absenceReason: "対策レベルのノードが1つもありません。文書に対策が記載されていない可能性があります。"
    };
  }

  const withActionVerbs = countermeasureNodes.filter((n) =>
    actionVerbs.some((verb) => n.label.includes(verb))
  );

  if (withActionVerbs.length === 0) {
    return {
      items: [],
      absenceReason: `対策は${countermeasureNodes.length}件ありますが、具体的な行動を示す動詞（実施・改善・導入など）が含まれていません。抽象的な記述に留まっています。`
    };
  }

  const actionable = withActionVerbs.filter((n) => !/未記入|不明|検討中/.test(n.label));

  if (actionable.length === 0) {
    return {
      items: [],
      absenceReason: `対策に動詞は含まれていますが、「未記入」「不明」「検討中」など不確定な表現が多く、実行可能なノウハウになっていません。`
    };
  }

  const items = actionable.map((n) => n.label).slice(0, 8);

  return {
    items,
    absenceReason: ""
  };
}

/**
 * 重要度の高い欠損ノードとその詳細情報を抽出
 * リスクと価値を明示して行動を促す
 */
function extractCriticalMissingNodesWithDetails(
  nodes: GraphNode[],
  edges: Edge[],
  labelMap: Map<string, string>
): MissingNodeDetail[] {
  const missingNodes = nodes.filter(
    (n) => n.status === "missing" && !/未記入|missing/i.test(n.label)
  );

  if (missingNodes.length === 0) return [];

  // 各ノードのエッジ数をカウント（接続が多い = 重要）
  const edgeCount = new Map<string, number>();
  edges.forEach((e) => {
    edgeCount.set(e.source, (edgeCount.get(e.source) || 0) + 1);
    edgeCount.set(e.target, (edgeCount.get(e.target) || 0) + 1);
  });

  // 欠損ノードを接続数でソート
  const sorted = missingNodes.sort((a, b) => {
    const countA = edgeCount.get(a.id) || 0;
    const countB = edgeCount.get(b.id) || 0;
    return countB - countA;
  });

  // ラベルで重複除去（同じラベルのノードが複数ある場合）
  const seen = new Set<string>();
  const unique = sorted.filter((node) => {
    if (seen.has(node.label)) return false;
    seen.add(node.label);
    return true;
  });

  // 各ノードに対して詳細情報を生成
  return unique.slice(0, 6).map((node) => {
    const incoming = edges.filter((e) => e.target === node.id);
    const outgoing = edges.filter((e) => e.source === node.id);

    let question = "";
    let risk = "";
    let value = "";

    if (node.levelLabel === "根本原因" || node.levelLabel === "原因") {
      const defects = incoming.map((e) => labelMap.get(e.source)).filter(Boolean);
      if (defects.length > 0) {
        question = `「${node.label}」の具体的な要因は？ → ${defects[0]}への影響は？`;
      } else {
        question = `「${node.label}」の根本原因は何か？誰が特定すべきか？`;
      }
      risk = "表面的な対策のみで再発する可能性が高くなります";
      value = "真因を特定することで、効果的な再発防止策を立案できます";
    } else if (node.levelLabel === "恒久対策" || node.levelLabel === "対策") {
      const causes = incoming.map((e) => labelMap.get(e.source)).filter(Boolean);
      if (causes.length > 0) {
        question = `「${node.label}」の実施方法は？ ${causes[0]}への対策として十分か？`;
      } else {
        question = `「${node.label}」は誰がいつまでに実施するのか？`;
      }
      risk = "同じ問題が再び発生し、顧客や組織に損害を与えます";
      value = "具体的な対策を記録することで、他のプロジェクトでも活用できます";
    } else if (node.levelLabel === "効果検証") {
      question = `「${node.label}」の検証方法は？いつまでに確認しますか？`;
      risk = "対策が有効かどうか分からず、PDCAサイクルが回りません";
      value = "検証により対策の実効性が証明され、組織の信頼性が向上します";
    } else if (node.levelLabel === "横展開") {
      question = `「${node.label}」はどの範囲に展開しますか？誰が担当しますか？`;
      risk = "他の製品・プロジェクトで同じ問題が潜在したまま放置されます";
      value = "組織全体で学習が共有され、予防的な品質向上が実現します";
    } else if (node.levelLabel === "事例") {
      question = `「${node.label}」の具体的な発生事例は？過去に類似ケースはあるか？`;
      risk = "抽象的な記録のみで、実務での再現性が低くなります";
      value = "具体的な事例により、他のメンバーが状況を理解し対応できます";
    } else {
      question = `「${node.label}」の具体は？誰がいつまでに明らかにするか？`;
      risk = "情報が不足したまま記録され、ナレッジとして活用できません";
      value = "詳細を記録することで、将来の類似問題で迅速に対応できます";
    }

    return {
      label: node.label,
      question,
      risk,
      value
    };
  });
}

/**
 * 決定事項を抽出
 */
function extractDecisions(nodes: GraphNode[]): string[] {
  return nodes
    .filter((n) => n.levelLabel === "対策" && n.status !== "missing")
    .filter((n) => !/未記入|不明|検討中/.test(n.label))
    .map((n) => `${n.label} を実施/決定`)
    .slice(0, 6);
}

/**
 * 原文からノードラベルに関連する箇所を抽出
 * ノードラベルを含む文とその前後2文を返す
 */
function extractSourceExcerpt(fullText: string | undefined, nodeLabels: string[]): string | undefined {
  if (!fullText || nodeLabels.length === 0) {
    return undefined;
  }

  // 文を分割（句点で区切る）
  const sentences = fullText.split(/[。．\n]/).filter((s) => s.trim().length > 0);

  if (sentences.length === 0) {
    return undefined;
  }

  // いずれかのノードラベルを含む文のインデックスを検索
  // 複数の戦略でマッチを試みる
  let matchIndex = -1;

  // 戦略1: ラベル全体でマッチ
  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i]!;
    for (const label of nodeLabels) {
      if (sentence.includes(label)) {
        matchIndex = i;
        break;
      }
    }
    if (matchIndex !== -1) break;
  }

  // 戦略2: ラベルの最初の5-10文字でマッチ
  if (matchIndex === -1) {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]!;
      for (const label of nodeLabels) {
        if (label.length >= 5) {
          const labelPrefix = label.substring(0, Math.min(label.length, 10));
          if (sentence.includes(labelPrefix)) {
            matchIndex = i;
            break;
          }
        }
      }
      if (matchIndex !== -1) break;
    }
  }

  // 戦略3: ラベルの単語（3文字以上）でマッチ
  if (matchIndex === -1) {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]!;
      for (const label of nodeLabels) {
        // ラベルを「と」「、」「・」「を」「の」などで分割して3文字以上の単語を検索
        const words = label.split(/[とを、・のに]/).filter((w) => w.trim().length >= 3);
        for (const word of words) {
          const trimmedWord = word.trim();
          if (trimmedWord.length >= 3 && sentence.includes(trimmedWord)) {
            matchIndex = i;
            break;
          }
        }
        if (matchIndex !== -1) break;
      }
      if (matchIndex !== -1) break;
    }
  }

  // 戦略4: さらに細かく - 動詞部分を除去して名詞のみでマッチ
  if (matchIndex === -1) {
    for (let i = 0; i < sentences.length; i++) {
      const sentence = sentences[i]!;
      for (const label of nodeLabels) {
        // 「〜を実施」「〜を導入」などの定型表現を除去
        const coreLabel = label.replace(/(を実施|を導入|を改善|を修正|を検証|を確認|を追加|を変更|を削除|を更新)$/, '');
        if (coreLabel.length >= 3 && coreLabel !== label && sentence.includes(coreLabel)) {
          matchIndex = i;
          break;
        }
      }
      if (matchIndex !== -1) break;
    }
  }

  // どの戦略でもマッチしなかった場合、undefinedを返す（デフォルトを表示しない）
  if (matchIndex === -1) {
    return undefined;
  }

  // 前後2文を含めて抜粋（最大5文）
  const startIndex = Math.max(0, matchIndex - 2);
  const endIndex = Math.min(sentences.length, matchIndex + 3);
  // 改行で区切って読みやすくする
  const excerpt = sentences.slice(startIndex, endIndex).join("。\n") + "。";

  // 長すぎる場合は200文字に制限
  if (excerpt.length > 200) {
    return excerpt.substring(0, 200) + "...";
  }

  return excerpt;
}

/**
 * グラフ構造から重要な示唆（インサイト）を抽出
 * ユーザーに気づきを与える本質的な洞察
 */
function extractInsights(
  nodes: GraphNode[],
  edges: Edge[],
  labelMap: Map<string, string>,
  levels: AxisLevel[]
): string[] {
  const insights: string[] = [];

  // 1. 根本原因の深さを分析
  const rootCauses = nodes.filter(
    (n) => (n.levelLabel === "根本原因" || n.levelLabel === "原因") && n.status !== "missing"
  );
  const directCauses = nodes.filter((n) => n.levelLabel === "直接原因" && n.status !== "missing");

  if (rootCauses.length === 0 && directCauses.length > 0) {
    insights.push(
      "直接原因のみで根本原因が未特定です。表面的な対症療法に留まり、再発リスクが高い状態です。"
    );
  } else if (rootCauses.length > 0) {
    const hasSystemicIssue = rootCauses.some((n) =>
      /(プロセス|体制|仕組み|ルール|手順|チェック|教育|共有|連携|マニュアル)/.test(n.label)
    );
    if (hasSystemicIssue) {
      insights.push(
        "組織的・プロセス的な根本原因が特定されています。個人の問題ではなく、仕組みの改善が必要です。"
      );
    }
  }

  // 2. 対策の質を分析
  const immediateActions = nodes.filter(
    (n) => n.levelLabel === "応急対策" && n.status !== "missing"
  );
  const permanentActions = nodes.filter(
    (n) => (n.levelLabel === "恒久対策" || n.levelLabel === "対策") && n.status !== "missing"
  );

  if (immediateActions.length > 0 && permanentActions.length === 0) {
    insights.push(
      "応急対策のみで恒久対策がありません。一時しのぎに過ぎず、同じ問題が再発する可能性があります。"
    );
  }

  if (permanentActions.length > 0) {
    const hasAutomation = permanentActions.some((n) =>
      /(自動|チェック|検証|テスト|CI|監視|アラート)/.test(n.label)
    );
    if (hasAutomation) {
      insights.push("自動化・システム化による恒久対策が講じられており、再発防止の実効性が高いです。");
    }
  }

  // 3. 横展開の有無
  const horizontalDeployment = nodes.filter(
    (n) => n.levelLabel === "横展開" && n.status !== "missing"
  );

  if (horizontalDeployment.length > 0) {
    insights.push(
      "類似箇所への横展開が計画されており、組織全体への学習が波及する可能性があります。"
    );
  } else if (permanentActions.length > 0) {
    insights.push(
      "対策が実施されていますが横展開が未記入です。他の製品・プロジェクトでも同様の問題が潜在している可能性があります。"
    );
  }

  // 4. 効果検証の有無
  const verification = nodes.filter((n) => n.levelLabel === "効果検証" && n.status !== "missing");

  if (permanentActions.length > 0 && verification.length === 0) {
    insights.push(
      "対策の効果検証が未実施です。対策が本当に有効かどうか確認できず、PDCAサイクルが回っていません。"
    );
  }

  // 5. 因果関係の複雑さを分析
  const phenomena = nodes.filter((n) => n.levelLabel === "現象" && n.status !== "missing");
  if (phenomena.length > 0) {
    const phenomenon = phenomena[0]!;
    const outgoingEdges = edges.filter((e) => e.source === phenomenon.id);
    if (outgoingEdges.length >= 3) {
      insights.push(
        "複数の原因が絡む複合要因です。優先順位を付けて段階的に対策を進める必要があります。"
      );
    }
  }

  // 6. 欠損の重大性を分析
  const criticalMissing = nodes.filter(
    (n) =>
      n.status === "missing" &&
      (n.levelLabel === "根本原因" ||
        n.levelLabel === "恒久対策" ||
        n.levelLabel === "効果検証")
  );

  if (criticalMissing.length >= 2) {
    insights.push(
      `重要な${criticalMissing.length}項目が欠損しています。報告書の品質が不十分で、再発防止策が不完全な可能性があります。`
    );
  }

  // 7. ノウハウの蓄積度
  const countermeasures = nodes.filter(
    (n) => (n.levelLabel === "対策" || n.levelLabel === "恒久対策") && n.status !== "missing"
  );

  if (countermeasures.length >= 3) {
    const specificActions = countermeasures.filter(
      (n) =>
        /(実施|導入|変更|追加|改善|修正|見直し|強化)/.test(n.label) &&
        n.label.length >= 10
    );
    if (specificActions.length >= 2) {
      insights.push(
        "具体的で実行可能な対策が複数立案されており、組織としてのナレッジ蓄積が進んでいます。"
      );
    }
  }

  // 8. リスクレベルの評価
  const hasRootCause = rootCauses.length > 0;
  const hasPermanentAction = permanentActions.length > 0;
  const hasVerification = verification.length > 0;

  if (!hasRootCause && !hasPermanentAction) {
    insights.push(
      "【高リスク】根本原因も恒久対策も不明確です。問題の本質が理解されておらず、早急な再分析が必要です。"
    );
  } else if (hasRootCause && hasPermanentAction && hasVerification) {
    insights.push(
      "【低リスク】根本原因分析・恒久対策・効果検証が揃っており、組織的な学習サイクルが機能しています。"
    );
  }

  return insights.slice(0, 6);
}

/**
 * フィードフォワード推論を生成
 * エピソード（現象・原因・対策）を具体的に示して文脈を伝える
 */
function generateFeedforward(
  nodes: GraphNode[],
  edges: Edge[],
  labelMap: Map<string, string>,
  fullText?: string
): FeedforwardSuggestion[] {
  const suggestions: FeedforwardSuggestion[] = [];

  // パターン1: 根本原因が未特定（最優先）
  const rootCauses = nodes.filter(
    (n) => (n.levelLabel === "根本原因" || n.levelLabel === "原因") && n.status !== "missing"
  );
  const phenomena = nodes.filter((n) => n.levelLabel === "現象" && n.status !== "missing");
  const permanentActions = nodes.filter(
    (n) => (n.levelLabel === "恒久対策" || n.levelLabel === "対策") && n.status !== "missing"
  );

  if (phenomena.length > 0 && rootCauses.length === 0) {
    const phenomenonLabel = phenomena[0]!.label;
    const sourceExcerpt = extractSourceExcerpt(fullText, [phenomenonLabel]);
    suggestions.push({
      type: "concern",
      message: `「${phenomenonLabel}」という現象は記録されていますが、根本原因が特定されていません。表面的な対策だけでは同じ問題が再発します。5WHY分析を実施して真因を特定してください。`,
      relatedNodes: [],
      priority: "high",
      sourceExcerpt
    });
  }

  // パターン2: 恒久対策が未記入
  if (rootCauses.length > 0 && permanentActions.length === 0) {
    const causeLabels = rootCauses
      .map((n) => n.label)
      .slice(0, 2)
      .join("、");
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」の原因として` : "";
    const sourceLabels = rootCauses.slice(0, 2).map((n) => n.label);
    const sourceExcerpt = extractSourceExcerpt(fullText, sourceLabels);
    suggestions.push({
      type: "concern",
      message: `${phenomenonContext}「${causeLabels}」が特定されていますが、恒久対策が未記入です。再発防止の具体的なアクションプランを立案してください。`,
      relatedNodes: [],
      priority: "high",
      sourceExcerpt
    });
  }

  // パターン3: 効果検証が未実施
  const verification = nodes.filter((n) => n.levelLabel === "効果検証" && n.status !== "missing");
  if (permanentActions.length > 0 && verification.length === 0) {
    const actionExamples = permanentActions
      .map((n) => n.label)
      .slice(0, 2)
      .join("、");
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」に対して` : "";
    const sourceLabels = permanentActions.slice(0, 2).map((n) => n.label);
    const sourceExcerpt = extractSourceExcerpt(fullText, sourceLabels);
    suggestions.push({
      type: "recommendation",
      message: `${phenomenonContext}「${actionExamples}」${permanentActions.length > 2 ? `など${permanentActions.length}件の対策` : "という対策"}が実施されていますが、効果検証が未記入です。対策が本当に有効かどうか分からないままPDCAサイクルが止まっています。対策実施後1ヶ月以内に効果測定を計画してください。`,
      relatedNodes: [],
      priority: "high",
      sourceExcerpt
    });
  }

  // パターン4: 横展開が未実施
  const horizontalDeployment = nodes.filter(
    (n) => n.levelLabel === "横展開" && n.status !== "missing"
  );
  if (permanentActions.length > 0 && horizontalDeployment.length === 0) {
    const actionExample = permanentActions[0]!.label;
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」への対策として` : "";
    const sourceExcerpt = extractSourceExcerpt(fullText, [actionExample]);
    suggestions.push({
      type: "recommendation",
      message: `${phenomenonContext}「${actionExample}」${permanentActions.length > 1 ? `など${permanentActions.length}件の対策` : "が"}実施されていますが、横展開が未記入です。他の製品・プロジェクトでも同じ問題が潜在している可能性があります。類似箇所を洗い出し、予防的に対策を展開してください。`,
      relatedNodes: [],
      priority: "medium",
      sourceExcerpt
    });
  }

  // パターン5: 応急対策のみで恒久対策なし
  const immediateActions = nodes.filter(
    (n) => n.levelLabel === "応急対策" && n.status !== "missing"
  );
  if (immediateActions.length > 0 && permanentActions.length === 0) {
    const immediateActionExample = immediateActions[0]!.label;
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」に対して` : "";
    const sourceExcerpt = extractSourceExcerpt(fullText, [immediateActionExample]);
    suggestions.push({
      type: "concern",
      message: `${phenomenonContext}「${immediateActionExample}」${immediateActions.length > 1 ? `など応急対策のみ` : "という応急対策のみ"}で恒久対策がありません。一時しのぎに過ぎず、同じ問題が再発する可能性が高いです。根本的な解決策を検討してください。`,
      relatedNodes: [],
      priority: "high",
      sourceExcerpt
    });
  }

  // パターン6: 複合要因の可能性
  if (phenomena.length > 0) {
    const phenomenon = phenomena[0]!;
    const outgoingEdges = edges.filter((e) => e.source === phenomenon.id);
    if (outgoingEdges.length >= 3) {
      const causeExamples = outgoingEdges
        .slice(0, 2)
        .map((e) => labelMap.get(e.target))
        .filter(Boolean)
        .join("、");
      const causeLabels = outgoingEdges
        .slice(0, 2)
        .map((e) => labelMap.get(e.target))
        .filter((l): l is string => Boolean(l));
      const sourceExcerpt = extractSourceExcerpt(fullText, causeLabels);
      suggestions.push({
        type: "concern",
        message: `「${phenomenon.label}」には「${causeExamples}」など${outgoingEdges.length}個の原因が絡む複合要因です。すべてを同時に解決するのは困難なため、影響度と対策難易度を評価し、優先順位を付けて段階的に対策を進めてください。`,
        relatedNodes: [],
        priority: "medium",
        sourceExcerpt
      });
    }
  }

  return suggestions.slice(0, 4);
}

/**
 * フィードバック示唆を生成
 * ドキュメント内容への具体的で実践的な改善アクションのみを提示（第一レイヤー）
 */
function generateFeedback(
  nodes: GraphNode[],
  edges: Edge[],
  labelMap: Map<string, string>,
  fullText?: string
): FeedbackSuggestion[] {
  const suggestions: FeedbackSuggestion[] = [];

  const phenomena = nodes.filter((n) => n.levelLabel === "現象" && n.status !== "missing");
  const rootCauses = nodes.filter(
    (n) => (n.levelLabel === "根本原因" || n.levelLabel === "原因") && n.status !== "missing"
  );
  const permanentActions = nodes.filter(
    (n) => (n.levelLabel === "恒久対策" || n.levelLabel === "対策") && n.status !== "missing"
  );
  const verification = nodes.filter((n) => n.levelLabel === "効果検証" && n.status !== "missing");
  const horizontalDeployment = nodes.filter(
    (n) => n.levelLabel === "横展開" && n.status !== "missing"
  );

  // パターン1: 効果検証の具体化（対策はあるが検証方法が不明確）
  if (permanentActions.length > 0 && verification.length === 0) {
    const actionExamples = permanentActions
      .map((n) => n.label)
      .slice(0, 2)
      .join("、");
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」への` : "";
    const sourceLabels = permanentActions.slice(0, 2).map((n) => n.label);
    const sourceExcerpt = extractSourceExcerpt(fullText, sourceLabels);

    suggestions.push({
      target: `${phenomenonContext}対策`,
      action: "効果検証の測定指標・基準値・測定期限を明記",
      rationale: `「${actionExamples}」${permanentActions.length > 2 ? `など${permanentActions.length}件の対策` : "という対策"}が記載されていますが、どのように効果を測定するか不明です。例：温度低減値（目標-10℃）、測定日（対策後1ヶ月）など具体的な検証計画を追記してください。`,
      relatedNodes: permanentActions.slice(0, 2).map((n) => n.label),
      priority: "high",
      sourceExcerpt
    });
  }

  // パターン2: 横展開の具体化（対策はあるが適用範囲が不明確）
  if (permanentActions.length > 0 && horizontalDeployment.length === 0) {
    const actionExample = permanentActions[0]!.label;
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」への` : "";
    const sourceExcerpt = extractSourceExcerpt(fullText, [actionExample]);

    suggestions.push({
      target: `${phenomenonContext}対策`,
      action: "類似箇所・対象範囲の特定と展開計画を明記",
      rationale: `「${actionExample}」${permanentActions.length > 1 ? `など${permanentActions.length}件の対策` : "という対策"}が記載されていますが、他の類似設備・製品への展開が不明です。例：同型機3台（A棟、B棟）、類似プロセス2ライン、など具体的な展開対象と時期を追記してください。`,
      relatedNodes: [permanentActions[0]!.label],
      priority: "medium",
      sourceExcerpt
    });
  }

  // パターン3: 対策の精緻化（抽象的・曖昧な対策の具体化）
  const vagueActions = permanentActions.filter(
    (n) =>
      /(検討|見直し|強化|徹底|注意|周知)/.test(n.label) &&
      !/(実施|導入|変更|追加|削除|更新)/.test(n.label)
  );

  if (vagueActions.length > 0) {
    const vagueExample = vagueActions[0]!.label;
    const phenomenonContext =
      phenomena.length > 0 ? `「${phenomena[0]!.label}」への` : "";
    const sourceExcerpt = extractSourceExcerpt(fullText, [vagueExample]);

    suggestions.push({
      target: `${phenomenonContext}対策`,
      action: "対策内容を具体的なアクション（5W1H）に分解",
      rationale: `「${vagueExample}」${vagueActions.length > 1 ? `など${vagueActions.length}件` : ""}は抽象的で、誰が何をすべきか不明確です。例：「点検頻度を見直し」→「日次点検を週次に変更（担当：保全チーム、期限：来月）」のように、具体的な実施内容・担当・期限を明記してください。`,
      relatedNodes: [vagueActions[0]!.label],
      priority: "medium",
      sourceExcerpt
    });
  }

  // パターン4: 因果関係の明確化（原因と対策の紐付けが弱い）
  if (rootCauses.length > 0 && permanentActions.length > 0) {
    // 原因から対策へのエッジが少ない場合
    const causeToActionEdges = edges.filter(
      (e) =>
        rootCauses.some((c) => c.id === e.source) &&
        permanentActions.some((a) => a.id === e.target)
    );

    if (causeToActionEdges.length < Math.min(rootCauses.length, permanentActions.length)) {
      const causeExample = rootCauses[0]!.label;
      const actionExample = permanentActions[0]!.label;
      const sourceLabels = [causeExample, actionExample];
      const sourceExcerpt = extractSourceExcerpt(fullText, sourceLabels);

      suggestions.push({
        target: "因果関係の記述",
        action: "各対策がどの原因に対応するか明記",
        rationale: `「${causeExample}」などの原因と「${actionExample}」などの対策が記載されていますが、どの対策がどの原因に対応するか不明瞭です。対策実施時に「この対策は〇〇の原因に対する再発防止策である」と明記してください。`,
        relatedNodes: [rootCauses[0]!.label, permanentActions[0]!.label],
        priority: "low",
        sourceExcerpt
      });
    }
  }

  // パターン5: 事例の具体化（場所名のみで内容が不明確）
  const caseStudies = nodes.filter((n) => n.levelLabel === "事例" && n.status !== "missing");

  const vagueCaseStudies = caseStudies.filter((n) => {
    // 短すぎる（20文字以下）
    if (n.label.length <= 20) return true;

    // 場所名・拠点名のみのパターン
    const locationOnlyPattern =
      /^([A-Z]\d*拠点|本社|支社|工場|.*ライン|.*棟|.*号機)[\s／]*([A-Z]\d*拠点|本社|支社|工場|.*ライン|.*棟|.*号機)*$/;
    if (locationOnlyPattern.test(n.label)) return true;

    return false;
  });

  if (vagueCaseStudies.length > 0) {
    const caseExample = vagueCaseStudies[0]!.label;
    const sourceExcerpt = extractSourceExcerpt(fullText, [caseExample]);

    suggestions.push({
      target: "事例の記述",
      action: "具体的な発生ストーリーを5W1Hで明記",
      rationale: `「${caseExample}」は場所名のみで、後から見たときに何が起きたか分かりません。いつ・どこで・何が起きたかを具体的に記録してください。例：「2024年3月、本社A拠点開発ラインで冷却装置の温度異常により不良品20個発生」のようなストーリー形式で記載してください。`,
      relatedNodes: [vagueCaseStudies[0]!.label],
      priority: "high",
      sourceExcerpt
    });
  }

  return suggestions.slice(0, 3);
}
