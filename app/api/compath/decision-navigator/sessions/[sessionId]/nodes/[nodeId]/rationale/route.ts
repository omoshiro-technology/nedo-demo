import { NextRequest, NextResponse } from "next/server";
import { updateRationale } from "@/lib/compath/application/decisionNavigator/updateRationale";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; nodeId: string }> }
) {
  try {
    const { sessionId, nodeId } = await params;
    const body = await request.json();
    const { rationale } = body ?? {};

    const session = await updateRationale({
      sessionId,
      nodeId,
      rationale,
    });

    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "理由の更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
