import { NextRequest, NextResponse } from "next/server";
import { buildDecisionTimeline } from "@/lib/compath/application/decision/buildTimeline";
import {
  normalizeBase64,
  validateFiles,
} from "@/lib/compath/presentation/http/validation";
import type { DecisionDocumentInput } from "@/lib/compath/domain/types";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { documents } = body ?? {};

    const validation = validateFiles(
      documents?.map((doc: { fileName: string; mimeType: string; base64: string }) => ({
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        base64: doc.base64,
      })) ?? [],
      {
        maxFiles: 20,
        allowedMimeTypes: [
          "application/pdf",
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "text/plain",
        ],
      }
    );

    if (!validation.valid) {
      return NextResponse.json(
        { message: validation.errors.join(" ") },
        { status: 400 }
      );
    }

    const inputs: DecisionDocumentInput[] = documents.map(
      (doc: { fileName: string; mimeType: string; base64: string; createdAt?: string; modifiedAt?: string }) => ({
        fileName: doc.fileName,
        mimeType: doc.mimeType,
        data: Buffer.from(normalizeBase64(doc.base64), "base64"),
        createdAt: doc.createdAt,
        modifiedAt: doc.modifiedAt,
      })
    );

    const result = await buildDecisionTimeline(inputs);
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "意思決定分析に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
