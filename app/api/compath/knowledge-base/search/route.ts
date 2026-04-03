import { NextRequest, NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { query, topK, minSimilarity, filter } = body ?? {};

    if (!query || query.trim().length === 0) {
      return NextResponse.json(
        { message: "query は必須です。" },
        { status: 400 }
      );
    }

    const retriever = getInMemoryRetriever();
    const results = await retriever.search(query, {
      topK: topK ?? 5,
      minSimilarity: minSimilarity ?? 0.3,
      filter,
    });

    return NextResponse.json({
      query,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error("[knowledgeBase] Search failed:", error);
    return NextResponse.json(
      {
        message: "検索に失敗しました。",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
