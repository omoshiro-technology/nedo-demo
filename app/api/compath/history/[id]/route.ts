import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const history = AnalysisHistoryRepository.findById(id);

    if (!history) {
      return NextResponse.json(
        { message: "履歴が見つかりません。" },
        { status: 404 }
      );
    }

    return NextResponse.json(history);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "履歴の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const deleted = AnalysisHistoryRepository.delete(id);

    if (!deleted) {
      return NextResponse.json(
        { message: "履歴が見つかりません。" },
        { status: 404 }
      );
    }

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "履歴の削除に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
