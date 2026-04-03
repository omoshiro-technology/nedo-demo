import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";
import type { DocumentClassification } from "@/lib/compath/domain/types";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { classification } = body ?? {};

    if (
      !classification ||
      !["trial_and_error", "final_report"].includes(classification)
    ) {
      return NextResponse.json(
        {
          message:
            "classification は 'trial_and_error' または 'final_report' である必要があります。",
        },
        { status: 400 }
      );
    }

    const updated = AnalysisHistoryRepository.updateClassification(
      id,
      classification as DocumentClassification,
      true
    );

    if (!updated) {
      return NextResponse.json(
        { message: "履歴が見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "分類の更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
