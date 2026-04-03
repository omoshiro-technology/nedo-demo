import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";
import { generateInsights } from "@/lib/compath/application/decisionNavigator/expertInsightGenerator";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();
    const { currentNodeId, triggerTiming } = body;

    const session = await SessionStore.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    const insightsResponse = await generateInsights({
      sessionId,
      currentNodeId,
      context: {
        purpose: session.purpose,
        selectedPath: session.selectionHistory.map(
          (h: { nodeId: string }) => h.nodeId
        ),
        problemCategory: session.problemCategory?.primary,
      },
      triggerTiming: triggerTiming as
        | "on_node_selection"
        | "before_confirmation"
        | "on_option_generation",
    });

    const clientOverlookedWarnings = insightsResponse.overlookedWarnings.map(
      (w: {
        viewpoint: { name: string; perspective: string };
        warning: string;
        checklist: Array<{
          item: string;
          isChecked: boolean;
          importance?: string;
        }>;
      }) => ({
        viewpoint: w.viewpoint.name,
        risk: w.warning,
        suggestion: `${w.viewpoint.perspective}を確認してください`,
        severity:
          w.checklist[0]?.importance === "critical"
            ? ("critical" as const)
            : w.checklist[0]?.importance === "high"
              ? ("high" as const)
              : w.checklist[0]?.importance === "medium"
                ? ("medium" as const)
                : ("low" as const),
        checklist: w.checklist.map(
          (c: { item: string; isChecked: boolean }) => ({
            item: c.item,
            isChecked: c.isChecked,
          })
        ),
      })
    );

    return NextResponse.json({
      insights: insightsResponse.insights,
      overlookedWarnings: clientOverlookedWarnings,
      riskScore: insightsResponse.overallRiskScore,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "インサイト生成に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}
