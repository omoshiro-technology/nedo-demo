import { NextRequest, NextResponse } from "next/server";
import { confirmSelection } from "@/lib/compath/application/decisionNavigator";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { summary } = body ?? {};

    const session = await confirmSelection(sessionId, { summary });

    if (!session) {
      return NextResponse.json(
        { message: "確定待ちの選択がありません。" },
        { status: 400 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "確定の処理に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
