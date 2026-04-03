/**
 * コピーレディ出力テンプレートAPI
 */
import type { GeneratedOutputData } from "../types/chat";

const API_BASE = "/api/compath/chat";

/** テンプレート推薦結果 */
export type TemplateSuggestion = {
  templateId: string;
  confidence: number;
  reason: string;
};

/** テンプレート一覧アイテム */
export type TemplateListItem = {
  id: string;
  name: string;
  category: string;
  description: string;
  icon: string;
};

/**
 * ユーザーメッセージからテンプレートを推薦
 */
export async function suggestTemplates(
  userMessage: string
): Promise<TemplateSuggestion[]> {
  const response = await fetch(`${API_BASE}/suggest-templates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userMessage }),
  });

  if (!response.ok) {
    throw new Error("テンプレート推薦に失敗しました");
  }

  const data = await response.json();
  return data.suggestions;
}

/**
 * テンプレートから出力を生成
 */
export async function generateOutput(
  templateId: string,
  context?: {
    userMessage?: string;
    chatHistory?: Array<{ role: string; content: string }>;
    analysisResult?: {
      decisions?: Array<{ content: string; status: string }>;
      actionItems?: Array<{ task: string; assignee?: string; deadline?: string }>;
      summary?: string;
    };
    userProvidedValues?: Record<string, string>;
  }
): Promise<GeneratedOutputData> {
  const response = await fetch(`${API_BASE}/generate-output`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ templateId, context }),
  });

  if (!response.ok) {
    throw new Error("出力生成に失敗しました");
  }

  return response.json();
}

/**
 * 利用可能なテンプレート一覧を取得
 */
export async function getTemplates(): Promise<TemplateListItem[]> {
  const response = await fetch(`${API_BASE}/templates`);

  if (!response.ok) {
    throw new Error("テンプレート一覧の取得に失敗しました");
  }

  const data = await response.json();
  return data.templates;
}

/**
 * メッセージからテンプレート作成意図を検出
 *
 * 「〜を作成して」「〜を書いて」などのパターンを検出
 */
export function detectTemplateIntent(message: string): boolean {
  const patterns = [
    /メール.*作成/,
    /メール.*書/,
    /議事録.*作成/,
    /議事録.*書/,
    /チェックリスト.*作成/,
    /アクションプラン.*作成/,
    /報告.*メール/,
    /依頼.*メール/,
    /招集.*メール/,
    /レビュー.*依頼/,
    /会議.*招集/,
    /進捗.*報告/,
  ];

  return patterns.some((pattern) => pattern.test(message));
}
