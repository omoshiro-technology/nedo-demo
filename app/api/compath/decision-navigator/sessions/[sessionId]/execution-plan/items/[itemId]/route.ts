import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";
import { updateExecutionPlanItemStatus } from "@/lib/compath/application/decisionNavigator/generateExecutionPlan";
import type { ExecutionItemStatus } from "@/lib/compath/application/decisionNavigator/types";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ sessionId: string; itemId: string }> }
) {
  try {
    const { sessionId, itemId } = await params;
    const body = await request.json();
    const { status } = body ?? {};

    const validStatuses: ExecutionItemStatus[] = [
      "pending",
      "in_progress",
      "completed",
    ];
    if (!status || !validStatuses.includes(status)) {
      return NextResponse.json(
        {
          message:
            "status は 'pending', 'in_progress', 'completed' のいずれかを指定してください。",
        },
        { status: 400 }
      );
    }

    const session = await SessionStore.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません。" },
        { status: 404 }
      );
    }

    if (!session.executionPlan) {
      return NextResponse.json(
        { message: "実行計画が存在しません。" },
        { status: 404 }
      );
    }

    const item = session.executionPlan.items.find(
      (i: { id: string }) => i.id === itemId
    );
    if (!item) {
      return NextResponse.json(
        { message: "指定されたアイテムが見つかりません。" },
        { status: 404 }
      );
    }

    const updatedPlan = updateExecutionPlanItemStatus(
      session.executionPlan,
      itemId,
      status
    );
    session.executionPlan = updatedPlan;
    session.updatedAt = new Date().toISOString();
    await SessionStore.save(session);

    return NextResponse.json({ executionPlan: updatedPlan });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "アイテムステータスの更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
