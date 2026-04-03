import { NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";

export async function GET() {
  try {
    const retriever = getInMemoryRetriever();
    const stats = retriever.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "統計情報の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
