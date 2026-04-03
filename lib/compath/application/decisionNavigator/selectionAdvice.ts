/**
 * Phase 25: 選択アドバイス生成
 * Phase 6: リスク詳細自動生成
 */

import type {
  DecisionNavigatorSession,
  DecisionFlowNode,
  DecisionChatMessage,
} from "./types";
import type { RiskDetail, RiskStrategy, RiskLevel } from "./types";
import { SessionStore } from "./sessionStore";
import { sessionRepository } from "./sessionRepository";
import { generateId, getTimestamp } from "./utils";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import {
  SELECTION_ADVICE_SYSTEM_PROMPT,
  buildSelectionAdvicePrompt,
  type SelectionAdviceContext,
  type SelectionAdviceLLMResponse,
} from "./llm/selectionAdvicePrompt";

/**
 * Phase 25改: 選択アドバイスを非同期で生成してチャットに追加
 * レスポンスをブロックせず、バックグラウンドで実行
 */
export async function generateSelectionAdviceAsync(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): Promise<void> {
  try {
    // 判断軸（問い）を取得
    const parentCriteriaNode = session.nodes.find(n => n.id === selectedNode.parentId);
    const criteriaLabel = session.criteriaLabels?.find(c => c.id === selectedNode.parentId);
    const criteriaQuestion = criteriaLabel?.question || parentCriteriaNode?.label;

    // これまでの選択履歴を収集
    const previousSelections = session.selectionHistory
      ?.filter(h => h.nodeId !== selectedNode.id)
      .map(h => {
        const historyNode = session.nodes.find(n => n.id === h.nodeId);
        const parentNode = historyNode?.parentId
          ? session.nodes.find(n => n.id === historyNode.parentId)
          : undefined;
        const parentLabel = session.criteriaLabels?.find(c => c.id === historyNode?.parentId);
        return {
          question: parentLabel?.question || parentNode?.label || "（不明）",
          selected: h.nodeLabel,
        };
      }) || [];

    // アドバイス生成コンテキスト
    const adviceContext: SelectionAdviceContext = {
      purpose: session.purpose,
      selectedOption: selectedNode.label,
      selectedDescription: selectedNode.description,
      criteriaQuestion,
      previousSelections,
    };

    const advicePrompt = buildSelectionAdvicePrompt(adviceContext);
    const adviceResponse = await generateChatCompletion({
      systemPrompt: SELECTION_ADVICE_SYSTEM_PROMPT,
      userContent: advicePrompt,
      maxTokens: 500,
      temperature: 0.5,
    });

    // JSONをパース
    const parsedAdvice = parseJsonFromLLMResponse<SelectionAdviceLLMResponse>(adviceResponse);

    const selectionAdvice = {
      message: parsedAdvice.message,
      impactPoints: parsedAdvice.impactPoints,
      considerations: parsedAdvice.considerations,
    };

    console.log("[recordSelection] Generated selection advice (async):", selectionAdvice.message);

    // SessionStoreを更新してチャットメッセージを追加
    const currentSession = await SessionStore.findById(session.id);
    if (!currentSession) {
      console.warn("[recordSelection] Session not found for advice update:", session.id);
      return;
    }

    const adviceMessage: DecisionChatMessage = {
      id: generateId(),
      role: "assistant",
      content: `💡 **選択アドバイス**\n\n${selectionAdvice.message}${
        selectionAdvice.impactPoints && selectionAdvice.impactPoints.length > 0
          ? `\n\n**影響ポイント:**\n${selectionAdvice.impactPoints.map(p => `- ${p}`).join("\n")}`
          : ""
      }${
        selectionAdvice.considerations && selectionAdvice.considerations.length > 0
          ? `\n\n**考慮事項:**\n${selectionAdvice.considerations.map(c => `- ${c}`).join("\n")}`
          : ""
      }`,
      timestamp: getTimestamp(),
      relatedNodeId: selectedNode.id,
      type: "advice",
    };

    const updatedSession = {
      ...currentSession,
      chatHistory: [...currentSession.chatHistory, adviceMessage],
      updatedAt: getTimestamp(),
    };

    await SessionStore.save(updatedSession);
    await sessionRepository.save(updatedSession);
    console.log("[recordSelection] Selection advice added to chat (async)");
  } catch (error) {
    console.warn("[recordSelection] Async selection advice generation failed:", error);
  }
}

