import { NextRequest, NextResponse } from "next/server";
import { recordSelection } from "@/lib/compath/application/decisionNavigator";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { nodeId, rationale } = body ?? {};

    if (!nodeId || typeof nodeId !== "string") {
      return NextResponse.json(
        { message: "nodeIdは必須です。" },
        { status: 400 }
      );
    }

    const result = await recordSelection(sessionId, { nodeId, rationale });

    if (!result) {
      return NextResponse.json(
        { message: "セッションまたはノードが見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "選択の記録に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
