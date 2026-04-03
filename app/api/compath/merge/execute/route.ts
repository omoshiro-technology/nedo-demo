import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";
import { executeGraphMerge } from "@/lib/compath/application/merge/executeMerge";
import { mergeCandidatesStore } from "@/lib/compath/presentation/http/mergeStore";
import type { MergeCandidate } from "@/lib/compath/domain/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      historyIds,
      axisId,
      candidateIds,
      approvedOnly = true,
    } = body ?? {};

    if (!historyIds || !Array.isArray(historyIds) || historyIds.length < 2) {
      return NextResponse.json(
        { message: "2つ以上のhistoryIdが必要です。" },
        { status: 400 }
      );
    }

    if (!axisId) {
      return NextResponse.json(
        { message: "axisIdは必須です。" },
        { status: 400 }
      );
    }

    const histories = historyIds
      .map((id: string) => AnalysisHistoryRepository.findById(id))
      .filter((h: unknown): h is NonNullable<typeof h> => h !== undefined);

    if (histories.length < 2) {
      return NextResponse.json(
        { message: "有効な履歴が2つ以上見つかりません。" },
        { status: 400 }
      );
    }

    let candidates: MergeCandidate[];
    if (candidateIds && candidateIds.length > 0) {
      candidates = candidateIds
        .map((id: string) => mergeCandidatesStore.get(id))
        .filter((c: unknown): c is MergeCandidate => c !== undefined);
    } else {
      candidates = Array.from(mergeCandidatesStore.values());
    }

    const result = executeGraphMerge(histories, candidates, axisId, {
      approvedOnly,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "マージの実行に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
