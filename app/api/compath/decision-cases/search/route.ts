import { NextRequest, NextResponse } from "next/server";
import { decisionCaseService } from "@/lib/compath/application/decisionCase/DecisionCaseService";
import type { DecisionCaseSearchOptions } from "@/lib/compath/domain/decisionCase/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, topK, minSimilarity, domainFilter } = body ?? {};

    if (!query || typeof query !== "string") {
      return NextResponse.json(
        { message: "query is required and must be a string" },
        { status: 400 }
      );
    }

    const options: DecisionCaseSearchOptions = {
      topK: topK ?? 5,
      minSimilarity: minSimilarity ?? 0.1,
      domainFilter,
    };

    const results = await decisionCaseService.searchSimilarCases(
      query,
      options
    );

    return NextResponse.json({
      total: results.length,
      results: results.map((r) => ({
        id: r.case.id,
        title: r.case.title,
        decision: r.case.decision,
        conditions: r.case.conditions,
        rationale: r.case.rationale,
        similarity: r.similarity,
        matchReason: r.matchReason,
        metadata: {
          domain: r.case.metadata.domain,
          plantName: r.case.metadata.plantName,
          year: r.case.metadata.year,
        },
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "検索に失敗しました";
    return NextResponse.json({ message }, { status: 500 });
  }
}
