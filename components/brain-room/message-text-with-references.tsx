"use client"

import { useState } from "react"
import { FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MermaidDiagram } from "@/components/brain-room/mermaid-diagram"
import type { KnowledgeFile, KnowledgeItem } from "@/lib/brain-room/types"

interface MessageTextWithReferencesProps {
  text: string
  knowledgeFiles: KnowledgeFile[]
}

export function MessageTextWithReferences({ text, knowledgeFiles }: MessageTextWithReferencesProps) {
  const [selectedKnowledgeId, setSelectedKnowledgeId] = useState<string | null>(null)
  const [showModal, setShowModal] = useState(false)

  // ナレッジIDパターン: 標準UUID (e5d140ac-...) と短縮ID (cs-003, fm-001等) の両方に対応
  const uuidPattern = /\[UUID:([a-zA-Z0-9-]+)\]/gi

  const findKnowledgeItem = (knowledgeId: string): { item: KnowledgeItem; fileName: string } | null => {
    for (const file of knowledgeFiles) {
      const item = file.items.find(item => item.id === knowledgeId)
      if (item) return { item, fileName: file.name }
    }
    return null
  }

  const handleKnowledgeClick = (knowledgeId: string) => {
    setSelectedKnowledgeId(knowledgeId)
    setShowModal(true)
  }

  const selectedKnowledge = selectedKnowledgeId ? findKnowledgeItem(selectedKnowledgeId) : null

  // テキストパート内のUUID参照をインラインアイコンに変換
  const renderTextPartWithRefs = (textPart: string, keyPrefix: string, refCounter: { value: number }) => {
    const parts: React.ReactNode[] = []
    let lastIndex = 0
    let match

    const localPattern = /\[UUID:([a-zA-Z0-9-]+)\]/gi
    while ((match = localPattern.exec(textPart)) !== null) {
      if (match.index > lastIndex) {
        parts.push(<span key={`${keyPrefix}-t-${lastIndex}`}>{textPart.slice(lastIndex, match.index)}</span>)
      }

      const knowledgeId = match[1]
      refCounter.value++
      parts.push(
        <button
          key={`${keyPrefix}-ref-${knowledgeId}`}
          onClick={() => handleKnowledgeClick(knowledgeId)}
          className="inline-flex items-center justify-center w-5 h-5 mx-1 text-xs font-semibold text-blue-700 bg-blue-100 border border-blue-300 rounded-full hover:bg-blue-200 hover:border-blue-400 transition-colors cursor-pointer"
          title={`知識を参照: ${knowledgeId}`}
        >
          {refCounter.value}
        </button>
      )

      lastIndex = match.index + match[0].length
    }

    if (lastIndex < textPart.length) {
      parts.push(<span key={`${keyPrefix}-t-${lastIndex}`}>{textPart.slice(lastIndex)}</span>)
    }

    return parts
  }

  // テキストをMermaidブロックとテキストパートに分割してレンダリング
  const renderContent = () => {
    const mermaidPattern = /```mermaid\n([\s\S]*?)```/g
    const segments: React.ReactNode[] = []
    let lastIndex = 0
    let match
    const refCounter = { value: 0 }

    while ((match = mermaidPattern.exec(text)) !== null) {
      // Mermaidブロック前のテキスト
      if (match.index > lastIndex) {
        const textBefore = text.slice(lastIndex, match.index)
        segments.push(
          <span key={`seg-${lastIndex}`} className="text-gray-700 whitespace-pre-wrap">
            {renderTextPartWithRefs(textBefore, `s${lastIndex}`, refCounter)}
          </span>
        )
      }

      // Mermaidダイアグラム
      segments.push(<MermaidDiagram key={`mermaid-${match.index}`} chart={match[1]} />)

      lastIndex = match.index + match[0].length
    }

    // 残りのテキスト
    if (lastIndex < text.length) {
      const remaining = text.slice(lastIndex)
      segments.push(
        <span key={`seg-${lastIndex}`} className="text-gray-700 whitespace-pre-wrap">
          {renderTextPartWithRefs(remaining, `s${lastIndex}`, refCounter)}
        </span>
      )
    }

    return segments
  }

  return (
    <>
      <div>{renderContent()}</div>

      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              知識の詳細
            </DialogTitle>
          </DialogHeader>
          
          {selectedKnowledge && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                <div className="border-l-4 border-blue-500 pl-4">
                  <h3 className="font-semibold text-lg">{selectedKnowledge.item.title}</h3>
                  <p className="text-sm text-gray-600 mb-2">
                    出典: {selectedKnowledge.fileName}
                  </p>
                  {selectedKnowledge.item.category && (
                    <span className="inline-block px-2 py-1 text-xs bg-gray-100 text-gray-700 rounded-md mb-2">
                      {selectedKnowledge.item.category}
                    </span>
                  )}
                  {selectedKnowledge.item.summary && (
                    <div className="mb-3">
                      <h4 className="font-medium text-sm text-gray-700 mb-1">要約</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {selectedKnowledge.item.summary}
                      </p>
                    </div>
                  )}
                </div>
                
                <div>
                  <h4 className="font-medium text-sm text-gray-700 mb-2">本文</h4>
                  <div className="text-sm text-gray-800 whitespace-pre-wrap bg-gray-50 p-3 rounded border">
                    {selectedKnowledge.item.content}
                  </div>
                </div>

                {selectedKnowledge.item.keywords && selectedKnowledge.item.keywords.length > 0 && (
                  <div>
                    <h4 className="font-medium text-sm text-gray-700 mb-2">キーワード</h4>
                    <div className="flex flex-wrap gap-1">
                      {selectedKnowledge.item.keywords.map((keyword, index) => (
                        <span
                          key={index}
                          className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded-md"
                        >
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-xs text-gray-500 pt-2 border-t">
                  <p>作成日: {new Date(selectedKnowledge.item.createdAt).toLocaleDateString('ja-JP')}</p>
                  {selectedKnowledge.item.updatedAt && (
                    <p>更新日: {new Date(selectedKnowledge.item.updatedAt).toLocaleDateString('ja-JP')}</p>
                  )}
                </div>
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}