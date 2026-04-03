import { NextRequest, NextResponse } from "next/server";
import { generateProposal } from "@/lib/compath/application/proposal";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { customerContext, evaluationPoints } = body;

    if (!customerContext || !evaluationPoints) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "customerContext と evaluationPoints は必須です",
        },
        { status: 400 }
      );
    }

    if (!customerContext.name || !customerContext.industry) {
      return NextResponse.json(
        {
          error: "Bad Request",
          message: "顧客名と業種は必須です",
        },
        { status: 400 }
      );
    }

    const result = await generateProposal({
      customerContext,
      evaluationPoints,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("[POST /api/compath/proposal/generate] Error:", error);
    return NextResponse.json(
      {
        error: "Internal Server Error",
        message:
          error instanceof Error
            ? error.message
            : "提案書の生成に失敗しました",
      },
      { status: 500 }
    );
  }
}
