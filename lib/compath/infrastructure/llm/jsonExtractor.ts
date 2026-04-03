/**
 * LLM応答からJSON文字列を抽出するユーティリティ
 *
 * LLMの出力はマークダウンコードブロック（```json ... ```）で囲まれている場合と、
 * 生のJSONが直接返される場合がある。このモジュールは両方のケースを統一的に処理する。
 */

/**
 * LLM応答からJSON文字列を抽出する。
 *
 * 抽出順序:
 * 1. マークダウンコードブロック（```json ... ``` または ``` ... ```）
 * 2. 生のJSONオブジェクト（{...}）またはJSON配列（[...]）
 * 3. 入力文字列をそのまま返す
 *
 * @param response LLMからの生応答テキスト
 * @returns 抽出されたJSON文字列
 */
export function extractJsonFromLLMResponse(response: string): string {
  const trimmed = response.trim();

  // 1. マークダウンコードブロックからの抽出
  const codeBlockMatch = trimmed.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (codeBlockMatch?.[1]) {
    return codeBlockMatch[1].trim();
  }

  // 2. 生のJSONオブジェクトまたは配列の抽出
  const jsonMatch = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
  if (jsonMatch) {
    return jsonMatch[1].trim();
  }

  // 3. フォールバック: そのまま返す
  return trimmed;
}

/**
 * LLM応答からJSONを抽出してパースする。
 *
 * @param response LLMからの生応答テキスト
 * @returns パースされたオブジェクト
 * @throws JSON.parseエラー（パースに失敗した場合）
 */
export function parseJsonFromLLMResponse<T>(response: string): T {
  const jsonStr = extractJsonFromLLMResponse(response);
  return JSON.parse(jsonStr) as T;
}
