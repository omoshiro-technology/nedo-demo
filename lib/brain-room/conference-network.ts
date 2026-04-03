import { Agent } from "@mastra/core"
import { AgentNetwork } from "@mastra/core/network"
import { openai } from "@ai-sdk/openai"
import { z } from "zod"
import type { Character, KnowledgeFile } from "@/lib/brain-room/types"
import { generateConferenceTurnWithKnowledge, createResponseAgent } from "./conference-agents"
import type { AgentConferenceContext } from "./conference-agents"

const messageTags = ["気づき", "合意", "重要な情報", "迷走中", "戻って考える", "問題提起"] as const

export const conferenceTurnSchema = z.object({
  utterance: z.string().describe("The character's actual spoken message in Japanese"),
  tag: z.enum(messageTags as readonly [string, ...string[]]).optional().describe("Tag for the utterance"),
  isFinished: z.boolean().optional().describe("Whether the conference should end"),
  finishReason: z.string().optional().nullable().describe("Reason for ending"),
  usedKnowledgeIds: z.array(z.string()).optional().describe("IDs of knowledge items referenced in this response"),
})

export interface ConferenceNetworkContext {
  theme: string
  purpose?: string
  characters: Character[]
  existingNodes: string[]
  turn: number
  conversationHistory: Array<{ speakerIndex: number; utterance: string }>
  knowledgeFiles?: KnowledgeFile[]
}

// ファシリテーターAgent - 純粋に進行管理のみ
function createFacilitatorAgent(context: ConferenceNetworkContext): Agent {
  const { theme, purpose, characters, turn, conversationHistory } = context
  
  // 発言回数の集計
  const speakingCounts = characters.map((char, i) => ({
    name: char.name,
    count: conversationHistory.filter(h => h.speakerIndex === i).length,
    background: char.background
  }))
  
  const instructions = `You are a conference facilitator for a discussion about "${theme}".
${purpose ? `\n**CONFERENCE PURPOSE**: ${purpose}\n*** CRITICAL: Every speaker selection must advance this purpose. Choose speakers who can best contribute to achieving this goal. ***` : ''}

Current turn: ${turn + 1}/20

Speaking statistics:
${speakingCounts.map(s => `- ${s.name} (${s.background}): ${s.count} times`).join('\n')}

Your role is ONLY to:
1. Analyze the discussion flow toward achieving the purpose
2. Select the next speaker who can best advance the conference goal
3. Provide purpose-focused guidance for their contribution

IMPORTANT: You do NOT speak in the conference. You only manage the flow.

When using transmit tool to a character:
- Tell them how to advance the conference purpose: "${purpose || theme}"
- Indicate if they should agree, challenge, or explore new angles that serve the goal
- Guide them to contribute meaningfully to achieving the objective
- If they mention someone else's name or ask for specific expertise, consider if that person can better serve the purpose

Balance participation while prioritizing speakers who can most effectively advance the conference purpose.`

  return new Agent({
    name: "facilitator",
    instructions,
    model: openai("gpt-4.1"),
  })
}

// キャラクターAgent - 実際の発言生成（知識検索機能付き）
function createCharacterAgent(character: Character, context: ConferenceNetworkContext): Agent {
  // conference-agentsのResponse Agentを使用（Knowledge検索は別途実行）
  return createResponseAgent(character, context)
}

// AgentNetwork作成
export function createConferenceNetwork(context: ConferenceNetworkContext): AgentNetwork {
  const { theme, purpose, characters, turn } = context
  
  // ファシリテーターと各キャラクターのAgentを作成
  const facilitatorAgent = createFacilitatorAgent(context)
  const characterAgents = characters.map(character => 
    createCharacterAgent(character, context)
  )
  
  // すべてのAgentをNetworkに追加
  const allAgents = [facilitatorAgent, ...characterAgents]

  // Network全体の調整役の指示
  const networkInstructions = `You are coordinating a conference discussion about "${theme}".
${purpose ? `Purpose: ${purpose}` : ''}

Turn: ${turn + 1}/20

Process flow:
1. First, use transmit to consult the facilitator about who should speak next
2. The facilitator will analyze balance and flow, then transmit to a specific character
3. The character will generate their actual utterance with proper formatting
4. Return the character's structured response

IMPORTANT: 
- The facilitator NEVER speaks in the conference, only manages flow
- Characters generate actual conference utterances
- Use transmit tool to chain: You → Facilitator → Character

Start by transmitting to the facilitator for speaker selection.`

  return new AgentNetwork({
    name: "ConferenceNetworkV2",
    instructions: networkInstructions,
    model: openai("gpt-4.1"),
    agents: allAgents,
  })
}


