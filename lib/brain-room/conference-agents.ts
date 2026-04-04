import { Agent } from "@mastra/core/agent"
import { anthropic } from "@ai-sdk/anthropic"
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
        maxResults: z.number().optional().default(8).describe("Maximum number of results to return"),
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

Your job is to search the knowledge base using the knowledge_search tool to find information relevant to the discussion.

Search for knowledge when discussing:
- Technical methods, processes, materials, and standards
- Decision frameworks, judgment criteria, and expert thinking patterns
- Case studies, past examples, lessons learned, and failure patterns
- Market conditions, competitive landscape, industry trends
- Cost structures, quality standards, and trade-off considerations
- Any factual claims or domain-specific expertise

Use the knowledge_search tool with specific keywords related to the topic being discussed. Perform multiple searches with different keywords.`,
    model: anthropic("claude-haiku-4-5-20251001"),
    tools: knowledgeTool,
  })
}

// Step 2: Response Generation Agent (Structured output only)
export function createResponseAgent(character: Character, context: AgentConferenceContext): Agent {
  return new Agent({
    name: `response-generator-${character.id}`,
    instructions: `あなたは${character.name}です。以下の人物になりきって会議に参加してください。

【あなたの人物像】
性格: ${character.personality}
話し方: ${character.speakingStyle}
経歴: ${character.background}

【会議テーマ】${context.theme}
${context.purpose ? `【会議の方向性】${context.purpose}` : ''}

【最重要ルール：あなたらしく話す】
- あなたの職種・経歴・性格から自然に出てくる視点で話してください。
- 他の参加者と同じことを言わない。あなたの専門領域から独自の切り口を出す。
- 問いかけだけでなく、具体的な知見・経験・提案も積極的に出す。問題提起と具体的貢献のバランスを取る。
- 相手の発言に対して、賛成でも反対でも、自分の経験や専門性に基づいた理由を添える。
- ナレッジベースの情報が提供された場合は、自分が元々知っている知識として自然に話す。「○○によると」のような引用表現は使わない。ナレッジに基づく発言をした文の直後に[UUID:id]を置く（例: 「公差の機能的な意味を問い直すことが大事なんだ[UUID:cr-002]。俺も昔それで型費を大幅に減らしたことがある[UUID:cs-003]。」）。

【話し方のルール】
- 2〜4文で短く。会議での発言であり、スピーチではない。
- 自然な口語日本語。Markdown記法（**, ##, 箇条書き）は禁止。
- あなたのspeakingStyleに忠実に。口癖があるなら使う。

ホワイトボードの状態が提供された場合は、既に整理済みの内容を踏まえて話す。`,
    model: anthropic("claude-haiku-4-5-20251001"),
  })
}


// Whiteboard update function - uses gpt-4.1 for quality, called every 3 turns
// Returns HTML string that visualizes the discussion structure like a real whiteboard
export async function updateWhiteboard(
  theme: string,
  purpose: string,
  conversationHistory: Array<{ speakerIndex: number; utterance: string }>,
  characters: Character[],
  currentWhiteboard: string,
): Promise<string> {
  const agent = new Agent({
    name: "whiteboard-updater",
    instructions: `You are a visual facilitator maintaining a shared whiteboard for a conference discussion.
Generate a single HTML snippet (no <html>/<body> tags) that looks like an organized whiteboard.

DESIGN PRINCIPLES:
- Think of a real whiteboard covered in sticky notes, arrows drawn with markers, grouped sections
- Use visual hierarchy: big bold headings, colored cards, indented details
- Mix formats freely: cards for topics, tables for comparisons, lists for action items, highlighted text for decisions
- Mark open questions prominently (e.g., red border or question mark icon)
- Mark decisions/agreements with checkmarks or green highlights
- Show relationships and flow between ideas

