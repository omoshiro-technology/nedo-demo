import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";
import { exportToCsv } from "@/lib/compath/application/export/exportToCsv";
import { buildContentDisposition } from "@/lib/compath/presentation/http/validation";
import type { ExportOptions } from "@/lib/compath/domain/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { historyId, axisId, includeEdgeLabels = true } = body ?? {};

    if (!historyId || !axisId) {
      return NextResponse.json(
        { message: "historyId, axisId は必須です。" },
        { status: 400 }
      );
    }

    const history = AnalysisHistoryRepository.findById(historyId);
    if (!history) {
      return NextResponse.json(
        { message: "履歴が見つかりません。" },
        { status: 404 }
      );
    }

    const graph = history.result.graphs.find(
      (g: { axisId: string }) => g.axisId === axisId
    );
    if (!graph) {
      return NextResponse.json(
        { message: "指定された軸が見つかりません。" },
        { status: 404 }
      );
    }

    const options: ExportOptions = {
      format: "csv",
      includeEdgeLabels,
    };

    const csvData = exportToCsv(history, graph, options);
    const disposition = buildContentDisposition(
      `${history.fileName}_${graph.axisLabel}_edges.csv`
    );

    return new NextResponse(csvData.edges, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": disposition,
      },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "エッジエクスポートに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
