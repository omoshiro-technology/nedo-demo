import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";
import { generateExecutionPlan } from "@/lib/compath/application/decisionNavigator/generateExecutionPlan";

export const maxDuration = 60;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = SessionStore.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    // 既存の実行計画があればそれを返す
    if (session.executionPlan) {
      return NextResponse.json({ executionPlan: session.executionPlan });
    }

    // なければ生成
    const executionPlan = await generateExecutionPlan(session);
    session.executionPlan = executionPlan;
    session.updatedAt = new Date().toISOString();
    SessionStore.save(session);

    return NextResponse.json({ executionPlan });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "実行計画の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const session = SessionStore.findById(sessionId);

    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    const executionPlan = await generateExecutionPlan(session);
    session.executionPlan = executionPlan;
    session.updatedAt = new Date().toISOString();
    SessionStore.save(session);

    return NextResponse.json({ executionPlan }, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "実行計画の生成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
