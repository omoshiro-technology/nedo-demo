/**
 * DecisionNavigator エラーハンドリング
 *
 * カスタムエラークラスと統一されたエラー処理ユーティリティ
 */

// ============================================================
// エラーコード定義
// ============================================================

export enum ErrorCode {
  // Validation
  SESSION_NOT_FOUND = "SESSION_NOT_FOUND",
  NODE_NOT_FOUND = "NODE_NOT_FOUND",
  INVALID_SELECTION = "INVALID_SELECTION",
  INVALID_INPUT = "INVALID_INPUT",

  // LLM
  LLM_API_ERROR = "LLM_API_ERROR",
  LLM_PARSE_ERROR = "LLM_PARSE_ERROR",
  LLM_RATE_LIMITED = "LLM_RATE_LIMITED",
  LLM_TIMEOUT = "LLM_TIMEOUT",

  // Document
  DOCUMENT_PARSE_ERROR = "DOCUMENT_PARSE_ERROR",

  // Knowledge
  KNOWLEDGE_NOT_FOUND = "KNOWLEDGE_NOT_FOUND",

  // Internal
  INTERNAL_ERROR = "INTERNAL_ERROR",
}

// ============================================================
// カスタムエラークラス
// ============================================================

/**
 * DecisionNavigator専用のカスタムエラークラス
 */
export class DecisionNavigatorError extends Error {
  public readonly code: ErrorCode;
  public readonly context?: Record<string, unknown>;
  public readonly timestamp: string;

  constructor(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>
  ) {
    super(message);
    this.name = "DecisionNavigatorError";
    this.code = code;
    this.context = context;
    this.timestamp = new Date().toISOString();

    // prototypeチェーンの復元（TypeScriptでのError継承に必要）
    Object.setPrototypeOf(this, DecisionNavigatorError.prototype);
  }

  /**
   * エラーを構造化されたオブジェクトに変換
   */
  toJSON(): Record<string, unknown> {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      context: this.context,
      timestamp: this.timestamp,
    };
  }
}

// ============================================================
// エラー分類
// ============================================================

/**
 * エラーをErrorCodeに分類
 */
export function classifyError(error: unknown): ErrorCode {
  if (error instanceof DecisionNavigatorError) {
    return error.code;
  }

  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    // LLM関連
    if (message.includes("rate limit")) {
      return ErrorCode.LLM_RATE_LIMITED;
    }
    if (message.includes("timeout") || message.includes("etimedout")) {
      return ErrorCode.LLM_TIMEOUT;
    }
    if (message.includes("json") || message.includes("parse")) {
      return ErrorCode.LLM_PARSE_ERROR;
    }
    if (message.includes("api") || message.includes("openai")) {
      return ErrorCode.LLM_API_ERROR;
    }

    // Validation関連
    if (message.includes("session") && message.includes("not found")) {
      return ErrorCode.SESSION_NOT_FOUND;
    }
    if (message.includes("node") && message.includes("not found")) {
      return ErrorCode.NODE_NOT_FOUND;
    }
  }

  return ErrorCode.INTERNAL_ERROR;
}

/**
 * フォールバック可能なエラーかどうか判定
 */
export function shouldFallback(code: ErrorCode): boolean {
  const fallbackableErrors = [
    ErrorCode.LLM_API_ERROR,
    ErrorCode.LLM_PARSE_ERROR,
    ErrorCode.LLM_RATE_LIMITED,
    ErrorCode.LLM_TIMEOUT,
    ErrorCode.DOCUMENT_PARSE_ERROR,
  ];
  return fallbackableErrors.includes(code);
}

// ============================================================
// エラーハンドリングユーティリティ
// ============================================================

/** エラーハンドリングのコンテキスト */
export type ErrorContext = {
  /** 関数名（ログプレフィックス用） */
  functionName: string;
  /** セッションID */
  sessionId?: string;
  /** ノードID */
  nodeId?: string;
  /** フォールバック関数 */
  fallback?: () => Promise<unknown> | unknown;
  /** フォールバック時にログをwarnにするか（デフォルト: true） */
  warnOnFallback?: boolean;
};

