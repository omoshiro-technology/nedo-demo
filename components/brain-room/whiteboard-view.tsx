"use client"

import { useEffect, useRef, useCallback } from "react"
import type { KnowledgeFile } from "@/lib/brain-room/types"

interface WhiteboardViewProps {
  html: string
  knowledgeFiles: KnowledgeFile[]
}

export function WhiteboardView({ html, knowledgeFiles }: WhiteboardViewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  const findKnowledge = useCallback((id: string) => {
    for (const file of knowledgeFiles) {
      const item = file.items.find((i) => i.id === id)
      if (item) return item
    }
    return null
  }, [knowledgeFiles])

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    // Set innerHTML first
    container.innerHTML = html

    // Walk all text nodes and replace [UUID:xxx] with hoverable badges
    const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT)
    const pattern = /\[UUID:([a-zA-Z0-9-]+)\]/g
    const nodesToReplace: { node: Text; matches: { index: number; id: string; full: string }[] }[] = []

    let textNode: Text | null
    while ((textNode = walker.nextNode() as Text | null)) {
      const text = textNode.textContent || ""
      const matches: { index: number; id: string; full: string }[] = []
      let match
      pattern.lastIndex = 0
      while ((match = pattern.exec(text)) !== null) {
        matches.push({ index: match.index, id: match[1], full: match[0] })
      }
      if (matches.length > 0) {
        nodesToReplace.push({ node: textNode, matches })
      }
    }

    for (const { node, matches } of nodesToReplace) {
      const text = node.textContent || ""
      const fragment = document.createDocumentFragment()
      let lastIndex = 0

      for (const m of matches) {
        // Text before match
        if (m.index > lastIndex) {
          fragment.appendChild(document.createTextNode(text.slice(lastIndex, m.index)))
        }

        // Create hoverable badge
        const knowledge = findKnowledge(m.id)
        const badge = document.createElement("span")
        badge.className = "wb-ref-badge"
        badge.textContent = knowledge ? `📖 ${knowledge.title}` : m.id
        badge.setAttribute("data-ref-id", m.id)

        if (knowledge) {
          const tooltip = document.createElement("div")
          tooltip.className = "wb-ref-tooltip"
          tooltip.innerHTML = `
            <div style="font-weight:600;margin-bottom:4px;">${knowledge.title}</div>
            ${knowledge.category ? `<div style="font-size:0.7rem;color:#6b7280;margin-bottom:4px;">${knowledge.category}</div>` : ""}
            <div style="font-size:0.8rem;">${knowledge.summary || knowledge.content.slice(0, 150) + "..."}</div>
            ${knowledge.keywords?.length ? `<div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:3px;">${knowledge.keywords.slice(0, 4).map((k) => `<span style="font-size:0.65rem;background:#dbeafe;color:#1e40af;padding:1px 6px;border-radius:9999px;">${k}</span>`).join("")}</div>` : ""}
          `
          badge.appendChild(tooltip)
        }

        fragment.appendChild(badge)
        lastIndex = m.index + m.full.length
      }

      // Remaining text
      if (lastIndex < text.length) {
        fragment.appendChild(document.createTextNode(text.slice(lastIndex)))
      }

      node.parentNode?.replaceChild(fragment, node)
    }
  }, [html, findKnowledge])

  return (
    <div
      ref={containerRef}
      className="whiteboard-container bg-gradient-to-br from-gray-50 to-blue-50 rounded-lg border p-6 overflow-auto max-h-[70vh]"
    />
  )
}
