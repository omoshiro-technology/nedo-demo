import { NextRequest, NextResponse } from "next/server";
import { undoSelection } from "@/lib/compath/application/decisionNavigator";

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = undoSelection(sessionId);

    if (!session) {
      return NextResponse.json(
        { message: "取り消しできる選択がありません。" },
        { status: 400 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "取り消しに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
