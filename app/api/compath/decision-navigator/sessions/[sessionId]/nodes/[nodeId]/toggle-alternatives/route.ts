import { NextRequest, NextResponse } from "next/server";
import { toggleAlternatives } from "@/lib/compath/application/decisionNavigator";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string; nodeId: string }> }
) {
  try {
    const { sessionId, nodeId } = await params;
    const body = await request.json();
    const { expand } = body ?? {};

    if (typeof expand !== "boolean") {
      return NextResponse.json(
        { message: "expand（true/false）は必須です。" },
        { status: 400 }
      );
    }

    const session = await toggleAlternatives({
      sessionId,
      nodeId,
      expand,
    });

    if (!session) {
      return NextResponse.json(
        { message: "セッションまたはノードが見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json({ session });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "代替選択肢の切り替えに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
