"use client"

import { CardFooter } from "@/components/ui/card"
import { useState, useRef, useCallback } from "react"
import type { Character, Message, SummaryNode, CharacterSet, TopicData, KnowledgeFile } from "@/lib/brain-room/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { useToast } from "@/components/ui/use-toast"
import { Bot, Sparkles, FileText, Settings, Users, FileOutput, Square, Target, Brain, Info } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { MindMapView } from "@/components/brain-room/mindmap-view"
import { NodeListView } from "@/components/brain-room/node-list-view"
import { MessageTag } from "@/components/brain-room/message-tag"
import { ArchipelagoView } from "@/components/brain-room/archipelago-view"
import { MessageTextWithReferences } from "@/components/brain-room/message-text-with-references"

interface DiscussionInterfaceProps {
  characters: Character[]
  onResetConfig: () => void
  characterSets: CharacterSet[]
  onLoadCharacterSet: (setId: string) => void
  knowledgeFiles: KnowledgeFile[]
}

export function DiscussionInterface({
  characters,
  onResetConfig,
  characterSets,
  onLoadCharacterSet,
  knowledgeFiles,
}: DiscussionInterfaceProps) {
  const [theme, setTheme] = useState("")
  const [purpose, setPurpose] = useState("")
  const [messages, setMessages] = useState<Message[]>([])
  const [summaryNodes, setSummaryNodes] = useState<Record<string, SummaryNode>>({})
  const [status, setStatus] = useState<"idle" | "running" | "finished">("idle")
  const [selectedSetId, setSelectedSetId] = useState<string>("")
  const [activeTab, setActiveTab] = useState("chat")
  const [highlightedMessageIndex, setHighlightedMessageIndex] = useState<number | null>(null)
  const [archipelagoTopics, setArchipelagoTopics] = useState<TopicData[]>([])
  const [isArchipelagoLoading, setIsArchipelagoLoading] = useState(false)
  const [archipelagoError, setArchipelagoError] = useState<string | null>(null)
  const [selectedKnowledgeItems, setSelectedKnowledgeItems] = useState<Set<string>>(new Set())
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)

  // Archipelago View State
  const { toast } = useToast()
  const abortControllerRef = useRef<AbortController | null>(null)
  const chatScrollRef = useRef<HTMLDivElement>(null)

  // Knowledge関連のヘルパー関数
  const findKnowledgeItemById = useCallback((id: string) => {
    for (const file of knowledgeFiles) {
      const item = file.items.find(item => item.id === id)
      if (item) return { item, fileName: file.name }
    }
    return null
  }, [knowledgeFiles])

  const handleKnowledgeClick = useCallback((knowledgeIds: string[]) => {
    setSelectedKnowledgeItems(new Set(knowledgeIds))
    setShowKnowledgeModal(true)
  }, [])

  const stopConference = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setStatus("finished")
    console.log("Conference manually stopped by user")
    toast({
      title: "会議停止",
      description: "会議を手動で停止しました。",
    })
  }

  const startConference = async () => {
    if (!theme) {
      toast({ title: "エラー", description: "会議のテーマを入力してください。", variant: "destructive" })
      return
    }

    console.log("=== Starting Conference ===")
    console.log("Theme:", theme)
    console.log("Purpose:", purpose)
    console.log("Characters:", characters.length)

    setStatus("running")
    setMessages([])

    const rootNodeId = "root"
    const initialSummaryNodes: Record<string, SummaryNode> = {
      [rootNodeId]: {
        id: rootNodeId,
        label: `テーマ: ${theme}`,
        children: [],
        relatedMessages: [],
        summary: `会議のメインテーマ: ${theme}${purpose ? `\n目的: ${purpose}` : ""}`,
      },
    }
    setSummaryNodes(initialSummaryNodes)

    abortControllerRef.current = new AbortController()

    try {
      console.log("Sending request to /api/conference-network")
      const response = await fetch("/api/conference-network", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, purpose, characters, knowledgeFiles }),
        signal: abortControllerRef.current.signal,
      })

      console.log("Response status:", response.status)
      console.log("Response headers:", Object.fromEntries(response.headers.entries()))

      if (!response.ok) {
        const errorText = await response.text()
        console.error("API Error Response:", errorText)
        throw new Error(`API error: ${response.status} ${response.statusText}`)
      }

      if (!response.body) {
        throw new Error("No response body received")
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      console.log("Starting to read stream...")

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          console.log("Stream reading completed")
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")

        buffer = lines.pop() || ""

        for (const line of lines) {
          if (line.trim() === "") continue

          // ハートビートの処理（ログのみ）
          if (line.startsWith(": heartbeat")) {
            console.log("Heartbeat received at", new Date().toISOString())
            continue
          }

          if (line.startsWith("data: ")) {
            const dataString = line.slice(6)
            try {
              const event = JSON.parse(dataString)
              console.log("Received event:", event.type)

              if (event.type === "message") {
                const newMessage = event.data
                setMessages((prev) => {
                  const updated = [...prev, newMessage]
                  return updated
                })
              } else if (event.type === "summary_update") {
                const { parentId, nodeId, label, relatedMessageIndices } = event.data
                setSummaryNodes((prev) => {
                  const newNodes = { ...prev }
                  if (!newNodes[nodeId]) {
                    newNodes[nodeId] = {
                      id: nodeId,
                      label,
                      children: [],
                      relatedMessages: relatedMessageIndices || [],
                      summary: `${label}に関する議論`,
                    }
                  }
                  if (parentId && newNodes[parentId] && !newNodes[parentId].children.includes(nodeId)) {
                    newNodes[parentId] = {
                      ...newNodes[parentId],
                      children: [...newNodes[parentId].children, nodeId],
                    }
                  }
                  return newNodes
                })
              } else if (event.type === "node_update") {
                const { nodeId, relatedMessageIndices } = event.data
                setSummaryNodes((prev) => {
                  const newNodes = { ...prev }
                  if (newNodes[nodeId]) {
                    newNodes[nodeId] = {
                      ...newNodes[nodeId],
                      relatedMessages: relatedMessageIndices || [],
                    }
                  }
                  return newNodes
                })
              } else if (event.type === "end") {
                console.log("Conference ended:", event.data.reason)
                setStatus("finished")
                generateTopicSummaries()
                toast({
                  title: "会議完了",
                  description: event.data.reason,
                  duration: 5000,
                })
                reader.cancel()
                return
              } else if (event.type === "error") {
                console.error("Stream error:", event.data)
                toast({
                  title: "会議エラー",
                  description: "会議中に問題が発生しましたが、続行します。",
                  variant: "destructive",
                })
              }
            } catch (e) {
              console.error("Error parsing JSON:", e, "Data string:", dataString)
            }
          }
        }
      }
    } catch (error: any) {
      console.error("Conference error:", error)
      if (error.name !== "AbortError") {
        toast({
          title: "会議エラー",
          description: `会議中にエラーが発生しました: ${error.message}`,
          variant: "destructive",
        })
        setStatus("idle")
      } else {
        console.log("Conference was aborted by user")
        setStatus("finished")
      }
    } finally {
      if (status === "running") {
        setStatus("finished")
        generateTopicSummaries()
      }
    }
  }

  const generateTopicSummaries = async () => {
    // 各トピックノードに対してサマリーを生成
    setSummaryNodes((prevNodes) => {
      const updatedNodes = { ...prevNodes }

      Object.keys(updatedNodes).forEach(async (nodeId) => {
        const node = updatedNodes[nodeId]
        if (nodeId !== "root" && node.relatedMessages.length > 0) {
          try {
            const relatedMessages = node.relatedMessages.map((index) => messages[index]).filter(Boolean)
            const response = await fetch("/api/generate-topic-summary", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                topic: node.label,
                messages: relatedMessages,
                characters,
              }),
            })

            if (response.ok) {
              const { summary } = await response.json()
              setSummaryNodes((prev) => ({
                ...prev,
                [nodeId]: {
                  ...prev[nodeId],
                  summary: summary,
                },
              }))
            }
          } catch (error) {
            console.error("Failed to generate summary for", nodeId, error)
          }
        }
      })

      return updatedNodes
    })
  }

  const handleGenerateArchipelagoMap = useCallback(async () => {
    setIsArchipelagoLoading(true)
    setArchipelagoError(null)
    setArchipelagoTopics([])

    try {
      const response = await fetch("/api/analyze-discussion-for-map", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme, purpose, messages }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to generate map data")
      }

      const data = await response.json()
      setArchipelagoTopics(data.topics)
      toast({
        title: "成功",
        description: "群島マップが生成されました。",
      })
    } catch (err: any) {
      setArchipelagoError(err.message)
      toast({
        title: "エラー",
        description: `マップ生成に失敗しました: ${err.message}`,
        variant: "destructive",
      })
    } finally {
      setIsArchipelagoLoading(false)
    }
  }, [theme, purpose, messages, toast])

  const handleJumpToMessage = (messageIndex: number) => {
    setActiveTab("chat")
    setHighlightedMessageIndex(messageIndex)

    // メッセージまでスクロール
    setTimeout(() => {
      const messageElement = document.getElementById(`message-${messageIndex}`)
      if (messageElement && chatScrollRef.current) {
        messageElement.scrollIntoView({ behavior: "smooth", block: "center" })

        // ハイライトを3秒後に解除
        setTimeout(() => {
          setHighlightedMessageIndex(null)
        }, 3000)
      }
    }, 100)
  }

  const handleLoadCharacterSet = () => {
    if (selectedSetId) {
      onLoadCharacterSet(selectedSetId)
    }
  }

  const exportProject = async () => {
    try {
      // LLMによる会議の全体サマリー生成
      const response = await fetch("/api/generate-conference-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          theme,
          purpose,
          messages,
          characters,
          summaryNodes,
        }),
      })

      let overallSummary = ""
      if (response.ok) {
        const data = await response.json()
        overallSummary = data.summary
      }

      // UUID参照をMarkdown形式に変換する関数
      const convertUUIDReferencesToMarkdown = (text: string): { convertedText: string; referencedKnowledge: string[] } => {
        const uuidPattern = /\[UUID:([a-f0-9-]{36})\]/gi
        const referencedKnowledge: Set<string> = new Set()
        
        // UUIDを収集
        let match
        const tempPattern = new RegExp(uuidPattern.source, uuidPattern.flags)
        while ((match = tempPattern.exec(text)) !== null) {
          referencedKnowledge.add(match[1])
        }
        
        // 参照番号でUUIDを置き換え
        const knowledgeArray = Array.from(referencedKnowledge)
        let convertedText = text
        knowledgeArray.forEach((uuid, index) => {
          const refNumber = index + 1
          convertedText = convertedText.replace(
            new RegExp(`\\[UUID:${uuid}\\]`, 'g'),
            `[^${refNumber}]`
          )
        })
        
        return { convertedText, referencedKnowledge: knowledgeArray }
      }

      let markdownContent = `# 会議レポート: ${theme}\n\n`
      markdownContent += `**作成日時**: ${new Date().toLocaleString("ja-JP")}\n\n`

      if (purpose) {
        markdownContent += `**会議の目的**: ${purpose}\n\n`
      }

      // 全体サマリーを追加
      if (overallSummary) {
        markdownContent += "## エグゼクティブサマリー\n\n"
        markdownContent += `${overallSummary}\n\n`
      }

      markdownContent += "## 参加キャラクター\n\n"
      characters.forEach((c) => {
        markdownContent += `### ${c.name}\n- **人格**: ${c.personality}\n- **話し方**: ${c.speakingStyle}\n- **背景**: ${c.background}\n\n`
      })

      // 全ての参照されたナレッジを収集
      const allReferencedKnowledge: Set<string> = new Set()
      const convertedMessages: Array<{ characterName: string; text: string; originalText: string }> = []

      messages.forEach((msg) => {
        const result = convertUUIDReferencesToMarkdown(msg.text)
        result.referencedKnowledge.forEach((uuid: string) => allReferencedKnowledge.add(uuid))
        convertedMessages.push({
          characterName: msg.characterName,
          text: result.convertedText,
          originalText: msg.text
        })
      })

      markdownContent += "## 会話履歴\n\n"
      convertedMessages.forEach((msg) => {
        markdownContent += `**${msg.characterName}**: ${msg.text}\n\n---\n\n`
      })

      if (Object.keys(summaryNodes).length > 1) {
        markdownContent += "## 会話のまとめ\n\n"
        const renderNodeMarkdown = (nodeId: string, depth = 0): string => {
          const node = summaryNodes[nodeId]
          if (!node) return ""

          let result = `${"  ".repeat(depth)}- **${node.label}**\n`
          if (node.summary && nodeId !== "root") {
            result += `${"  ".repeat(depth + 1)}*概要: ${node.summary}*\n\n`
          }
          node.children.forEach((childId) => {
            result += renderNodeMarkdown(childId, depth + 1)
          })
          return result
        }
        markdownContent += renderNodeMarkdown("root")
      }

      // 引用元情報セクションを追加
      if (allReferencedKnowledge.size > 0) {
        markdownContent += "## 引用元情報\n\n"
        
        Array.from(allReferencedKnowledge).forEach((knowledgeId, index) => {
          const result = findKnowledgeItemById(knowledgeId)
          if (result) {
            const { item, fileName } = result
            const refNumber = index + 1
            
            markdownContent += `### [^${refNumber}] ${item.title}\n\n`
            markdownContent += `**出典**: ${fileName}\n\n`
            
            if (item.summary) {
              markdownContent += `**要約**: ${item.summary}\n\n`
            }
            
            markdownContent += "**原文**:\n```\n"
            markdownContent += `${item.content}\n`
            markdownContent += "```\n\n"
            
            if (item.keywords && item.keywords.length > 0) {
              markdownContent += `**キーワード**: ${item.keywords.join(", ")}\n\n`
            }
            
            if (item.source) {
              markdownContent += `**情報源**: ${item.source}\n\n`
            }
            
            markdownContent += "---\n\n"
          }
        })
      }

      const blob = new Blob([markdownContent], { type: "text/markdown; charset=utf-8" })
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url

      // 日本語対応のファイル名生成（ファイルシステムで使えない文字のみ置き換え）
      const sanitizedTheme = theme.replace(/[<>:"/\\|?*]/g, "_")
      const dateStr = new Date().toISOString().split("T")[0]
      a.download = `conference_report_${sanitizedTheme}_${dateStr}.md`

      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      toast({
        title: "レポート出力完了",
        description: "会議レポートをMarkdownファイルとして保存しました。",
      })
    } catch (error) {
      console.error("Export error:", error)
      toast({
        title: "エクスポートエラー",
        description: "レポート生成中にエラーが発生しました。",
        variant: "destructive",
      })
    }
  }

  return (
    <div className="space-y-6">
      {/* キャラクターセット切り替え */}
      {characterSets.length > 1 && (
        <Card>
          <CardHeader>
            <CardTitle>キャラクターセット切り替え</CardTitle>
            <CardDescription>別のキャラクターセットに切り替えることができます。</CardDescription>
          </CardHeader>
          <CardContent className="flex gap-4">
            <Select value={selectedSetId} onValueChange={setSelectedSetId}>
              <SelectTrigger className="flex-grow">
                <SelectValue placeholder="キャラクターセットを選択..." />
              </SelectTrigger>
              <SelectContent>
                {characterSets.map((set) => (
                  <SelectItem key={set.id} value={set.id}>
                    {set.name} ({new Date(set.createdAt).toLocaleDateString("ja-JP")})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button onClick={handleLoadCharacterSet} disabled={!selectedSetId || status === "running"}>
              <Users className="mr-2 h-4 w-4" />
              切り替え
            </Button>
          </CardContent>
        </Card>
      )}

      {/* 現在のキャラクター表示 */}
      <Card>
        <CardHeader>
          <CardTitle>現在のキャラクター</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {characters.map((char) => (
              <div key={char.id} className="p-3 bg-gray-50 rounded-lg">
                <h4 className="font-semibold text-sm">{char.name}</h4>
                <p className="text-xs text-gray-600 mt-1 line-clamp-2">{char.personality}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>プロジェクト設定</CardTitle>
          <CardDescription>会議のテーマと目的を設定し、プロジェクトを開始します。</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="theme" className="text-sm font-medium text-gray-700">
              会議のテーマ <span className="text-red-500">*</span>
            </label>
            <Input
              id="theme"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder="例：人工知能は人類の未来をどう変えるか？"
              disabled={status === "running"}
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="purpose" className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <Target className="h-4 w-4" />
              会議の目的 <span className="text-gray-400 text-xs">(オプション)</span>
            </label>
            <Textarea
              id="purpose"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              placeholder="例：AIの倫理的な課題を整理し、今後の開発指針を決定する"
              disabled={status === "running"}
              rows={3}
              className="resize-none"
            />
            <p className="text-xs text-gray-500">
              会議の具体的な目的や達成したい成果を入力すると、より方向性のある議論が期待できます。
            </p>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={startConference} disabled={status === "running" || !theme} className="flex-1 sm:flex-none">
              {status === "running" ? (
                <>
                  <Sparkles className="mr-2 h-4 w-4 animate-pulse" />
                  会議中...
                </>
              ) : (
                "会議を開始"
              )}
            </Button>
            {status === "running" && (
              <Button variant="destructive" size="default" onClick={stopConference}>
                <Square className="mr-1 h-4 w-4" />
                停止
              </Button>
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-end">
          <Button variant="outline" size="sm" onClick={onResetConfig} disabled={status === "running"}>
            <Settings className="mr-2 h-4 w-4" />
            新しいキャラクターセットを作成
          </Button>
        </CardFooter>
      </Card>

      {status !== "idle" && (
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="chat">チャットビュー</TabsTrigger>
            <TabsTrigger value="mindmap">マインドマップビュー</TabsTrigger>
            <TabsTrigger value="nodelist">ノードリストビュー</TabsTrigger>
            <TabsTrigger value="archipelago">群島ビュー</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>チャットビュー</CardTitle>
                <CardDescription>キャラクターたちのリアルタイム会議</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[50vh] w-full p-4 border rounded-md" ref={chatScrollRef}>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      id={`message-${index}`}
                      className={`mb-4 flex items-start gap-3 p-2 rounded transition-colors duration-300 ${
                        highlightedMessageIndex === index ? "bg-yellow-100 border-l-4 border-yellow-400" : ""
                      }`}
                    >
                      <div className="p-2 bg-gray-200 rounded-full">
                        <Bot className="h-5 w-5 text-gray-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-bold">{msg.characterName}</p>
                          {msg.tag && <MessageTag tag={msg.tag} />}
                        </div>
                        <MessageTextWithReferences
                          text={msg.text}
                          knowledgeFiles={knowledgeFiles}
                        />
                      </div>
                    </div>
                  ))}
                  {status === "running" && (
                    <div className="text-center text-gray-500">
                      AIが思考中... <Sparkles className="inline-block h-4 w-4 animate-pulse" />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="mindmap">
            <Card>
              <CardHeader>
                <CardTitle>マインドマップビュー</CardTitle>
                <CardDescription>
                  会議の要点をマインドマップ形式で表示。ノードをクリックして詳細を確認できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[60vh] p-4">
                {Object.keys(summaryNodes).length > 0 ? (
                  <MindMapView
                    nodes={summaryNodes}
                    messages={messages}
                    characters={characters}
                    theme={theme}
                    onJumpToMessage={handleJumpToMessage}
                  />
                ) : (
                  <p>サマリーはまだありません。</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="nodelist">
            <Card>
              <CardHeader>
                <CardTitle>ノードリストビュー</CardTitle>
                <CardDescription>
                  会議の要点を階層的なリスト形式で表示。各ノードをクリックして詳細を確認できます。
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[60vh] p-4">
                {Object.keys(summaryNodes).length > 0 ? (
                  <NodeListView
                    nodes={summaryNodes}
                    messages={messages}
                    characters={characters}
                    theme={theme}
                    onJumpToMessage={handleJumpToMessage}
                  />
                ) : (
                  <p>サマリーはまだありません。</p>
                )}
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="archipelago" forceMount className="group">
            <div className="h-[70vh] group-data-[state=inactive]:hidden">
              <ArchipelagoView
                theme={theme}
                messages={messages}
                characters={characters}
                onJumpToMessage={handleJumpToMessage}
                topics={archipelagoTopics}
                isLoading={isArchipelagoLoading}
                error={archipelagoError}
                onGenerateMap={handleGenerateArchipelagoMap}
              />
            </div>
          </TabsContent>
        </Tabs>
      )}

      {status === "finished" && (
        <Alert>
          <FileText className="h-4 w-4" />
          <AlertTitle>会議が完了しました！</AlertTitle>
          <AlertDescription>
            <div className="flex flex-col sm:flex-row gap-2 mt-2">
              <Button onClick={exportProject} size="sm">
                <FileOutput className="mr-2 h-4 w-4" />
                プロジェクトをエクスポート
              </Button>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {/* Knowledge Modal */}
      <Dialog open={showKnowledgeModal} onOpenChange={setShowKnowledgeModal}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              参照されたナレッジ ({selectedKnowledgeItems.size}個)
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[60vh]">
            <div className="space-y-4 p-4">
              {Array.from(selectedKnowledgeItems).map((knowledgeId) => {
                const result = findKnowledgeItemById(knowledgeId)
                if (!result) {
                  return (
                    <div key={knowledgeId} className="p-4 border border-red-200 rounded-lg bg-red-50">
                      <p className="text-red-600">ナレッジ ID: {knowledgeId} が見つかりません</p>
                    </div>
                  )
                }
                const { item, fileName } = result
                return (
                  <div key={knowledgeId} className="p-4 border rounded-lg bg-gray-50">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="font-semibold text-lg">{item.title}</h3>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <FileText className="h-4 w-4" />
                        {fileName}
                      </div>
                    </div>
                    {item.summary && (
                      <p className="text-gray-700 text-sm mb-2 italic">{item.summary}</p>
                    )}
                    <div className="text-gray-800 whitespace-pre-wrap mb-3">
                      {item.content}
                    </div>
                    {item.keywords && item.keywords.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-2">
                        {item.keywords.map((keyword, i) => (
                          <span 
                            key={i} 
                            className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded"
                          >
                            {keyword}
                          </span>
                        ))}
                      </div>
                    )}
                    {item.source && (
                      <div className="text-xs text-gray-500 mt-2">
                        出典: {item.source}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  )
}
