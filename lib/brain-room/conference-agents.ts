import { Agent } from "@mastra/core"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { Character, MessageTagType, KnowledgeFile } from "@/lib/brain-room/types"
import { performKnowledgeSearch, type KnowledgeSearchResponse } from "./knowledge-search-tool"

const messageTags = ["気づき", "合意", "重要な情報", "迷走中", "戻って考える", "問題提起"] as const

// Conference context type for internal use
export interface AgentConferenceContext {
  theme: string
  purpose?: string
  turn: number
  conversationHistory: Array<{ speakerIndex: number; utterance: string }>
  characters: Character[]
  knowledgeFiles: KnowledgeFile[]
}

// Conference turn schema for structured output - only content, no speaker selection
export const conferenceTurnSchema = z.object({
  thought: z.string().optional().describe("The reasoning process for the utterance"),
  utterance: z.string().describe("The character's next message in the conference"),
  tag: z.enum(messageTags as readonly [string, ...string[]]).optional().describe("Tag for the utterance"),
  isFinished: z.boolean().optional().describe("Whether the conference should end"),
  finishReason: z.string().optional().describe("Reason for ending"),
  usedKnowledgeIds: z.array(z.string()).optional().describe("IDs of knowledge items referenced in this response"),
})

export const flexibleTurnSchema = z.object({
  utterance: z.string().min(1).describe("The character's message"),
  tag: z.enum(messageTags as readonly [string, ...string[]]).optional(),
  isFinished: z.boolean().optional(),
  usedKnowledgeIds: z.array(z.string()).optional().describe("IDs of knowledge items referenced in this response"),
})

export interface ConferenceContext {
  theme: string
  purpose?: string
  characters: Character[]
  existingNodes: string[]
  turn: number
  isStagnant: boolean
  previousSpeaker: Character | null
  conversationHistory: Array<{ speakerIndex: number; utterance: string }>
}

function createCharacterInstructions(
  character: Character,
  context: ConferenceContext
): string {
  const { theme, purpose, characters, existingNodes, turn, isStagnant, previousSpeaker } = context
  
  const otherCharacters = characters
    .filter(c => c.id !== character.id)
    .map(c => `- ${c.name}: ${c.personality}`)
    .join("\n")

  const nodesList = existingNodes.length > 1 ? `\nExisting discussion nodes: ${existingNodes.slice(1).join(", ")}` : ""
  const maxTurns = 20

  let specialInstructions = ""
  if (isStagnant) {
    specialInstructions =
      "The conference seems stagnant. Propose a completely new topic or angle to reinvigorate the conversation."
  } else if (turn > 2 && turn % 3 === 1 && previousSpeaker) {
    specialInstructions = `Find a point of agreement with ${previousSpeaker.name}'s last statement. Build upon their idea and express your agreement naturally (avoid directly saying "合意" in your response). If you agree, you MUST use the "合意" tag to mark this as an agreement moment.`
  } else if (turn > 3 && turn % 4 === 2) {
    specialInstructions = `Challenge the current conference by raising a concern, question, or potential problem. Use the "問題提起" tag when raising important issues or concerns that need to be addressed.`
  } else if (turn > 5 && turn % 4 === 0) {
    const targetCharacter = characters[(turn + 1) % characters.length]
    specialInstructions = `Ask ${targetCharacter.name} for their opinion to encourage interaction.`
  }

  const purposeSection = purpose
    ? `\n**Conference Purpose**: ${purpose}\nKeep this purpose in mind and try to steer the conversation toward achieving this goal when appropriate.`
    : ""

  return `You are ${character.name}, participating in a conference on: "${theme}"${purposeSection}

Your Character Profile:
- Name: ${character.name}
- Personality: ${character.personality}
- Speaking Style: ${character.speakingStyle}
- Background: ${character.background}

Other Participants:
${otherCharacters}

${nodesList}

**Your Role Guidelines:**
- Stay true to your personality and speaking style
- Foster Collaboration: Actively look for opportunities to agree with other participants
- Express Agreement Naturally: Use phrases like "その通りですね", "確かに", "おっしゃる通り", "同感です"
- Raise Important Issues: Use phrases like "しかし問題は", "気になる点は", "課題として", "懸念されるのは"
- Stay Purpose-Focused: ${purpose ? `Remember the conference purpose: "${purpose}". Guide discussion toward achieving it.` : "Keep the discussion focused and productive."}

**Tag Usage:**
- Use "合意" when expressing agreement with another participant
- Use "問題提起" when raising concerns or important questions
- Use other tags appropriately based on your contribution

**Response Guidelines:**
- Keep responses natural, engaging, and under 120 words
- Speak in character consistently
- Build meaningful conversations

**Focus on Quality Discussion:**
- Introduce NEW major topics or perspectives when appropriate
- Provide substantial elaboration that advances the conversation
- Make strong counterpoints that challenge previous ideas
- Build toward important agreements that synthesize viewpoints
- Raise critical questions that reframe the discussion

**Current Situation (Turn ${turn}/${maxTurns}):**
${specialInstructions || "Continue the natural flow of conference."}

Respond as ${character.name} would, staying in character and following the conference guidelines.`
}

