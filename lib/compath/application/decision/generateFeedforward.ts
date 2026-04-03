/**
 * フィードフォワード生成
 *
 * 決定事項から「次にやるべきこと」をLLMで動的生成する
 * 決定したことを行動に移すための支援を提供
 */

import type {
  DecisionItem,
  FeedforwardAction,
  VeteranVoice,
} from "../../domain/types";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";
import { createHash } from "node:crypto";

/**
 * LLMレスポンスの型
 */
type LLMFeedforwardResponse = {
  nextActions: Array<{
    action: string;
    deadline?: string;
    priority: "high" | "medium" | "low";
    rationale?: string;
  }>;
  veteranVoice?: {
    quote: string;
    speakerRole: string;
    date: string;
    meetingName: string;
    insight: string;
  };
};

/**
 * フィードフォワード生成結果
 */
export type GenerateFeedforwardResult = {
  feedforwardActions: FeedforwardAction[];
  veteranVoice?: VeteranVoice;
};

/**
 * 決定事項からフィードフォワード（次にやるべきこと）を生成
 *
 * @param decision - 決定事項
 * @param context - 追加コンテキスト（議事録の全文など）
 * @returns フィードフォワードアクションとベテランの声
 */
export async function generateFeedforward(
  decision: DecisionItem,
  context?: string
): Promise<GenerateFeedforwardResult> {
  // APIキーがない場合は空を返す
  if (!env.openaiApiKey) {
    return { feedforwardActions: [] };
  }

  const systemPrompt = `あなたはプロジェクト管理のベテランエンジニアです。
意思決定事項を行動に移すための「次のアクション」を提案してください。

## 重要な原則

1. **決めただけでは終わらない**: 決定したことを実行に移すためのアクションを具体的に提案
2. **フィードフォワード思考**: 先を見通して、今やっておくべきことを示す
3. **忘れやすいことを補う**: 決定後に忘れがちな後続タスクを明示
4. **実行可能性を重視**: 具体的で、すぐに着手できるアクションに

## 出力形式（JSON）

{
  "nextActions": [
    {
      "action": "具体的なアクション内容（「〜する」形式、20文字以内）",
      "deadline": "推奨期限（「1週間以内」「次回会議まで」など）",
      "priority": "high|medium|low",
      "rationale": "なぜこのアクションが必要か（1文）"
    }
  ],
  "veteranVoice": {
    "quote": "ベテランが言いそうなアドバイス（「」で囲まない、50文字程度）",
    "speakerRole": "発言者の役職例（「水処理G 佐藤主任」など）",
    "date": "発言の時期（「2012年3月」など）",
    "meetingName": "会議名（「設計審査会議」など）",
    "insight": "現在の状況への示唆（1文）"
  }
}

## nextActionsのガイドライン

- 3〜5件のアクションを提案
- 優先度が高いものを先に
- 期限は決定日からの相対日数で
- アクションは動詞で始める（「確認する」「更新する」「連絡する」など）

## veteranVoiceのガイドライン

- 過去の類似決定でベテランが言っていそうなこと
- 失敗経験や教訓に基づくアドバイス
- 「後で後悔した」「これをやっておけばよかった」という視点
- veteranVoiceは任意（関連する知見がなければ省略可）`;

  const userPrompt = `以下の決定事項について、次にやるべきアクションを提案してください。

## 決定事項

- 内容: ${decision.content}
- 種別: ${decision.patternType}
- ステータス: ${decision.status}
- 決定日: ${decision.decisionDate}
${decision.sourceText ? `- 原文: ${decision.sourceText}` : ""}
${decision.importance ? `- 重要度: ${decision.importance.level}（${decision.importance.categories.join(", ")}）` : ""}

${context ? `## 追加コンテキスト\n\n${context.slice(0, 2000)}` : ""}

JSONで回答してください。`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent: userPrompt,
      model: env.openaiModelDefault,
      temperature: 0.7,
      maxTokens: 1500,
    });

    const parsed = parseJsonFromLLMResponse<LLMFeedforwardResponse>(response);

    // FeedforwardAction に変換
    const feedforwardActions: FeedforwardAction[] = (
      parsed.nextActions || []
    ).map((action, index) => ({
      id: generateActionId(decision.id, index),
      action: action.action,
      deadline: action.deadline,
      priority: action.priority || "medium",
      rationale: action.rationale,
      isCompleted: false,
    }));

    // VeteranVoice に変換
    let veteranVoice: VeteranVoice | undefined;
    if (parsed.veteranVoice) {
      veteranVoice = {
        quote: parsed.veteranVoice.quote,
        quoteSource: {
          date: parsed.veteranVoice.date,
          meetingName: parsed.veteranVoice.meetingName,
          speakerRole: parsed.veteranVoice.speakerRole,
        },
        veteranInsight: parsed.veteranVoice.insight,
        relevanceScore: 80, // LLM生成なので固定値
        contextTags: extractContextTags(decision),
        applicableStatus: decision.status,
        feedforward: feedforwardActions
          .slice(0, 2)
          .map((a) => a.action)
          .join("→"),
      };
    }

    return { feedforwardActions, veteranVoice };
  } catch (error) {
    console.error("[generateFeedforward] Error:", error);
    return { feedforwardActions: [] };
  }
}

/**
 * アクションIDを生成
 */
function generateActionId(decisionId: string, index: number): string {
  const hash = createHash("md5")
    .update(`${decisionId}-action-${index}`)
    .digest("hex")
    .slice(0, 8);
  return `ff-${hash}`;
}

/**
 * 決定事項からコンテキストタグを抽出
 */
function extractContextTags(decision: DecisionItem): string[] {
  const tags: string[] = [];

  // 重要度カテゴリから
  if (decision.importance?.categories) {
    tags.push(...decision.importance.categories.slice(0, 2));
  }

  // パターン種別から
  switch (decision.patternType) {
    case "decision":
      tags.push("決定");
      break;
    case "agreement":
      tags.push("合意");
      break;
    case "change":
      tags.push("変更");
      break;
    case "adoption":
      tags.push("採用");
      break;
    case "cancellation":
      tags.push("延期");
      break;
  }

  return tags.slice(0, 4);
}

/**
 * 複数の決定事項にフィードフォワードを一括生成
 *
 * @param decisions - 決定事項の配列
 * @param context - 追加コンテキスト
 * @returns フィードフォワード付きの決定事項
 */
export async function attachFeedforwardToDecisions(
  decisions: DecisionItem[],
  context?: string
): Promise<DecisionItem[]> {
  // confirmed または gray の決定事項のみ対象
  const targetDecisions = decisions.filter(
    (d) => d.status === "confirmed" || d.status === "gray"
  );

  // API呼び出しを並列化（最大5件まで同時）
  const batchSize = 5;
  const results: DecisionItem[] = [...decisions];

  for (let i = 0; i < targetDecisions.length; i += batchSize) {
    const batch = targetDecisions.slice(i, i + batchSize);
    const feedforwardPromises = batch.map((d) => generateFeedforward(d, context));
    const feedforwardResults = await Promise.all(feedforwardPromises);

    // 結果を元の配列に反映
    for (let j = 0; j < batch.length; j++) {
      const decisionIndex = results.findIndex((d) => d.id === batch[j].id);
      if (decisionIndex !== -1) {
        const result = feedforwardResults[j];
        results[decisionIndex] = {
          ...results[decisionIndex],
          feedforwardActions: result.feedforwardActions,
          veteranVoices: result.veteranVoice
            ? [result.veteranVoice]
            : undefined,
        };
      }
    }
  }

  return results;
}
