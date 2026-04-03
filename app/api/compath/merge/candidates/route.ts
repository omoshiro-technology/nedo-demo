import { NextResponse } from "next/server";
import { mergeCandidatesStore } from "@/lib/compath/presentation/http/mergeStore";

export async function GET() {
  try {
    const candidates = Array.from(mergeCandidatesStore.values());
    return NextResponse.json({ candidates });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "マージ候補の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    mergeCandidatesStore.clear();
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "マージ候補のクリアに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