AVAILABLE COMPONENTS (use CSS classes):
- <div class="wb-section"> — a grouped area with a heading
- <div class="wb-card wb-card-blue|yellow|green|red|purple"> — a sticky-note style card
- <div class="wb-decision"> — a decision box (green border, checkmark)
- <div class="wb-question"> — an open question (red border, ?)
- <div class="wb-arrow"> — visual connector text (→, ↔, ⇒)
- <table class="wb-table"> — comparison table
- <div class="wb-tag"> — small inline tag/badge
- Use <strong>, <em>, <ul>, <li> freely inside cards

KNOWLEDGE REFERENCES:
- When the discussion references knowledge items, include them using EXACTLY this format: [UUID:item-id]
  Example: "公差の機能的意味を問い直す[UUID:cr-002]ことで工程削減が可能"
- The [UUID:xxx] text will be automatically converted to hoverable tooltips — do NOT wrap them in links or other HTML.
- Use the exact knowledge IDs from the discussion (e.g., cs-003, fm-001, mt-001, cr-002, etc.)

LAYOUT:
- Use CSS grid or flexbox via inline styles or the wb-grid-2, wb-grid-3 classes for multi-column layouts
- Keep it scannable — someone should understand the discussion state in 10 seconds
- Japanese text throughout
- Preserve existing content structure when updating, adding new insights
- Do NOT use generic card/box UI. Use the wb-* classes defined above for a handwritten whiteboard feel.

Return ONLY the HTML snippet. No markdown, no code fences, no explanation.`,
    model: anthropic("claude-sonnet-4-6"),
  })

  const prompt = `テーマ: ${theme}
${purpose ? `目的: ${purpose}` : ""}

${currentWhiteboard ? `現在のホワイトボード（更新してください）:\n${currentWhiteboard}` : "ホワイトボードは空です。議論の構造を整理してください。"}

議論の全履歴 (${conversationHistory.length}ターン):
${conversationHistory.map((h) => `${characters[h.speakerIndex]?.name}: ${h.utterance}`).join("\n")}

