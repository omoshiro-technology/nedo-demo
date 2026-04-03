"use client"
import { useState } from "react"
import type { Character, Message, SummaryNode } from "@/lib/brain-room/types"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ChevronDown, ChevronRight, MessageSquare, Users, FileText, ExternalLink } from "lucide-react"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { MarkdownModal } from "@/components/brain-room/markdown-modal"

interface NodeListViewProps {
  nodes: Record<string, SummaryNode>
  messages: Message[]
  characters: Character[]
  theme: string
  onJumpToMessage: (messageIndex: number) => void
}

interface NodeItemProps {
  node: SummaryNode
  level: number
  nodes: Record<string, SummaryNode>
  messages: Message[]
  characters: Character[]
  theme: string
  onJumpToMessage: (messageIndex: number) => void
  onShowReport: (node: SummaryNode) => void
}

function NodeItem({ node, level, nodes, messages, characters, theme, onJumpToMessage, onShowReport }: NodeItemProps) {
  const [isOpen, setIsOpen] = useState(level < 2) // レベル2未満は初期状態で開く

  const hasChildren = node.children && node.children.length > 0
  const relatedMessages = node.relatedMessages.map((index) => messages[index]).filter(Boolean)
  const participatingCharacters = Array.from(new Set(relatedMessages.map((msg) => msg.characterName)))

  const getIndentColor = (level: number) => {
    const colors = [
      "border-blue-500",
      "border-green-500",
      "border-yellow-500",
      "border-red-500",
      "border-purple-500",
      "border-pink-500",
    ]
    return colors[level % colors.length]
  }

  return (
    <div className={`${level > 0 ? `ml-${Math.min(level * 4, 16)} border-l-2 ${getIndentColor(level)} pl-4` : ""}`}>
      <div className="mb-2">
        <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
          {hasChildren && (
            <Collapsible open={isOpen} onOpenChange={setIsOpen}>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="sm" className="p-0 h-auto">
                  {isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </Button>
              </CollapsibleTrigger>
            </Collapsible>
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h4 className={`font-semibold ${level === 0 ? "text-lg" : level === 1 ? "text-base" : "text-sm"}`}>
                {node.label}
              </h4>
              <Badge variant="outline" className="text-xs">
                L{level}
              </Badge>
            </div>

            <div className="flex items-center gap-4 text-xs text-gray-600">
              <div className="flex items-center gap-1">
                <MessageSquare className="h-3 w-3" />
                <span>{relatedMessages.length} 件の発言</span>
              </div>

              {hasChildren && (
                <div className="flex items-center gap-1">
                  <FileText className="h-3 w-3" />
                  <span>{node.children.length} 個のサブトピック</span>
                </div>
              )}

              <div className="flex items-center gap-1">
                <Users className="h-3 w-3" />
                <span>{participatingCharacters.length} 人参加</span>
              </div>
            </div>

            {node.summary && level > 0 && <p className="text-sm text-gray-700 mt-2 line-clamp-2">{node.summary}</p>}
          </div>

          {level > 0 && (
            <Button size="sm" variant="outline" onClick={() => onShowReport(node)} className="ml-2">
              詳細レポート
            </Button>
          )}
        </div>

        {/* 関連する発言のプレビュー */}
        {node.relatedMessages.length > 0 && (
          <div className="mt-2 ml-6">
            <div className="text-xs text-gray-500 mb-1">関連する発言:</div>
            <div className="space-y-1">
              {node.relatedMessages.slice(0, 3).map((messageIndex, index) => {
                const message = messages[messageIndex]
                if (!message) return null
                return (
                  <div
                    key={index}
                    className="text-xs p-2 bg-white border rounded cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => onJumpToMessage(messageIndex)}
                  >
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="secondary" className="text-xs">
                        {message.characterName}
                      </Badge>
                      <ExternalLink className="h-3 w-3 text-gray-400" />
                    </div>
                    <p className="text-gray-700 line-clamp-2">{message.text}</p>
                  </div>
                )
              })}
              {relatedMessages.length > 3 && (
                <div className="text-xs text-gray-500 text-center py-1">
                  他 {relatedMessages.length - 3} 件の発言...
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 子ノード */}
      {hasChildren && (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
          <CollapsibleContent className="space-y-2">
            {node.children.map((childId) => {
              const childNode = nodes[childId]
              if (!childNode) return null

              return (
                <NodeItem
                  key={childId}
                  node={childNode}
                  level={level + 1}
                  nodes={nodes}
                  messages={messages}
                  characters={characters}
                  theme={theme}
                  onJumpToMessage={onJumpToMessage}
                  onShowReport={onShowReport}
                />
              )
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  )
}

export function NodeListView({ nodes, messages, characters, theme, onJumpToMessage }: NodeListViewProps) {
  const [selectedNode, setSelectedNode] = useState<SummaryNode | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [topicReport, setTopicReport] = useState<string>("")
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)

  const rootNode = nodes["root"]
  if (!rootNode) return <div>データがありません</div>

  const handleShowReport = async (node: SummaryNode) => {
    setSelectedNode(node)
    setIsModalOpen(true)
    setIsGeneratingReport(true)
    setTopicReport("")

    try {
      const relatedMessages = node.relatedMessages.map((index) => messages[index]).filter(Boolean)

      const response = await fetch("/api/generate-topic-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: node.label,
          theme,
          messages: relatedMessages,
          characters,
          allMessages: messages,
          summaryNodes: nodes,
        }),
      })

      if (response.ok) {
        const { report } = await response.json()
        setTopicReport(report)
      } else {
        throw new Error("Failed to generate report")
      }
    } catch (error) {
      console.error("Failed to generate topic report:", error)
      setTopicReport("レポートの生成に失敗しました。")
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const totalNodes = Object.keys(nodes).length
  const maxLevel = Math.max(
    ...Object.values(nodes).map((node) => {
      let level = 0
      let current = node
      while (current && nodes[current.id] && nodes[current.id].children?.length > 0) {
        level++
        const firstChild = nodes[current.id].children[0]
        current = firstChild ? nodes[firstChild] : null
        if (level > 10) break // 無限ループ防止
      }
      return level
    }),
  )

  return (
    <div className="h-full flex flex-col">
      {/* 統計情報 */}
      <div className="mb-4 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-blue-900">会議構造の概要</h3>
            <p className="text-sm text-blue-700">
              総ノード数: {totalNodes} | 最大階層: {maxLevel} | メッセージ数: {messages.length}
            </p>
          </div>
          <div className="text-right">
            <div className="text-sm text-blue-700">参加キャラクター</div>
            <div className="flex gap-1 mt-1">
              {characters.map((char) => (
                <Badge key={char.id} variant="secondary" className="text-xs">
                  {char.name}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ノードリスト */}
      <ScrollArea className="flex-1">
        <div className="space-y-4">
          <NodeItem
            node={rootNode}
            level={0}
            nodes={nodes}
            messages={messages}
            characters={characters}
            theme={theme}
            onJumpToMessage={onJumpToMessage}
            onShowReport={handleShowReport}
          />
        </div>
      </ScrollArea>

      {/* Markdownモーダル */}
      <MarkdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedNode ? `トピック詳細レポート: ${selectedNode.label}` : ""}
        content={topicReport}
        isLoading={isGeneratingReport}
        node={selectedNode}
        theme={theme}
        messages={messages}
      />
    </div>
  )
}
