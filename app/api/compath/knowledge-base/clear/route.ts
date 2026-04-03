import { NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";

export async function DELETE() {
  try {
    const retriever = getInMemoryRetriever();
    await retriever.clear();
    return NextResponse.json({ message: "全データをクリアしました。" });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "データのクリアに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
