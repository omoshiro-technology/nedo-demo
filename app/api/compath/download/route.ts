import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json(
    { message: "Download is not implemented yet." },
    { status: 501 }
  );
}
