import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purpose, chatContext } = body ?? {};

    if (
      !purpose ||
      typeof purpose !== "string" ||
      purpose.trim().length === 0
    ) {
      return NextResponse.json(
        { message: "purpose（目的）は必須です。" },
        { status: 400 }
      );
    }

    const { generateClarificationQuestions } = await import(
      "@/lib/compath/application/decisionNavigator/generateClarificationQuestions"
    );
    const result = await generateClarificationQuestions(
      purpose.trim(),
      chatContext
    );
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "確認質問の生成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
