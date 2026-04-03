import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const conferenceData = await request.json()

    // ファイル名を生成（テーマと日時を含む、日本語対応）
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const themeSlug = conferenceData.theme
      .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9]/g, "_")
      .substring(0, 50)
    const filename = `conference_${themeSlug}_${timestamp}.json`

    // Vercel Blobにデータを保存（UTF-8エンコーディングを明示）
    const blob = await put(filename, JSON.stringify(conferenceData, null, 2), {
      access: "public",
      contentType: "application/json; charset=utf-8",
    })

    return Response.json({
      url: blob.url,
      filename: filename,
      size: blob.size,
    })
  } catch (error) {
    console.error("Error saving to blob:", error)
    return Response.json({ error: "Failed to save conference data" }, { status: 500 })
  }
}
