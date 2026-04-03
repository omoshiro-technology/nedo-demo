import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = await SessionStore.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json(session);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "セッションの取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const deleted = await SessionStore.delete(sessionId);

    if (!deleted) {
      return NextResponse.json(
        { message: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "セッションの削除に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
