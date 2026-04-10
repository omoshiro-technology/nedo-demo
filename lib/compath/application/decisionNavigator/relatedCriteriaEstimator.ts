/**
 * Phase 21: 関連判断軸推定（AI誘導エッジ生成）
 */

import type { DecisionFlowEdge } from "./types";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import {
  RELATED_CRITERIA_SYSTEM_PROMPT,
  buildRelatedCriteriaPrompt,
  getDefaultRelatedCriteria,
  type RelatedCriteriaContext,
  type RelatedCriteriaLLMResponse,
} from "./llm/relatedCriteriaPrompt";

/**
 * Phase 21: AI誘導エッジ生成
 *
 * 選択したノードから関連する未選択の判断軸へ誘導エッジを生成。
 * AIが選択内容と残りの判断軸の関連性を判定し、次に検討すべき判断軸を提案。
 */
export async function generateRelatedCriteriaEdges(
  _sessionId: string,
  selectedNodeId: string,
  context: RelatedCriteriaContext
): Promise<DecisionFlowEdge[]> {
  const newEdges: DecisionFlowEdge[] = [];

  if (context.remainingCriteria.length === 0) {
    return newEdges;
  }

  let response: RelatedCriteriaLLMResponse;

  try {
    const prompt = buildRelatedCriteriaPrompt(context);
    const responseText = await generateChatCompletion({
      systemPrompt: RELATED_CRITERIA_SYSTEM_PROMPT,
      userContent: prompt,
      maxTokens: 500,
      temperature: 0.3,
    });

    // JSON抽出
    response = parseJsonFromLLMResponse(responseText);

    console.log("[generateRelatedCriteriaEdges] LLM response:", {
      relatedIds: response.relatedCriteriaIds,
      confidence: response.confidence,
    });
  } catch (error) {
    console.warn("[generateRelatedCriteriaEdges] LLM failed, using fallback:", error);
    // フォールバック: 順番に誘導
    response = getDefaultRelatedCriteria(context.remainingCriteria);
  }

  // 関連判断軸へのエッジを生成
  for (const criteriaId of response.relatedCriteriaIds.slice(0, 2)) {
    // 判断軸のノードIDを構築（判断軸IDではなく、その判断軸に属する最初のノードへ接続）
    // または判断軸ラベル自体をターゲットにする（CriteriaLabelOverlayでハイライト表示）
    const edgeId = `edge-guide-${selectedNodeId}-${criteriaId}`;

    newEdges.push({
      id: edgeId,
      source: selectedNodeId,
      target: criteriaId, // 判断軸ID（CriteriaLabel）
      type: "guide" as DecisionFlowEdge["type"], // 誘導エッジ（破線アニメーション）
      animated: true,
      label: response.reasons[response.relatedCriteriaIds.indexOf(criteriaId)] ?? undefined,
    });
  }

  return newEdges;
}
