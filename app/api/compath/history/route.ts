import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";

export async function GET() {
  try {
    const histories = AnalysisHistoryRepository.findAll();
    return NextResponse.json(histories);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "履歴一覧の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { fileName, result, qualityScore } = body ?? {};

    if (!fileName || !result) {
      return NextResponse.json(
        { message: "fileName and result are required." },
        { status: 400 }
      );
    }

    const history = AnalysisHistoryRepository.create({
      fileName,
      result,
      qualityScore,
    });
    return NextResponse.json(history, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "履歴の保存に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
