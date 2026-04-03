import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import type { Character, Message, SummaryNode } from "@/lib/brain-room/types"

export async function POST(req: Request) {
  try {
    const {
      theme,
      purpose,
      messages,
      characters,
      summaryNodes,
    }: {
      theme: string
      purpose?: string
      messages: Message[]
      characters: Character[]
      summaryNodes: Record<string, SummaryNode>
    } = await req.json()

    if (!theme || !messages || messages.length === 0) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    // 会議の基本情報
    const basicInfo = `会議テーマ: ${theme}${purpose ? `\n会議の目的: ${purpose}` : ""}`
    
    // 参加キャラクター情報
    const characterInfo = characters.map((c) => 
      `- ${c.name}: ${c.personality} (${c.speakingStyle})`
    ).join("\n")

    // 主要なディスカッションポイント（summary nodesから）
    const discussionPoints = Object.values(summaryNodes)
      .filter(node => node.id !== "root" && node.summary)
      .map(node => `- ${node.label}: ${node.summary}`)
      .join("\n")

    // 会話の抜粋（重要な部分のみ、長すぎる場合は最初と最後の部分）
    const conversationExcerpt = messages.length > 20 
      ? [
          ...messages.slice(0, 10),
          { characterName: "...", text: `[中略: ${messages.length - 20}件のメッセージ]`, tag: null },
          ...messages.slice(-10)
        ]
      : messages

    const conversationText = conversationExcerpt
      .map((msg) => `${msg.characterName}: ${msg.text}`)
      .join("\n")

    const prompt = `以下の会議について、エグゼクティブサマリーを作成してください。

${basicInfo}

参加キャラクター:
${characterInfo}

主要な議論ポイント:
${discussionPoints}

会話内容（抜粋）:
${conversationText}

以下の構成で、400-600文字程度のエグゼクティブサマリーを作成してください：

1. **会議の概要**: テーマと目的の要約
2. **主要な議論**: キーとなった論点や異なる視点
3. **重要な洞察**: 会議で得られた新しい気づきや重要な指摘
4. **結論・今後の方向性**: 合意点や今後検討すべき課題

読みやすく、会議に参加していない人でも内容が理解できるよう、簡潔で分かりやすい文章でお願いします。`

    const { text: summary } = await generateText({
      model: openai("gpt-4.1"),
      prompt,
      maxTokens: 800,
      temperature: 0.3,
    })

    return Response.json({ summary })
  } catch (error) {
    console.error("Error generating conference summary:", error)
    return Response.json({ error: "Failed to generate summary" }, { status: 500 })
  }
}