import { createHash } from "node:crypto";
import type { SimilarCase, NextAction, DecisionItem } from "../../domain/types";

/**
 * 類似事例から次のアクションを生成
 *
 * @param similarCases 類似事例一覧
 * @param decisions 元の決定事項（guidance情報を持つ）
 * @returns 優先度順にソートされた次のアクション
 */
export function generateNextActions(
  similarCases: SimilarCase[],
  decisions: DecisionItem[]
): NextAction[] {
  if (similarCases.length === 0) {
    return [];
  }

  // DecisionItem のマップを作成（IDで検索用）
  const decisionMap = new Map<string, DecisionItem>();
  for (const decision of decisions) {
    decisionMap.set(decision.id, decision);
  }

  // アクション候補を収集
  const actionCandidates: Array<{
    content: string;
    basedOnCaseId: string;
    similarity: number;
    importanceScore: number;
  }> = [];

  // 類似事例からアクションを抽出
  for (const caseItem of similarCases) {
    const decision = decisionMap.get(caseItem.id);

    if (decision?.guidance?.requiredActions) {
      for (const action of decision.guidance.requiredActions) {
        actionCandidates.push({
          content: action,
          basedOnCaseId: caseItem.id,
          similarity: caseItem.similarity,
          importanceScore: decision.importance?.score ?? 50,
        });
      }
    }

    // guidanceがなくても、採用された結論があればアクションとして追加
    if (caseItem.adoptedConclusion && !decision?.guidance?.requiredActions?.length) {
      actionCandidates.push({
        content: caseItem.adoptedConclusion,
        basedOnCaseId: caseItem.id,
        similarity: caseItem.similarity,
        importanceScore: decision?.importance?.score ?? 50,
      });
    }
  }

  // 重複を除去（類似コンテンツをマージ）
  const uniqueActions = deduplicateActions(actionCandidates);

  // 優先度を計算してソート
  const rankedActions = uniqueActions
    .map((action) => ({
      ...action,
      priority: calculatePriority(action.similarity, action.importanceScore),
    }))
    .sort((a, b) => {
      // 優先度でソート、同じなら類似度でソート
      const priorityOrder = { high: 3, medium: 2, low: 1 };
      const diff = priorityOrder[b.priority] - priorityOrder[a.priority];
      return diff !== 0 ? diff : b.similarity - a.similarity;
    });

  // 上位5件を返却
  return rankedActions.slice(0, 5).map((action) => ({
    id: generateActionId(action.content, action.basedOnCaseId),
    content: action.content,
    basedOnCaseId: action.basedOnCaseId,
    priority: action.priority,
  }));
}

/**
 * 優先度を計算
 */
function calculatePriority(
  similarity: number,
  importanceScore: number
): "high" | "medium" | "low" {
  // 類似度と重要度の加重平均
  const score = similarity * 0.6 + importanceScore * 0.4;

  if (score >= 70) return "high";
  if (score >= 40) return "medium";
  return "low";
}

/**
 * 類似したアクションをマージ
 */
function deduplicateActions(
  actions: Array<{
    content: string;
    basedOnCaseId: string;
    similarity: number;
    importanceScore: number;
  }>
): Array<{
  content: string;
  basedOnCaseId: string;
  similarity: number;
  importanceScore: number;
}> {
  const seen = new Map<
    string,
    {
      content: string;
      basedOnCaseId: string;
      similarity: number;
      importanceScore: number;
    }
  >();

  for (const action of actions) {
    // 正規化したキーで重複チェック
    const normalizedKey = normalizeForDedup(action.content);

    const existing = seen.get(normalizedKey);
    if (!existing || action.similarity > existing.similarity) {
      // より類似度が高いものを採用
      seen.set(normalizedKey, action);
    }
  }

  return Array.from(seen.values());
}

/**
 * 重複チェック用の正規化
 */
function normalizeForDedup(content: string): string {
  return content
    .replace(/\s+/g, "")
    .replace(/[、。]/g, "")
    .toLowerCase();
}

/**
 * アクションIDを生成
 */
function generateActionId(content: string, caseId: string): string {
  const hash = createHash("sha1");
  hash.update(content);
  hash.update(caseId);
  return `action-${hash.digest("hex").slice(0, 8)}`;
}

/**
 * デフォルトのアクションを生成（類似事例がない場合）
 */
export function generateDefaultActions(userSituation: string): NextAction[] {
  const defaultActions: Array<{
    content: string;
    priority: "high" | "medium" | "low";
  }> = [
    {
      content: "関係者への状況説明を行う",
      priority: "high",
    },
    {
      content: "影響範囲を洗い出す",
      priority: "high",
    },
    {
      content: "代替案を検討する",
      priority: "medium",
    },
    {
      content: "次回会議で議題として取り上げる",
      priority: "medium",
    },
  ];

  return defaultActions.map((action, idx) => ({
    id: `default-action-${idx}`,
    content: action.content,
    basedOnCaseId: "",
    priority: action.priority,
  }));
}
