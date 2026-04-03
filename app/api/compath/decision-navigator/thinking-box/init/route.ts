import { NextRequest, NextResponse } from "next/server";
import { generateInitialLayout } from "@/lib/compath/application/decisionNavigator/conditionExtractor";
import {
  createInitialThinkingBox,
  initializeGoalCompass,
} from "@/lib/compath/application/decisionNavigator/thinkingBox";
import { thinkingBoxStore } from "@/lib/compath/presentation/http/thinkingBoxStore";

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { purpose, currentSituation, documentContext } = body ?? {};

    if (
      !purpose ||
      typeof purpose !== "string" ||
      purpose.trim().length === 0
    ) {
      return NextResponse.json(
        { message: "purpose（目的）は必須です。" },
        { status: 400 }
      );
    }

    const initialLayout = await generateInitialLayout(
      purpose.trim(),
      currentSituation,
      documentContext
    );

    const initialThinkingBox = createInitialThinkingBox(initialLayout);

    const compassState = initializeGoalCompass(
      initialLayout.initialDistance,
      initialLayout.initialCandidates.length
    );

    const boxId = initialThinkingBox.id;
    thinkingBoxStore.set(boxId, {
      initialLayout,
      currentThinkingBox: initialThinkingBox,
      compassState,
    });

    return NextResponse.json(
      {
        boxId,
        initialLayout,
        thinkingBox: initialThinkingBox,
        goalCompass: compassState,
      },
      { status: 201 }
    );
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "初期レイアウトの生成に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
