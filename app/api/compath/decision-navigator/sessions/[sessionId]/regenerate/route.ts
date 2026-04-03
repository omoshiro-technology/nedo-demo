import { NextRequest, NextResponse } from "next/server";
import { regenerateSession } from "@/lib/compath/application/decisionNavigator";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { conditions } = body ?? {};

    if (!conditions || !Array.isArray(conditions)) {
      return NextResponse.json(
        { message: "conditions（条件配列）は必須です。" },
        { status: 400 }
      );
    }

    const session = await regenerateSession(sessionId, { conditions });

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
        : "セッションの再生成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
