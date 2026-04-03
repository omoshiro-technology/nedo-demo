import { NextRequest, NextResponse } from "next/server";
import {
  createSession,
  SessionStore,
} from "@/lib/compath/application/decisionNavigator";
import {
  normalizeBase64,
  validateFileSize,
} from "@/lib/compath/presentation/http/validation";

export const maxDuration = 60;

export async function GET() {
  try {
    const sessions = await SessionStore.findAll();
    return NextResponse.json({ sessions });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "セッション一覧の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      purpose,
      documentBase64,
      fileName,
      currentSituation,
      preconditions,
      skipClarification,
    } = body ?? {};

    if (
      !purpose ||
      typeof purpose !== "string" ||
      purpose.trim().length === 0
    ) {
      return NextResponse.json(
        { message: "purpose（目的/課題）は必須です。" },
        { status: 400 }
      );
    }

    if (documentBase64) {
      const sizeValidation = validateFileSize(documentBase64);
      if (!sizeValidation.valid) {
        return NextResponse.json(
          { message: sizeValidation.error },
          { status: 413 }
        );
      }
    }

    const session = await createSession({
      purpose: purpose.trim(),
      documentBase64: documentBase64
        ? normalizeBase64(documentBase64)
        : undefined,
      fileName,
      currentSituation,
      preconditions,
      skipClarification,
    });

    return NextResponse.json(session, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "セッションの作成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