/**
 * 統一されたエラーハンドリングラッパー
 *
 * @example
 * ```typescript
 * const result = await withErrorHandling(
 *   () => generateNextOptionsWithLLMInternal(session, node),
 *   {
 *     functionName: "generateNextOptionsWithLLM",
 *     sessionId: session.id,
 *     nodeId: node?.id,
 *     fallback: () => generateNextOptionsWithTemplate(session, node),
 *   }
 * );
 * ```
 */
export async function withErrorHandling<T>(
  fn: () => Promise<T>,
  context: ErrorContext
): Promise<T> {
  const { functionName, sessionId, nodeId, fallback, warnOnFallback = true } = context;

  try {
    return await fn();
  } catch (error) {
    const errorCode = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logContext = { sessionId, nodeId, errorCode };

    // フォールバック可能かつフォールバック関数がある場合
    if (shouldFallback(errorCode) && fallback) {
      if (warnOnFallback) {
        console.warn(`[${functionName}] ${errorMessage}. Using fallback.`, logContext);
      }
      return (await fallback()) as T;
    }

    // フォールバック不可能なエラー
    console.error(`[${functionName}] ${errorMessage}`, logContext);

    // カスタムエラーとして再スロー
    if (error instanceof DecisionNavigatorError) {
      throw error;
    }

    throw new DecisionNavigatorError(errorCode, errorMessage, logContext);
  }
}

/**
 * 同期版のエラーハンドリングラッパー
 */
export function withErrorHandlingSync<T>(
  fn: () => T,
  context: ErrorContext
): T {
  const { functionName, sessionId, nodeId, fallback, warnOnFallback = true } = context;

  try {
    return fn();
  } catch (error) {
    const errorCode = classifyError(error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    const logContext = { sessionId, nodeId, errorCode };

    if (shouldFallback(errorCode) && fallback) {
      if (warnOnFallback) {
        console.warn(`[${functionName}] ${errorMessage}. Using fallback.`, logContext);
      }
      return fallback() as T;
    }

    console.error(`[${functionName}] ${errorMessage}`, logContext);

    if (error instanceof DecisionNavigatorError) {
      throw error;
    }

    throw new DecisionNavigatorError(errorCode, errorMessage, logContext);
  }
}

// ============================================================
// ファクトリ関数
// ============================================================

/**
 * セッションが見つからないエラーを生成
 */
export function sessionNotFoundError(sessionId: string): DecisionNavigatorError {
  return new DecisionNavigatorError(
    ErrorCode.SESSION_NOT_FOUND,
    "セッションが見つかりません",
    { sessionId }
  );
}

/**
 * ノードが見つからないエラーを生成
 */
export function nodeNotFoundError(nodeId: string, sessionId?: string): DecisionNavigatorError {
  return new DecisionNavigatorError(
    ErrorCode.NODE_NOT_FOUND,
    "ノードが見つかりません",
    { nodeId, sessionId }
  );
}

/**
 * 無効な選択エラーを生成
 */
export function invalidSelectionError(
  reason: string,
  context?: Record<string, unknown>
): DecisionNavigatorError {
  return new DecisionNavigatorError(
    ErrorCode.INVALID_SELECTION,
    reason,
    context
  );
}

/**
 * LLMパースエラーを生成
 */
export function llmParseError(
  details: string,
  context?: Record<string, unknown>
): DecisionNavigatorError {
  return new DecisionNavigatorError(
    ErrorCode.LLM_PARSE_ERROR,
    `LLMレスポンスのパースに失敗: ${details}`,
    context
  );
}

/**
 * LLM APIエラーを生成
 */
export function llmApiError(
  details: string,
  context?: Record<string, unknown>
): DecisionNavigatorError {
  return new DecisionNavigatorError(
    ErrorCode.LLM_API_ERROR,
    `LLM API呼び出しに失敗: ${details}`,
    context
  );
}
