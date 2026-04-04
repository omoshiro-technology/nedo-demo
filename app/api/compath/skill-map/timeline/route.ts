import { NextRequest, NextResponse } from "next/server";
import { getSkillTimeline } from "@/lib/compath/application/skillMap/skillProfile";

/**
 * GET /api/compath/skill-map/timeline?userId=xxx&limit=50
 *
 * ユーザーのスキル成長タイムライン（思考品質スコアの時系列推移）を返す。
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { message: "userId is required." },
      { status: 400 }
    );
  }

  const limit = Number(request.nextUrl.searchParams.get("limit") ?? "50");
  const timeline = getSkillTimeline(userId, limit);

  return NextResponse.json(timeline);
}
