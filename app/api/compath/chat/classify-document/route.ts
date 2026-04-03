import { NextRequest, NextResponse } from "next/server";
import { classifyDocument } from "@/lib/compath/application/chat/documentClassifier";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { filePreview, fileName, userMessage } = body ?? {};

    if (!filePreview || typeof filePreview !== "string") {
      return NextResponse.json(
        { message: "filePreview is required and must be a string." },
        { status: 400 }
      );
    }
    if (!fileName || typeof fileName !== "string") {
      return NextResponse.json(
        { message: "fileName is required and must be a string." },
        { status: 400 }
      );
    }
    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { message: "userMessage is required and must be a string." },
        { status: 400 }
      );
    }

    const MAX_FILE_PREVIEW_LENGTH = 2000;
    const trimmedFilePreview =
      filePreview.length > MAX_FILE_PREVIEW_LENGTH
        ? filePreview.slice(0, MAX_FILE_PREVIEW_LENGTH)
        : filePreview;

    const result = await classifyDocument(
      trimmedFilePreview,
      fileName,
      userMessage
    );

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ドキュメント分類に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
