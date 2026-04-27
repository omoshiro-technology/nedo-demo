export interface SlideData {
  title: string
  subtitle?: string
  slides: Slide[]
}

export interface Slide {
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

export function shouldUseMockSlide(): boolean {
  const key = process.env.GEMINI_API_KEY
  if (!key) return true
  if (key === "dummy" || key === "placeholder" || key.startsWith("dummy-")) return true
  return false
}

export async function generateSlideHtml(whiteboardHtml: string, theme: string): Promise<string> {
  const data = shouldUseMockSlide()
    ? generateMockSlideData(whiteboardHtml, theme)
    : await generateSlideDataWithGemini(whiteboardHtml, theme)
  return renderSlideHtml(data)
}

async function generateSlideDataWithGemini(whiteboardHtml: string, theme: string): Promise<SlideData> {
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
    console.error("Gemini slide generation failed:", body)
    throw new Error(`Gemini API error: ${response.status}`)
  }

  const data = await response.json()
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}"
  const parsed = JSON.parse(text) as SlideData
  return normalizeSlideData(parsed, theme)
}

function buildGeminiPrompt(whiteboardHtml: string, theme: string): string {
  return `以下のホワイトボード HTML を、プレゼンテーション用のスライド構造に変換してください。

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

function normalizeSlideData(data: SlideData, theme: string): SlideData {
  const slides = Array.isArray(data.slides) ? data.slides : []
  return {
    title: data.title || theme,
    subtitle: data.subtitle,
    slides: slides
      .filter((s) => s && typeof s === "object" && s.heading)
      .map((s) => ({
        type: (["title", "section", "flow", "summary"].includes(s.type) ? s.type : "section") as Slide["type"],
        heading: String(s.heading).slice(0, 80),
        subheading: s.subheading ? String(s.subheading).slice(0, 120) : undefined,
        bullets: Array.isArray(s.bullets) ? s.bullets.map((b) => String(b).slice(0, 200)) : undefined,
        speaker: s.speaker ? String(s.speaker).slice(0, 30) : undefined,
        color: (["blue", "yellow", "purple", "red", "green", "neutral"].includes(s.color as string)
          ? s.color
          : "neutral") as Slide["color"],
      })),
  }
}

export function generateMockSlideData(whiteboardHtml: string, theme: string): SlideData {
  const text = stripHtml(whiteboardHtml)
  const titleMatch = whiteboardHtml.match(/font-size:\s*1\.3em[^"]*"[^>]*>\s*([^<]+)/)
  const mainTitle = (titleMatch?.[1] || theme).replace(/[🏭🔩🔧🔬🔍💴💻🗣📎🔗]/g, "").trim()

  const cards = extractCards(whiteboardHtml)
  const flowSteps = extractFlowSteps(whiteboardHtml)
  const agreements = extractAgreements(whiteboardHtml, text)

  const colors: Slide["color"][] = ["blue", "yellow", "purple", "red", "green"]
  const slides: Slide[] = []

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

  // wb-decision ブロックの <strong> を拾う（合意・方針セクション）
  const decisionRegex = /<div class="wb-decision"[^>]*>([\s\S]*?)<\/div>/g
  let m
  while ((m = decisionRegex.exec(html)) !== null) {
    const strongMatch = m[1].match(/<strong>([\s\S]*?)<\/strong>/)
    if (strongMatch) {
      const cleaned = cleanText(strongMatch[1])
      if (cleaned.length > 0 && cleaned.length < 80) structured.push(cleaned)
    }
  }

  // アクション項目セクションの wb-tag（担当者）＋内容を拾う
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

  // フォールバック: 短い合意・決定文を拾う
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

function renderSlideHtml(data: SlideData): string {
  const slidesHtml = data.slides.map((s, i) => renderSlide(s, i, data.slides.length)).join("\n")
  const escapedTitle = escapeHtml(data.title)
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapedTitle} — スライド</title>
<style>
  :root {
    --bg: #f5f0e8;
    --ink: #2c3e50;
    --muted: #666;
    --blue: #3498db;
    --yellow: #e6a817;
    --purple: #8e44ad;
    --red: #c0392b;
    --green: #27ae60;
    --neutral: #7f8c8d;
  }
  * { box-sizing: border-box; }
  html, body {
    margin: 0;
    padding: 0;
    font-family: 'Noto Sans JP', -apple-system, BlinkMacSystemFont, sans-serif;
    background: #1a1a1a;
    color: var(--ink);
    overflow: hidden;
  }
  body {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 100vh;
  }
  .deck {
    width: 100vw;
    height: 100vh;
    position: relative;
  }
  .slide {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    width: min(90vw, 1280px);
    aspect-ratio: 16 / 9;
    background: var(--bg);
    border-radius: 16px;
    box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5);
    padding: 56px 72px;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.45s ease;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }
  .slide.active {
    opacity: 1;
    pointer-events: auto;
  }
  .slide.active .reveal {
    animation: fadeUp 0.6s ease both;
  }
  .slide.active .reveal-1 { animation-delay: 0.15s; }
  .slide.active .reveal-2 { animation-delay: 0.30s; }
  .slide.active .reveal-3 { animation-delay: 0.45s; }
  .slide.active .reveal-4 { animation-delay: 0.60s; }
  .slide.active .reveal-5 { animation-delay: 0.75s; }
  .slide.active .reveal-6 { animation-delay: 0.90s; }
  .slide.active .reveal-7 { animation-delay: 1.05s; }
  @keyframes fadeUp {
    from { opacity: 0; transform: translateY(16px); }
    to   { opacity: 1; transform: translateY(0); }
  }
  .badge {
    display: inline-block;
    padding: 4px 14px;
    border-radius: 999px;
    font-size: 0.78em;
    font-weight: 600;
    color: #fff;
    margin-bottom: 18px;
  }
  .badge-blue    { background: var(--blue); }
  .badge-yellow  { background: var(--yellow); }
  .badge-purple  { background: var(--purple); }
  .badge-red     { background: var(--red); }
  .badge-green   { background: var(--green); }
  .badge-neutral { background: var(--neutral); }
  .heading {
    font-size: 2.2em;
    font-weight: 700;
    color: var(--ink);
    margin: 0 0 12px 0;
    line-height: 1.3;
  }
  .subheading {
    font-size: 1.05em;
    color: var(--muted);
    margin: 0 0 28px 0;
    line-height: 1.5;
  }
  .bullets {
    list-style: none;
    padding: 0;
    margin: 0;
    flex: 1;
  }
  .bullets li {
    font-size: 1.15em;
    line-height: 1.6;
    color: #333;
    padding: 10px 0 10px 32px;
    position: relative;
    border-bottom: 1px dashed #d9cfc0;
  }
  .bullets li:last-child { border-bottom: none; }
  .bullets li::before {
    content: "";
    position: absolute;
    left: 8px;
    top: 20px;
    width: 10px;
    height: 10px;
    border-radius: 50%;
    background: var(--ink);
  }
  .slide.color-blue    .bullets li::before { background: var(--blue); }
  .slide.color-yellow  .bullets li::before { background: var(--yellow); }
  .slide.color-purple  .bullets li::before { background: var(--purple); }
  .slide.color-red     .bullets li::before { background: var(--red); }
  .slide.color-green   .bullets li::before { background: var(--green); }
  .slide.title-slide {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: #fff;
    align-items: center;
    justify-content: center;
    text-align: center;
  }
  .slide.title-slide .heading {
    color: #fff;
    font-size: 3em;
    margin-bottom: 20px;
  }
  .slide.title-slide .subheading {
    color: #ecf0f1;
    font-size: 1.25em;
    max-width: 80%;
  }
  .slide.summary-slide {
    background: linear-gradient(135deg, #eaf9f0 0%, #f5f0e8 100%);
  }
  .slide.flow-slide .bullets {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
    gap: 12px;
  }
  .slide.flow-slide .bullets li {
    border: 1px solid #d9cfc0;
    border-radius: 8px;
    padding: 14px 14px 14px 42px;
    background: #fff;
  }
  .speaker {
    font-size: 0.9em;
    color: var(--muted);
    margin-bottom: 8px;
  }
  .controls {
    position: fixed;
    bottom: 24px;
    left: 50%;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 14px;
    background: rgba(255, 255, 255, 0.9);
    backdrop-filter: blur(6px);
    padding: 10px 18px;
    border-radius: 999px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
    z-index: 10;
  }
  .ctrl-btn {
    background: var(--ink);
    color: #fff;
    border: none;
    width: 36px;
    height: 36px;
    border-radius: 50%;
    font-size: 1em;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .ctrl-btn:hover { background: #34495e; }
  .ctrl-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .counter {
    font-size: 0.9em;
    color: var(--muted);
    font-weight: 600;
    min-width: 50px;
    text-align: center;
  }
  .progress {
    position: fixed;
    top: 0;
    left: 0;
    height: 4px;
    background: var(--blue);
    transition: width 0.4s ease;
    z-index: 20;
  }
  @media print {
    body { background: #fff; }
    .controls, .progress { display: none; }
    .deck { height: auto; }
    .slide {
      position: static;
      transform: none;
      opacity: 1 !important;
      pointer-events: auto;
      page-break-after: always;
      box-shadow: none;
      margin: 0 auto 16px;
    }
  }
</style>
</head>
<body>
<div class="progress" id="progress"></div>
<div class="deck">
${slidesHtml}
</div>
<div class="controls">
  <button class="ctrl-btn" id="prev" aria-label="前へ">‹</button>
  <div class="counter" id="counter">1 / ${data.slides.length}</div>
  <button class="ctrl-btn" id="next" aria-label="次へ">›</button>
</div>
<script>
  (function(){
    const slides = document.querySelectorAll('.slide');
    const counter = document.getElementById('counter');
    const progress = document.getElementById('progress');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');
    let current = 0;
    function render() {
      slides.forEach((el, i) => el.classList.toggle('active', i === current));
      counter.textContent = (current + 1) + ' / ' + slides.length;
      progress.style.width = ((current + 1) / slides.length * 100) + '%';
      prevBtn.disabled = current === 0;
      nextBtn.disabled = current === slides.length - 1;
    }
    function go(delta) {
      const next = Math.max(0, Math.min(slides.length - 1, current + delta));
      if (next !== current) { current = next; render(); }
    }
    prevBtn.addEventListener('click', () => go(-1));
    nextBtn.addEventListener('click', () => go(1));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'PageDown') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); go(-1); }
      else if (e.key === 'Home') { current = 0; render(); }
      else if (e.key === 'End') { current = slides.length - 1; render(); }
    });
    render();
  })();
</script>
</body>
</html>`
}

