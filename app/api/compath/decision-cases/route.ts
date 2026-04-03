import { NextResponse } from "next/server";
import { decisionCaseService } from "@/lib/compath/application/decisionCase/DecisionCaseService";

export async function GET() {
  try {
    const cases = await decisionCaseService.getAllCases();
    return NextResponse.json({
      total: cases.length,
      cases: cases.map((c) => ({
        id: c.id,
        title: c.title,
        decision: c.decision.summary,
        year: c.metadata.year,
        domain: c.metadata.domain,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "取得に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}
