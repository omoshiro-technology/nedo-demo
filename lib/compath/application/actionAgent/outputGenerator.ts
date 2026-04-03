/**
 * コピーレディ出力生成器
 *
 * テンプレートとコンテキストを組み合わせて、
 * すぐに使える出力を生成する
 */
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import type {
  OutputTemplate,
  GeneratedOutput,
  Placeholder,
  OutputFormat,
} from "../../domain/actionAgent/outputTemplates";
import { findTemplateById, MANUFACTURING_TEMPLATES } from "../../domain/actionAgent/outputTemplates";
import { generateChatCompletion } from "../../infrastructure/llm/openaiClient";

/** 出力生成のコンテキスト */
export type OutputGenerationContext = {
  /** ユーザーの入力メッセージ */
  userMessage?: string;
  /** チャット履歴 */
  chatHistory?: Array<{ role: string; content: string }>;
  /** 分析結果（議事録解析など） */
  analysisResult?: {
    decisions?: Array<{ content: string; status: string }>;
    actionItems?: Array<{ task: string; assignee?: string; deadline?: string }>;
    summary?: string;
  };
  /** ユーザーが明示的に指定した値 */
  userProvidedValues?: Record<string, string>;
};

/** プレースホルダー抽出結果 */
type ExtractedPlaceholders = {
  filled: Record<string, string>;
  missing: string[];
};

/**
 * テンプレートからコピーレディ出力を生成
 */
