import { Agent } from "@mastra/core/agent"
import { anthropic } from "@ai-sdk/anthropic"
import { z } from "zod"
import type { Character, KnowledgeFile } from "@/lib/brain-room/types"
import { performKnowledgeSearch } from "./knowledge-search-tool"

// Select which persona(s) should respond in a group chat
export async function selectChatResponders(
  userMessage: string,
  characters: Character[],
  selectedIds: number[],
  recentHistory: string,
): Promise<number[]> {
  // 1-on-1: no selection needed
  if (selectedIds.length === 1) return selectedIds

  const agent = new Agent({
    name: "chat-responder-selector",
    instructions: `グループチャットで、ユーザーの発言に対して応答するペルソナを選んでください。
重要: これはグループチャットです。基本的に2人以上が応答するのが自然です。
- 必ず2人以上を選ぶ（各ペルソナの異なる視点が価値）
- 名前で呼ばれたペルソナは必ず含める
- 3人全員が応答してもよい
- 1人だけにするのは、本当に単純な確認（はい/いいえ）の場合のみ
JSON形式で返してください: { "ids": [数字の配列] }`,
    model: anthropic("claude-haiku-4-5-20251001"),
  })

  const personaList = characters
    .filter((c) => selectedIds.includes(c.id))
    .map((c) => `ID ${c.id}: ${c.name}（${c.background.slice(0, 60)}）`)
    .join("\n")

  try {
    const result = await agent.generate(
      `ペルソナ一覧:\n${personaList}\n\n直近の会話:\n${recentHistory}\n\nユーザーの発言: ${userMessage}\n\n応答すべきペルソナのIDをJSON形式で返してください。`,
      { temperature: 0.2, maxTokens: 100 },
    )
    let raw = (result.text || "").trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    console.log(`[Chat Responder] Raw response: ${raw}`)
    const parsed = JSON.parse(raw)
    // Coerce to numbers to avoid string/number mismatch
    const rawIds = (parsed.ids || parsed.responderIds || []).map(Number)
    let ids = rawIds.filter((id: number) => selectedIds.map(Number).includes(id))
    console.log(`[Chat Responder] Parsed IDs: ${rawIds}, Filtered: ${ids}, Selected: ${selectedIds}`)
    // Ensure at least 2 responders in group chat
    if (ids.length < 2 && selectedIds.length >= 2) {
      for (const sid of selectedIds) {
        if (!ids.includes(Number(sid))) { ids.push(Number(sid)); if (ids.length >= 2) break }
      }
    }
    return ids.length > 0 ? ids : selectedIds.slice(0, 2).map(Number)
  } catch {
    return selectedIds.slice(0, 2)
  }
}

