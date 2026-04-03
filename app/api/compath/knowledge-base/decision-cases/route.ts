import { NextRequest, NextResponse } from "next/server";
import { getInMemoryRetriever } from "@/lib/compath/application/knowledgeBase/retrieverAccessor";

export async function GET() {
  try {
    const retriever = getInMemoryRetriever();
    const cases = retriever.getDecisionCases();
    return NextResponse.json({
      total: cases.length,
      cases,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "判断事例一覧の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      title,
      content,
      rationale,
      rule,
      outcome,
      learnings,
      metadata,
    } = body ?? {};

    if (!title || !content) {
      return NextResponse.json(
        { message: "title と content は必須です。" },
        { status: 400 }
      );
    }

    const caseId =
      id ||
      `case-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const retriever = getInMemoryRetriever();
    await retriever.indexDecisionCase([
      {
        id: caseId,
        title,
        content,
        rationale,
        rule,
        outcome,
        learnings,
        metadata,
      },
    ]);

    return NextResponse.json(
      {
        id: caseId,
        message: `判断事例「${title}」を登録しました。`,
        hasRationale: !!rationale,
        hasOutcome: !!outcome,
        learningsCount: learnings?.length ?? 0,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "[knowledgeBase] Decision case registration failed:",
      error
    );
    return NextResponse.json(
      {
        message: "判断事例の登録に失敗しました。",
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
