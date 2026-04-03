import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";
import type { ThinkingStrategyId } from "@/lib/compath/domain/decisionNavigator/strategies/IThinkingStrategy";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { strategy } = body ?? {};

    if (!strategy || typeof strategy !== "string") {
      return NextResponse.json(
        { message: "strategy は必須です。" },
        { status: 400 }
      );
    }

    const validStrategies: ThinkingStrategyId[] = [
      "forward",
      "backcast",
      "constraint",
      "risk",
      "analogy",
    ];
    if (!validStrategies.includes(strategy as ThinkingStrategyId)) {
      return NextResponse.json(
        {
          message: `strategy は ${validStrategies.join(", ")} のいずれかを指定してください。`,
        },
        { status: 400 }
      );
    }

    const session = SessionStore.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    session.thinkingStrategy = strategy as ThinkingStrategyId;
    session.updatedAt = new Date().toISOString();
    SessionStore.save(session);

    return NextResponse.json({
      session,
      message: `思考戦略を「${strategy}」に変更しました。`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "戦略の変更に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
