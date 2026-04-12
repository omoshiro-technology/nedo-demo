"use client"

import { Bot, FileText } from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { MessageTag } from "@/components/brain-room/message-tag"
import type { Character, Message, KnowledgeFile, KnowledgeItem } from "@/lib/brain-room/types"

interface AgentMessageModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  message: Message | null
  character: Character | null
  knowledgeFiles: KnowledgeFile[]
}

function stripUuidRefs(text: string): string {
  return text.replace(/\[UUID:[a-zA-Z0-9-]+\]/gi, "").trim()
}

export function AgentMessageModal({
  open,
  onOpenChange,
  message,
  character,
  knowledgeFiles,
}: AgentMessageModalProps) {
  if (!message || !character) return null

  const subtitle = character.department || character.personality.split("。")[0]
  const cleanText = stripUuidRefs(message.text)

  // 参照ナレッジを取得
  const referencedKnowledge: Array<{ item: KnowledgeItem; fileName: string }> = []
  if (message.usedKnowledgeIds) {
    for (const id of message.usedKnowledgeIds) {
      for (const file of knowledgeFiles) {
        const item = file.items.find(k => k.id === id)
        if (item) {
          referencedKnowledge.push({ item, fileName: file.name })
          break
        }
      }
    }
  }
  // テキスト内の[UUID:xxx]からも取得
  const uuidMatches = message.text.matchAll(/\[UUID:([a-zA-Z0-9-]+)\]/gi)
  const inlineIds = new Set(message.usedKnowledgeIds || [])
  for (const match of uuidMatches) {
    if (!inlineIds.has(match[1])) {
      inlineIds.add(match[1])
      for (const file of knowledgeFiles) {
        const item = file.items.find(k => k.id === match[1])
        if (item) {
          referencedKnowledge.push({ item, fileName: file.name })
          break
        }
      }
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-gray-200">
              <Bot className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <div className="text-lg font-bold">{character.name}</div>
              <div className="text-sm font-normal text-gray-500">{subtitle}</div>
            </div>
            {message.tag && (
              <div className="ml-auto">
                <MessageTag tag={message.tag} />
              </div>
            )}
          </DialogTitle>
        </DialogHeader>

        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 pr-2">
            {/* 発言内容 */}
            <div>
              <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">発言内容</h4>
              <p className="text-base text-gray-800 whitespace-pre-wrap leading-relaxed">
                {cleanText}
              </p>
            </div>

            {/* 参照ナレッジ */}
            {referencedKnowledge.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-gray-500 uppercase mb-2">
                  参照ナレッジ ({referencedKnowledge.length})
                </h4>
                <div className="space-y-2">
                  {referencedKnowledge.map(({ item, fileName }) => (
                    <div key={item.id} className="p-3 border rounded-lg bg-gray-50">
                      <div className="flex items-start gap-2 mb-1">
                        <FileText className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-base font-medium text-gray-800 truncate">{item.title}</p>
                          <p className="text-sm text-gray-500">{fileName}</p>
                        </div>
                      </div>
                      {item.summary && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.summary}</p>
                      )}
                      {item.keywords && item.keywords.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {item.keywords.slice(0, 5).map((kw, i) => (
                            <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded">
                              {kw}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
