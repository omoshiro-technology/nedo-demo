/**
 * DecisionContext ビルダー
 *
 * セッションの状態からLLM入力用のDecisionContextを構築する
 */

import type {
  DecisionNavigatorSession,
  DecisionContext,
  DecisionFlowNode,
  LLMContextUpdates,
} from "./types";

// ============================================================
// Context 構築
// ============================================================

/**
 * セッションから現在のDecisionContextを取得または初期化
 * @param session セッション
 * @returns DecisionContext
 */
export function getOrCreateContext(session: DecisionNavigatorSession): DecisionContext {
  if (session.decisionContext) {
    return session.decisionContext;
  }

  // 初期コンテキストを作成
  return {
    purpose: session.purpose,
    currentSituation: undefined,
    documentSummary: session.documentSource?.extractedContext,
    constraints: [],
    assumptions: [],
    commitments: [],
    selectedPath: [],
  };
}

/**
 * 選択に基づいてコンテキストを更新
 * @param context 現在のコンテキスト
 * @param selectedNode 選択されたノード
 * @param contextUpdates LLMが提案したコンテキスト更新
 * @returns 更新されたコンテキスト
 */
export function updateContextWithSelection(
  context: DecisionContext,
  selectedNode: DecisionFlowNode,
  contextUpdates?: LLMContextUpdates
): DecisionContext {
  const updated: DecisionContext = {
    ...context,
    selectedPath: [...context.selectedPath, selectedNode.id],
  };

  // LLMが提案したコンテキスト更新をマージ
  if (contextUpdates) {
    if (contextUpdates.constraints?.length) {
      updated.constraints = [
        ...context.constraints,
        ...contextUpdates.constraints.filter(c => !context.constraints.includes(c)),
      ];
    }
    if (contextUpdates.assumptions?.length) {
      updated.assumptions = [
        ...context.assumptions,
        ...contextUpdates.assumptions.filter(a => !context.assumptions.includes(a)),
      ];
    }
    if (contextUpdates.commitments?.length) {
      updated.commitments = [
        ...context.commitments,
        ...contextUpdates.commitments.filter(c => !context.commitments.includes(c)),
      ];
    }
  }

  return updated;
}

/**
 * clarification回答に基づいてコンテキストを更新
 * @param context 現在のコンテキスト
 * @param answers 質問への回答リスト
 * @returns 更新されたコンテキスト
 */
export function updateContextWithClarification(
  context: DecisionContext,
  answers: Array<{ question: string; answer: string }>
): DecisionContext {
  // 回答から制約や前提条件を抽出
  const newAssumptions: string[] = [];

  for (const { question, answer } of answers) {
    // 回答を前提条件として追加
    const assumption = `${question}: ${answer}`;
    if (!context.assumptions.includes(assumption)) {
      newAssumptions.push(assumption);
    }
  }

  return {
    ...context,
    assumptions: [...context.assumptions, ...newAssumptions],
  };
}

// ============================================================
// LLMプロンプト用テキスト生成
// ============================================================

/**
 * LLMプロンプト用のコンテキストサマリーを生成
 * @param context DecisionContext
 * @returns プロンプト用テキスト
 */
export function buildContextSummary(context: DecisionContext): string {
  const sections: string[] = [];

  // 目的
  sections.push(`【目的】\n${context.purpose}`);

  // 現状（あれば）
  if (context.currentSituation) {
    sections.push(`【現状・困りごと】\n${context.currentSituation}`);
  }

  // 文書要約（あれば）
  if (context.documentSummary) {
    sections.push(`【参考文書の要約】\n${context.documentSummary}`);
  }

  // 累積制約
  if (context.constraints.length > 0) {
    sections.push(`【制約条件】\n${context.constraints.map(c => `- ${c}`).join("\n")}`);
  }

  // 累積前提条件
  if (context.assumptions.length > 0) {
    sections.push(`【前提条件】\n${context.assumptions.map(a => `- ${a}`).join("\n")}`);
  }

  // 確定した約束事
  if (context.commitments.length > 0) {
    sections.push(`【確定事項】\n${context.commitments.map(c => `- ${c}`).join("\n")}`);
  }

  return sections.join("\n\n");
}

/**
 * 選択履歴をLLMプロンプト用テキストに変換
 * @param session セッション
 * @returns 選択履歴テキスト
 */
export function buildSelectionHistory(session: DecisionNavigatorSession): string {
  if (session.selectionHistory.length === 0) {
    return "（まだ選択なし）";
  }

  return session.selectionHistory
    .map((entry, index) => {
      const rationaleText = entry.rationale ? ` (理由: ${entry.rationale})` : "";
      return `${index + 1}. ${entry.nodeLabel}${rationaleText}`;
    })
    .join("\n");
}

/**
 * 現在の選択可能ノードの情報を取得
 * @param session セッション
 * @returns 選択可能ノードのリスト
 */
export function getSelectableNodes(session: DecisionNavigatorSession): DecisionFlowNode[] {
  return session.nodes.filter(
    node => node.isSelectable && (node.status === "available" || node.status === "recommended")
  );
}

/**
 * 選択済みノードのパスを取得
 * @param session セッション
 * @returns 選択済みノードのリスト（順序付き）
 */
export function getSelectedPath(session: DecisionNavigatorSession): DecisionFlowNode[] {
  const context = getOrCreateContext(session);
  return context.selectedPath
    .map(nodeId => session.nodes.find(n => n.id === nodeId))
    .filter((node): node is DecisionFlowNode => node !== undefined);
}

// ============================================================
// バリデーション
// ============================================================

/**
 * コンテキストの整合性をチェック
 * @param context DecisionContext
 * @returns エラーメッセージのリスト（空配列 = 問題なし）
 */
export function validateContext(context: DecisionContext): string[] {
  const errors: string[] = [];

  // 目的は必須
  if (!context.purpose || context.purpose.trim().length === 0) {
    errors.push("目的が設定されていません");
  }

  // 重複チェック
  const duplicateConstraints = findDuplicates(context.constraints);
  if (duplicateConstraints.length > 0) {
    errors.push(`重複する制約があります: ${duplicateConstraints.join(", ")}`);
  }

  const duplicateAssumptions = findDuplicates(context.assumptions);
  if (duplicateAssumptions.length > 0) {
    errors.push(`重複する前提条件があります: ${duplicateAssumptions.join(", ")}`);
  }

  return errors;
}

/**
 * 配列内の重複を検出
 */
function findDuplicates(items: string[]): string[] {
  const seen = new Set<string>();
  const duplicates = new Set<string>();

  for (const item of items) {
    if (seen.has(item)) {
      duplicates.add(item);
    }
    seen.add(item);
  }

  return Array.from(duplicates);
}

// ============================================================
// ユーティリティ
// ============================================================

/**
 * コンテキストの統計情報を取得
 * @param context DecisionContext
 */
export function getContextStats(context: DecisionContext): {
  constraintsCount: number;
  assumptionsCount: number;
  commitmentsCount: number;
  selectedCount: number;
} {
  return {
    constraintsCount: context.constraints.length,
    assumptionsCount: context.assumptions.length,
    commitmentsCount: context.commitments.length,
    selectedCount: context.selectedPath.length,
  };
}

/**
 * 空のコンテキストを作成
 * @param purpose 目的
 * @param currentSituation 現状（オプション）
 */
export function createEmptyContext(
  purpose: string,
  currentSituation?: string
): DecisionContext {
  return {
    purpose,
    currentSituation,
    constraints: [],
    assumptions: [],
    commitments: [],
    selectedPath: [],
  };
}
