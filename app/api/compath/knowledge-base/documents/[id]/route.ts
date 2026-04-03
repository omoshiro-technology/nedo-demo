import { NextRequest, NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const retriever = getInMemoryRetriever();
    const deleted = await retriever.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "ドキュメントが見つかりません。" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ドキュメントの削除に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
