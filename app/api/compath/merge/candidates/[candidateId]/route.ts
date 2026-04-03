import { NextRequest, NextResponse } from "next/server";
import { mergeCandidatesStore } from "@/lib/compath/presentation/http/mergeStore";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ candidateId: string }> }
) {
  try {
    const { candidateId } = await params;
    const body = await request.json();
    const { status, mergedLabel } = body ?? {};

    if (!status || !["approved", "rejected"].includes(status)) {
      return NextResponse.json(
        {
          message:
            "status は 'approved' または 'rejected' である必要があります。",
        },
        { status: 400 }
      );
    }

    const candidate = mergeCandidatesStore.get(candidateId);
    if (!candidate) {
      return NextResponse.json(
        { message: "候補が見つかりません。" },
        { status: 404 }
      );
    }

    candidate.status = status;
    if (mergedLabel) {
      candidate.mergedLabel = mergedLabel;
    }

    mergeCandidatesStore.set(candidateId, candidate);

    return NextResponse.json(candidate);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "マージ候補の更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
