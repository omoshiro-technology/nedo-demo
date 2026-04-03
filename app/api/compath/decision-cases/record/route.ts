import { NextRequest, NextResponse } from "next/server";
import { decisionCaseService } from "@/lib/compath/application/decisionCase/DecisionCaseService";

export async function POST(request: NextRequest) {
  try {
    const input = await request.json();

    if (!input?.title) {
      return NextResponse.json(
        { message: "title is required" },
        { status: 400 }
      );
    }
    if (!input?.decision?.summary) {
      return NextResponse.json(
        { message: "decision.summary is required" },
        { status: 400 }
      );
    }
    if (!input?.conditions?.context) {
      return NextResponse.json(
        { message: "conditions.context is required" },
        { status: 400 }
      );
    }
    if (!input?.rationale?.primary) {
      return NextResponse.json(
        { message: "rationale.primary is required" },
        { status: 400 }
      );
    }

    const recorded = await decisionCaseService.recordDecision(input);

    return NextResponse.json(
      {
        id: recorded.id,
        title: recorded.title,
        message:
          "判断が記録されました。今後の類似案件で参照可能になります。",
        indexed: true,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "記録に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}
