import { NextRequest, NextResponse } from "next/server";
import { AnalysisHistoryRepository } from "@/lib/compath/application/repositories";
import { exportToJsonString } from "@/lib/compath/application/export/exportToJson";
import { exportToCsv } from "@/lib/compath/application/export/exportToCsv";
import { buildContentDisposition } from "@/lib/compath/presentation/http/validation";
import type { ExportOptions } from "@/lib/compath/domain/types";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      historyId,
      axisId,
      format,
      includeTags = true,
      includeEdgeLabels = true,
    } = body ?? {};

    if (!historyId || !axisId || !format) {
      return NextResponse.json(
        { message: "historyId, axisId, format は必須です。" },
        { status: 400 }
      );
    }

    if (!["json", "csv"].includes(format)) {
      return NextResponse.json(
        { message: "format は 'json' または 'csv' である必要があります。" },
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
      format,
      includeTags,
      includeEdgeLabels,
    };

    if (format === "json") {
      const jsonString = exportToJsonString(history, graph, options);
      const disposition = buildContentDisposition(
        `${history.fileName}_${graph.axisLabel}.json`
      );
      return new NextResponse(jsonString, {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": disposition,
        },
      });
    }

    if (format === "csv") {
      const csvData = exportToCsv(history, graph, options);
      const disposition = buildContentDisposition(
        `${history.fileName}_${graph.axisLabel}_nodes.csv`
      );
      return new NextResponse(csvData.nodes, {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": disposition,
        },
      });
    }

    return NextResponse.json(
      { message: "未対応のフォーマットです。" },
      { status: 400 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "エクスポートに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
