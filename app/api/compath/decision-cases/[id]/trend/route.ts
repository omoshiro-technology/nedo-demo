import { NextRequest, NextResponse } from "next/server";
import { decisionCaseService } from "@/lib/compath/application/decisionCase/DecisionCaseService";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { answers } = body ?? { answers: [] };

    const trend = await decisionCaseService.getDecisionTrend(
      id,
      answers || []
    );

    return NextResponse.json({
      caseId: id,
      trend,
      disclaimer:
        "これは過去の熟達者の判断傾向であり、最終判断はあなた自身が行ってください。",
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "傾向の取得に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}
