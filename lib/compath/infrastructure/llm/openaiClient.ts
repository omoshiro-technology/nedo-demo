import { env } from "../../config/env";
import type { OpenAIToolDefinition } from "../../domain/agent/types";

/** OpenAI Chat Completion APIのレスポンス型 */
type OpenAIChatResponse = {
  choices?: Array<{
    message: {
      content?: string;
      tool_calls?: ToolCall[];
    };
    finish_reason: string;
  }>;
};

type ChatOptions = {
  systemPrompt: string;
  userContent: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** タイムアウト（ミリ秒）。デフォルト60秒 */
  timeout?: number;
};

/**
 * Function Calling用のオプション
 */
type FunctionCallingOptions = {
  systemPrompt: string;
  userContent: string;
  tools: OpenAIToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** ツール選択を強制するか */
  toolChoice?: "auto" | "required" | "none";
  /** タイムアウト（ミリ秒）。デフォルト60秒 */
  timeout?: number;
};

/**
 * Function Calling の結果
 */
type FunctionCallingResult = {
  /** LLMのテキスト応答（ツール呼び出しがない場合） */
  content?: string;
  /** ツール呼び出しのリスト */
  toolCalls?: ToolCall[];
  /** 応答の終了理由 */
  finishReason: "stop" | "tool_calls" | "length" | "content_filter";
};

/**
 * ツール呼び出し情報
 */
type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string; // JSON文字列
  };
};

/**
 * APIエラーのカテゴリ
 */
type ErrorCategory = "transient" | "permanent" | "rate_limit";

/**
 * APIエラーを分類
 */
function categorizeError(status: number, errorText: string): ErrorCategory {
  // 429: Rate limit
  if (status === 429) return "rate_limit";

  // 5xx: サーバーエラー（一時的）
  if (status >= 500) return "transient";

  // 408: Timeout（一時的）
  if (status === 408) return "transient";

  // 503: Service Unavailable（一時的）
  if (status === 503) return "transient";

  // content missing（一時的な可能性あり）
  if (errorText.includes("missing content")) return "transient";

  // その他は永続的エラー
  return "permanent";
}

/**
 * 指数バックオフでの待機
 */
