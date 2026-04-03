import { GeminiAnalyzer } from "@/lib/brain-room/gemini-analyzer"
import type { Message } from "@/lib/brain-room/types"

export const maxDuration = 300 // タイムアウトを5分に延長

export async function POST(req: Request) {
  try {
    const { theme, messages }: { theme: string; messages: Message[] } = await req.json()

    if (!process.env.GEMINI_API_KEY) {
      return Response.json({ error: "Gemini API key is not configured" }, { status: 500 })
    }

    if (!theme || !messages || messages.length === 0) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    // 議論のサマリーテキストを生成（インデックス付き）
    const discussionTextWithIndices = `テーマ：「${theme}」\n\n${messages
      .map((msg, index) => `[${index}] ${msg.characterName}: ${msg.text}`)
      .join("\n")}`

    const analyzer = new GeminiAnalyzer(process.env.GEMINI_API_KEY)
    const result = await analyzer.analyzeSummary(discussionTextWithIndices)

    console.log("=== Gemini Analysis Result ===")
    console.log("Raw result:", JSON.stringify(result, null, 2))
    console.log("Topics found:", result?.topics?.length || 0)
    if (result?.topics) {
      result.topics.forEach((topic, index) => {
        console.log(`Topic ${index + 1}:`, {
          name: topic.name,
          x: topic.x,
          y: topic.y,
          size: topic.size,
          importance: topic.importance,
          related_indices: topic.related_message_indices,
        })
      })
    }
    console.log("=============================")

    if (!result || !result.topics) {
      return Response.json({ error: "Failed to analyze discussion" }, { status: 500 })
    }

    return Response.json({ topics: result.topics })
  } catch (error) {
    console.error("Error in analyze-discussion-for-map:", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: "Failed to generate island map data", details: errorMessage }, { status: 500 })
  }
}