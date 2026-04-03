import { NextRequest, NextResponse } from "next/server";
import {
  KnowledgeRepository,
  SessionKnowledgeRepository,
} from "@/lib/compath/application/repositories";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const sessionIds = searchParams.get("sessionIds");
    const includeHeuristics = searchParams.get("includeHeuristics") ?? "true";
    const includePatterns = searchParams.get("includePatterns") ?? "true";
    const minReliability = searchParams.get("minReliability") ?? "0";

    const sessionIdList = sessionIds?.split(",").filter(Boolean) || [];
    const minRel = Number.parseFloat(minReliability) || 0;

    let heuristics = KnowledgeRepository.getAllHeuristics();
    let patterns = KnowledgeRepository.getAllPatterns();

    if (minRel > 0) {
      heuristics = heuristics.filter(
        (h: { reliability: { score: number } }) => h.reliability.score >= minRel
      );
      patterns = patterns.filter(
        (p: { reliability: number }) => p.reliability >= minRel
      );
    }

    const exportData = {
      version: "1.0.0",
      heuristics: includeHeuristics === "true" ? heuristics : [],
      patterns: includePatterns === "true" ? patterns : [],
      sourceInfo: {
        sessionCount:
          sessionIdList.length || SessionKnowledgeRepository.count(),
        decisionCount: SessionKnowledgeRepository.findAll().reduce(
          (
            acc: number,
            k: {
              exportableSummary: { decisions: Array<unknown> };
            }
          ) => acc + k.exportableSummary.decisions.length,
          0
        ),
        exportedAt: new Date().toISOString(),
      },
    };

    return NextResponse.json(exportData);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ナレッジのエクスポートに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
