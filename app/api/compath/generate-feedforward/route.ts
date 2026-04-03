import { NextRequest, NextResponse } from "next/server";
import { generateGlobalFeedforward } from "@/lib/compath/application/decision/generateGlobalFeedforward";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { decisions, context } = body ?? {};

    if (!decisions || !Array.isArray(decisions) || decisions.length === 0) {
      return NextResponse.json(
        { message: "decisions array is required and must not be empty." },
        { status: 400 }
      );
    }

    const globalFeedforward = await generateGlobalFeedforward(
      decisions,
      context || ""
    );
    return NextResponse.json({ globalFeedforward });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "フィードフォワード生成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
