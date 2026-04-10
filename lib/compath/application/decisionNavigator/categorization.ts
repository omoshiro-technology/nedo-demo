/**
 * 問題カテゴリの自動判定
 * - キーワードベース判定（高速・フォールバック用）
 * - LLM判定（高精度・ANTHROPIC_API_KEYがある場合）
 */

import { env } from "../../config/env";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import type { ProblemCategory, ProblemCategoryResult } from "./types";

// ============================================================
// キーワードマッピング
// ============================================================

const CATEGORY_KEYWORDS: Record<ProblemCategory, string[]> = {
  technical: [
    // バグ・エラー系
    "バグ", "エラー", "障害", "不具合", "クラッシュ", "例外", "異常",
    // 性能系
    "性能", "パフォーマンス", "遅い", "重い", "レスポンス", "速度", "メモリ",
    // 設計・実装系
    "設計", "実装", "コード", "アーキテクチャ", "リファクタリング", "技術的負債",
    // テスト系
    "テスト", "品質", "カバレッジ", "検証", "デバッグ",
    // インフラ系
    "サーバー", "インフラ", "デプロイ", "環境", "構築", "設定",
    // セキュリティ系
    "セキュリティ", "脆弱性", "認証", "権限",
  ],
  organizational: [
    // 人員系
    "人員", "人手", "リソース不足", "採用", "退職", "引き継ぎ",
    // チーム系
    "チーム", "組織", "部署", "グループ", "メンバー",
    // プロセス系
    "プロセス", "フロー", "手順", "ワークフロー", "承認", "レビュー",
    // コミュニケーション系
    "コミュニケーション", "連携", "報告", "共有", "会議", "ミーティング",
    // 文化系
    "文化", "雰囲気", "モチベーション低下", "士気",
  ],
  strategic: [
    // 方針系
    "方針", "戦略", "ビジョン", "目標", "計画", "ロードマップ",
    // 優先順位系
    "優先順位", "優先度", "トレードオフ", "判断", "意思決定",
    // リソース配分系
    "予算", "コスト", "投資", "配分", "リソース配分",
    // ビジネス系
    "市場", "競合", "顧客", "売上", "収益", "KPI",
    // 長期系
    "長期", "中期", "将来", "成長", "拡大", "縮小",
  ],
  personal: [
    // スキル系
    "スキル", "能力", "経験", "知識", "学習", "勉強", "成長",
    // キャリア系
    "キャリア", "昇進", "評価", "目標設定", "フィードバック",
    // モチベーション系
    "モチベーション", "やる気", "意欲", "やりがい", "達成感",
    // ワークライフバランス系
    "残業", "休暇", "ワークライフバランス", "健康", "ストレス", "燃え尽き",
    // 人間関係系
    "人間関係", "上司", "部下", "同僚", "相性",
  ],
};

// ============================================================
// キーワードベース判定
// ============================================================

type KeywordMatchResult = {
  category: ProblemCategory;
  matchedKeywords: string[];
  score: number;
};

function matchKeywords(text: string): KeywordMatchResult[] {
  const normalizedText = text.toLowerCase();
  const results: KeywordMatchResult[] = [];

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    const matchedKeywords: string[] = [];
    for (const keyword of keywords) {
      if (normalizedText.includes(keyword.toLowerCase())) {
        matchedKeywords.push(keyword);
      }
    }
    if (matchedKeywords.length > 0) {
      results.push({
        category: category as ProblemCategory,
        matchedKeywords,
        score: matchedKeywords.length,
      });
    }
  }

  // スコア順にソート
  results.sort((a, b) => b.score - a.score);
  return results;
}

function categorizeByKeywords(purpose: string): ProblemCategoryResult {
  const matches = matchKeywords(purpose);

  if (matches.length === 0) {
    // マッチなしの場合はデフォルトで technical
    return {
      primary: "technical",
      confidence: 30,
      keywords: [],
    };
  }

  const primary = matches[0];
  const secondary = matches.length > 1 ? matches[1] : undefined;

  // 信頼度の計算（マッチ数と総キーワード数に基づく）
  const maxScore = Math.max(...matches.map((m) => m.score));
  const confidence = Math.min(40 + maxScore * 15, 85); // 40-85の範囲

  return {
    primary: primary.category,
    secondary: secondary?.category,
    confidence,
    keywords: primary.matchedKeywords,
  };
}

// ============================================================
// LLM判定
// ============================================================

const CATEGORIZATION_SYSTEM_PROMPT = `あなたは問題分析の専門家です。ユーザーが入力した課題や目的を分析し、以下の4つのカテゴリのいずれに該当するか判定してください。

## カテゴリ
1. technical: 技術的問題（バグ、性能、設計、インフラ、セキュリティなど）
2. organizational: 組織的問題（人員、チーム、プロセス、コミュニケーション、文化など）
3. strategic: 戦略的問題（方針、優先順位、リソース配分、ビジネス判断など）
4. personal: 個人的問題（スキル、キャリア、モチベーション、人間関係など）

## 出力形式
以下のJSON形式で出力してください。余計な説明は不要です。

{
  "primary": "カテゴリ名",
  "secondary": "カテゴリ名またはnull",
  "confidence": 0-100の数値,
  "keywords": ["判定に使用したキーワード1", "キーワード2"]
}

## 判定のポイント
- 複数のカテゴリに該当する場合は、最も重要なものを primary に、次点を secondary に設定
- confidence は判定の確信度（明確な場合は80以上、曖昧な場合は50-70）
- keywords には判定の根拠となったキーワードを3-5個程度抽出`;

async function categorizeByLLM(purpose: string): Promise<ProblemCategoryResult> {
  const response = await generateChatCompletion({
    systemPrompt: CATEGORIZATION_SYSTEM_PROMPT,
    userContent: purpose,
    temperature: 0.1,
    maxTokens: 256,
  });

  // JSONをパース
  const parsed = parseJsonFromLLMResponse<{
    primary: string;
    secondary?: string | null;
    confidence: number;
    keywords: string[];
  }>(response);

  // バリデーション
  const validCategories: ProblemCategory[] = ["technical", "organizational", "strategic", "personal"];
  if (!validCategories.includes(parsed.primary as ProblemCategory)) {
    throw new Error(`Invalid primary category: ${parsed.primary}`);
  }

  return {
    primary: parsed.primary as ProblemCategory,
    secondary: parsed.secondary && validCategories.includes(parsed.secondary as ProblemCategory)
      ? (parsed.secondary as ProblemCategory)
      : undefined,
    confidence: Math.max(0, Math.min(100, parsed.confidence)),
    keywords: parsed.keywords || [],
  };
}

// ============================================================
// メイン関数
// ============================================================

/**
 * 問題カテゴリを判定する
 * - ANTHROPIC_API_KEYがある場合: LLM判定（高精度）
 * - ない場合: キーワードベース判定（高速）
 */
export async function categorizeProblem(purpose: string): Promise<ProblemCategoryResult> {
  // APIキーがない場合はキーワードベース判定
  if (!env.anthropicApiKey) {
    return categorizeByKeywords(purpose);
  }

  try {
    // LLM判定を試行
    const result = await categorizeByLLM(purpose);
    return result;
  } catch (error) {
    // LLM判定失敗時はキーワードベースにフォールバック
    console.warn("[categorization] LLM categorization failed, falling back to keyword-based:", error);
    return categorizeByKeywords(purpose);
  }
}

/**
 * キーワードベースのみで判定（テスト用）
 */
export function categorizeProblemSync(purpose: string): ProblemCategoryResult {
  return categorizeByKeywords(purpose);
}
