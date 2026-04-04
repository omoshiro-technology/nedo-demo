"use client"

import { useEffect, useRef, useState } from "react"

interface MermaidDiagramProps {
  chart: string
}

export function MermaidDiagram({ chart }: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [svg, setSvg] = useState<string>("")
  const [error, setError] = useState<string>("")

  useEffect(() => {
    let cancelled = false

    async function render() {
      try {
        const mermaid = (await import("mermaid")).default
        mermaid.initialize({
          startOnLoad: false,
          theme: "neutral",
          securityLevel: "loose",
          flowchart: { useMaxWidth: true, htmlLabels: true },
        })

        const id = `mermaid-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
        const { svg: rendered } = await mermaid.render(id, chart.trim())
        if (!cancelled) {
          setSvg(rendered)
          setError("")
        }
      } catch (e: any) {
        if (!cancelled) {
          setError(e.message || "Mermaid rendering failed")
          setSvg("")
        }
      }
    }

    render()
    return () => { cancelled = true }
  }, [chart])

  if (error) {
    return (
      <pre className="my-2 p-3 bg-gray-100 border border-gray-300 rounded text-xs text-gray-600 overflow-x-auto">
        <code>{chart}</code>
      </pre>
    )
  }

  if (!svg) {
    return (
      <div className="my-2 p-4 bg-gray-50 border border-gray-200 rounded text-center text-sm text-gray-400">
        図を描画中...
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-2 p-3 bg-white border border-gray-200 rounded-lg overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  )
}
