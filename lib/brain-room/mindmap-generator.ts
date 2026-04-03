import { openai } from "@ai-sdk/openai"
import { generateObject } from "ai"
import { z } from "zod"

// Schema for importance evaluation
const importanceEvaluationSchema = z.object({
  isImportant: z.boolean().describe("Whether this utterance is important enough for a mindmap node"),
  reason: z.string().describe("Brief explanation of the decision"),
  suggestedTopic: z.string().optional().describe("Suggested topic label if important (max 15 chars)"),
})

// Schema for node relation evaluation
const nodeRelationSchema = z.object({
  isRelated: z.boolean().describe("Whether this utterance is related to the existing node"),
  reason: z.string().describe("Brief explanation of the relationship"),
  relevanceScore: z.number().min(0).max(1).describe("Relevance score from 0 to 1"),
})

// Schema for mindmap node generation
const mindmapNodeSchema = z.object({
  nodes: z.array(z.object({
    parentId: z.string().describe("Parent node ID - choose existing node or 'root'"),
    nodeId: z.string().describe("Short unique ID (e.g. 'tech', 'cost', 'ui')"),
    label: z.string().max(12).describe("Short Japanese label (max 12 chars, e.g. 'バックライト輝度', 'SDGs関連')"),
    description: z.string().optional().describe("Brief description of the topic"),
  })).describe("New nodes to add to the mindmap"),
  reasoning: z.string().describe("Explanation of the node structure"),
})

export interface ConversationContext {
  theme: string
  conversationHistory: Array<{
    speakerName: string
    utterance: string
    tag?: string
  }>
  currentUtterance: {
    speakerName: string
    utterance: string
    tag?: string
    turn: number
  }
  existingNodes: Array<{
    id: string
    parentId: string
    label: string
  }>
}

// Find most related existing node for any utterance
export async function findRelatedNode(context: ConversationContext): Promise<{
  nodeId: string | null
  reason: string
  relevanceScore: number
}> {
  const { currentUtterance, existingNodes, theme } = context
  
  if (existingNodes.length <= 1) {
    return { nodeId: null, reason: "No existing nodes to relate to", relevanceScore: 0 }
  }
  
  const candidateNodes = existingNodes.filter(n => n.id !== "root")
  let bestMatch = { nodeId: null as string | null, reason: "", relevanceScore: 0 }
  
  for (const node of candidateNodes.slice(0, 5)) { // Limit to avoid too many API calls
    const systemPrompt = `Analyze if a conference utterance relates to an existing mindmap node.
    
Conference theme: "${theme}"
Node: "${node.label}" (${node.id})

Rate relevance on 0-1 scale:
- 0.8+: Directly discusses this topic
- 0.6-0.8: Mentions or relates to this topic  
- 0.4-0.6: Indirectly connected
- <0.4: Not related`
    
    const userPrompt = `Utterance: ${currentUtterance.speakerName}: ${currentUtterance.utterance}

How related is this to "${node.label}"?`
    
    try {
      const { object } = await generateObject({
        model: openai("gpt-4o-mini"),
        schema: nodeRelationSchema,
        system: systemPrompt,
        prompt: userPrompt,
        temperature: 0.2,
        maxTokens: 120,
      })
      
      if (object.isRelated && object.relevanceScore > bestMatch.relevanceScore) {
        bestMatch = {
          nodeId: node.id,
          reason: object.reason,
          relevanceScore: object.relevanceScore,
        }
      }
    } catch (error) {
      console.error(`Failed to evaluate relation to node ${node.id}:`, error)
    }
  }
  
  // Return best match if relevance score is meaningful
  if (bestMatch.relevanceScore >= 0.4) {
    return bestMatch
  }
  
  return { nodeId: null, reason: "No significantly related node found", relevanceScore: 0 }
}

