/**
 * SENSEステート
 *
 * 状況把握フェーズ：入力を解析し、コンテキストを収集する
 */

import type { AgentContext } from "../AgentContext";
import { generateChatCompletion } from "../../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../../infrastructure/llm/jsonExtractor";

/**
 * SENSE状態の結果
 */
export type SenseResult = {
  /** 理解した意図 */
  intent: string;
  /** 抽出されたエンティティ */
  entities: Array<{
    type: string;
    value: string;
  }>;
  /** 不足している情報 */
  missingInfo: string[];
  /** ユーザーへの確認が必要か */
  needsClarification: boolean;
  /** 確認メッセージ（needsClarification=trueの場合） */
  clarificationMessage?: string;
};

/**
 * SENSEステートを実行
 *
 * @param context エージェントコンテキスト
 * @returns 状況把握の結果
 */
export async function executeSenseState(
  context: AgentContext
): Promise<SenseResult> {
  console.log("[SenseState] Starting sense phase...");

  const systemPrompt = `あなたはユーザーのリクエストを分析するAIアシスタントです。
ユーザーの入力から以下を抽出してください：

1. **意図（intent）**: ユーザーが何を達成したいのか
2. **エンティティ**: 入力から抽出できる重要な情報（ファイル名、日付、キーワードなど）
3. **不足情報**: タスク完了に必要だが不足している情報
4. **確認の必要性**: 曖昧で確認が必要な場合はtrue

以下のJSON形式で回答してください：
{
  "intent": "ユーザーの意図の説明",
  "entities": [
    { "type": "エンティティタイプ", "value": "値" }
  ],
  "missingInfo": ["不足している情報1", "不足している情報2"],
  "needsClarification": false,
  "clarificationMessage": "確認メッセージ（必要な場合）"
}`;

  // アップロードファイルの情報を含める
  let userContent = `## ユーザーリクエスト\n${context.userInput}`;

  if (context.uploadedFiles.length > 0) {
    const fileInfo = context.uploadedFiles
      .map((f) => `- ${f.name} (${f.type})`)
      .join("\n");
    userContent += `\n\n## アップロードされたファイル\n${fileInfo}`;
  }

  // 会話履歴がある場合は追加
  if (context.conversationHistory.length > 0) {
    const history = context.conversationHistory
      .slice(-5) // 直近5件のみ
      .map((m) => `[${m.role}] ${m.content}`)
      .join("\n");
    userContent += `\n\n## 直近の会話\n${history}`;
  }

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent,
      temperature: 0.1,
      maxTokens: 1024,
    });

    // JSONをパース
    const result = parseJsonFromLLMResponse<SenseResult>(response);

    console.log("[SenseState] Intent:", result.intent);
    console.log("[SenseState] Entities:", result.entities.length);
    console.log("[SenseState] Missing info:", result.missingInfo.length);

    return result;
  } catch (error) {
    console.error("[SenseState] Error:", error);

    // フォールバック：最低限の結果を返す
    return {
      intent: context.userInput,
      entities: [],
      missingInfo: [],
      needsClarification: false,
    };
  }
}
