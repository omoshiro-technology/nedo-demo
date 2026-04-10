import { env } from "../../config/env";

type ChatOptions = {
  systemPrompt: string;
  userContent: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  /** タイムアウト（ミリ秒）。デフォルト60秒 */
  timeout?: number;
};

type AnthropicResponse = {
  content?: Array<{
    type: string;
    text?: string;
  }>;
  stop_reason?: string;
};

type ErrorCategory = "transient" | "permanent" | "rate_limit";

function categorizeError(status: number): ErrorCategory {
  if (status === 429) return "rate_limit";
  if (status === 529) return "transient"; // Anthropic overloaded
  if (status >= 500) return "transient";
  if (status === 408) return "transient";
  return "permanent";
}

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function safeRead(response: Response): Promise<string> {
  try {
    return await response.text();
  } catch {
    return "";
  }
}

export async function generateChatCompletion(options: ChatOptions): Promise<string> {
  if (!env.anthropicApiKey) {
    throw new Error("ANTHROPIC_API_KEY is not set.");
  }

  const url = env.anthropicBaseUrl;

  const requestBody = {
    model: options.model ?? env.anthropicModelDefault,
    max_tokens: options.maxTokens ?? 512,
    temperature: options.temperature ?? 0.2,
    system: options.systemPrompt,
    messages: [
      {
        role: "user" as const,
        content: options.userContent,
      },
    ],
  };

  if (env.debugLlmLog) {
    console.log("[Anthropic Request] URL:", url);
    console.log("[Anthropic Request] Model:", requestBody.model);
    console.log("[Anthropic Request] System prompt (first 100 chars):", options.systemPrompt.substring(0, 100));
    console.log("[Anthropic Request] User content (first 100 chars):", options.userContent.substring(0, 100));
  }

  const maxRetries = 3;
  const timeoutMs = options.timeout ?? 30000;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": env.anthropicApiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));

      if (!response.ok) {
        const category = categorizeError(response.status);

        if (category === "permanent") {
          const text = await safeRead(response);
          throw new Error(`AIサービスでエラーが発生しました (${response.status}): ${text}`);
        }

        if (category === "rate_limit") {
          if (attempt < maxRetries - 1) {
            const waitTime = Math.min(10000, 2000 * Math.pow(2, attempt));
            console.log(`[Anthropic] Rate limited, waiting ${waitTime}ms before retry ${attempt + 1}/${maxRetries}`);
            await sleep(waitTime);
            continue;
          }
          throw new Error("AIサービスがレート制限中です。しばらく待ってから再試行してください。");
        }

        // transient
        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[Anthropic] Transient error (${response.status}), retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error("AIサービスが一時的に利用できません。しばらく待ってから再試行してください。");
      }

      const json = (await response.json()) as AnthropicResponse;
      if (env.debugLlmLog) {
        console.log("[Anthropic Response]", JSON.stringify(json, null, 2));
      }

      const content = json?.content?.[0]?.text;
      if (!content) {
        console.error("[Anthropic Error] Response missing content. Model:", requestBody.model, "Attempt:", attempt + 1);

        if (attempt < maxRetries - 1) {
          const waitTime = 1000 * Math.pow(2, attempt);
          console.log(`[Anthropic] Response missing content, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
          await sleep(waitTime);
          continue;
        }

        throw new Error("AIからの応答が空でした。再試行してください。");
      }

      return content.trim();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (lastError.name === "AbortError") {
        console.log(`[Anthropic] Request timed out after ${timeoutMs}ms (${attempt + 1}/${maxRetries})`);
        if (attempt < maxRetries - 1) {
          await sleep(1000);
          continue;
        }
        throw new Error("AIサービスへの接続がタイムアウトしました。しばらく待ってから再試行してください。");
      }

      if (attempt < maxRetries - 1 && !lastError.message.includes("AIサービスでエラー")) {
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`[Anthropic] Error: ${lastError.message}, retrying in ${waitTime}ms (${attempt + 1}/${maxRetries})`);
        await sleep(waitTime);
        continue;
      }

      throw lastError;
    }
  }

  throw lastError || new Error("予期しないエラーが発生しました。");
}
