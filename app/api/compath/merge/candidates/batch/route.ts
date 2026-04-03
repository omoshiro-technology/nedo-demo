import { NextRequest, NextResponse } from "next/server";
import { mergeCandidatesStore } from "@/lib/compath/presentation/http/mergeStore";
import type { MergeCandidate } from "@/lib/compath/domain/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { updates } = body ?? {};

    if (!updates || !Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { message: "updates配列が必要です。" },
        { status: 400 }
      );
    }

    const results: MergeCandidate[] = [];

    for (const update of updates) {
      const candidate = mergeCandidatesStore.get(update.candidateId);
      if (candidate) {
        candidate.status = update.status;
        if (update.mergedLabel) {
          candidate.mergedLabel = update.mergedLabel;
        }
        mergeCandidatesStore.set(update.candidateId, candidate);
        results.push(candidate);
      }
    }

    return NextResponse.json({ updated: results });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "マージ候補の一括更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
