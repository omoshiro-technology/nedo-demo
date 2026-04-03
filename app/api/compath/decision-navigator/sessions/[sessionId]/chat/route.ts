import { NextRequest, NextResponse } from "next/server";
import { processChat } from "@/lib/compath/application/decisionNavigator/chat";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { message } = body ?? {};

    if (
      !message ||
      typeof message !== "string" ||
      message.trim().length === 0
    ) {
      return NextResponse.json(
        { message: "message は必須です。" },
        { status: 400 }
      );
    }

    const session = await processChat(sessionId, message.trim());
    return NextResponse.json(session);
  } catch (error) {
    const errMessage =
      error instanceof Error
        ? error.message
        : "チャットの処理に失敗しました。";
    return NextResponse.json({ message: errMessage }, { status: 500 });
  }
}
