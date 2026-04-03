import { NextRequest, NextResponse } from "next/server";
import { analyzeKnowledgeGaps } from "@/lib/compath/application/knowledge/analyzeKnowledgeGaps";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { graph, fullText } = body ?? {};

    if (!graph || !fullText) {
      return NextResponse.json(
        { message: "graph and fullText are required." },
        { status: 400 }
      );
    }

    const gapAnalysis = await analyzeKnowledgeGaps(graph, fullText);
    return NextResponse.json(gapAnalysis);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ギャップ分析に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