議論の全体像が一目で分かるホワイトボードを生成してください。話題の構造、決定事項、未解決の問い、アクション項目を整理してください。`

  try {
    const result = await agent.generate(prompt, { temperature: 0.3, maxTokens: 2000 })
    let html = (result.text || "").trim()
    html = html.replace(/^```(?:html)?\n?/, "").replace(/\n?```$/, "").trim()
    return html || currentWhiteboard
  } catch (error) {
    console.error("Whiteboard update failed:", error)
    return currentWhiteboard
  }
}

// Two-step generation process: Knowledge search + Response generation
export async function generateConferenceTurnWithKnowledge(
  character: Character,
  context: AgentConferenceContext,
  whiteboard?: string,
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
${context.purpose ? `Purpose: ${context.purpose}` : ''}
Recent conversation:
${recentMessages || "This is the start of the conference."}

Search the knowledge base for information relevant to this discussion. Use multiple specific keywords to find:
- Technical knowledge directly related to the topic (methods, processes, materials, standards)
- Decision frameworks, judgment criteria, and thinking patterns
- Relevant case studies, past examples, and lessons learned
- Market conditions, competitive landscape, or industry context if relevant
- Troubleshooting approaches or failure patterns if applicable

IMPORTANT: Perform at least 2-3 separate searches with different keywords to find diverse, relevant knowledge. Do not rely on a single search.

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
          .slice(0, 8)
        
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
  
  const responsePrompt = `発言者: ${character.name}
ターン: ${turn + 1}/20
${whiteboard ? `\n【ホワイトボード（現在の整理状況）】\n${whiteboard}\n` : ''}
【直近の会話】
${recentMessages || "（会議の冒頭です）"}
${knowledgeContext}

${character.name}として2〜4文で発言してください。
- あなたの専門性・性格に基づいた独自の視点で。他の人と同じことは言わない。
- 問いかけだけでなく、具体的な知見・経験・提案も出す。タグは状況に応じて使い分ける。
- Markdown禁止。自然な口語で。
${knowledgeContext ? `- ナレッジの知識を自分のものとして自然に話す。引用表現は使わない。ナレッジに基づく文の直後に[UUID:id]を置く（例: 「公差を問い直すのが大事だ[UUID:cr-002]。」）。` : ''}

以下のJSON形式のみ返してください:
{
  "thought": "この発言の狙い（1文）",
  "utterance": "発言内容（2〜4文、口語日本語、Markdown禁止）",
  "tag": "気づき/合意/重要な情報/迷走中/戻って考える/問題提起 のいずれか"
}`

  try {
    console.log(`Turn ${turn}: Step 2 - Response generation for ${character.name}`)
    
    // Step 2a: Generate JSON string
    const jsonResult = await responseAgent.generate(responsePrompt, {
      temperature: 0.7,
      maxTokens: 800,
    })

    console.log(`Turn ${turn}: JSON response received:`, jsonResult.text?.substring(0, 200) + '...')

    // Step 2b: Parse JSON (strip code fences if present)
    let parsedJson: any
    try {
      let raw = (jsonResult.text || '').trim()
      // Strip markdown code fences that LLMs sometimes add
      raw = raw.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()
      parsedJson = JSON.parse(raw)
    } catch (parseError) {
      console.error(`Turn ${turn}: JSON parse failed for ${character.name}:`, parseError)
      console.error(`Turn ${turn}: Raw text:`, jsonResult.text?.substring(0, 300))
      throw new Error("Invalid JSON response")
    }

    // Step 3: Extract UUIDs from the generated text
    const utteranceText = parsedJson.utterance || ''
    const uuidPattern = /\[UUID:([a-zA-Z0-9-]+)\]/gi
    const knowledgeIds: string[] = []
    let match
    while ((match = uuidPattern.exec(utteranceText)) !== null) {
      knowledgeIds.push(match[1])
    }
    console.log(`[DEBUG] Knowledge IDs for ${character.name}:`, knowledgeIds)

    // Step 2c: Normalize tag — LLM sometimes returns non-enum values
    const validTags = new Set(messageTags)
    const rawTag = parsedJson.tag || ""
    const normalizedTag = validTags.has(rawTag) ? rawTag : "気づき"
    if (!validTags.has(rawTag)) {
      console.log(`Turn ${turn}: Invalid tag "${rawTag}" from ${character.name}, falling back to "気づき"`)
    }

    const finalResult = {
      thought: parsedJson.thought || `${character.name}の考え`,
      utterance: utteranceText || `${character.name}: この点についてもう少し考えさせてください。`,
      tag: normalizedTag,
      isFinished: false,
      finishReason: parsedJson.finishReason || "continue",
      usedKnowledgeIds: knowledgeIds,
    }

    if (!finalResult.utterance || finalResult.utterance.trim().length === 0) {
      throw new Error("Empty utterance")
    }

    console.log(`Turn ${turn}: Two-step generation successful for ${character.name}`)
    console.log(`[DEBUG] Final result usedKnowledgeIds:`, finalResult.usedKnowledgeIds)

    return finalResult

  } catch (error) {
    console.error(`Turn ${turn}: Response generation failed for ${character.name}:`, error)
    console.error(`Turn ${turn}: Error details:`, error instanceof Error ? error.message : String(error))
    console.error(`Turn ${turn}: Error stack:`, error instanceof Error ? error.stack : 'N/A')
    return {
      utterance: `${character.name}: この点についてもう少し考えさせてください。`,
      tag: "迷走中" as const,
      isFinished: false,
      finishReason: null,
      usedKnowledgeIds: [],
    }
  }
}


// Legacy exports for backwards compatibility with /api/conference route
export function createConferenceAgent(character: Character) {
  return createResponseAgent(character, { theme: "", turn: 0, conversationHistory: [], characters: [character], knowledgeFiles: [] })
}
export async function generateConferenceTurn(agent: any, context: any) {
  return generateConferenceTurnWithKnowledge(context.characters?.[0] || { id: 0, name: "", personality: "", speakingStyle: "", background: "" }, context)
}
