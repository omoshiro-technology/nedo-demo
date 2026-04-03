import { NextRequest, NextResponse } from "next/server";
import {
  generateGoalCompass,
  checkTerminationCondition,
} from "@/lib/compath/application/decisionNavigator/thinkingBox";
import { thinkingBoxStore } from "@/lib/compath/presentation/http/thinkingBoxStore";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  try {
    const { boxId } = await params;

    const stored = thinkingBoxStore.get(boxId);
    if (!stored) {
      return NextResponse.json(
        { message: "思考ボックスが見つかりません。" },
        { status: 404 }
      );
    }

    const { initialLayout, currentThinkingBox, compassState } = stored;

    const goalDistance = generateGoalCompass(
      currentThinkingBox,
      initialLayout.initialCandidates.length
    );

    const termination = checkTerminationCondition(currentThinkingBox);

    return NextResponse.json({
      boxId,
      initialLayout,
      thinkingBox: currentThinkingBox,
      goalCompass: compassState,
      goalDistance,
      termination,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "思考ボックスの取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
