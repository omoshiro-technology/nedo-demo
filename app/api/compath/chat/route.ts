import { NextRequest, NextResponse } from "next/server";
import { createChatStrategy } from "@/lib/compath/application/chat/ChatServiceFactory";
import { detectDecisionNeed } from "@/lib/compath/application/chat/detectDecisionNeed";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      messages,
      context,
      enableDecisionDetection = true,
      hasDecisionTimelineResult = false,
    } = body ?? {};

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { message: "messages are required." },
        { status: 400 }
      );
    }

    const chatStrategy = createChatStrategy();
    const response = await chatStrategy.generateResponse({ messages, context });

    // 意思決定検出（有効な場合のみ、かつ議事録分析結果がない場合のみ）
    let decisionNavigatorSuggestion = null;
    if (enableDecisionDetection && !hasDecisionTimelineResult) {
      const lastUserMessage = messages
        .filter((m: { role: string }) => m.role === "user")
        .pop();
      if (lastUserMessage) {
        const detection = await detectDecisionNeed(
          lastUserMessage.content,
          messages
        );
        if (detection.needsDecisionSupport && detection.suggestion) {
          decisionNavigatorSuggestion = detection.suggestion;
        }
      }
    }

    return NextResponse.json({
      reply: response.reply,
      sources: response.sources,
      decisionNavigatorSuggestion,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "LLM呼び出しに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
