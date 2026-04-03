import { NextRequest, NextResponse } from "next/server";
import { generateCopyReadyOutput } from "@/lib/compath/application/actionAgent/outputGenerator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { templateId, context } = body ?? {};

    if (!templateId || typeof templateId !== "string") {
      return NextResponse.json(
        { message: "templateId is required and must be a string." },
        { status: 400 }
      );
    }

    const result = await generateCopyReadyOutput(templateId, context ?? {});
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "出力生成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
