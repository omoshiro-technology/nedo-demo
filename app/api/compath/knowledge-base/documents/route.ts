import { NextRequest, NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";
import { indexDocument } from "@/lib/compath/application/knowledgeBase/documentIndexer";

export const maxDuration = 60;

export async function GET() {
  try {
    const retriever = getInMemoryRetriever();
    const documents = retriever.getDocuments();
    return NextResponse.json({
      total: documents.length,
      documents,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ドキュメント一覧の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { title, content, metadata } = body ?? {};

    if (!title || !content) {
      return NextResponse.json(
        { message: "title と content は必須です。" },
        { status: 400 }
      );
    }

    if (content.length < 10) {
      return NextResponse.json(
        { message: "content は10文字以上必要です。" },
        { status: 400 }
      );
    }

    const result = await indexDocument({ title, content, metadata });

    return NextResponse.json(
      {
        id: result.id,
        chunksCreated: result.chunksCreated,
        message: `ドキュメント「${title}」を登録しました。`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[knowledgeBase] Document registration failed:", error);
    return NextResponse.json(
      {
        message: "ドキュメントの登録に失敗しました。",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
