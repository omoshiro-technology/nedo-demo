import { NextRequest, NextResponse } from "next/server";
import { analyzeDocument } from "@/lib/compath/application/analyzeDocument";
import {
  normalizeBase64,
  validateFileSize,
} from "@/lib/compath/presentation/http/validation";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, mimeType, base64 } = body ?? {};

    if (!fileName || !mimeType || !base64) {
      return NextResponse.json(
        { message: "fileName, mimeType, base64 are required." },
        { status: 400 }
      );
    }

    const sizeValidation = validateFileSize(base64);
    if (!sizeValidation.valid) {
      return NextResponse.json(
        { message: sizeValidation.error },
        { status: 413 }
      );
    }

    const normalizedBase64 = normalizeBase64(base64);
    const buffer = Buffer.from(normalizedBase64, "base64");
    const result = await analyzeDocument({
      fileName,
      mimeType,
      data: buffer,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "ドキュメント分析に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
