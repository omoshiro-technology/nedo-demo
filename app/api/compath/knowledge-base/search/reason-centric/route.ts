import { NextRequest, NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      query,
      topK,
      minSimilarity,
      filter,
      mode,
      context,
      problemCategory,
    } = body ?? {};

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { message: "query は必須です。" },
        { status: 400 }
      );
    }

    const startTime = Date.now();
    const retriever = getInMemoryRetriever();

    let results;
    if (mode === "reason_centric" || !mode) {
      results = await retriever.searchByRationale(query, {
        topK: topK ?? 5,
        minSimilarity: minSimilarity ?? 0.3,
        filter,
        context,
        problemCategory,
        extractRationale: true,
      });
    } else {
      results = await retriever.search(query, {
        topK: topK ?? 5,
        minSimilarity: minSimilarity ?? 0.3,
        filter,
      });
    }

    const processingTime = Date.now() - startTime;

    return NextResponse.json({
      query,
      mode: mode ?? "reason_centric",
      total: results.length,
      results,
      metadata: {
        searchMode: mode ?? "reason_centric",
        processingTimeMs: processingTime,
        context: context ?? null,
        problemCategory: problemCategory ?? null,
      },
    });
  } catch (error) {
    console.error("[knowledgeBase] Reason-centric search failed:", error);
    return NextResponse.json(
      {
        message: "Reason-centric検索に失敗しました。",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
