import { NextRequest, NextResponse } from "next/server";
import { suggestTemplate } from "@/lib/compath/application/actionAgent/outputGenerator";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userMessage } = body ?? {};

    if (!userMessage || typeof userMessage !== "string") {
      return NextResponse.json(
        { message: "userMessage is required and must be a string." },
        { status: 400 }
      );
    }

    const suggestions = await suggestTemplate(userMessage);
    return NextResponse.json({ suggestions });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "テンプレート推薦に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