// Step 1: Knowledge Search Agent (No structured output) - with tool
export function createKnowledgeSearchAgent(character: Character, knowledgeFiles: KnowledgeFile[], context: AgentConferenceContext): Agent {
  const knowledgeTool = {
    knowledge_search: {
      id: "knowledge_search",
      description: "Search through the knowledge base to find relevant information for the discussion. Use this when you need to reference specific facts, data, or insights to support your arguments.",
      inputSchema: z.object({
        query: z.string().describe("The search query to find relevant knowledge"),
        maxResults: z.number().optional().default(5).describe("Maximum number of results to return"),
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
        console.log(`[DEBUG] Tool execute called with args:`, args)
        
        // Extract query and maxResults from the args structure
        let query: string;
        let maxResults: number | undefined;
        
        if (args.context) {
          // Nested context structure
          query = args.context.query;
          maxResults = args.context.maxResults;
        } else {
          // Direct structure
          query = args.query;
          maxResults = args.maxResults;
        }
        
        console.log(`[DEBUG] Extracted query: "${query}", maxResults: ${maxResults}`)
        
        if (!query) {
          console.log(`[DEBUG] No query provided, returning empty results`)
          return { results: [], totalFound: 0 };
        }
        
        return performKnowledgeSearch(query, knowledgeFiles, maxResults)
      }
    }
  }

  return new Agent({
    name: `knowledge-searcher-${character.id}`,
    instructions: `You are a knowledge researcher for ${character.name} in an internal company meeting about "${context.theme}".
${context.purpose ? `Meeting Purpose: ${context.purpose}` : ''}

Your job is to search the knowledge base using the knowledge_search tool when discussing company-related topics.

Search for company information when discussing:
- Company policies, strategies, and guidelines
- Technical specifications and practices
- Executive messages and directions  
- Cultural values and work practices
- Any factual claims about the company

Use the knowledge_search tool with specific keywords related to the topic being discussed.`,
    model: openai("gpt-4.1"),
    tools: knowledgeTool,
  })
}

// Step 2: Response Generation Agent (Structured output only)
export function createResponseAgent(character: Character, context: AgentConferenceContext): Agent {
  return new Agent({
    name: `response-generator-${character.id}`,
    instructions: `You are ${character.name}, a conference participant with the following traits:
- Personality: ${character.personality}
- Speaking Style: ${character.speakingStyle}  
- Background: ${character.background}

You are participating in a structured conference about "${context.theme}".
${context.purpose ? `Conference Purpose: ${context.purpose}\n\nIMPORTANT: Your contributions should help achieve this purpose. Consider how your response advances the conference goal.` : ''}

You participate in structured conferences, staying in character while contributing meaningfully to discussions.

${context.purpose ? `Always consider how your response helps achieve the conference purpose: "${context.purpose}". Guide the discussion toward productive outcomes that fulfill this goal.` : ''}

When provided with knowledge search results, naturally incorporate the information into your response while staying in character. Include the knowledge IDs in your usedKnowledgeIds array when referencing internal information.`,
    model: openai("gpt-4.1"),
  })
}


// Two-step generation process: Knowledge search + Response generation
export async function generateConferenceTurnWithKnowledge(
  character: Character,
  context: AgentConferenceContext
): Promise<any> {
  const { knowledgeFiles, theme, turn, conversationHistory, characters } = context
  
  const recentMessages = conversationHistory
    .slice(-3)
    .map((h) => `${characters[h.speakerIndex].name}: ${h.utterance}`)
    .join("\n")

  let knowledgeContext = ""
  let usedKnowledgeIds: string[] = []

  // Clear global accumulator at start of each turn
  global.knowledgeSearchAccumulator = []

  // Step 1: Knowledge Search (if knowledge files available)
  if (knowledgeFiles.length > 0) {
    console.log(`[DEBUG] Knowledge files available: ${knowledgeFiles.length} files`)
    console.log(`[DEBUG] Knowledge file names: ${knowledgeFiles.map(f => f.name).join(', ')}`)
    
    const searchAgent = createKnowledgeSearchAgent(character, knowledgeFiles, context)
    
    const searchPrompt = `Theme: ${theme}
Recent conversation:
${recentMessages || "This is the start of the conference."}

Search the knowledge base for relevant company information about this discussion topic. Use specific keywords related to:
- Company strategies and policies mentioned
- Technical topics being discussed
- Executive statements or internal guidelines
- Any factual claims about the company

Use the knowledge_search tool to find relevant information.`

    try {
      console.log(`Turn ${turn}: Step 1 - Knowledge search for ${character.name}`)
      console.log(`[DEBUG] Calling searchAgent.generate with toolChoice: "required"`)
      
      const searchResult = await searchAgent.generate(searchPrompt, {
        temperature: 0.3,
        maxTokens: 400,
        toolChoice: "required", // Force tool usage (specific tool names not supported)
      })

      console.log(`[DEBUG] searchResult:`, JSON.stringify({
        hasToolCalls: !!searchResult.toolCalls,
        toolCallsLength: searchResult.toolCalls?.length || 0,
        hasToolResults: !!searchResult.toolResults,
        toolResultsLength: searchResult.toolResults?.length || 0,
        text: searchResult.text?.substring(0, 100),
        allKeys: Object.keys(searchResult),
      }, null, 2))

      // Extract tool results from the response
      if (searchResult.toolResults && searchResult.toolResults.length > 0) {
        console.log(`[DEBUG] Found ${searchResult.toolResults.length} tool results`)
        console.log(`[DEBUG] ENTERING TOOL RESULTS PROCESSING`)
        const allResults: KnowledgeSearchResponse['results'] = []
        
        for (const toolResult of searchResult.toolResults) {
          console.log(`[DEBUG] Tool result:`, JSON.stringify({
            toolName: toolResult.toolName,
            hasResult: !!toolResult.result,
            resultKeys: toolResult.result ? Object.keys(toolResult.result) : [],
          }, null, 2))
          
          if (toolResult.toolName === "knowledge_search" && toolResult.result) {
            if (toolResult.result.results && Array.isArray(toolResult.result.results)) {
              const resultsToAdd = toolResult.result.results
              console.log(`[DEBUG] About to add ${resultsToAdd.length} results:`, resultsToAdd.map(r => r.id))
              allResults.push(...resultsToAdd)
              console.log(`[DEBUG] Total results so far: ${allResults.length}`)
            }
          }
        }
        
        console.log(`[DEBUG] All collected results before dedup:`, allResults.map(r => r.id))
        
        // CRITICAL: Get results from global accumulator instead of toolResults
        const globalResults = global.knowledgeSearchAccumulator || []
        console.log(`[DEBUG] Global accumulated results:`, globalResults.map(r => r.id))
        
        // Remove duplicates and get top 5 results
        const uniqueResults = globalResults
          .filter((result, index, arr) => arr.findIndex(r => r.id === result.id) === index)
          .sort((a, b) => b.score - a.score)
          .slice(0, 5)
        
        if (uniqueResults.length > 0) {
          usedKnowledgeIds = uniqueResults.map(r => r.id)
          console.log(`[DEBUG] usedKnowledgeIds extracted:`, usedKnowledgeIds)
          knowledgeContext = `\n\n**Available Company Knowledge:**\n` +
            uniqueResults.map((result) => 
              `${result.title} (ID: ${result.id})\n${result.summary || result.content.slice(0, 200)}...`
            ).join('\n\n')
          
          console.log(`Turn ${turn}: Found ${uniqueResults.length} knowledge items`)
        } else {
          console.log(`[DEBUG] No unique results found after filtering`)
        }
      } else if (searchResult.toolCalls && searchResult.toolCalls.length > 0) {
        console.log(`[DEBUG] Tool calls found but no tool results - may be async execution`)
        console.log(`[DEBUG] Tool calls:`, searchResult.toolCalls.map(tc => ({ toolName: tc.toolName, args: tc.args })))
      } else {
        console.log(`[DEBUG] No tool calls or results found in searchResult`)
        console.log(`[DEBUG] Full searchResult keys:`, Object.keys(searchResult))
      }
    } catch (error) {
      console.error(`Turn ${turn}: Knowledge search failed:`, error)
    }
  } else {
    console.log(`[DEBUG] No knowledge files available`)
  }

  // Step 2: Response Generation with UUID embedding approach
  const responseAgent = createResponseAgent(character, context)
  
  const responsePrompt = `Current speaker: ${character.name}
Turn: ${turn + 1}/20
Theme: ${theme}
${context.purpose ? `\n**CONFERENCE PURPOSE**: ${context.purpose}\n*** CRITICAL: Your response must actively advance this purpose. Ask yourself: "How does my contribution help achieve this goal?" ***` : ''}

Recent conversation:
${recentMessages || "This is the start of the conference."}${knowledgeContext}

Generate your thoughtful response as ${character.name}. ${context.purpose ? `Focus on achieving the conference purpose: "${context.purpose}". Your response should either: 1) Directly address the purpose, 2) Provide insights that advance toward the goal, 3) Raise questions that help clarify the path to achieving it, or 4) Build agreements that move the group closer to the objective.` : 'Respond based on your character traits and the conversation context.'}

${knowledgeContext ? `When referencing the provided company knowledge, embed the UUID ID directly in your text using this format: [UUID:knowledge-id]. Only embed UUIDs for knowledge you actually reference in your response.` : ''}

Return ONLY a valid JSON string with this exact structure:
{
  "thought": "Your reasoning for this response (include how it advances the conference purpose)",
  "utterance": "Your response text with embedded UUIDs when referencing knowledge",
  "tag": "One of: 気づき, 合意, 重要な情報, 迷走中, 戻って考える, 問題提起"
}`

  try {
    console.log(`Turn ${turn}: Step 2 - Response generation for ${character.name}`)
    
    // Step 2a: Generate JSON string
    const jsonResult = await responseAgent.generate(responsePrompt, {
      temperature: 0.7,
      maxTokens: 800,
    })

    console.log(`Turn ${turn}: JSON response received:`, jsonResult.text?.substring(0, 200) + '...')

    // Step 2b: Parse and validate with StructuredOutput
    let parsedJson: any
    try {
      parsedJson = JSON.parse(jsonResult.text || '{}')
    } catch (parseError) {
      console.error(`Turn ${turn}: JSON parse failed:`, parseError)
      throw new Error("Invalid JSON response")
    }

    // Step 3: Extract UUIDs from the generated text
    const utteranceText = parsedJson.utterance || ''
    const uuidPattern = /\[UUID:([a-f0-9-]{36})\]/gi
    const extractedKnowledgeIds: string[] = []
    let match
    
    // Extract all UUIDs from the text
    while ((match = uuidPattern.exec(utteranceText)) !== null) {
      extractedKnowledgeIds.push(match[1])
    }
    
    console.log(`[DEBUG] Extracted knowledge IDs from text:`, extractedKnowledgeIds)
    console.log(`[DEBUG] Original utterance with UUIDs:`, utteranceText.substring(0, 100) + '...')

    // Step 2c: Create structured output with extracted knowledge IDs  
    const finalResult = {
      thought: parsedJson.thought || `${character.name}の考え`,
      utterance: utteranceText || `${character.name}: この点についてもう少し考えさせてください。`,
      tag: parsedJson.tag || "迷走中",
      isFinished: false,
      finishReason: parsedJson.finishReason || "continue",
      usedKnowledgeIds: extractedKnowledgeIds, // Use only the UUIDs actually referenced in text
    }

    // Validate the result
    const validatedResult = conferenceTurnSchema.parse(finalResult)

    if (!validatedResult.utterance || validatedResult.utterance.trim().length === 0) {
      throw new Error("Empty utterance")
    }

    console.log(`Turn ${turn}: Two-step generation successful`)
    console.log(`[DEBUG] Final result usedKnowledgeIds:`, validatedResult.usedKnowledgeIds)
    
    return validatedResult

  } catch (error) {
    console.error(`Turn ${turn}: Response generation failed:`, error)
    return {
      utterance: `${character.name}: この点についてもう少し考えさせてください。`,
      tag: "迷走中" as const,
      isFinished: false,
      finishReason: null,
      usedKnowledgeIds: [], // Empty since no knowledge was extracted
    }
  }
}

