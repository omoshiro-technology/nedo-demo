import { NextRequest, NextResponse } from "next/server";
import { addCriteria } from "@/lib/compath/application/decisionNavigator";

export const maxDuration = 60;

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const result = await addCriteria(sessionId);

    if (!result.success) {
      return NextResponse.json(
        { success: false, reason: result.reason },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      session: result.session,
      addedCriteria: result.addedCriteria,
      addedNodes: result.addedNodes,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "判断軸の追加に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
