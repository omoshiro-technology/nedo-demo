import { selectNextSpeaker, generateCharacterTurn, type ConferenceNetworkContext } from "@/lib/brain-room/conference-network"
import { updateWhiteboard } from "@/lib/brain-room/conference-agents"
import type { Character, KnowledgeFile } from "@/lib/brain-room/types"

export const maxDuration = 60

interface TurnRequest {
  theme: string
  purpose?: string
  characters: Character[]
  knowledgeFiles?: KnowledgeFile[]
  conversationHistory: Array<{ speakerIndex: number; utterance: string }>
  turn: number
  nextSpeakerIndex: number
  whiteboardHtml?: string
  updateWhiteboard?: boolean
}

export async function POST(req: Request) {
  try {
    const body: TurnRequest = await req.json()
    const {
      theme,
      purpose = "",
      characters,
      knowledgeFiles = [],
      conversationHistory,
      turn,
      nextSpeakerIndex,
      whiteboardHtml = "",
      updateWhiteboard: shouldUpdateWhiteboard = false,
    } = body

    if (!theme || !characters || characters.length < 2) {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const context: ConferenceNetworkContext = {
      theme,
      purpose,
      characters,
      existingNodes: ["root"],
      turn,
      conversationHistory,
      knowledgeFiles,
    }

    // 1. Generate response from the selected speaker
    const selectedSpeaker = characters[nextSpeakerIndex] || characters[0]

    const whiteboardContext = whiteboardHtml
      ? whiteboardHtml.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim()
      : undefined

    const result = await generateCharacterTurn(selectedSpeaker, context, whiteboardContext)

    const message = {
      characterId: selectedSpeaker.id,
      characterName: selectedSpeaker.name,
      text: result.utterance || `${selectedSpeaker.name}が何かを言おうとしています...`,
      tag: result.tag,
      usedKnowledgeIds: result.usedKnowledgeIds || [],
    }

    // 2. Select next speaker
    const updatedHistory = [
      ...conversationHistory,
      { speakerIndex: nextSpeakerIndex, utterance: message.text },
    ]

    let newNextSpeakerIndex = (turn + 1) % characters.length
    try {
      const nextContext = { ...context, conversationHistory: updatedHistory }
      const nextSpeaker = await selectNextSpeaker(nextContext, message.text)
      newNextSpeakerIndex = characters.findIndex((c) => c.id === nextSpeaker.id)
      if (newNextSpeakerIndex === -1) newNextSpeakerIndex = (turn + 1) % characters.length
    } catch (error) {
      console.error("Next speaker selection failed:", error)
    }

    // 3. Whiteboard update (only when requested by client, every 3 turns)
    let newWhiteboardHtml = whiteboardHtml
    if (shouldUpdateWhiteboard) {
      try {
        const isFirstUpdate = !whiteboardHtml
        newWhiteboardHtml = await updateWhiteboard(
          theme,
          purpose,
          isFirstUpdate ? updatedHistory : updatedHistory.slice(-3),
          characters,
          whiteboardHtml,
        )
      } catch (error) {
        console.error("Whiteboard update failed:", error)
      }
    }

    return Response.json({
      message,
      nextSpeakerIndex: newNextSpeakerIndex,
      whiteboardHtml: newWhiteboardHtml,
      isFinished: result.isFinished || false,
      finishReason: result.finishReason,
    })
  } catch (error) {
    console.error("[Conference Turn API Error]", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
