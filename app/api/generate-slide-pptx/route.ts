import { generateSlidePptx } from "@/lib/brain-room/slide-pptx-generator"

export const maxDuration = 120
export const runtime = "nodejs"

export async function POST(req: Request) {
  try {
    const { whiteboardHtml, theme }: { whiteboardHtml?: string; theme?: string } = await req.json()

    if (!whiteboardHtml || whiteboardHtml.trim().length === 0) {
      return Response.json({ error: "whiteboardHtml is required" }, { status: 400 })
    }

    const bytes = await generateSlidePptx(whiteboardHtml, theme || "議論スライド")
    const fileName = buildFileName(theme)
    const asciiFallback = fileName.replace(/[^\x20-\x7E]/g, "_")
    const encoded = encodeURIComponent(fileName)
    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        "Content-Disposition": `attachment; filename="${asciiFallback}"; filename*=UTF-8''${encoded}`,
        "Content-Length": String(bytes.byteLength),
      },
    })
  } catch (error) {
    console.error("Error in generate-slide-pptx:", error)
    const message = error instanceof Error ? error.message : "Unknown error"
    return Response.json({ error: "Failed to generate slide pptx", details: message }, { status: 500 })
  }
}

function buildFileName(theme?: string): string {
  const safe = (theme || "slides")
    .replace(/[\\/:*?"<>|]/g, "_")
    .replace(/\s+/g, "_")
    .slice(0, 60)
  const ts = new Date().toISOString().replace(/[-:T]/g, "").slice(0, 14)
  return `${safe}_${ts}.pptx`
}
