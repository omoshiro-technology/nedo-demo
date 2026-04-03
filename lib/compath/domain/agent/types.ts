/**
 * AIエージェントのドメイン型定義
 *
 * エージェントがツールを選択・実行するための基盤型
 */

/**
 * JSON Schemaの簡易型定義
 */
export type JSONSchemaProperty = {
  type: "string" | "number" | "boolean" | "array" | "object";
  description?: string;
  enum?: string[];
  items?: JSONSchemaProperty;
  properties?: Record<string, JSONSchemaProperty>;
  required?: string[];
};

export type JSONSchema = {
  type: "object";
  properties: Record<string, JSONSchemaProperty>;
  required?: string[];
};

/**
 * ツール実行結果
 */
export type ToolResult<T = unknown> = {
  /** 実行成功フラグ */
  success: boolean;
  /** 実行結果データ */
  data?: T;
  /** エラーメッセージ（失敗時） */
  error?: string;
  /** 実行時間（ミリ秒） */
  executionTimeMs?: number;
};

/**
 * ツール定義
 */
export type Tool<TParams = unknown, TResult = unknown> = {
  /** ツール名（一意識別子） */
  name: string;
  /** ツールの説明（LLMが選択時に参照） */
  description: string;
  /** パラメータのJSON Schema */
  parameters: JSONSchema;
  /** ツール実行関数 */
  execute: (params: TParams) => Promise<ToolResult<TResult>>;
  /** ツールのカテゴリ（オプション） */
  category?: ToolCategory;
  /** 実行に必要な権限（オプション） */
  requiredPermissions?: ToolPermission[];
};

/**
 * ツールカテゴリ
 */
export type ToolCategory =
  | "analysis"      // 文書分析系
  | "search"        // 検索系
  | "extraction"    // 抽出系
  | "generation"    // 生成系
  | "external";     // 外部連携系

/**
 * ツール権限
 */
export type ToolPermission =
  | "read_document"     // 文書読み取り
  | "write_document"    // 文書書き込み
  | "search_history"    // 履歴検索
  | "external_api"      // 外部API呼び出し
  | "user_notification"; // ユーザー通知

/**
 * OpenAI Function Calling用のツール定義形式
 */
export type OpenAIToolDefinition = {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: JSONSchema;
  };
};

/**
 * ToolをOpenAI形式に変換
 */
export function toOpenAIToolDefinition(tool: Tool): OpenAIToolDefinition {
  return {
    type: "function",
    function: {
      name: tool.name,
      description: tool.description,
      parameters: tool.parameters,
    },
  };
}

/**
 * エージェント実行コンテキスト
 */
export type AgentContext = {
  /** セッションID */
  sessionId: string;
  /** ユーザー入力 */
  userInput: string;
  /** アップロードされたファイル情報 */
  uploadedFiles?: FileInfo[];
  /** 会話履歴 */
  conversationHistory: ConversationMessage[];
  /** 利用可能なツール */
  availableTools: Tool[];
  /** 実行済みツールの結果 */
  toolResults: ToolExecutionRecord[];
  /** 現在の状態 */
  currentState: AgentState;
  /** 最大ループ回数 */
  maxIterations: number;
  /** 現在のイテレーション */
  currentIteration: number;
};

/**
 * ファイル情報
 */
export type FileInfo = {
  name: string;
  type: string;
  size: number;
  content?: string;
};

/**
 * 会話メッセージ
 */
export type ConversationMessage = {
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
};

/**
 * ツール実行記録
 */
export type ToolExecutionRecord = {
  toolName: string;
  params: unknown;
  result: ToolResult;
  executedAt: number;
};

/**
 * エージェント状態
 */
export type AgentState =
  | "IDLE"      // 待機中
  | "SENSE"    // 状況把握中
  | "PLAN"     // 計画立案中
  | "ACT"      // 実行中
  | "EVALUATE" // 評価中
  | "COMPLETE" // 完了
  | "ERROR";   // エラー

/**
 * エージェント計画
 */
export type AgentPlan = {
  /** 計画の目標 */
  goal: string;
  /** 実行するツールのリスト */
  steps: PlanStep[];
  /** 計画の信頼度（0-1） */
  confidence: number;
};

/**
 * 計画ステップ
 */
export type PlanStep = {
  /** ステップ番号 */
  order: number;
  /** 使用するツール名 */
  toolName: string;
  /** ツールに渡すパラメータ */
  params: unknown;
  /** ステップの説明 */
  description: string;
  /** 依存する前のステップ番号 */
  dependsOn?: number[];
};

/**
 * 評価結果
 */
export type EvaluationResult = {
  /** 目標達成度（0-1） */
  goalAchievement: number;
  /** 信頼度スコア（0-1） */
  confidenceScore: number;
  /** 次のアクション */
  nextAction: "complete" | "retry" | "clarify" | "escalate";
  /** フィードバック */
  feedback: string;
  /** 再試行が必要な場合の改善提案 */
  improvementSuggestions?: string[];
};
