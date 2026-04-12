import { updateWhiteboard } from "@/lib/brain-room/conference-agents"
import type { Character } from "@/lib/brain-room/types"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { theme, purpose, conversationHistory, characters, currentWhiteboardHtml } = await req.json() as {
      theme: string
      purpose: string
      conversationHistory: Array<{ speakerIndex: number; utterance: string }>
      characters: Character[]
      currentWhiteboardHtml: string
    }

    const isFirstUpdate = !currentWhiteboardHtml
    const recentHistory = isFirstUpdate ? conversationHistory : conversationHistory.slice(-3)

    const html = await updateWhiteboard(theme, purpose, recentHistory, characters, currentWhiteboardHtml)

    return Response.json({ html })
  } catch (error) {
    console.error("[Whiteboard API Error]", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