// AI-based importance evaluation
export async function evaluateImportance(context: ConversationContext): Promise<{
  isImportant: boolean
  reason: string
  suggestedTopic?: string
}> {
  const { currentUtterance, conversationHistory, existingNodes, theme } = context
  
  const recentHistory = conversationHistory.slice(-3)
    .map(h => `${h.speakerName}: ${h.utterance}`)
    .join("\n")
    
  const existingTopics = existingNodes
    .filter(n => n.id !== "root")
    .map(n => n.label)
    .join(", ")

  const systemPrompt = `You are evaluating whether a conference utterance contains important enough content to warrant creating a new mindmap node.

Conference theme: "${theme}"
Existing mindmap topics: ${existingTopics || "None yet"}

Criteria for importance (be VERY SELECTIVE):
- Introduces a completely NEW major topic not in mindmap
- Provides substantial NEW insight or breakthrough solution
- Raises critical questions that reframe entire discussion
- Marks a major paradigm shift in discussion direction

Do NOT consider important:
- Simple acknowledgments ("そうですね", "確かに", "おっしゃる通り")
- Building on or elaborating existing topics
- Examples or details about topics already in mindmap
- Agreement statements or minor clarifications
- Procedural comments or follow-up questions`

  const userPrompt = `Recent conversation:
${recentHistory}

Current utterance to evaluate:
${currentUtterance.speakerName}: ${currentUtterance.utterance}${currentUtterance.tag ? ` [Tag: ${currentUtterance.tag}]` : ''}

Is this utterance important enough for a mindmap node?`

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o-mini"),
      schema: importanceEvaluationSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.3,
      maxTokens: 200,
    })
    
    return object
  } catch (error) {
    console.error("Failed to evaluate importance:", error)
    return {
      isImportant: false,
      reason: "Evaluation failed",
    }
  }
}

// AI-based mindmap node generation
export async function generateMindmapNodes(context: ConversationContext): Promise<{
  nodes: Array<{
    parentId: string
    nodeId: string
    label: string
    description?: string
  }>
  reasoning: string
} | null> {
  const { theme, conversationHistory, currentUtterance, existingNodes } = context
  
  const existingStructure = existingNodes
    .map(n => `- ${n.id}: ${n.label} (parent: ${n.parentId || 'none'})`)
    .join("\n")
    
  const recentHistory = conversationHistory.slice(-5)
    .map(h => `${h.speakerName}: ${h.utterance}`)
    .join("\n")

  const systemPrompt = `You are a mindmap specialist creating hierarchical topic maps from conference discussions.

Critical Guidelines for Node Creation:
- Labels must be SHORT (max 12 chars): "バックライト輝度" not "バックライトの輝度調整の重要性"
- CRITICAL: Use ONLY existing node IDs for parentId (never theme names or labels!)
- Examples of good labels: "技術課題", "コスト問題", "UI設計", "運用面", "セキュリティ"
- Examples of bad labels: "リモートワーク技術基盤の整備", "ユーザー体験設計の課題"

Connection Strategy:
- Prefer connecting to existing nodes over creating root-level nodes
- Group related concepts under broader categories
- Build meaningful hierarchies that show relationships
- Avoid flat lists - create depth and structure`

  const userPrompt = `Conference theme: "${theme}"

Available parent nodes (use these IDs EXACTLY for parentId):
${existingStructure}

IMPORTANT: For parentId field, use only the node IDs from above list (e.g., "root", "tech", "cost") - NEVER use labels or theme names!

Recent conversation context:
${recentHistory}

Important new contribution:
${currentUtterance.speakerName}: ${currentUtterance.utterance}${currentUtterance.tag ? ` [${currentUtterance.tag}]` : ''}

Create 1-2 mindmap nodes for this contribution. Focus on:
1. What is the CORE concept (use short, clear label)
2. Which EXISTING node ID should this connect to? 
3. Use "root" for major new topics, existing node IDs for sub-topics

CRITICAL: Always use valid parentId from the available nodes list above!`

  try {
    const { object } = await generateObject({
      model: openai("gpt-4o"),
      schema: mindmapNodeSchema,
      system: systemPrompt,
      prompt: userPrompt,
      temperature: 0.5,
      maxTokens: 400,
    })
    
    if (object.nodes && object.nodes.length > 0) {
      return object
    }
    
    return null
  } catch (error) {
    console.error("Failed to generate mindmap nodes:", error)
    return null
  }
}