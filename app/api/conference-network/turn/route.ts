import { selectNextSpeaker, generateCharacterTurn, getConferencePhase, type ConferenceNetworkContext } from "@/lib/brain-room/conference-network"
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
    } = body

    if (!theme || !characters || characters.length < 2) {
      return Response.json({ error: "Invalid request" }, { status: 400 })
    }

    const phase = getConferencePhase(turn, 20)

    const context: ConferenceNetworkContext = {
      theme,
      purpose,
      characters,
      existingNodes: ["root"],
      turn,
      conversationHistory,
      knowledgeFiles,
      phase,
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

    return Response.json({
      message,
      nextSpeakerIndex: newNextSpeakerIndex,
      // AIが早期にisFinishedを返しても、ターン18未満では無視する
      isFinished: turn >= 18 && (result.isFinished || false),
      finishReason: turn >= 18 ? result.finishReason : undefined,
      phase,
    })
  } catch (error) {
    console.error("[Conference Turn API Error]", error)
    return Response.json(
      { error: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
