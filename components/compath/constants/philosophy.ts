/**
 * UI思想コピー定数ファイル
 *
 * チャットUIはデモ用であり、将来は他の仕組みに組み込まれることを想定。
 * 思想コピーを定数化し、どこからでも参照可能にする。
 *
 * 禁止用語:
 * - 「〜でお困りですか？」「〜をお探しですか？」などの営業的な表現
 * - 「便利」「簡単」「かんたん」などの訴求表現
 * - 「ぜひ」「今すぐ」などの促進表現
 */

// ========================================
// AgentSelector（ホーム画面）
// ========================================

export const AGENT_SELECTOR = {
  /** メインタイトル - ユーザーの行動を促す */
  TITLE: "何でも聞いてください",

  /** サブタイトル - アシスタントの役割を説明 */
  SUBTITLE: "質問やファイルに応じて最適なアシスタントが対応します",

  /** テキストエリアのプレースホルダー */
  PLACEHOLDER: "質問を入力、またはファイルをドロップ... (Ctrl+Enterで送信)",

  /** デモ用データセクションのラベル */
  DEMO_SECTION_LABEL: "デモデータ投入",
} as const;

// ========================================
// ChatInput（メッセージ入力欄）
// ========================================

export const CHAT_INPUT = {
  /** 知識抽出エージェント用プレースホルダー */
  PLACEHOLDER_KNOWLEDGE_EXTRACTION: "分析したい文書をアップロードしてください...",

  /** 意思決定タイムラインエージェント用プレースホルダー */
  PLACEHOLDER_DECISION_TIMELINE: "今決めたいことは何ですか？",

  /** 日報エージェント用プレースホルダー */
  PLACEHOLDER_DAILY_REPORT: "今日の業務内容を入力してください...",

  /** 過去事例検索エージェント用プレースホルダー */
  PLACEHOLDER_LEARN_FROM_PAST: "検索したい内容を入力してください...",

  /** デフォルトプレースホルダー */
  PLACEHOLDER_DEFAULT: "メッセージを入力...",

  /** ファイル添付時のヒント */
  FILE_HINT: "指示を入力してください（例: 解析して、まとめて）",
} as const;

// ========================================
// ChatPage（エージェント別ウェルカム画面）
// ========================================

export const WELCOME_MESSAGES = {
  knowledge_extraction: {
    title: "文書構造解析",
    description: "報告書をアップロードして、知見を構造化し欠損情報を可視化します。",
    instructions: "分析したい報告書（PDF、DOCX、TXT）をアップロードしてください。",
  },
  unified_analysis: {
    title: "意思決定支援",
    description: "今決めたいことを入力してください。過去の類似事例を参考に、意思決定を支援します。",
    instructions: "状況やファイルを入力してください。",
  },
  daily_report: {
    title: "日報を書く",
    description: "今日の業務内容を入力してください。",
    instructions: "この機能は現在開発中です。",
  },
  default: {
    title: "チャット",
    description: "",
    instructions: "",
  },
} as const;

// ========================================
// FlowChart（意思決定ナビゲーター）
// ========================================

export const FLOWCHART = {
  /** ローディングプレースホルダーのラベル */
  LOADING_PLACEHOLDER: "探索中...",
} as const;

// ========================================
// NodeDetailSheet（ノード詳細パネル）
// ========================================

export const NODE_DETAIL_SHEET = {
  /** セクションタイトル */
  SECTION_TITLES: {
    overview: "概要",
    riskStrategy: "リスク対応戦略",
    riskCategories: "関連するリスク領域",
    evaluation: "評価",
    pastCases: "関連する過去事例",
    rationale: "選択理由（任意）",
    warnings: "見落とし注意",
  },

  /** ラベル */
  LABELS: {
    confidence: "確度",
    riskLevel: "リスク",
    pastCaseCount: "過去事例",
  },

  /** 選択理由のヒント */
  RATIONALE_HINT: "この選択肢を選ぶ理由を選んでください",

  /** 選択ボタンのラベル */
  SELECT_BUTTON: "この選択肢を選ぶ",

  /** カスタム理由入力のプレースホルダー */
  CUSTOM_RATIONALE_PLACEHOLDER: "その他の理由を入力...",
} as const;

// ========================================
// リスク関連ラベル
// ========================================

export const RISK_LABELS = {
  /** リスクレベル */
  levels: {
    low: "低",
    medium: "中",
    high: "高",
  },

  /** リスク戦略 */
  strategies: {
    avoid: {
      label: "回避",
      description: "リスク自体を排除する戦略。高コストだが効果的。",
    },
    mitigate: {
      label: "軽減",
      description: "リスクの影響を最小化する戦略。バランスの取れたアプローチ。",
    },
    transfer: {
      label: "転嫁",
      description: "リスクを第三者に移転する戦略。専門家や外部に委ねる。",
    },
    accept: {
      label: "受容",
      description: "リスクを許容する戦略。コストを抑えつつ対処可能な場合に有効。",
    },
  },

  /** リスク種別 */
  categories: {
    safety: "安全",
    quality: "品質",
    cost: "コスト",
    delivery: "納期",
    environment: "環境",
    scope: "スコープ",
  },
} as const;

// ========================================
// DecisionResultView（意思決定タイムライン）
// ========================================

export const DECISION_RESULT_VIEW = {
  /** 空状態のメッセージ */
  EMPTY_MESSAGE: "意思決定パターンが見つかりませんでした",

  /** タイトル */
  TITLE: "意思決定タイムライン分析結果",

  /** フィルターラベル */
  FILTER_LABELS: {
    all: "すべて",
    confirmed: "確定",
    gray: "要確認",
    proposed: "未確定",
  },

  /** ソートラベル */
  SORT_LABEL: "優先度順",
} as const;

// ========================================
// 共通メッセージ
// ========================================

export const COMMON_MESSAGES = {
  /** 閉じるボタンのaria-label */
  CLOSE_ARIA_LABEL: "閉じる",

  /** 送信ボタン */
  SEND: "送信",

  /** ファイル添付 */
  ATTACH_FILE: "ファイル添付",
} as const;
