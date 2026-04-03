import { NextResponse } from "next/server";
import {
  MockSearchClient,
  type IKnowledgeSearchClient,
} from "@/lib/compath/application/learnFromPast/searchClientFactory";

const searchClient: IKnowledgeSearchClient = new MockSearchClient();

export async function GET() {
  try {
    const stats = await searchClient.getStats();
    return NextResponse.json(stats);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "統計の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
