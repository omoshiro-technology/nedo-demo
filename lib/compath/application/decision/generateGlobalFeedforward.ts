/**
 * グローバルフィードフォワード生成
 *
 * 全決定事項から「次にやるべきこと」をLLMで一括生成する
 * Phase 14: 重複排除と参照元追跡による効率化
 *
 * メリット:
 * - LLM呼び出し: 18回 → 1回 (95%削減)
 * - アクション: 54件（重複多数） → 10-15件（統合済み）
 * - 処理時間: 60-90秒 → 10-15秒
 */

import type {
  DecisionItem,
  GlobalFeedforward,
  GlobalFeedforwardAction,
  VeteranVoice,
} from "../../domain/types";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import { env } from "../../config/env";
import { createHash } from "node:crypto";

/**
 * LLMレスポンスの型
 */
type LLMGlobalFeedforwardResponse = {
  actions: Array<{
    action: string;
    deadline?: string;
    priority: "high" | "medium" | "low";
    rationale?: string;
    referencedDecisionIds: string[];
  }>;
  globalInsights?: string;
  veteranVoice?: {
    quote: string;
    speakerRole: string;
    date: string;
    meetingName: string;
    insight: string;
  };
};

/**
 * 全決定事項からグローバルフィードフォワードを生成
 *
 * @param decisions - 全決定事項
 * @param context - 追加コンテキスト（議事録の全文など）
 * @returns グローバルフィードフォワード
 */