// ファシリテーターによる話者選択関数
export async function selectNextSpeaker(
  context: ConferenceNetworkContext,
  currentUtterance?: string
): Promise<Character> {
  const { theme, conversationHistory, characters } = context
  
  const facilitatorAgent = createFacilitatorAgent(context)
  
  const lastMessage = conversationHistory.length > 0 ? conversationHistory[conversationHistory.length - 1] : null
  const recentMessages = conversationHistory
    .slice(-3)
    .map(h => `${characters[h.speakerIndex].name}: ${h.utterance}`)
    .join('\n')
  
  const speakingStats = characters.map((char, i) => ({
    name: char.name,
    count: conversationHistory.filter(h => h.speakerIndex === i).length,
    background: char.background
  }))

  const facilitatorPrompt = `Analyze the conversation and select the most appropriate next speaker to advance the conference purpose.
${context.purpose ? `\n**CONFERENCE PURPOSE**: ${context.purpose}\n*** CRITICAL: Choose the speaker who can best advance this specific goal. ***` : ''}

Recent conversation:
${recentMessages || 'This is the start of the conference.'}

${currentUtterance ? `Latest utterance to analyze: ${currentUtterance}` : ''}

Available speakers:
${characters.map(c => `- ${c.name} (${c.background}): ${c.personality}`).join('\n')}

Speaking statistics:
${speakingStats.map(s => `${s.name}: ${s.count} times`).join(', ')}

Consider (in order of priority):
1. **Purpose Achievement**: Who can best advance the conference purpose right now?
2. **Expertise Match**: Whose background/skills are most relevant to achieving the goal?
3. **Natural Flow**: If someone was mentioned by name or role, they should speak next
4. **Balance**: Avoid same person speaking too much, but prioritize purpose advancement

${context.purpose ? `Focus on selecting the speaker who can make the most meaningful contribution toward achieving: "${context.purpose}"` : ''}

Select ONE speaker name only. Respond with just the name.`

  try {
    const facilitatorResult = await facilitatorAgent.generate(facilitatorPrompt, {
      temperature: 0.3,
      maxTokens: 50,
    })

    const selectedName = facilitatorResult.text?.trim()
    const selectedCharacter = characters.find(c => c.name === selectedName)
    
    if (selectedCharacter) {
      console.log(`Facilitator selected: ${selectedCharacter.name}`)
      return selectedCharacter
    } else {
      console.log(`Facilitator selection failed, using fallback`)
      return characters[0]
    }
  } catch (error) {
    console.error('Facilitator selection error:', error)
    return characters[0]
  }
}

// キャラクターの性格による反応度を計算
function calculatePersonalityReaction(character: Character, lastUtterance: string, _theme: string): number {
  let score = 0
  
  // 性格キーワードをチェック
  const personality = character.personality.toLowerCase()
  const utterance = lastUtterance.toLowerCase()
  
  // 楽観的な人は新しい提案やポジティブな話題に反応
  if (personality.includes('楽観') || personality.includes('前向き') || personality.includes('積極')) {
    if (utterance.includes('新しい') || utterance.includes('可能性') || utterance.includes('やってみ')) {
      score += 2
    }
  }
  
  // 分析的な人は論理や問題、データに反応
  if (personality.includes('分析') || personality.includes('論理') || personality.includes('慎重')) {
    if (utterance.includes('問題') || utterance.includes('データ') || utterance.includes('分析') || utterance.includes('根拠')) {
      score += 2
    }
  }
  
  // 情熱的な人は感情的な話題や直感的な内容に反応
  if (personality.includes('情熱') || personality.includes('感情') || personality.includes('直感')) {
    if (utterance.includes('感じ') || utterance.includes('気持ち') || utterance.includes('心') || utterance.includes('すごく')) {
      score += 2
    }
  }
  
  // 平和主義や穏やかな人は対立や議論の調整に反応
  if (personality.includes('平和') || personality.includes('穏やか') || personality.includes('調整')) {
    if (utterance.includes('でも') || utterance.includes('一方で') || utterance.includes('違う')) {
      score += 1.5
    }
  }

  return score
}

// キャラクターの専門性とトピックのマッチングを計算
function calculateExpertiseMatch(character: Character, lastUtterance: string, theme: string): number {
  const background = (character.background || '').toLowerCase()
  const utterance = lastUtterance.toLowerCase()
  const topicLower = theme.toLowerCase()
  
  let score = 0
  
  // 技術系の話題
  if ((topicLower.includes('技術') || topicLower.includes('デバッグ') || topicLower.includes('システム') || 
       utterance.includes('技術') || utterance.includes('プログラム') || utterance.includes('開発')) &&
      (background.includes('エンジニア') || background.includes('it') || background.includes('開発'))) {
    score += 2
  }
  
  // 研究・分析系の話題
  if ((utterance.includes('研究') || utterance.includes('データ') || utterance.includes('分析') || 
       topicLower.includes('研究') || topicLower.includes('分析')) &&
      (background.includes('研究') || background.includes('コンサル') || background.includes('学者'))) {
    score += 2
  }
  
  // デザイン・アート系の話題
  if ((utterance.includes('デザイン') || utterance.includes('表現') || utterance.includes('創作') ||
       topicLower.includes('デザイン') || topicLower.includes('アート')) &&
      (background.includes('デザイン') || background.includes('アート') || background.includes('グラフィック'))) {
    score += 2
  }
  
  // 哲学・思想系の話題
  if ((utterance.includes('哲学') || utterance.includes('本質') || utterance.includes('意味') ||
       topicLower.includes('哲学') || topicLower.includes('思想')) &&
      background.includes('哲学')) {
    score += 2
  }

  return score
}

// 選択された話者による発言生成関数（知識検索機能付き）
export async function generateCharacterTurn(
  selectedSpeaker: Character,
  context: ConferenceNetworkContext
): Promise<any> {
  console.log(`[DEBUG] generateCharacterTurn called for ${selectedSpeaker.name}`)
  console.log(`[DEBUG] Knowledge files in context: ${context.knowledgeFiles?.length || 0}`)
  
  // AgentConferenceContext型に変換
  const conferenceContext: AgentConferenceContext = {
    theme: context.theme,
    purpose: context.purpose,
    turn: context.turn,
    conversationHistory: context.conversationHistory,
    characters: context.characters,
    knowledgeFiles: context.knowledgeFiles || [],
  }
  
  // 2段階生成プロセスを使用（既存実装）
  const result = await generateConferenceTurnWithKnowledge(
    selectedSpeaker,
    conferenceContext
  )
  
  console.log(`[DEBUG] Result from generateConferenceTurnWithKnowledge:`, {
    hasUtterance: !!result.utterance,
    hasKnowledgeIds: !!result.usedKnowledgeIds,
    knowledgeIdsCount: result.usedKnowledgeIds?.length || 0,
  })
  
  return result
}