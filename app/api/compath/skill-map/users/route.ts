import { NextResponse } from "next/server";
import { SAMPLE_USERS } from "@/lib/compath/infrastructure/repositories/skillMapSeedData";

/**
 * GET /api/compath/skill-map/users
 *
 * スキルマップに登録されているユーザー一覧を返す。
 */
export async function GET() {
  return NextResponse.json({ users: SAMPLE_USERS });
}