function renderSlide(slide: Slide, index: number, total: number): string {
  const activeClass = index === 0 ? "active" : ""
  const colorClass = slide.color ? `color-${slide.color}` : ""
  const typeClass = `${slide.type}-slide`
  const classes = ["slide", activeClass, colorClass, typeClass].filter(Boolean).join(" ")

  const bulletsHtml = slide.bullets && slide.bullets.length > 0
    ? `<ul class="bullets">${slide.bullets
        .map((b, i) => `<li class="reveal reveal-${Math.min(i + 2, 7)}">${escapeHtml(b)}</li>`)
        .join("")}</ul>`
    : ""

  if (slide.type === "title") {
    return `<section class="${classes}" data-index="${index}">
  <h1 class="heading reveal reveal-1">${escapeHtml(slide.heading)}</h1>
  ${slide.subheading ? `<p class="subheading reveal reveal-2">${escapeHtml(slide.subheading)}</p>` : ""}
</section>`
  }

  const badge = slide.speaker
    ? `<span class="badge badge-${slide.color || "neutral"} reveal reveal-1">${escapeHtml(slide.speaker)}</span>`
    : slide.type === "summary"
      ? `<span class="badge badge-green reveal reveal-1">まとめ</span>`
      : slide.type === "flow"
        ? `<span class="badge badge-neutral reveal reveal-1">構造</span>`
        : ""

  return `<section class="${classes}" data-index="${index}">
  ${badge}
  <h2 class="heading reveal reveal-${badge ? 2 : 1}">${escapeHtml(slide.heading)}</h2>
  ${slide.subheading ? `<p class="subheading reveal reveal-${badge ? 3 : 2}">${escapeHtml(slide.subheading)}</p>` : ""}
  ${bulletsHtml}
</section>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}
