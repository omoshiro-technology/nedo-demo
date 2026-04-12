import { NextRequest, NextResponse } from "next/server";
import { getSkillProfile } from "@/lib/compath/application/skillMap/skillProfile";

/**
 * GET /api/compath/skill-map/profile?userId=xxx
 *
 * ユーザーのスキルプロファイルを取得する。
 */
export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return NextResponse.json(
      { message: "userId is required." },
      { status: 400 }
    );
  }

  const asOf = request.nextUrl.searchParams.get("asOf") ?? undefined;
  const profile = getSkillProfile(userId, asOf);
  if (!profile) {
    return NextResponse.json(
      { message: "Profile not found.", userId },
      { status: 404 }
    );
  }

  return NextResponse.json(profile);
}
