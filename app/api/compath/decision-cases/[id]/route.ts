import { NextRequest, NextResponse } from "next/server";
import { decisionCaseService } from "@/lib/compath/application/decisionCase/DecisionCaseService";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const decisionCase = await decisionCaseService.getCaseById(id);

    if (!decisionCase) {
      return NextResponse.json(
        { message: `事例 ${id} が見つかりません` },
        { status: 404 }
      );
    }

    return NextResponse.json(decisionCase);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}
