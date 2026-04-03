/**
 * セッション再生成
 * 条件変更時に既存セッションの推奨パスを再生成する
 */

import { generateId, getTimestamp } from "./utils";
import type {
  DecisionNavigatorSession,
  SimulationCondition,
  PreconditionData,
} from "./types";
import { SessionStore } from "./sessionStore";
import { sessionRepository } from "./sessionRepository";
import { generateRecommendedPath } from "./generateRecommendedPath";
import { computeSelectability } from "../../domain/decisionNavigator/selectability";

export type RegenerateSessionRequest = {
  /** 更新された条件 */
  conditions: SimulationCondition[];
};

export type RegenerateSessionResult = {
  /** 再生成されたセッション */
  session: DecisionNavigatorSession;
  /** 条件に変更があったかどうか */
  hasChanges: boolean;
  /** スキップされた理由（変更がない場合） */
  skipReason?: string;
};

/**
 * 条件の差分をチェック
 * @param existingConditions 既存の条件
 * @param newConditions 新しい条件
 * @returns 変更があればtrue
 */
function hasConditionChanges(
  existingConditions: SimulationCondition[] | undefined,
  newConditions: SimulationCondition[]
): boolean {
  // 既存の条件がない場合は変更ありとみなす
  if (!existingConditions || existingConditions.length === 0) {
    return newConditions.length > 0;
  }

  // 条件の数が異なる場合は変更あり
  if (existingConditions.length !== newConditions.length) {
    return true;
  }

  // 各条件を比較（id と value のペアで比較）
  const existingMap = new Map(
    existingConditions.map(c => [c.id, c.value])
  );

  for (const newCond of newConditions) {
    const existingValue = existingMap.get(newCond.id);
    // IDが存在しない、または値が異なる場合は変更あり
    if (existingValue === undefined || existingValue !== newCond.value) {
      return true;
    }
  }

  return false;
}

/**
 * 条件変更時にセッションを再生成
 *
 * @param sessionId 再生成対象のセッションID
 * @param request 更新された条件
 * @returns 再生成されたセッション、またはnull（セッションが見つからない場合）
 */
export async function regenerateSession(
  sessionId: string,
  request: RegenerateSessionRequest
): Promise<DecisionNavigatorSession | null> {
  const existingSession = await SessionStore.findById(sessionId);
  if (!existingSession) {
    return null;
  }

  // 条件の差分チェック - 変更がなければ既存セッションをそのまま返す
  const hasChanges = hasConditionChanges(
    existingSession.simulationConditions,
    request.conditions
  );

  if (!hasChanges) {
    console.log("[regenerateSession] No condition changes detected, skipping regeneration:", {
      sessionId,
      existingConditionCount: existingSession.simulationConditions?.length ?? 0,
      newConditionCount: request.conditions.length,
    });
    // 既存セッションをそのまま返す（LLM呼び出しをスキップ）
    return existingSession;
  }

  console.log("[regenerateSession] Condition changes detected, regenerating:", {
    sessionId,
    existingConditions: existingSession.simulationConditions?.map(c => `${c.label}: ${c.value}`),
    newConditions: request.conditions.map(c => `${c.label}: ${c.value}`),
  });

  const now = getTimestamp();

  // 条件をPreconditionDataに変換
  const preconditions: PreconditionData = {
    conditions: request.conditions.map(c => ({
      id: c.id,
      label: c.label,
      category: c.criteriaId || "other",
      isSelected: true,
      detail: c.value,
    })),
  };

  // 推奨パスを再生成
  const {
    nodes,
    edges,
    recommendedPath,
    decisionPoints,
    layoutHints,
    startNodeId,
    generationMode,
    decisionContext,
    criteriaLabels,
    columnStates,
    currentColumnIndex,
    totalColumns,
  } = await generateRecommendedPath(
    existingSession.purpose,
    existingSession.documentSource?.extractedContext,
    existingSession.decisionContext?.currentSituation,
    existingSession.supportMode || "thinking",
    preconditions
  );

  // 選択可能性を計算
  const nodesWithSelectability = computeSelectability(nodes);

  // 初回再生成かどうかを判定
  // 初回: 既存セッションにsimulationConditionsが未設定（undefinedまたは空配列）
  const isFirstRegeneration = !existingSession.simulationConditions || existingSession.simulationConditions.length === 0;

  // セッションを更新（選択履歴はリセット）
  const regeneratedSession: DecisionNavigatorSession = {
    ...existingSession,
    nodes: nodesWithSelectability,
    edges,
    criteriaLabels,
    columnStates,
    currentColumnIndex,
    totalColumns,
    currentNodeId: startNodeId,
    // 選択履歴をリセット
    selectionHistory: [
      {
        id: generateId(),
        nodeId: startNodeId,
        nodeLabel: existingSession.purpose.slice(0, 30) + (existingSession.purpose.length > 30 ? "..." : ""),
        level: "strategy",
        selectedAt: now,
      },
    ],
    // チャット履歴に再生成メッセージを追加（2回目以降のみ）
    chatHistory: isFirstRegeneration
      ? existingSession.chatHistory // 初回はメッセージを追加しない
      : [
          ...existingSession.chatHistory,
          {
            id: generateId(),
            role: "assistant",
            content: "条件が変更されたため、推奨パスを再生成しました。新しい条件に基づいて判断を進めてください。",
            timestamp: now,
            type: "text",
          },
        ],
    recommendedPath,
    decisionPoints,
    layoutHints,
    generationMode,
    decisionContext,
    // 更新された条件を保存
    simulationConditions: request.conditions,
    // 前提条件も更新
    preconditions,
    updatedAt: now,
    stats: {
      totalNodes: nodesWithSelectability.length,
      selectedNodes: nodesWithSelectability.filter((n) => n.status === "recommended" || n.status === "selected").length,
      pastCasesUsed: nodesWithSelectability.filter((n) => n.hasPastCase).length,
    },
  };

  // 保存
  await SessionStore.save(regeneratedSession);
  await sessionRepository.save(regeneratedSession);

  console.log("[regenerateSession] Session regenerated:", {
    sessionId,
    conditionCount: request.conditions.length,
    nodeCount: regeneratedSession.nodes.length,
    generationMode,
  });

  return regeneratedSession;
}
