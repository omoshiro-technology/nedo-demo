import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { updates } = body ?? {};

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { message: "updates配列が必要です。" },
        { status: 400 }
      );
    }

    const tagUpdates = updates.map(
      (update: {
        axisId: string;
        nodeId: string;
        confidenceTag: string;
        reason?: string;
      }) => ({
        axisId: update.axisId,
        nodeId: update.nodeId,
        tagInfo: {
          confidenceTag: update.confidenceTag,
          taggedBy: "user" as const,
          taggedAt: new Date().toISOString(),
          reason: update.reason,
        },
      })
    );

    const updated = AnalysisHistoryRepository.updateNodeTagsBatch(
      id,
      tagUpdates
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
      error instanceof Error
        ? error.message
        : "タグの一括更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
