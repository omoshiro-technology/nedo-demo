import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";
import { detectMergeCandidates } from "@/lib/compath/application/merge/detectMergeCandidates";
import { mergeCandidatesStore } from "@/lib/compath/presentation/http/mergeStore";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { historyIds, options } = body ?? {};

    if (!historyIds || !Array.isArray(historyIds) || historyIds.length < 2) {
      return NextResponse.json(
        { message: "2つ以上のhistoryIdが必要です。" },
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

    const candidates = detectMergeCandidates(histories, options);

    for (const candidate of candidates) {
      mergeCandidatesStore.set(candidate.id, candidate);
    }

    return NextResponse.json({
      candidates,
      totalCount: candidates.length,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "マージ候補の検出に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
