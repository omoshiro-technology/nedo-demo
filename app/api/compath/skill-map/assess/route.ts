import { NextRequest, NextResponse } from "next/server";
import { assessSession } from "@/lib/compath/application/skillMap/assessSession";
import { applyAssessmentToProfile } from "@/lib/compath/application/skillMap/skillProfile";
import type { SessionSource } from "@/lib/compath/domain/skillMap/types";

export const maxDuration = 120;

/**
 * POST /api/compath/skill-map/assess
 *
 * セッションの対話履歴を分析し、思考品質を評価してスキルプロファイルに反映する。
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      userId,
      sessionId,
      sessionSource,
      sessionPurpose,
      messages,
      availableSkills,
    } = body ?? {};

    if (!userId || !sessionId || !messages?.length) {
      return NextResponse.json(
        { message: "userId, sessionId, messages are required." },
        { status: 400 }
      );
    }

    const assessment = await assessSession({
      userId,
      sessionId,
      sessionSource: (sessionSource ?? "compath_chat") as SessionSource,
      sessionPurpose: sessionPurpose ?? "",
      messages,
      availableSkills: availableSkills ?? [],
    });

    const profile = applyAssessmentToProfile(assessment);

    return NextResponse.json({ assessment, profile });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "スキルアセスメントに失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
