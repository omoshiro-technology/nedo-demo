import { NextRequest, NextResponse } from "next/server";
import { KnowledgeRepository } from "@/lib/compath/application/repositories";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { data, duplicateHandling } = body;

    if (!data || !data.version) {
      return NextResponse.json(
        { message: "有効なナレッジデータが必要です" },
        { status: 400 }
      );
    }

    const heuristicsResult = KnowledgeRepository.importHeuristics(
      data.heuristics || [],
      duplicateHandling
    );

    const patternsResult = KnowledgeRepository.importPatterns(
      data.patterns || [],
      duplicateHandling
    );

    return NextResponse.json({
      success: true,
      importedHeuristics: heuristicsResult.imported,
      importedPatterns: patternsResult.imported,
      skipped: [
        ...Array(heuristicsResult.skipped)
          .fill(null)
          .map((_: null, i: number) => ({
            id: `heuristic-${i}`,
            type: "heuristic",
            reason: "duplicate",
          })),
        ...Array(patternsResult.skipped)
          .fill(null)
          .map((_: null, i: number) => ({
            id: `pattern-${i}`,
            type: "pattern",
            reason: "duplicate",
          })),
      ],
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ナレッジのインポートに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