/**
 * Phase 6: riskStrategyとオプション情報からRiskDetailを自動生成
 * 「選ぶことで何が得られるか」を明確に表現する
 *
 * @param riskStrategy リスク戦略（avoid/mitigate/transfer/accept）
 * @param riskLevel リスクレベル
 * @param label 選択肢のラベル（例: "屋外設置+防液堤110%"）
 * @param description 選択肢の説明
 */
export function generateRiskDetailFromStrategy(
  riskStrategy: RiskStrategy | undefined,
  _riskLevel: RiskLevel,
  label: string,
  description: string
): RiskDetail | undefined {
  if (!riskStrategy) return undefined;

  // labelとdescriptionから具体的なリスク対象を抽出
  const riskContext = extractRiskContext(label, description);

  // キーワードにマッチしない場合は undefined を返す（テンプレート文を使わない）
  // 「わからないならわからない」を明示する
  if (!riskContext.targetRisk || !riskContext.howThisHelps) {
    console.log(`[generateRiskDetailFromStrategy] No matching pattern for: "${label}" - returning undefined`);
    return undefined;
  }

  return {
    targetRisk: riskContext.targetRisk,
    howThisHelps: riskContext.howThisHelps,
    residualRisk: riskContext.residualRisk,
    // tradeoffsは具体的な情報がある場合のみ設定
    tradeoffs: undefined,
  };
}

/**
 * labelとdescriptionからリスク文脈を抽出
 * キーワードベースで具体的なリスクを推定
 */
function extractRiskContext(label: string, description: string): {
  targetRisk?: string;
  howThisHelps?: string;
  residualRisk?: string;
} {
  const text = `${label} ${description}`.toLowerCase();

  // キーワードパターンと対応するリスク文脈
  const patterns: Array<{
    keywords: string[];
    targetRisk: string;
    howThisHelps: string;
    residualRisk?: string;
  }> = [
    // 安全・防災関連
    {
      keywords: ["防液堤", "漏洩", "液体", "タンク", "貯蔵"],
      targetRisk: "漏洩による環境汚染や火災のリスク",
      howThisHelps: "防液堤により万が一の漏洩時も被害を最小限に抑えられます",
      residualRisk: "設置コストと定期点検が必要です",
    },
    {
      keywords: ["屋外", "屋内", "設置場所", "配置"],
      targetRisk: "設置環境による劣化や事故のリスク",
      howThisHelps: "適切な設置場所の選定により長期的な安全性を確保できます",
    },
    {
      keywords: ["安全", "危険", "事故", "防止"],
      targetRisk: "事故や怪我のリスク",
      howThisHelps: "安全対策により作業者や周辺環境を保護できます",
    },
    // 品質関連
    {
      keywords: ["品質", "検査", "テスト", "確認"],
      targetRisk: "品質不良による手戻りや顧客クレームのリスク",
      howThisHelps: "事前の品質確認により問題を早期発見できます",
    },
    // コスト関連
    {
      keywords: ["コスト", "費用", "予算", "削減"],
      targetRisk: "予算超過や投資回収のリスク",
      howThisHelps: "コスト最適化により限られた予算内で最大の効果を得られます",
    },
    // 納期関連
    {
      keywords: ["納期", "スケジュール", "工期", "期限"],
      targetRisk: "納期遅延による信頼低下のリスク",
      howThisHelps: "計画的な対応により納期を守ることができます",
    },
    // 法規制関連
    {
      keywords: ["法規", "規制", "基準", "消防法", "法定"],
      targetRisk: "法令違反による罰則や操業停止のリスク",
      howThisHelps: "法規制を満たすことで安心して操業を継続できます",
    },
  ];

  // マッチするパターンを探す
  for (const pattern of patterns) {
    if (pattern.keywords.some(kw => text.includes(kw))) {
      return {
        targetRisk: pattern.targetRisk,
        howThisHelps: pattern.howThisHelps,
        residualRisk: pattern.residualRisk,
      };
    }
  }

  // マッチしない場合は空オブジェクトを返す（テンプレート文を使わない）
  return {};
}