async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function generateChatCompletion(options: ChatOptions): Promise<string> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const url = env.openaiBaseUrl;

  const requestBody = {
    model: options.model ?? env.openaiModelDefault,
    temperature: options.temperature ?? 0.2,
    max_completion_tokens: options.maxTokens ?? 512,
    messages: [
      {
        role: "system",
        content: options.systemPrompt
      },
      {
        role: "user",
        content: options.userContent
      }
    ]
  };

  if (env.debugLlmLog) {
    console.log('[OpenAI Request] URL:', url);
    console.log('[OpenAI Request] Model:', requestBody.model);
    console.log('[OpenAI Request] Messages:', requestBody.messages.length);
    console.log('[OpenAI Request] System prompt (first 100 chars):', options.systemPrompt.substring(0, 100));
    console.log('[OpenAI Request] User content (first 100 chars):', options.userContent.substring(0, 100));
  }

  // リトライ設定
  const maxRetries = 2; // 最大2回（初回 + 1リトライ）
  const timeoutMs = options.timeout ?? 60000; // デフォルト60秒タイムアウト
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // タイムアウト用のAbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.openaiApiKey}`
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const text = await safeRead(response);
        const category = categorizeError(response.status, text);

        // 永続的エラーはリトライしない
        if (category === "permanent") {
          throw new Error(`AIサービスでエラーが発生しました (${response.status})`);
        }

        // Rate limitの場合は長めに待機
        if (category === "rate_limit") {
          const waitTime = Math.min(10000, 2000 * Math.pow(2, attempt));
          console.log(`[OpenAI] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await sleep(waitTime);
          continue;
        }

        // 一時的エラーの場合はリトライ
        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt); // 1s, 2s, 4s
          console.log(`[OpenAI] Transient error (${response.status}), retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error(`AIサービスが一時的に利用できません。しばらく待ってから再試行してください。`);
      }

      const json = (await response.json()) as OpenAIChatResponse;
      if (env.debugLlmLog) {
        console.log('[OpenAI Response]', JSON.stringify(json, null, 2));
      }

      const content = json?.choices?.[0]?.message?.content;
      if (!content) {
        console.error('[OpenAI Error] Response missing content. Model:', requestBody.model, 'Attempt:', attempt + 1);

        // content missingも一時的エラーとしてリトライ
        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[OpenAI] Response missing content, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error("AIからの応答が空でした。再試行してください。");
      }

      return content.toString().trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // タイムアウトエラーの場合
      if (lastError.name === "AbortError") {
        console.log(`[OpenAI] Request timed out after ${timeoutMs}ms (${attempt + 1}/${maxRetries})`);
        if (attempt < maxRetries - 1) {
          await sleep(1000);
          continue;
        }
        throw new Error("AIサービスへの接続がタイムアウトしました。しばらく待ってから再試行してください。");
      }

      // ネットワークエラーなどの場合もリトライ
      if (attempt < maxRetries - 1 && !lastError.message.includes("AIサービスでエラー")) {
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`[OpenAI] Error: ${lastError.message}, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("予期しないエラーが発生しました。");
}

async function safeRead(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

/**
 * Function Calling対応のChat Completion
 *
 * LLMがツールを選択して呼び出すことができる
 */
export async function generateFunctionCallingCompletion(
  options: FunctionCallingOptions
): Promise<FunctionCallingResult> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const url = env.openaiBaseUrl;

  const requestBody: Record<string, unknown> = {
    model: options.model ?? env.openaiModelDefault,
    temperature: options.temperature ?? 0.2,
    max_completion_tokens: options.maxTokens ?? 1024,
    messages: [
      {
        role: "system",
        content: options.systemPrompt,
      },
      {
        role: "user",
        content: options.userContent,
      },
    ],
    tools: options.tools,
  };

  // ツール選択のモードを設定
  if (options.toolChoice) {
    requestBody.tool_choice = options.toolChoice;
  }

  if (env.debugLlmLog) {
    console.log("[OpenAI Function Calling Request] URL:", url);
    console.log("[OpenAI Function Calling Request] Model:", requestBody.model);
    console.log("[OpenAI Function Calling Request] Tools:", options.tools.length);
    console.log(
      "[OpenAI Function Calling Request] Tool names:",
      options.tools.map((t) => t.function.name).join(", ")
    );
  }

  // リトライ設定
  const maxRetries = 2;
  const timeoutMs = options.timeout ?? 60000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // タイムアウト用のAbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.openaiApiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const text = await safeRead(response);
        const category = categorizeError(response.status, text);

        // 永続的エラーはリトライしない
        if (category === "permanent") {
          throw new Error(`AIサービスでエラーが発生しました (${response.status})`);
        }

        // Rate limitの場合は長めに待機
        if (category === "rate_limit") {
          const waitTime = Math.min(10000, 2000 * Math.pow(2, attempt));
          console.log(`[OpenAI FC] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await sleep(waitTime);
          continue;
        }

        // 一時的エラーの場合はリトライ
        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[OpenAI FC] Transient error (${response.status}), retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error(`AIサービスが一時的に利用できません。しばらく待ってから再試行してください。`);
      }

      const json = (await response.json()) as OpenAIChatResponse;

      if (env.debugLlmLog) {
        console.log("[OpenAI Function Calling Response]", JSON.stringify(json, null, 2));
      }

      const choice = json?.choices?.[0];
      if (!choice) {
        console.error('[OpenAI FC Error] Response missing choices. Model:', requestBody.model, 'Attempt:', attempt + 1);

        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[OpenAI FC] Response missing choices, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error("AIからの応答が空でした。再試行してください。");
      }

      const message = choice.message;
      const finishReason = choice.finish_reason as FunctionCallingResult["finishReason"];

      // ツール呼び出しがある場合
      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          toolCalls: message.tool_calls as ToolCall[],
          finishReason: "tool_calls",
        };
      }

      // 通常のテキスト応答の場合
      return {
        content: message.content?.toString().trim(),
        finishReason,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // タイムアウトエラーの場合
      if (lastError.name === "AbortError") {
        console.log(`[OpenAI FC] Request timed out after ${timeoutMs}ms (${attempt + 1}/${maxRetries})`);
        if (attempt < maxRetries - 1) {
          await sleep(1000);
          continue;
        }
        throw new Error("AIサービスへの接続がタイムアウトしました。しばらく待ってから再試行してください。");
      }

      // ネットワークエラーなどの場合もリトライ
      if (attempt < maxRetries - 1 && !lastError.message.includes("AIサービスでエラー")) {
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`[OpenAI FC] Error: ${lastError.message}, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("予期しないエラーが発生しました。");
}

/**
 * ツール実行結果を含めた継続的な会話
 */
export async function continueWithToolResults(options: {
  systemPrompt: string;
  conversationHistory: Array<{
    role: "user" | "assistant" | "tool";
    content?: string;
    tool_calls?: ToolCall[];
    tool_call_id?: string;
    name?: string;
  }>;
  tools: OpenAIToolDefinition[];
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** タイムアウト（ミリ秒）。デフォルト60秒 */
  timeout?: number;
}): Promise<FunctionCallingResult> {
  if (!env.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not set.");
  }

  const url = env.openaiBaseUrl;

  const messages = [
    { role: "system", content: options.systemPrompt },
    ...options.conversationHistory,
  ];

  const requestBody = {
    model: options.model ?? env.openaiModelDefault,
    temperature: options.temperature ?? 0.2,
    max_completion_tokens: options.maxTokens ?? 1024,
    messages,
    tools: options.tools,
  };

  if (env.debugLlmLog) {
    console.log("[OpenAI Continue Request] Messages:", messages.length);
  }

  // リトライ設定
  const maxRetries = 2;
  const timeoutMs = options.timeout ?? 60000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // タイムアウト用のAbortController
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.openaiApiKey}`,
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const text = await safeRead(response);
        const category = categorizeError(response.status, text);

        // 永続的エラーはリトライしない
        if (category === "permanent") {
          throw new Error(`AIサービスでエラーが発生しました (${response.status})`);
        }

        // Rate limitの場合は長めに待機
        if (category === "rate_limit") {
          const waitTime = Math.min(10000, 2000 * Math.pow(2, attempt));
          console.log(`[OpenAI Continue] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
          await sleep(waitTime);
          continue;
        }

        // 一時的エラーの場合はリトライ
        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[OpenAI Continue] Transient error (${response.status}), retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error(`AIサービスが一時的に利用できません。しばらく待ってから再試行してください。`);
      }

      const json = (await response.json()) as OpenAIChatResponse;

      if (env.debugLlmLog) {
        console.log("[OpenAI Continue Response]", JSON.stringify(json, null, 2));
      }

      const choice = json?.choices?.[0];
      if (!choice) {
        console.error('[OpenAI Continue Error] Response missing choices. Model:', requestBody.model, 'Attempt:', attempt + 1);

        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[OpenAI Continue] Response missing choices, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error("AIからの応答が空でした。再試行してください。");
      }

      const message = choice.message;
      const finishReason = choice.finish_reason as FunctionCallingResult["finishReason"];

      if (message.tool_calls && message.tool_calls.length > 0) {
        return {
          toolCalls: message.tool_calls as ToolCall[],
          finishReason: "tool_calls",
        };
      }

      return {
        content: message.content?.toString().trim(),
        finishReason,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // タイムアウトエラーの場合
      if (lastError.name === "AbortError") {
        console.log(`[OpenAI Continue] Request timed out after ${timeoutMs}ms (${attempt + 1}/${maxRetries})`);
        if (attempt < maxRetries - 1) {
          await sleep(1000);
          continue;
        }
        throw new Error("AIサービスへの接続がタイムアウトしました。しばらく待ってから再試行してください。");
      }

      // ネットワークエラーなどの場合もリトライ
      if (attempt < maxRetries - 1 && !lastError.message.includes("AIサービスでエラー")) {
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`[OpenAI Continue] Error: ${lastError.message}, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("予期しないエラーが発生しました。");
}

// 型をエクスポート
export type { FunctionCallingOptions, FunctionCallingResult, ToolCall };
