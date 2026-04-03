import { 
  createConferenceAgent, 
  generateConferenceTurn, 
  type ConferenceContext 
} from "@/lib/brain-room/conference-agents"
import type { Character } from "@/lib/brain-room/types"

export const maxDuration = 300

export async function POST(req: Request) {
  const encoder = new TextEncoder()
  let isStreamClosed = false

  const sendEvent = (controller: ReadableStreamDefaultController, type: string, data: any) => {
    if (isStreamClosed) {
      console.log("Attempted to send event to closed stream:", type)
      return
    }
    try {
      const eventData = JSON.stringify({ type, data })
      controller.enqueue(encoder.encode(`data: ${eventData}\n\n`))
      console.log(`Event sent: ${type}`)
    } catch (error) {
      console.error("Error sending event:", error)
      isStreamClosed = true
    }
  }

  const sendHeartbeat = (controller: ReadableStreamDefaultController) => {
    if (!isStreamClosed) {
      try {
        controller.enqueue(encoder.encode(`: heartbeat\n\n`))
      } catch (error) {
        console.error("Heartbeat failed:", error)
        isStreamClosed = true
      }
    }
  }

  try {
    const body = await req.json()
    console.log("=== Conference API Started ===")
    console.log("Request received:", {
      theme: body.theme,
      purpose: body.purpose,
      charactersLength: body.characters?.length,
    })

    const { theme, purpose = "", characters } = body
    const numCharacters = characters?.length || 0

    // Input validation
    if (!theme || typeof theme !== "string" || theme.trim().length === 0) {
      console.error("Invalid theme:", theme)
      return new Response(JSON.stringify({ error: "Invalid theme provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    if (!characters || !Array.isArray(characters) || numCharacters < 2 || numCharacters > 5) {
      console.error("Invalid characters array:", { characters, numCharacters })
      return new Response(JSON.stringify({ error: "Invalid characters array provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    // Validate each character has required fields
    for (let i = 0; i < characters.length; i++) {
      const char = characters[i]
      if (!char || !char.name || !char.personality || !char.speakingStyle) {
        console.error("Invalid character at index", i, char)
        return new Response(JSON.stringify({ error: `Invalid character data at index ${i}` }), {
          status: 400,
          headers: { "Content-Type": "application/json" },
        })
      }
    }

    console.log("Creating Mastra agents for", numCharacters, "characters")

    // Create Mastra agents for each character
    const characterAgents = new Map<number, any>()
    for (const character of characters) {
      const agent = createConferenceAgent(character)
      characterAgents.set(character.id, agent)
    }

    console.log("Agents created successfully")

    const conversationHistory: { speakerIndex: number; utterance: string }[] = []
    const existingNodes: string[] = ["root"]
    let currentSpeakerIndex = 0
    let messageIndex = 0
    const maxTurns = 20
    let consecutiveErrors = 0
    let stagnationCounter = 0

    const stream = new ReadableStream({
      async start(controller) {
        let heartbeatInterval: NodeJS.Timeout | null = null

        try {
          console.log("=== Conference Stream Started ===")

          heartbeatInterval = setInterval(() => {
            sendHeartbeat(controller)
          }, 30000)

          for (let turn = 0; turn < maxTurns; turn++) {
            if (isStreamClosed) {
              console.log("Stream closed, breaking loop")
              break
            }

            const currentCharacter = characters[currentSpeakerIndex]
            console.log(`=== Turn ${turn + 1}/${maxTurns} ===`)
            console.log(`Current character: ${currentCharacter.name} (index: ${currentSpeakerIndex})`)

            let previousSpeaker: Character | null = null
            if (conversationHistory.length > 0) {
              const lastMessage = conversationHistory[conversationHistory.length - 1]
              previousSpeaker = characters[lastMessage.speakerIndex]
            }

            const isStagnant = stagnationCounter >= 3
            
            const context: ConferenceContext = {
              theme,
              purpose,
              characters,
              existingNodes,
              turn,
              isStagnant,
              previousSpeaker,
              conversationHistory
            }

            try {
              console.log(`Generating response for ${currentCharacter.name}...`)

              const agent = characterAgents.get(currentCharacter.id)
              if (!agent) {
                throw new Error(`Agent not found for character ${currentCharacter.id}`)
              }

              const result = await generateConferenceTurn(
                agent,
                currentCharacter,
                context,
                numCharacters
              )

              console.log(`Response generated successfully for ${currentCharacter.name}`)

              const normalizedResult = {
                utterance: result.utterance || `${currentCharacter.name}が何かを言おうとしています...`,
                tag: result.tag,
                nextSpeakerIndex:
                  typeof result.nextSpeakerIndex === "number" &&
                  result.nextSpeakerIndex >= 0 &&
                  result.nextSpeakerIndex < numCharacters
                    ? result.nextSpeakerIndex
                    : (currentSpeakerIndex + 1) % numCharacters,
                summaryUpdate: result.summaryUpdate,
                isFinished: result.isFinished || false,
                finishReason: result.finishReason,
              }

              // Dynamic parent selection for better branching
              if (normalizedResult.summaryUpdate && normalizedResult.summaryUpdate.parentId) {
                const availableParents = existingNodes.filter((nodeId) => nodeId !== normalizedResult.summaryUpdate.nodeId)

                // Encourage branching from root or shallow nodes
                if (turn % 3 === 0 && availableParents.length > 2) {
                  const shallowNodes = availableParents.slice(0, Math.min(3, availableParents.length))
                  normalizedResult.summaryUpdate.parentId = shallowNodes[Math.floor(Math.random() * shallowNodes.length)]
                }
              }

              // If no summaryUpdate was provided but the turn count suggests we need more nodes
              if (!normalizedResult.summaryUpdate && turn > 4 && existingNodes.length < Math.floor((turn + 1) * 0.4) && turn % 4 === 0) {
                const nodeId = `${currentCharacter.name.toLowerCase()}-key-${turn}`
                const parentOptions = existingNodes.length > 3 ? existingNodes.slice(0, 3) : ["root"]
                const selectedParent = parentOptions[Math.floor(Math.random() * parentOptions.length)]

                const shortLabel = normalizedResult.utterance.length > 20 
                  ? normalizedResult.utterance.substring(0, 18) + "..." 
                  : normalizedResult.utterance

                normalizedResult.summaryUpdate = {
                  parentId: selectedParent,
                  nodeId: nodeId,
                  label: shortLabel,
                  relatedMessageIndices: [turn],
                }
              }

              conversationHistory.push({
                speakerIndex: currentSpeakerIndex,
                utterance: normalizedResult.utterance,
              })

              sendEvent(controller, "message", {
                characterId: currentCharacter.id,
                characterName: currentCharacter.name,
                text: normalizedResult.utterance,
                tag: normalizedResult.tag,
              })

              if (normalizedResult.summaryUpdate?.nodeId && normalizedResult.summaryUpdate?.label) {
                stagnationCounter = 0
                const parentId = normalizedResult.summaryUpdate.parentId || "root"
                const validParentId = existingNodes.includes(parentId) ? parentId : "root"
                const summaryUpdate = {
                  parentId: validParentId,
                  nodeId: normalizedResult.summaryUpdate.nodeId,
                  label: normalizedResult.summaryUpdate.label,
                  relatedMessageIndices: [messageIndex],
                }
                if (!existingNodes.includes(summaryUpdate.nodeId)) {
                  existingNodes.push(summaryUpdate.nodeId)
                }
                sendEvent(controller, "summary_update", summaryUpdate)
                console.log(`Node created: ${summaryUpdate.label} (Total nodes: ${existingNodes.length})`)
              } else {
                stagnationCounter++
              }

              messageIndex++
              consecutiveErrors = 0

              console.log(`Turn ${turn + 1} completed successfully`)

              if (normalizedResult.isFinished || turn >= maxTurns - 1) {
                console.log("Conference ending:", normalizedResult.finishReason || "Max turns reached")
                sendEvent(controller, "end", {
                  reason: normalizedResult.finishReason || "The conference has concluded.",
                })
                break
              }

              currentSpeakerIndex = normalizedResult.nextSpeakerIndex

              await new Promise((resolve) => setTimeout(resolve, 1000))
            } catch (generationError) {
              console.error(`Turn ${turn + 1} generation error:`, generationError)
              consecutiveErrors++

              if (consecutiveErrors >= 3) {
                console.log("Too many consecutive errors, ending conference")
                sendEvent(controller, "end", {
                  reason: "Technical difficulties encountered. Conference ended.",
                })
                break
              }

              const fallbackUtterance = `${currentCharacter.name}: この点についてもう少し考えさせてください。`
              conversationHistory.push({ speakerIndex: currentSpeakerIndex, utterance: fallbackUtterance })
              sendEvent(controller, "message", {
                characterId: currentCharacter.id,
                characterName: currentCharacter.name,
                text: fallbackUtterance,
              })

              const fallbackNodeId = `error-recovery-${turn}`
              sendEvent(controller, "summary_update", {
                parentId: "root",
                nodeId: fallbackNodeId,
                label: `${currentCharacter.name}の考察`,
                relatedMessageIndices: [messageIndex],
              })
              existingNodes.push(fallbackNodeId)
              messageIndex++
              currentSpeakerIndex = (currentSpeakerIndex + 1) % numCharacters
              await new Promise((resolve) => setTimeout(resolve, 500))
            }
          }

          if (!isStreamClosed) {
            sendEvent(controller, "end", { reason: "The maximum number of turns has been reached." })
          }
        } catch (streamError) {
          console.error("Stream processing error:", streamError)
          if (!isStreamClosed) {
            sendEvent(controller, "end", { reason: "An error occurred during the conference." })
          }
        } finally {
          if (heartbeatInterval) {
            clearInterval(heartbeatInterval)
          }
          isStreamClosed = true
          console.log("=== Conference Stream Ended ===")
          try {
            controller.close()
          } catch (closeError) {
            console.error("Error closing controller:", closeError)
          }
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Cache-Control",
      },
    })
  } catch (error) {
    console.error("[Conference API Error]", error)
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred"
    console.error("Error details:", {
      message: errorMessage,
      stack: error instanceof Error ? error.stack : undefined,
    })
    return new Response(
      JSON.stringify({
        error: "An internal server error occurred.",
        details: errorMessage,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    )
  }
}