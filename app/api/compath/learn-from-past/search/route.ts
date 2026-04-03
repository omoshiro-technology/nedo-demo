import { NextRequest, NextResponse } from "next/server";
import {
  MockSearchClient,
  type IKnowledgeSearchClient,
} from "@/lib/compath/application/learnFromPast/searchClientFactory";

const searchClient: IKnowledgeSearchClient = new MockSearchClient();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { situation, limit = 5, minSimilarity = 20 } = body ?? {};

    if (
      !situation ||
      typeof situation !== "string" ||
      situation.trim().length === 0
    ) {
      return NextResponse.json(
        { message: "situation（状況の説明）は必須です。" },
        { status: 400 }
      );
    }

    const result = await searchClient.searchSimilarCases(situation, {
      limit,
      minSimilarity,
    });
    return NextResponse.json(result);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "類似事例の検索に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
