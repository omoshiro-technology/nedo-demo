import { NextRequest, NextResponse } from "next/server";
import { processConditionSelection } from "@/lib/compath/application/decisionNavigator/thinkingBox";
import { thinkingBoxStore } from "@/lib/compath/presentation/http/thinkingBoxStore";

export const maxDuration = 60;

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ boxId: string }> }
) {
  try {
    const { boxId } = await params;
    const body = await request.json();
    const { conditionId, purpose } = body ?? {};

    if (!conditionId || typeof conditionId !== "string") {
      return NextResponse.json(
        { message: "conditionId は必須です。" },
        { status: 400 }
      );
    }

    const stored = thinkingBoxStore.get(boxId);
    if (!stored) {
      return NextResponse.json(
        { message: "思考ボックスが見つかりません。" },
        { status: 404 }
      );
    }

    const { currentThinkingBox, compassState } = stored;

    // 選択された条件を取得
    const allConditions = [
      ...currentThinkingBox.columns.contextual,
      ...currentThinkingBox.columns.experiential,
      ...currentThinkingBox.columns.inferred,
    ];
    const selectedCondition = allConditions.find(
      (c: { id: string }) => c.id === conditionId
    );

    if (!selectedCondition) {
      return NextResponse.json(
        { message: "指定された条件が見つかりません。" },
        { status: 404 }
      );
    }

    const result = processConditionSelection(
      currentThinkingBox,
      selectedCondition,
      purpose || stored.initialLayout.goalDefinition.target || ""
    );

    // ゴールコンパスを更新
    const { updateGoalCompass } = await import(
      "@/lib/compath/application/decisionNavigator/thinkingBox/goalCompass"
    );
    const newCompassState = updateGoalCompass(
      compassState,
      result.nextThinkingBox,
      selectedCondition,
      result.goalDistance
    );

    // ストアを更新
    thinkingBoxStore.set(boxId, {
      ...stored,
      currentThinkingBox: result.nextThinkingBox,
      compassState: newCompassState,
    });

    return NextResponse.json({
      boxId,
      selectionResult: result,
      thinkingBox: result.nextThinkingBox,
      goalCompass: newCompassState,
      isTerminal: result.isGoalAchieved,
      terminationReason: result.isGoalAchieved ? "goal_achieved" : undefined,
      finalDecision:
        result.isGoalAchieved && result.achievedValue
          ? {
              value: result.achievedValue,
              rationale:
                result.nextThinkingBox.terminationReason ||
                "条件が収束しました",
              satisfiedConditions:
                result.nextThinkingBox.parentConditions.map(
                  (c: { label: string }) => c.label
                ),
            }
          : undefined,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "条件選択の処理に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
