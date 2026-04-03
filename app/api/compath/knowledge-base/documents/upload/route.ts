import { NextRequest, NextResponse } from "next/server";
import { indexFile } from "@/lib/compath/application/knowledgeBase/documentIndexer";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileContent, fileName, metadata } = body ?? {};

    if (!fileContent || !fileName) {
      return NextResponse.json(
        { message: "fileContent と fileName は必須です。" },
        { status: 400 }
      );
    }

    const result = await indexFile({ fileContent, fileName, metadata });

    return NextResponse.json(
      {
        id: result.id,
        title: result.title,
        chunksCreated: result.chunksCreated,
        message: `ファイル「${fileName}」を登録しました。`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[knowledgeBase] File registration failed:", error);
    return NextResponse.json(
      {
        message: "ファイルの登録に失敗しました。",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