// Generate a chat response from a single persona
export async function generateChatResponse(
  character: Character,
  userMessage: string,
  conversationHistory: Array<{ speakerName: string; text: string; isUser: boolean }>,
  knowledgeFiles: KnowledgeFile[],
  theme?: string,
  whiteboard?: string,
): Promise<{ utterance: string; tag: string; usedKnowledgeIds: string[] }> {
  const recentMessages = conversationHistory
    .slice(-10)
    .map((h) => `${h.isUser ? "ユーザー" : h.speakerName}: ${h.text}`)
    .join("\n")

  // Step 1: Knowledge search
  let knowledgeContext = ""
  const usedKnowledgeIds: string[] = []

  if (knowledgeFiles.length > 0) {
    const searchAgent = new Agent({
      name: `chat-search-${character.id}`,
      instructions: `ユーザーとの会話に関連するナレッジを検索してください。`,
      model: anthropic("claude-haiku-4-5-20251001"),
      tools: {
        knowledge_search: {
          id: "knowledge_search",
          description: "Search knowledge base",
          inputSchema: z.object({
            query: z.string(),
            maxResults: z.number().optional().default(5),
          }),
          outputSchema: z.object({
            results: z.array(z.object({
              id: z.string(),
              title: z.string(),
              content: z.string(),
              summary: z.string().optional(),
              score: z.number(),
              matchedKeywords: z.array(z.string()),
            })),
            totalFound: z.number(),
          }),
          execute: async (args: any) => {
            const query = args.context?.query || args.query
            const maxResults = args.context?.maxResults || args.maxResults
            if (!query) return { results: [], totalFound: 0 }
            return performKnowledgeSearch(query, knowledgeFiles, maxResults)
          },
        },
      },
    })

    try {
      global.knowledgeSearchAccumulator = []
      await searchAgent.generate(
        `ユーザーの発言: ${userMessage}\n会話の文脈: ${recentMessages}\n\nknowledge_searchツールで関連情報を検索してください。`,
        { temperature: 0.3, maxTokens: 400, toolChoice: "required" },
      )

      const results = (global.knowledgeSearchAccumulator || [])
        .filter((r: any, i: number, arr: any[]) => arr.findIndex((x: any) => x.id === r.id) === i)
        .sort((a: any, b: any) => b.score - a.score)
        .slice(0, 5)

      if (results.length > 0) {
        knowledgeContext = `\n\n【あなたが持っている知識】\n` +
          results.map((r: any) => `${r.title} (ID: ${r.id})\n${r.summary || r.content.slice(0, 200)}`).join("\n\n")
      }
    } catch (e) {
      console.error("Chat knowledge search failed:", e)
    }
  }

  // Step 2: Response generation
  const responseAgent = new Agent({
    name: `chat-response-${character.id}`,
    instructions: `あなたは${character.name}です。ユーザーとの会話に参加しています。

【あなたの人物像】
性格: ${character.personality}
話し方: ${character.speakingStyle}
経歴: ${character.background}

${theme ? `【話題】${theme}` : ""}

【ルール】
- ユーザーの質問や発言に直接応答する。
- あなたの専門性・性格に基づいた独自の視点で話す。
- 2〜4文で短く。自然な口語日本語。Markdown禁止。
- あなたのspeakingStyleに忠実に。口癖があるなら使う。
- 知識は自分が元々知っていることとして自然に話す。活用したナレッジIDは発言末尾に[UUID:id]で付記。`,
    model: anthropic("claude-haiku-4-5-20251001"),
  })

  const prompt = `${whiteboard ? `【ホワイトボード】\n${whiteboard}\n` : ""}
【会話】
${recentMessages}
ユーザー: ${userMessage}
${knowledgeContext}

${character.name}として2〜4文で応答してください。
${knowledgeContext ? "知識を活用した場合は発言末尾に[UUID:id]を付記。" : ""}

JSON形式で返してください:
{
  "utterance": "応答（口語日本語、Markdown禁止）",
  "tag": "気づき/合意/重要な情報/迷走中/戻って考える/問題提起 のいずれか"
}`

  try {
    const result = await responseAgent.generate(prompt, { temperature: 0.7, maxTokens: 500 })
    let raw = (result.text || "").trim().replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim()
    const parsed = JSON.parse(raw)

    const utterance = parsed.utterance || ""
    const uuidPattern = /\[UUID:([a-zA-Z0-9-]+)\]/gi
    let match
    while ((match = uuidPattern.exec(utterance)) !== null) {
      usedKnowledgeIds.push(match[1])
    }

    const validTags = new Set(["気づき", "合意", "重要な情報", "迷走中", "戻って考える", "問題提起"])
    return {
      utterance: utterance || `${character.name}: この点についてもう少し考えさせてください。`,
      tag: validTags.has(parsed.tag) ? parsed.tag : "気づき",
      usedKnowledgeIds,
    }
  } catch (e) {
    console.error(`Chat response failed for ${character.name}:`, e)
    return {
      utterance: `${character.name}: この点についてもう少し考えさせてください。`,
      tag: "迷走中",
      usedKnowledgeIds: [],
    }
  }
}
