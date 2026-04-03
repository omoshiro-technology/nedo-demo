import { NextRequest, NextResponse } from "next/server";
import { exploreNext } from "@/lib/compath/application/decisionNavigator";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { explorationNodeId } = body ?? {};

    if (!explorationNodeId) {
      return NextResponse.json(
        { message: "explorationNodeId is required" },
        { status: 400 }
      );
    }

    const result = await exploreNext({
      sessionId,
      explorationNodeId,
    });

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
      error instanceof Error ? error.message : "探索に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