export async function generateCopyReadyOutput(
  templateId: string,
  context: OutputGenerationContext
): Promise<GeneratedOutput> {
  const template = findTemplateById(templateId);
  if (!template) {
    throw new Error(`Template not found: ${templateId}`);
  }

  // 1. コンテキストからプレースホルダーを抽出
  const extracted = await extractPlaceholdersFromContext(template, context);

  // 2. ユーザー指定値をマージ
  const mergedValues = {
    ...extracted.filled,
    ...(context.userProvidedValues || {}),
  };

  // 3. マージ後の未入力を再計算
  const missingPlaceholders = template.placeholders
    .filter((p) => p.required && !mergedValues[p.key])
    .map((p) => p.key);

  // 4. テンプレートを充填
  const output = fillTemplate(template.template, mergedValues, template.placeholders);

  return {
    templateId: template.id,
    templateName: template.name,
    output,
    format: template.format,
    filledPlaceholders: mergedValues,
    missingPlaceholders,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * LLMを使用してコンテキストからプレースホルダーを抽出
 */
async function extractPlaceholdersFromContext(
  template: OutputTemplate,
  context: OutputGenerationContext
): Promise<ExtractedPlaceholders> {
  const filled: Record<string, string> = {};
  const missing: string[] = [];

  // コンテキスト情報がない場合は空で返す
  if (!context.userMessage && !context.chatHistory?.length && !context.analysisResult) {
    return {
      filled: {},
      missing: template.placeholders.filter((p) => p.required).map((p) => p.key),
    };
  }

  // コンテキストを文字列化
  const contextString = buildContextString(context);

  // LLMでプレースホルダーを抽出
  const prompt = buildExtractionPrompt(template, contextString);

  try {
    const response = await generateChatCompletion({
      systemPrompt: `あなたはテンプレート充填アシスタントです。
与えられたコンテキストから、テンプレートのプレースホルダーに適切な値を抽出してください。
JSON形式で回答してください。値が見つからない場合はnullを返してください。`,
      userContent: prompt,
      temperature: 0.1,
      maxTokens: 1024,
    });

    // JSONを抽出してパース
    const extracted = parseJsonFromLLMResponse<Record<string, string | null>>(response);
    for (const [key, value] of Object.entries(extracted)) {
      if (value !== null && value !== "") {
        filled[key] = value;
      }
    }
  } catch (error) {
    // LLM呼び出しに失敗した場合は、簡易的なルールベース抽出にフォールバック
    console.warn("LLM extraction failed, falling back to rule-based extraction:", error);
    return extractPlaceholdersWithRules(template, context);
  }

  // 未入力の必須項目を特定
  for (const placeholder of template.placeholders) {
    if (placeholder.required && !filled[placeholder.key]) {
      missing.push(placeholder.key);
    }
  }

  return { filled, missing };
}

/**
 * コンテキストを文字列化
 */
function buildContextString(context: OutputGenerationContext): string {
  const parts: string[] = [];

  if (context.userMessage) {
    parts.push(`【ユーザーのメッセージ】\n${context.userMessage}`);
  }

  if (context.chatHistory?.length) {
    const recentHistory = context.chatHistory.slice(-5);
    parts.push(`【最近の会話】\n${recentHistory.map((m) => `${m.role}: ${m.content}`).join("\n")}`);
  }

  if (context.analysisResult) {
    if (context.analysisResult.summary) {
      parts.push(`【分析サマリー】\n${context.analysisResult.summary}`);
    }
    if (context.analysisResult.decisions?.length) {
      parts.push(
        `【決定事項】\n${context.analysisResult.decisions.map((d) => `- ${d.content} (${d.status})`).join("\n")}`
      );
    }
    if (context.analysisResult.actionItems?.length) {
      parts.push(
        `【アクションアイテム】\n${context.analysisResult.actionItems
          .map((a) => `- ${a.task}${a.assignee ? ` (担当: ${a.assignee})` : ""}${a.deadline ? ` 期限: ${a.deadline}` : ""}`)
          .join("\n")}`
      );
    }
  }

  return parts.join("\n\n");
}

/**
 * LLM抽出用のプロンプトを構築
 */
function buildExtractionPrompt(template: OutputTemplate, contextString: string): string {
  const placeholderDescriptions = template.placeholders
    .map((p) => `- ${p.key}: ${p.label}${p.required ? " (必須)" : " (任意)"}`)
    .join("\n");

  return `以下のコンテキストから、テンプレート「${template.name}」のプレースホルダーに適切な値を抽出してください。

【テンプレートのプレースホルダー】
${placeholderDescriptions}

【コンテキスト】
${contextString}

【回答形式】
JSON形式で、各プレースホルダーのキーと値を返してください。
値が見つからない場合はnullを設定してください。
今日の日付が必要な場合は「${new Date().toISOString().split("T")[0]}」を使用してください。

例:
{
  "project_name": "新製品A開発",
  "sender_name": null,
  "deadline": "2026-02-15"
}`;
}

/**
 * ルールベースのプレースホルダー抽出（フォールバック）
 */
function extractPlaceholdersWithRules(
  template: OutputTemplate,
  context: OutputGenerationContext
): ExtractedPlaceholders {
  const filled: Record<string, string> = {};
  const missing: string[] = [];

  // 今日の日付を設定
  const today = new Date().toISOString().split("T")[0];

  for (const placeholder of template.placeholders) {
    let value: string | undefined;

    // 日付関連のプレースホルダーには今日の日付を設定
    if (placeholder.inputType === "date" && placeholder.key.includes("date")) {
      value = today;
    }

    // デフォルト値がある場合は使用
    if (!value && placeholder.defaultValue) {
      value = placeholder.defaultValue;
    }

    // 分析結果からアクションアイテムを抽出
    if (
      placeholder.key === "action_items" ||
      placeholder.key === "tasks"
    ) {
      if (context.analysisResult?.actionItems?.length) {
        value = context.analysisResult.actionItems
          .map(
            (a, i) =>
              `| ${i + 1} | ${a.task} | ${a.assignee || "-"} | ${a.deadline || "-"} | 未着手 |`
          )
          .join("\n");
      }
    }

    // 決定事項を抽出
    if (placeholder.key === "decisions") {
      if (context.analysisResult?.decisions?.length) {
        value = context.analysisResult.decisions
          .map((d) => `- ${d.content}`)
          .join("\n");
      }
    }

    if (value) {
      filled[placeholder.key] = value;
    } else if (placeholder.required) {
      missing.push(placeholder.key);
    }
  }

  return { filled, missing };
}

/**
 * テンプレートにプレースホルダーの値を充填
 */
function fillTemplate(
  template: string,
  values: Record<string, string>,
  placeholders: Placeholder[]
): string {
  let result = template;

  // 各プレースホルダーを置換
  for (const placeholder of placeholders) {
    const pattern = new RegExp(`\\{\\{${placeholder.key}\\}\\}`, "g");
    const value = values[placeholder.key] || placeholder.defaultValue || `【${placeholder.label}】`;
    result = result.replace(pattern, value);
  }

  return result;
}

/**
 * ユーザーメッセージから適切なテンプレートを推薦
 */
export async function suggestTemplate(
  userMessage: string
): Promise<Array<{ templateId: string; confidence: number; reason: string }>> {
  const prompt = `以下のユーザーメッセージから、最も適切なテンプレートを1〜3件選んでください。

【ユーザーメッセージ】
${userMessage}

【利用可能なテンプレート】
${MANUFACTURING_TEMPLATES.map((t) => `- ${t.id}: ${t.name} - ${t.description}`).join("\n")}

【回答形式】
JSON配列で、templateId, confidence (0-1), reason を返してください。

例:
[
  { "templateId": "design_review_email", "confidence": 0.9, "reason": "レビュー依頼に関する内容のため" }
]`;

  try {
    const response = await generateChatCompletion({
      systemPrompt: "あなたはテンプレート推薦アシスタントです。ユーザーの意図に最も適したテンプレートを選んでください。",
      userContent: prompt,
      temperature: 0.2,
      maxTokens: 512,
    });

    return parseJsonFromLLMResponse<Array<{
      templateId: string;
      confidence: number;
      reason: string;
    }>>(response);
  } catch (error) {
    console.warn("Template suggestion failed:", error);
  }

  // フォールバック：キーワードマッチング
  return suggestTemplateWithKeywords(userMessage);
}

/**
 * キーワードベースのテンプレート推薦（フォールバック）
 */
function suggestTemplateWithKeywords(
  userMessage: string
): Array<{ templateId: string; confidence: number; reason: string }> {
  const suggestions: Array<{ templateId: string; confidence: number; reason: string }> = [];
  const lowerMessage = userMessage.toLowerCase();

  const keywordMap: Record<string, { keywords: string[]; confidence: number }> = {
    design_review_email: {
      keywords: ["レビュー", "設計", "確認", "依頼"],
      confidence: 0.7,
    },
    meeting_invitation_email: {
      keywords: ["会議", "招集", "打ち合わせ", "ミーティング"],
      confidence: 0.7,
    },
    status_report_email: {
      keywords: ["進捗", "報告", "レポート", "状況"],
      confidence: 0.7,
    },
    meeting_minutes: {
      keywords: ["議事録", "メモ", "会議記録"],
      confidence: 0.8,
    },
    design_review_checklist: {
      keywords: ["チェックリスト", "確認項目", "チェック"],
      confidence: 0.7,
    },
    decision_record: {
      keywords: ["意思決定", "決定", "判断", "選択"],
      confidence: 0.7,
    },
    action_plan: {
      keywords: ["アクション", "計画", "プラン", "タスク"],
      confidence: 0.7,
    },
  };

  for (const [templateId, config] of Object.entries(keywordMap)) {
    const matchedKeywords = config.keywords.filter((kw) => lowerMessage.includes(kw));
    if (matchedKeywords.length > 0) {
      suggestions.push({
        templateId,
        confidence: config.confidence * (matchedKeywords.length / config.keywords.length + 0.5),
        reason: `「${matchedKeywords.join("」「")}」に関連`,
      });
    }
  }

  // 信頼度でソートして上位3件を返す
  return suggestions
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 3);
}

/**
 * 出力をフォーマット変換
 */
export function convertOutputFormat(
  output: string,
  fromFormat: OutputFormat,
  toFormat: OutputFormat
): string {
  if (fromFormat === toFormat) {
    return output;
  }

  // Markdown → Plain
  if (fromFormat === "markdown" && toFormat === "plain") {
    return output
      .replace(/#{1,6}\s+/g, "") // ヘッダー除去
      .replace(/\*\*([^*]+)\*\*/g, "$1") // 太字除去
      .replace(/\*([^*]+)\*/g, "$1") // 斜体除去
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // リンク除去
      .replace(/^[-*]\s+/gm, "・") // リスト変換
      .replace(/\|/g, " ") // テーブル区切り除去
      .replace(/---+/g, "―――――――――――――――――") // 水平線変換
      .replace(/```[\s\S]*?```/g, "") // コードブロック除去
      .replace(/`([^`]+)`/g, "$1"); // インラインコード除去
  }

  // Plain → Markdown
  if (fromFormat === "plain" && toFormat === "markdown") {
    return output
      .replace(/^・\s*/gm, "- ") // リスト変換
      .replace(/―{5,}/g, "---"); // 水平線変換
  }

  // その他の変換はそのまま返す
  return output;
}
