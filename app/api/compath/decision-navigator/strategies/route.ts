import { NextResponse } from "next/server";
import { getStrategyMetas } from "@/lib/compath/domain/decisionNavigator/strategies/strategyRegistry";
// 戦略登録を確実に行う
import "@/lib/compath/application/decisionNavigator/strategies/index";

export async function GET() {
  try {
    const strategies = getStrategyMetas();
    return NextResponse.json({ strategies });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "戦略一覧の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
