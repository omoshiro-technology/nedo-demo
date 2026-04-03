import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import type { Character, Message } from "@/lib/brain-room/types"

export async function POST(req: Request) {
  try {
    const {
      topic,
      messages,
      characters,
    }: {
      topic: string
      messages: Message[]
      characters: Character[]
    } = await req.json()

    if (!topic || !messages || messages.length === 0) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    // メッセージを整理
    const conversationText = messages.map((msg) => `${msg.characterName}: ${msg.text}`).join("\n\n")

    const prompt = `以下は「${topic}」というトピックに関する会議の一部です。

参加キャラクター:
${characters.map((c) => `- ${c.name}: ${c.personality}`).join("\n")}

会話内容:
${conversationText}

このトピックについて、以下の観点から簡潔なサマリー（150文字以内）を作成してください：
1. 主要な論点
2. キャラクターたちの異なる視点
3. 会議の結論や合意点（あれば）

サマリー:`

    const { text: summary } = await generateText({
      model: openai("gpt-4.1"),
      prompt,
      maxTokens: 300,
      temperature: 0.3,
    })

    return Response.json({ summary })
  } catch (error) {
    console.error("Error generating topic summary:", error)
    return Response.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}