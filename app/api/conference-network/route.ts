import { 
  createConferenceNetwork, 
  selectNextSpeaker,
  generateCharacterTurn,
  type ConferenceNetworkContext 
} from "@/lib/brain-room/conference-network"
import { evaluateImportance, generateMindmapNodes, findRelatedNode } from "@/lib/brain-room/mindmap-generator"
import { createConferenceAgent, generateConferenceTurn } from "@/lib/brain-room/conference-agents"
import type { Character, KnowledgeFile } from "@/lib/brain-room/types"

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
    console.log("=== Conference Network API Started ===")
    console.log("Request received:", {
      theme: body.theme,
      purpose: body.purpose,
      charactersLength: body.characters?.length,
    })

    const { theme, purpose = "", characters, knowledgeFiles = [] } = body
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

    console.log("Creating AgentNetwork for conference with", numCharacters, "characters")

    const conversationHistory: { speakerIndex: number; utterance: string }[] = []
    const existingNodes: string[] = ["root"]
    // Track related messages for each node
    const nodeRelatedMessages: Record<string, number[]> = { root: [] }
    let messageIndex = 0
    const maxTurns = 20
    let consecutiveErrors = 0
    let stagnationCounter = 0
    let nextSpeakerIndex = 0 // Start with first character

    const stream = new ReadableStream({
      async start(controller) {
        let heartbeatInterval: NodeJS.Timeout | null = null

        try {
          console.log("=== Conference Network Stream Started ===")

          heartbeatInterval = setInterval(() => {
            sendHeartbeat(controller)
          }, 30000)

          for (let turn = 0; turn < maxTurns; turn++) {
            if (isStreamClosed) {
              console.log("Stream closed, breaking loop")
              break
            }

            console.log(`=== Turn ${turn + 1}/${maxTurns} ===`)

            const context: ConferenceNetworkContext = {
              theme,
              purpose,
              characters,
              existingNodes,
              turn,
              conversationHistory,
              knowledgeFiles
            }

            let selectedSpeaker: Character | null = null
            try {
              console.log(`Creating network for turn ${turn + 1}...`)

              // Create fresh network for each turn to avoid state issues
              const network = createConferenceNetwork(context)

              // Step 1: Use pre-selected speaker for this turn
              selectedSpeaker = characters[nextSpeakerIndex]
              console.log(`Speaker for turn ${turn + 1}: ${selectedSpeaker.name}`)

              // Step 2: Generate response from selected speaker
              const result = await generateCharacterTurn(
                selectedSpeaker,
                context
              )

              console.log(`Response generated successfully for ${selectedSpeaker.name}`)

              const normalizedResult = {
                utterance: result.utterance || `${selectedSpeaker.name}が何かを言おうとしています...`,
                tag: result.tag,
                summaryUpdate: null as any, // Will be generated by AI if important
                isFinished: result.isFinished || false,
                finishReason: result.finishReason,
                usedKnowledgeIds: result.usedKnowledgeIds || [],
              }

              // Step 3: Select next speaker based on current utterance
              if (turn < maxTurns - 1) { // Don't select next speaker on last turn
                const nextContext = {
                  ...context,
                  conversationHistory: [...conversationHistory, {
                    speakerIndex: characters.findIndex(c => c.id === selectedSpeaker.id),
                    utterance: normalizedResult.utterance
                  }]
                }
                
                try {
                  const nextSpeaker = await selectNextSpeaker(nextContext, normalizedResult.utterance)
                  nextSpeakerIndex = characters.findIndex(c => c.id === nextSpeaker.id)
                  console.log(`Next speaker selected: ${nextSpeaker.name}`)
                } catch (error) {
                  console.error('Next speaker selection failed:', error)
                  nextSpeakerIndex = (turn + 1) % characters.length
                }
              }

              // AI-based importance evaluation and mindmap update
              const conversationForEval = conversationHistory.map((h, i) => ({
                speakerName: characters[h.speakerIndex]?.name || 'Unknown',
                utterance: h.utterance,
                tag: undefined // We don't have tags in old conversation history
              }))
              
              const existingNodesForEval = existingNodes.map(id => ({
                id,
                parentId: id === 'root' ? '' : 'root', // Simplified for evaluation
                label: id === 'root' ? theme : id
              }))
              
              const importance = await evaluateImportance({
                theme,
                conversationHistory: conversationForEval,
                currentUtterance: {
                  speakerName: selectedSpeaker.name,
                  utterance: normalizedResult.utterance,
                  tag: normalizedResult.tag,
                  turn,
                },
                existingNodes: existingNodesForEval,
              })
              
              if (importance.isImportant) {
                console.log(`Turn ${turn}: Important utterance - ${importance.reason}`)
                
                const mindmapUpdate = await generateMindmapNodes({
                  theme,
                  conversationHistory: conversationForEval,
                  currentUtterance: {
                    speakerName: selectedSpeaker.name,
                    utterance: normalizedResult.utterance,
                    tag: normalizedResult.tag,
                    turn,
                  },
                  existingNodes: existingNodesForEval,
                })
                
                if (mindmapUpdate && mindmapUpdate.nodes.length > 0) {
                  const node = mindmapUpdate.nodes[0] // Use first node
                  console.log(`Turn ${turn}: Mindmap generated node:`, node)
                  // Validate parent exists
                  if (node.parentId === "root" || existingNodes.includes(node.parentId)) {
                    normalizedResult.summaryUpdate = {
                      parentId: node.parentId,
                      nodeId: node.nodeId,
                      label: node.label,
                      relatedMessageIndices: [messageIndex],
                    }
                    console.log(`Turn ${turn}: Added node "${node.label}" - ${mindmapUpdate.reasoning}`)
                  } else {
                    console.log(`Turn ${turn}: Invalid parent "${node.parentId}" - available:`, existingNodes)
                  }
                } else {
                  console.log(`Turn ${turn}: No mindmap update generated despite importance`)
                }
              } else {
                console.log(`Turn ${turn}: Not important - ${importance.reason}`)
                
                // Check if this non-important utterance relates to existing nodes
                const relatedNode = await findRelatedNode({
                  theme,
                  conversationHistory: conversationForEval,
                  currentUtterance: {
                    speakerName: selectedSpeaker.name,
                    utterance: normalizedResult.utterance,
                    tag: normalizedResult.tag,
                    turn,
                  },
                  existingNodes: existingNodesForEval,
                })
                
                console.log(`Turn ${turn}: Relation check result:`, relatedNode)
                if (relatedNode.nodeId && relatedNode.relevanceScore >= 0.4) {
                  console.log(`Turn ${turn}: Related to "${relatedNode.nodeId}" (score: ${relatedNode.relevanceScore}) - ${relatedNode.reason}`)
                  
                  // Add this message to the related node's message list
                  if (!nodeRelatedMessages[relatedNode.nodeId]) {
                    nodeRelatedMessages[relatedNode.nodeId] = []
                  }
                  nodeRelatedMessages[relatedNode.nodeId].push(messageIndex)
                  
                  // Send update event for the related node with updated message indices
                  sendEvent(controller, "node_update", {
                    nodeId: relatedNode.nodeId,
                    relatedMessageIndices: nodeRelatedMessages[relatedNode.nodeId],
                    reason: relatedNode.reason,
                    relevanceScore: relatedNode.relevanceScore,
                  })
                }
              }

              const selectedSpeakerIndex = characters.findIndex(c => c.id === selectedSpeaker.id)
              conversationHistory.push({
                speakerIndex: selectedSpeakerIndex,
                utterance: normalizedResult.utterance,
              })

              // デバッグログを追加
              console.log(`[DEBUG] Sending message event:`, {
                characterId: selectedSpeaker.id,
                hasUsedKnowledgeIds: !!normalizedResult.usedKnowledgeIds,
                usedKnowledgeIds: normalizedResult.usedKnowledgeIds,
                usedKnowledgeIdsLength: normalizedResult.usedKnowledgeIds?.length || 0,
              })

              sendEvent(controller, "message", {
                characterId: selectedSpeaker.id,
                characterName: selectedSpeaker.name,
                text: normalizedResult.utterance,
                tag: normalizedResult.tag,
                usedKnowledgeIds: normalizedResult.usedKnowledgeIds || [],
              })

              if (normalizedResult.summaryUpdate?.nodeId && normalizedResult.summaryUpdate?.label) {
                stagnationCounter = 0
                const parentId = normalizedResult.summaryUpdate.parentId || "root"
                const validParentId = existingNodes.includes(parentId) ? parentId : "root"
                
                // Initialize related messages for new node
                if (!nodeRelatedMessages[normalizedResult.summaryUpdate.nodeId]) {
                  nodeRelatedMessages[normalizedResult.summaryUpdate.nodeId] = []
                }
                nodeRelatedMessages[normalizedResult.summaryUpdate.nodeId].push(messageIndex)
                
                const summaryUpdate = {
                  parentId: validParentId,
                  nodeId: normalizedResult.summaryUpdate.nodeId,
                  label: normalizedResult.summaryUpdate.label,
                  relatedMessageIndices: nodeRelatedMessages[normalizedResult.summaryUpdate.nodeId],
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

              // Use first character as fallback if speaker selection failed
              const fallbackCharacter = selectedSpeaker || characters[0]
              const fallbackSpeakerIndex = characters.findIndex(c => c.id === fallbackCharacter.id)
              const fallbackUtterance = `${fallbackCharacter.name}: この点についてもう少し考えさせてください。`
              conversationHistory.push({ speakerIndex: fallbackSpeakerIndex, utterance: fallbackUtterance })
              sendEvent(controller, "message", {
                characterId: fallbackCharacter.id,
                characterName: fallbackCharacter.name,
                text: fallbackUtterance,
              })

              const fallbackNodeId = `error-recovery-${turn}`
              sendEvent(controller, "summary_update", {
                parentId: "root",
                nodeId: fallbackNodeId,
                label: `${fallbackCharacter.name}の考察`,
                relatedMessageIndices: [messageIndex],
              })
              existingNodes.push(fallbackNodeId)
              messageIndex++
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
          if (!isStreamClosed) {
            isStreamClosed = true
            console.log("=== Conference Network Stream Ended ===")
            try {
              controller.close()
            } catch (closeError) {
              console.error("Error closing controller:", closeError)
            }
          } else {
            console.log("=== Conference Network Stream Already Ended ===")
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
    console.error("[Conference Network API Error]", error)
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