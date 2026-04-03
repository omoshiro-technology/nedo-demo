import { NextRequest, NextResponse } from "next/server";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purpose, limit } = body ?? {};

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

    const { getPastPreconditions } = await import(
      "@/lib/compath/application/decisionNavigator/getPastPreconditions"
    );
    const result = await getPastPreconditions(purpose.trim(), limit ?? 5);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "過去事例の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
