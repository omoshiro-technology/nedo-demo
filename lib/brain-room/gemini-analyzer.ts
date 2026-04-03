import type { TopicData } from "./types"

/** 分析結果の型 */
export interface SummaryAnalysisResult {
  topics?: TopicData[]
}

/** Gemini APIクライアント */
class GeminiClient {
  private apiKey: string
  private baseUrl = "https://generativelanguage.googleapis.com/v1beta"

  constructor(apiKey: string) {
    this.apiKey = apiKey
  }

  /**
   * Structured Output対応のコンテンツ生成
   */
  async generateStructuredContent(prompt: string, schema?: object): Promise<object> {
    const generationConfig: any = {
      responseMimeType: "application/json",
      temperature: 0.2,
      topP: 0.8,
      topK: 20,
      maxOutputTokens: 8192,
    }

    if (schema) {
      generationConfig.responseSchema = schema
    }

    const enhancedPrompt =
      prompt +
      "\n\n必ず提供されたJSONスキーマに厳密に従って応答してください。回答は有効なJSONのみを含み、説明文やMarkdownフォーマットは含めないでください。"

    const response = await fetch(`${this.baseUrl}/models/gemini-2.5-pro:generateContent?key=${this.apiKey}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [{ parts: [{ text: enhancedPrompt }] }],
        generationConfig,
      }),
    })

    if (!response.ok) {
      const errorBody = await response.text()
      console.error("Gemini API Error Body:", errorBody)
      throw new Error(`Gemini API エラー: ${response.status} ${response.statusText}`)
    }

    const data = await response.json()
    const responseText = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"

    try {
      return JSON.parse(responseText)
    } catch (error) {
      const cleanedJson = this.cleanJsonResponse(responseText)
      return JSON.parse(cleanedJson)
    }
  }

  private cleanJsonResponse(response: string): string {
    let cleaned = response
      .replace(/^```json\s*\n?/i, "")
      .replace(/^```\s*\n?/m, "")
      .replace(/\n?```\s*$/g, "")
      .trim()

    const jsonStart = cleaned.indexOf("{")
    const jsonEnd = cleaned.lastIndexOf("}")

    if (jsonStart !== -1 && jsonEnd !== -1 && jsonEnd > jsonStart) {
      cleaned = cleaned.substring(jsonStart, jsonEnd + 1)
    }

    return cleaned
  }
}

/** 分析結果JSONスキーマ */
export const ANALYSIS_RESULT_SCHEMA = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          content: { type: "string" },
          x: { type: "number" },
          y: { type: "number" },
          size: { type: "number" },
          importance: { type: "number" },
          island_image: { type: "string" },
          related_topics: {
            type: "array",
            items: { type: "string" },
          },
          related_message_indices: {
            type: "array",
            description: "このトピックに最も関連する発言のインデックス（3〜5個）",
            items: { type: "number" },
          },
        },
        required: ["name", "content", "x", "y", "size", "importance", "island_image"],
      },
    },
  },
  required: ["topics"],
}

/** Gemini分析器クラス */
export class GeminiAnalyzer {
  private client: GeminiClient

  constructor(apiKey: string) {
    this.client = new GeminiClient(apiKey)
  }

  async analyzeSummary(discussionTextWithIndices: string): Promise<SummaryAnalysisResult | null> {
    try {
      const prompt = this.createAnalysisPrompt(discussionTextWithIndices)
      const result = await this.client.generateStructuredContent(prompt, ANALYSIS_RESULT_SCHEMA)
      return this.validateAnalysisResult(result)
    } catch (error) {
      console.error("Gemini分析エラー:", error)
      return null
    }
  }

  private createAnalysisPrompt(discussionTextWithIndices: string): string {
    return `
以下のインデックス付きの議論テキストを詳細に分析し、細分化された話題を抽出して空間配置してください。

【議論テキスト】
${discussionTextWithIndices.substring(0, 8000)}${discussionTextWithIndices.length > 8000 ? "..." : ""}

【分析方針】
- 抽象的な概念も具体的な要素に分解
- 技術的な側面、社会的な側面、経済的な側面など多角的に分析
- 関連するサブトピックや詳細な要素も含める

【空間配置の考慮点】
- 類似した話題は近くに配置（座標の差を20以内に）
- 重要度の高い話題は中央寄りに配置
- 周辺的な話題は端に配置

【指示】
1. テキストから15-17個の具体的で詳細な話題を抽出
2. 大きな話題は複数の小さな話題に細分化
3. 各話題について、最も関連性の高い発言のインデックスを3〜5個、'related_message_indices'として含める
4. 関連性の高い話題は近くに配置
5. 重要度に応じてサイズを調整（0.3-0.9の範囲）
6. 適切な島画像を選択 (例: Island-1.svg, Island-2.svg...)

以下のJSON形式で15-17個の話題を生成してください：
{
  "topics": [
    {
      "name": "話題名",
      "content": "説明",
      "x": 50.0,
      "y": 50.0,
      "size": 0.5,
      "importance": 0.5,
      "island_image": "Island-1.svg",
      "related_topics": [],
      "related_message_indices": [0, 5, 12]
    }
  ]
}`
  }

  private validateAnalysisResult(parsed: any): SummaryAnalysisResult {
    if (!parsed || typeof parsed !== "object") {
      throw new Error("解析結果が無効です")
    }
    const result: SummaryAnalysisResult = { topics: [] }
    if (parsed.topics && Array.isArray(parsed.topics)) {
      result.topics = parsed.topics
        .map((topic: any, index: number) => {
          if (!topic || typeof topic !== "object") return null
          return {
            name: String(topic.name || `topic_${index}`),
            content: String(topic.content || ""),
            x: Number(topic.x) || 50,
            y: Number(topic.y) || 50,
            size: Number(topic.size) || 0.5,
            importance: Number(topic.importance) || 0.5,
            island_image: String(topic.island_image || "Island-1.svg"),
            related_topics: Array.isArray(topic.related_topics) ? topic.related_topics.map(String) : [],
            related_message_indices: Array.isArray(topic.related_message_indices)
              ? topic.related_message_indices.map(Number)
              : [],
          }
        })
        .filter((t): t is TopicData => t !== null)
    }
    return result
  }
}
