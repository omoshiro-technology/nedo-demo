import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import type { Character, Message, SummaryNode } from "@/lib/brain-room/types"

export async function POST(req: Request) {
  try {
    const {
      topic,
      theme,
      messages,
      characters,
      allMessages,
      summaryNodes,
    }: {
      topic: string
      theme: string
      messages: Message[]
      characters: Character[]
      allMessages: Message[]
      summaryNodes: Record<string, SummaryNode>
    } = await req.json()

    if (!topic || !theme || !messages || messages.length === 0) {
      return Response.json({ error: "Invalid input" }, { status: 400 })
    }

    // 関連するメッセージを整理
    const conversationText = messages.map((msg) => `${msg.characterName}: ${msg.text}`).join("\n\n")

    // 関連するサブトピックを取得
    const relatedSubtopics = Object.values(summaryNodes)
      .filter((node) => node.id !== "root" && node.label.includes(topic.split(":")[0]))
      .map((node) => node.label)
      .slice(0, 5)

    const prompt = `あなたは会議分析の専門家です。以下の情報に基づいて、詳細なトピック分析レポートを作成してください。

## 基本情報
- **メインテーマ**: ${theme}
- **分析対象トピック**: ${topic}
- **参加キャラクター**: ${characters.map((c) => `${c.name}（${c.personality.substring(0, 50)}...）`).join(", ")}

## 関連する議論内容
${conversationText}

## 関連サブトピック
${relatedSubtopics.length > 0 ? relatedSubtopics.join(", ") : "なし"}

## レポート作成指示
以下の構成で詳細なレポートを作成してください：

### 1. トピック概要
- このトピックの核心的な論点
- メインテーマとの関連性

### 2. 主要な議論ポイント
- 会議で取り上げられた重要な観点
- キャラクター間の意見の相違点と共通点

### 3. 各キャラクターの立場
- 各キャラクターの主張とその根拠
- 特徴的な発言や論理展開

### 4. 得られた示唆とまとめ
- この会議から得られる重要な洞察
- 今後の検討課題や発展可能性
- 実践的な含意

### 5. 結論
- トピックに関する総合的な評価
- メインテーマへの貢献度

レポートは読みやすく、具体的で、建設的な内容にしてください。各セクションは明確に区分し、重要なポイントは強調してください。`

    const { text: report } = await generateText({
      model: openai("gpt-4.1"),
      prompt,
      maxTokens: 2000,
      temperature: 0.3,
    })

    return Response.json({ report })
  } catch (error) {
    console.error("Error generating topic report:", error)
    return Response.json({ error: "Failed to generate topic report" }, { status: 500 })
  }
}