import { NextResponse } from "next/server";
import { getTemplateList } from "@/lib/compath/domain/actionAgent/outputTemplates";

export async function GET() {
  try {
    const templates = getTemplateList();
    return NextResponse.json({ templates });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "テンプレート一覧の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
