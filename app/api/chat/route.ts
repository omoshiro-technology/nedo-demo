import { selectChatResponders, generateChatResponse } from "@/lib/brain-room/chat-agents"
import { updateWhiteboard } from "@/lib/brain-room/conference-agents"
import type { Character, KnowledgeFile } from "@/lib/brain-room/types"

export const maxDuration = 120

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  let isStreamClosed = false

  const sendEvent = (controller: ReadableStreamDefaultController, type: string, data: any) => {
    if (isStreamClosed) return
    try {
      controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type, data })}\n\n`))
    } catch {
      isStreamClosed = true
    }
  }

  try {
    const body = await req.json()
    const {
      userMessage,
      characters,
      selectedPersonaIds,
      conversationHistory,
      knowledgeFiles = [],
      theme,
      purpose,
      whiteboard,
      turnCount = 0,
    }: {
      userMessage: string
      characters: Character[]
      selectedPersonaIds: number[]
      conversationHistory: Array<{ speakerName: string; text: string; isUser: boolean }>
      knowledgeFiles: KnowledgeFile[]
      theme?: string
      purpose?: string
      whiteboard?: string
      turnCount?: number
    } = body

    if (!userMessage || !characters || !selectedPersonaIds?.length) {
      return new Response(JSON.stringify({ error: "Invalid input" }), { status: 400 })
    }

    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Build recent history string for responder selection
          const recentHistory = conversationHistory
            .slice(-8)
            .map((h) => `${h.isUser ? "ユーザー" : h.speakerName}: ${h.text}`)
            .join("\n")

          // Select responders (name-based, same approach as conference mode)
          const responderIds = await selectChatResponders(
            userMessage,
            characters,
            selectedPersonaIds,
            recentHistory,
          )

          // Generate responses from each selected persona
          for (const id of responderIds) {
            const character = characters.find((c) => c.id === id)
            if (!character) continue

            const result = await generateChatResponse(
              character,
              userMessage,
              conversationHistory,
              knowledgeFiles,
              theme,
              whiteboard,
            )

            sendEvent(controller, "message", {
              characterId: character.id,
              characterName: character.name,
              text: result.utterance,
              tag: result.tag,
              usedKnowledgeIds: result.usedKnowledgeIds,
            })
          }

          // Update whiteboard every 3 user messages
          if (turnCount > 0 && turnCount % 3 === 0 && whiteboard !== undefined) {
            try {
              const fullHistory = [
                ...conversationHistory.map((h) => ({
                  speakerIndex: h.isUser ? -1 : characters.findIndex((c) => c.name === h.speakerName),
                  utterance: h.text,
                })),
                { speakerIndex: -1, utterance: userMessage },
              ]
              const allChars = [{ id: -1, name: "ユーザー", personality: "", speakingStyle: "", background: "" } as any, ...characters]

              const newWhiteboard = await updateWhiteboard(
                theme || "",
                purpose || "",
                fullHistory,
                allChars,
                whiteboard || "",
              )
              sendEvent(controller, "whiteboard_update", { html: newWhiteboard })
            } catch (e) {
              console.error("Chat whiteboard update failed:", e)
            }
          }

          sendEvent(controller, "end", { reason: "done" })
        } catch (error) {
          console.error("Chat stream error:", error)
          sendEvent(controller, "end", { reason: "error" })
        } finally {
          if (!isStreamClosed) {
            isStreamClosed = true
            try { controller.close() } catch {}
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    })
  } catch (error) {
    console.error("Chat API error:", error)
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 })
  }
}
