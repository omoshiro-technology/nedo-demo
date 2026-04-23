import { generateSlideHtml } from "@/lib/brain-room/slide-generator"

export const maxDuration = 120

export async function POST(req: Request) {
  try {
    const { whiteboardHtml, theme }: { whiteboardHtml?: string; theme?: string } = await req.json()

    if (!whiteboardHtml || whiteboardHtml.trim().length === 0) {
      return Response.json({ error: "whiteboardHtml is required" }, { status: 400 })
    }

    const html = await generateSlideHtml(whiteboardHtml, theme || "議論スライド")
    return new Response(html, {
      status: 200,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    })
  } catch (error) {
    console.error("Error in generate-slide:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: "Failed to generate slide", details: message }, { status: 500 })
  }
}
