import { NextResponse } from "next/server"
import { createConferenceNetwork, type ConferenceNetworkContext } from "@/lib/brain-room/conference-network"
import type { Character } from "@/lib/brain-room/types"

export async function GET() {
  try {
    // テスト用キャラクター（英数字名でテスト）
    const testCharacters: Character[] = [
      {
        id: 1,
        name: "Tanaka_Sensei",
        personality: "論理的で分析的、教育者として丁寧",
        speakingStyle: "敬語を使い、理論的に説明する",
        background: "AI研究の専門家"
      },
      {
        id: 2,
        name: "Sato_San",
        personality: "実用的で現実的、ビジネス志向",
        speakingStyle: "簡潔で要点を突く話し方",
        background: "IT企業の経営者"
      }
    ]

    // テスト用会議コンテキスト
    const context: ConferenceNetworkContext = {
      theme: "AI技術の社会実装",
      purpose: "AI技術を実際のビジネスに活用する方法を検討する",
      characters: testCharacters,
      existingNodes: ["root"],
      turn: 0,
      conversationHistory: []
    }

    // AgentNetworkを作成
    const network = createConferenceNetwork(context)
    
    // デバッグ: AgentNetworkの状態を確認
    const agents = network.getAgents()
    const agentNames = agents.map(a => a.name)
    
    console.log("Created agents:", agentNames)
    console.log("Network instructions:", network.getInstructions())
    
    // テスト発言を生成
    const prompt = "AI技術の社会実装について、田中先生から議論を開始してください"
    
    const result = await network.generate(prompt, {
      temperature: 0.7,
      maxTokens: 300,
    })
    
    // AgentNetworkの履歴も確認
    const interactionHistory = network.getAgentInteractionHistory()
    console.log("Agent interaction history:", interactionHistory)
    
    return NextResponse.json({
      success: true,
      message: "AgentNetwork Conference is working!",
      prompt: prompt,
      response: result.text,
      networkInfo: {
        agentCount: testCharacters.length,
        agentNames: agentNames,
        theme: context.theme,
        purpose: context.purpose
      },
      interactionHistory: interactionHistory
    })
  } catch (error) {
    console.error("AgentNetwork test error:", error)
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      stack: error instanceof Error ? error.stack : undefined,
    }, { status: 500 })
  }
}