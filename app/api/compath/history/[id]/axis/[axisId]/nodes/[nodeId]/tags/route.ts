import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";
import type { NodeConfidenceTag, NodeTagInfo } from "@/lib/compath/domain/types";

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: {
    params: Promise<{ id: string; axisId: string; nodeId: string }>;
  }
) {
  try {
    const { id, axisId, nodeId } = await params;
    const body = await request.json();
    const { confidenceTag, reason } = body ?? {};

    if (
      !confidenceTag ||
      !["confirmed", "estimated", "unknown"].includes(confidenceTag)
    ) {
      return NextResponse.json(
        {
          message:
            "confidenceTag は 'confirmed', 'estimated', 'unknown' のいずれかである必要があります。",
        },
        { status: 400 }
      );
    }

    const tagInfo: NodeTagInfo = {
      confidenceTag: confidenceTag as NodeConfidenceTag,
      taggedBy: "user",
      taggedAt: new Date().toISOString(),
      reason,
    };

    const updated = AnalysisHistoryRepository.updateNodeTag(
      id,
      axisId,
      nodeId,
      tagInfo
    );

    if (!updated) {
      return NextResponse.json(
        { message: "履歴またはノードが見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "タグの更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
