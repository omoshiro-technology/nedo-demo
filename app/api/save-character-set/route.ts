import { put } from "@vercel/blob"
import type { NextRequest } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const characterSet = await request.json()

    // ファイル名を生成（セット名と日時を含む、日本語対応）
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const setNameSlug = characterSet.name
      .replace(/[^\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAFa-zA-Z0-9]/g, "_")
      .substring(0, 30)
    const filename = `character_set_${setNameSlug}_${timestamp}.json`

    // Vercel Blobにデータを保存（UTF-8エンコーディングを明示）
    const blob = await put(filename, JSON.stringify(characterSet, null, 2), {
      access: "public",
      contentType: "application/json; charset=utf-8",
    })

    return Response.json({
      url: blob.url,
      filename: filename,
      size: blob.size,
    })
  } catch (error) {
    console.error("Error saving character set to blob:", error)
    return Response.json({ error: "Failed to save character set" }, { status: 500 })
  }
}
