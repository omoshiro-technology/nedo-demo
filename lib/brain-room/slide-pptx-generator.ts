import pptxgen from "pptxgenjs"

export interface PptxSlideData {
  title: string
  subtitle?: string
  slides: PptxSlide[]
}

export interface PptxSlide {
  type: "title" | "section" | "flow" | "summary"
  heading: string
  subheading?: string
  bullets?: string[]
  speaker?: string
  color?: "blue" | "yellow" | "purple" | "red" | "green" | "neutral"
}

const SLIDE_JSON_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    subtitle: { type: "string" },
    slides: {
      type: "array",
      items: {
        type: "object",
        properties: {
          type: { type: "string", enum: ["title", "section", "flow", "summary"] },
          heading: { type: "string" },
          subheading: { type: "string" },
          bullets: { type: "array", items: { type: "string" } },
          speaker: { type: "string" },
          color: { type: "string", enum: ["blue", "yellow", "purple", "red", "green", "neutral"] },
        },
        required: ["type", "heading"],
      },
    },
  },
  required: ["title", "slides"],
}

const GEMINI_BASE_URL = "https://generativelanguage.googleapis.com/v1beta"

const COLOR_HEX: Record<NonNullable<PptxSlide["color"]>, string> = {
  blue: "3498DB",
  yellow: "E6A817",
  purple: "8E44AD",
  red: "C0392B",
  green: "27AE60",
  neutral: "7F8C8D",
}

export function shouldUseMockSlidePptx(): boolean {
  const key = process.env.GEMINI_API_KEY
  if (!key) return true
  if (key === "dummy" || key === "placeholder" || key.startsWith("dummy-")) return true
  return false
}

export async function generateSlidePptx(whiteboardHtml: string, theme: string): Promise<Uint8Array> {
  const data = shouldUseMockSlidePptx()
    ? generateMockSlideData(whiteboardHtml, theme)
    : await generateSlideDataWithGemini(whiteboardHtml, theme)
  return renderPptx(data)
}