export async function generateGlobalFeedforward(
  decisions: DecisionItem[],
  context?: string
): Promise<GlobalFeedforward | undefined> {
  // APIキーがない場合は生成しない
  if (!env.openaiApiKey) {
    return undefined;
  }

  // confirmed/gray の決定事項のみ対象
  const targetDecisions = decisions.filter(
    (d) => d.status === "confirmed" || d.status === "gray"
  );

  if (targetDecisions.length === 0) {
    return undefined;
  }

  const systemPrompt = `あなたはプロジェクト管理のベテランエンジニアです。
複数の意思決定事項を分析し、「次にやるべきこと」を提案してください。

## 重要な原則

1. **具体的に書く**: 「誰に」「何を」「どうする」を明確に。抽象的な表現は禁止
2. **重複を排除**: 同じ意味のアクションは1つに統合
3. **参照元を明示**: 各アクションがどの決定事項から導かれたかを紐づけ
4. **すぐ実行できる粒度**: 読んですぐに着手できるレベルまで具体化

## 出力形式（JSON）

{
  "actions": [
    {
      "action": "【対象】に【具体的な内容】を【動詞】（30文字以内）",
      "deadline": "推奨期限（「1週間以内」「次回会議まで」など）",
      "priority": "high|medium|low",
      "rationale": "なぜこのアクションが必要か（1文）",
      "referencedDecisionIds": ["decision-001", "decision-005"]
    }
  ],
  "globalInsights": "全体を通した所見（1-2文、オプション）",
  "veteranVoice": {
    "quote": "ベテランが言いそうなアドバイス（「」で囲まない、50文字程度）",
    "speakerRole": "発言者の役職例（「水処理G 佐藤主任」など）",
    "date": "発言の時期（「2012年3月」など）",
    "meetingName": "会議名（「設計審査会議」など）",
    "insight": "現在の状況への示唆（1文）"
  }
}

## actionsのガイドライン（最重要）

### 具体的な書き方のルール
- ❌ NG: 「計画を更新する」「確認する」「連絡する」（誰に何を？）
- ✅ OK: 「調達部に発注数量100個を連絡する」「設計書のP.5を3.5億円に修正する」

### 必須要素
1. **対象**: 誰に/何を（例：「経理部に」「図面の配管径を」「A社に」）
2. **内容**: 具体的な数値や項目（例：「3.5億円」「2025年3月末」「方式A」）
3. **動作**: 明確な動詞（例：「連絡する」「修正する」「依頼する」）

### アクション例
- 「経理部に予算上限3.5億円を通知する」
- 「A社・B社・C社に見積依頼を送付する」
- 「プロジェクト計画書に完了期限2025年3月末を記載する」
- 「安全管理者の人選を総務部に依頼する」
- 「仮設ライン設置のコスト試算を設計チームに依頼する」

### その他のルール
- 5〜10件程度のアクションに統合（多くても10件まで）
- 優先度が高いものを先に
- 同じ内容のアクションは統合し、複数の決定事項IDを参照元に

## veteranVoiceのガイドライン

- 全体の決定を俯瞰したアドバイス
- 失敗経験や教訓に基づく
- 「後で後悔した」「これをやっておけばよかった」という視点
- veteranVoiceは任意（関連する知見がなければ省略可）`;

  // 決定事項一覧を整形
  const decisionsText = targetDecisions
    .map(
      (d) =>
        `- ID: ${d.id}
  内容: ${d.content}
  種別: ${d.patternType}
  ステータス: ${d.status}
  決定日: ${d.decisionDate}${d.importance ? `
  重要度: ${d.importance.level}（${d.importance.categories.join(", ")}）` : ""}`
    )
    .join("\n\n");

  const userPrompt = `以下の${targetDecisions.length}件の決定事項について、次にやるべきアクションを提案してください。

【重要】アクションは必ず具体的に書いてください：
- 「誰に」「何を」「どうする」を明確に
- 数値や固有名詞を含める（例：「3.5億円」「A社」「2025年3月末」）
- 抽象的な「確認する」「連絡する」だけは禁止

## 決定事項一覧

${decisionsText}

${context ? `## 追加コンテキスト\n\n${context.slice(0, 3000)}` : ""}

JSONで回答してください。`;

  try {
    const response = await generateChatCompletion({
      systemPrompt,
      userContent: userPrompt,
      model: env.openaiModelDefault,
      temperature: 0.7,
      maxTokens: 2500,
    });

    const parsed = parseJsonFromLLMResponse<LLMGlobalFeedforwardResponse>(response);

    // 決定事項のマップを作成（ID→決定事項全体）
    const decisionMap = new Map(targetDecisions.map((d) => [d.id, d]));

    // GlobalFeedforwardAction に変換
    const actions: GlobalFeedforwardAction[] = (parsed.actions || []).map(
      (action, index) => ({
        id: generateActionId(index),
        action: action.action,
        deadline: action.deadline,
        priority: action.priority || "medium",
        rationale: action.rationale,
        referencedDecisions: (action.referencedDecisionIds || []).map(
          (decisionId) => {
            const decision = decisionMap.get(decisionId);
            const relevance: "primary" | "secondary" = index === 0 ? "primary" : "secondary";
            return {
              decisionId,
              // ハイライト用にsourceTextを優先、なければcontentを使用
              decisionContent: decision?.sourceText || decision?.content || "(不明)",
              relevance,
            };
          }
        ),
        isCompleted: false,
      })
    );

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
        contextTags: extractGlobalContextTags(targetDecisions),
        feedforward: actions
          .slice(0, 2)
          .map((a) => a.action)
          .join("→"),
      };
    }

    return {
      actions,
      globalInsights: parsed.globalInsights,
      veteranVoice,
    };
  } catch (error) {
    console.error("[generateGlobalFeedforward] Error:", error);
    return undefined;
  }
}

/**
 * アクションIDを生成
 */
function generateActionId(index: number): string {
  const hash = createHash("md5")
    .update(`global-action-${index}-${Date.now()}`)
    .digest("hex")
    .slice(0, 8);
  return `gff-${hash}`;
}

/**
 * 全決定事項からコンテキストタグを抽出
 */
function extractGlobalContextTags(decisions: DecisionItem[]): string[] {
  const tagCounts = new Map<string, number>();

  for (const decision of decisions) {
    // 重要度カテゴリから
    if (decision.importance?.categories) {
      for (const category of decision.importance.categories) {
        tagCounts.set(category, (tagCounts.get(category) || 0) + 1);
      }
    }

    // パターン種別から
    const patternTag = getPatternTag(decision.patternType);
    if (patternTag) {
      tagCounts.set(patternTag, (tagCounts.get(patternTag) || 0) + 1);
    }
  }

  // 出現頻度が高いタグを上位4件まで返す
  return Array.from(tagCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([tag]) => tag);
}

/**
 * パターン種別からタグを取得
 */
function getPatternTag(
  patternType: DecisionItem["patternType"]
): string | undefined {
  switch (patternType) {
    case "decision":
      return "決定";
    case "agreement":
      return "合意";
    case "change":
      return "変更";
    case "adoption":
      return "採用";
    case "cancellation":
      return "延期";
    default:
      return undefined;
  }
}