async function generateSlideDataWithGemini(whiteboardHtml: string, theme: string): Promise<PptxSlideData> {
  const apiKey = process.env.GEMINI_API_KEY!
  const prompt = buildGeminiPrompt(whiteboardHtml, theme)
  const response = await fetch(`${GEMINI_BASE_URL}/models/gemini-2.5-pro:generateContent?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: SLIDE_JSON_SCHEMA,
        temperature: 0.3,
        maxOutputTokens: 8192,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error("Gemini slide PPTX generation failed:", body)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
  const parsed = JSON.parse(text) as PptxSlideData
  return normalizeSlideData(parsed, theme)
}

function buildGeminiPrompt(whiteboardHtml: string, theme: string): string {
  return `以下のホワイトボード HTML を、PowerPoint 用のスライド構造に変換してください。

【会議テーマ】
${theme}

【要件】
- 6〜9枚のスライドを生成
- 1枚目は title（議論全体のタイトル）
- 中盤は section（発言者ごとの論点 or 主要議題）または flow（工程/順序）
- 最後は summary（合意事項・次のアクション）
- bullets は各スライド 3〜5 個、各行 60 文字以内
- speaker を埋める場合は発言者の氏名のみ
- color は論点の性質で blue / yellow / purple / red / green / neutral から選択

【ホワイトボード HTML】
${whiteboardHtml.substring(0, 6000)}${whiteboardHtml.length > 6000 ? "..." : ""}
`
}

function normalizeSlideData(data: PptxSlideData, theme: string): PptxSlideData {
  const slides = Array.isArray(data.slides) ? data.slides : []
  return {
    title: data.title || theme,
    subtitle: data.subtitle,
    slides: slides
      .filter((s) => s && typeof s === "object" && s.heading)
      .map((s) => ({
        type: (["title", "section", "flow", "summary"].includes(s.type) ? s.type : "section") as PptxSlide["type"],
        heading: String(s.heading).slice(0, 80),
        subheading: s.subheading ? String(s.subheading).slice(0, 120) : undefined,
        bullets: Array.isArray(s.bullets) ? s.bullets.map((b) => String(b).slice(0, 200)) : undefined,
        speaker: s.speaker ? String(s.speaker).slice(0, 30) : undefined,
        color: (["blue", "yellow", "purple", "red", "green", "neutral"].includes(s.color as string)
          ? s.color
          : "neutral") as PptxSlide["color"],
      })),
  }
}

export function generateMockSlideData(whiteboardHtml: string, theme: string): PptxSlideData {
  const text = stripHtml(whiteboardHtml)
  const titleMatch = whiteboardHtml.match(/font-size:\s*1\.3em[^"]*"[^>]*>\s*([^<]+)/)
  const mainTitle = (titleMatch?.[1] || theme).replace(/[🏭🔩🔧🔬🔍💴💻🗣📎🔗]/g, "").trim()

  const cards = extractCards(whiteboardHtml)
  const flowSteps = extractFlowSteps(whiteboardHtml)
  const agreements = extractAgreements(whiteboardHtml, text)

  const colors: PptxSlide["color"][] = ["blue", "yellow", "purple", "red", "green"]
  const slides: PptxSlide[] = []

  slides.push({
    type: "title",
    heading: mainTitle,
    subheading: theme,
  })

  cards.slice(0, 5).forEach((c, i) => {
    slides.push({
      type: "section",
      heading: c.claim,
      speaker: c.speaker,
      bullets: c.bullets,
      color: colors[i % colors.length],
    })
  })

  if (flowSteps.length >= 3) {
    slides.push({
      type: "flow",
      heading: "論点の構造・依存関係",
      bullets: flowSteps.slice(0, 7),
      color: "neutral",
    })
  }

  slides.push({
    type: "summary",
    heading: "合意事項と次のアクション",
    bullets: agreements.length > 0 ? agreements : ["議論を踏まえた方針を次回会議で確定", "各担当が必要な情報を持ち寄って再集合"],
    color: "green",
  })

  return { title: mainTitle, subtitle: theme, slides }
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/g, "")
    .replace(/<script[\s\S]*?<\/script>/g, "")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

interface CardData {
  speaker: string
  claim: string
  bullets: string[]
}

function extractCards(html: string): CardData[] {
  const cards: CardData[] = []
  const cardRegex = /<div class="wb-card wb-card-\w+">([\s\S]*?)<\/div>\s*<\/div>/g
  let match
  while ((match = cardRegex.exec(html)) !== null) {
    const inner = match[1]
    const speakerMatch = inner.match(/🗣\s*([^（(<]+)/)
    const claimMatch = inner.match(/<strong>([^<]+)<\/strong>/)
    const bulletMatches = [...inner.matchAll(/<li>([\s\S]*?)<\/li>/g)]
    if (!speakerMatch || !claimMatch) continue
    cards.push({
      speaker: speakerMatch[1].trim(),
      claim: claimMatch[1].trim(),
      bullets: bulletMatches
        .map((m) => cleanText(m[1]))
        .filter((t) => t.length > 0)
        .slice(0, 5),
    })
  }
  return cards
}

function extractFlowSteps(html: string): string[] {
  const sectionMatch = html.match(/論点の構造[\s\S]*?<\/div>\s*<\/div>/)
  if (!sectionMatch) return []
  const section = sectionMatch[0]
  const cardRegex = /<div class="wb-card[^"]*"[^>]*>([\s\S]*?)<\/div>/g
  const steps: string[] = []
  let match
  while ((match = cardRegex.exec(section)) !== null) {
    const text = cleanText(match[1])
    if (text.length > 0) steps.push(text)
  }
  return steps
}

function extractAgreements(html: string, text: string): string[] {
  const structured: string[] = []

  const decisionRegex = /<div class="wb-decision"[^>]*>([\s\S]*?)<\/div>/g
  let m
  while ((m = decisionRegex.exec(html)) !== null) {
    const strongMatch = m[1].match(/<strong>([\s\S]*?)<\/strong>/)
    if (strongMatch) {
      const cleaned = cleanText(strongMatch[1])
      if (cleaned.length > 0 && cleaned.length < 80) structured.push(cleaned)
    }
  }

  const actionSectionMatch = html.match(/アクション項目[\s\S]{0,3000}/)
  if (actionSectionMatch) {
    const actionRegex = /<div class="wb-tag"[^>]*>([^<]+)<\/div>\s*<([\s\S]*?)<\/div>/g
    let a
    while ((a = actionRegex.exec(actionSectionMatch[0])) !== null && structured.length < 6) {
      const assignee = cleanText(a[1])
      const body = cleanText(a[2])
      const summary = body.slice(0, 60)
      if (assignee && summary) structured.push(`${assignee}: ${summary}`)
    }
  }

  if (structured.length >= 2) return structured.slice(0, 5)

  const keywords = ["合意", "決定", "採用", "次回", "担当"]
  const sentences = text.split(/[。\n]/).filter((s) => {
    const t = s.trim()
    return t.length > 10 && t.length < 70
  })
  const matched = sentences.filter((s) => keywords.some((k) => s.includes(k)))
  return matched.slice(0, 5).map((s) => s.trim())
}

function cleanText(html: string): string {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\[UUID:[^\]]+\]/g, "")
    .trim()
}

async function renderPptx(data: PptxSlideData): Promise<Uint8Array> {
  const pres = new pptxgen()
  pres.layout = "LAYOUT_WIDE" // 13.333 x 7.5 inch (16:9)
  pres.title = data.title
  pres.author = "BreinRoom"

  for (const s of data.slides) {
    addSlide(pres, s)
  }

  const out = await pres.write({ outputType: "arraybuffer" })
  if (typeof out === "string") {
    return new TextEncoder().encode(out)
  }
  if (out instanceof ArrayBuffer) return new Uint8Array(out)
  if (out instanceof Uint8Array) return out
  if (typeof Blob !== "undefined" && out instanceof Blob) {
    return new Uint8Array(await out.arrayBuffer())
  }
  throw new Error("Unexpected pptxgenjs output type")
}

function addSlide(pres: pptxgen, slide: PptxSlide): void {
  if (slide.type === "title") {
    addTitleSlide(pres, slide)
    return
  }

  const color = slide.color || "neutral"
  const accentHex = COLOR_HEX[color]

  const pptSlide = pres.addSlide()
  pptSlide.background = { color: "F5F0E8" }

  // Left accent bar
  pptSlide.addShape("rect", {
    x: 0,
    y: 0,
    w: 0.3,
    h: 7.5,
    fill: { color: accentHex },
    line: { type: "none" },
  })

  // Speaker / type badge
  const badgeText =
    slide.speaker ||
    (slide.type === "summary" ? "まとめ" : slide.type === "flow" ? "構造" : "論点")
  pptSlide.addText(badgeText, {
    x: 0.7,
    y: 0.45,
    w: 3,
    h: 0.4,
    fontSize: 12,
    bold: true,
    color: "FFFFFF",
    fill: { color: accentHex },
    align: "center",
    valign: "middle",
    fontFace: "Noto Sans JP",
  })

  // Heading
  pptSlide.addText(slide.heading, {
    x: 0.7,
    y: 1.0,
    w: 11.9,
    h: 1.0,
    fontSize: 30,
    bold: true,
    color: "2C3E50",
    fontFace: "Noto Sans JP",
    valign: "top",
  })

  let bulletsY = 2.1
  if (slide.subheading) {
    pptSlide.addText(slide.subheading, {
      x: 0.7,
      y: 2.05,
      w: 11.9,
      h: 0.5,
      fontSize: 14,
      color: "666666",
      fontFace: "Noto Sans JP",
    })
    bulletsY = 2.6
  }

  // Bullets
  if (slide.bullets && slide.bullets.length > 0) {
    const bulletItems = slide.bullets.map((b) => ({
      text: b,
      options: {
        bullet: { code: "25CF" },
        paraSpaceAfter: 8,
        color: "333333",
        fontSize: 16,
        fontFace: "Noto Sans JP",
      },
    }))
    pptSlide.addText(bulletItems as any, {
      x: 0.9,
      y: bulletsY,
      w: 11.7,
      h: 7.5 - bulletsY - 0.5,
      fontFace: "Noto Sans JP",
    })
  }
}

function addTitleSlide(pres: pptxgen, slide: PptxSlide): void {
  const pptSlide = pres.addSlide()
  pptSlide.background = { color: "2C3E50" }

  pptSlide.addText(slide.heading, {
    x: 0.5,
    y: 2.8,
    w: 12.3,
    h: 1.5,
    fontSize: 44,
    bold: true,
    color: "FFFFFF",
    align: "center",
    fontFace: "Noto Sans JP",
  })

  if (slide.subheading) {
    pptSlide.addText(slide.subheading, {
      x: 1.5,
      y: 4.5,
      w: 10.3,
      h: 1.0,
      fontSize: 18,
      color: "ECF0F1",
      align: "center",
      fontFace: "Noto Sans JP",
    })
  }

  pptSlide.addShape("line", {
    x: 5.5,
    y: 4.3,
    w: 2.3,
    h: 0,
    line: { color: "3498DB", width: 3 },
  })
}
