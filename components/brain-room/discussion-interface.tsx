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
import { MermaidDiagram } from "@/components/brain-room/mermaid-diagram"
import { WhiteboardView } from "@/components/brain-room/whiteboard-view"

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
  const [whiteboardHtml, setWhiteboardHtml] = useState<string>("")
  const [showKnowledgeModal, setShowKnowledgeModal] = useState(false)
  const [appMode, setAppMode] = useState<"conference" | "chat">("conference")
  const [chatInput, setChatInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [selectedChatPersonas, setSelectedChatPersonas] = useState<number[]>([])
  const [selectedConferenceMembers, setSelectedConferenceMembers] = useState<number[]>(() => characters.map(c => c.id))
  const [chatTurnCount, setChatTurnCount] = useState(0)

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

  const sendChatMessage = async () => {
    if (!chatInput.trim() || isSending) return

    const userMsg = chatInput.trim()
    setChatInput("")
    setIsSending(true)

    // Add user message
    const userMessage: Message = {
      characterId: 0,
      characterName: "あなた",
      text: userMsg,
      isUser: true,
    }
    setMessages((prev) => [...prev, userMessage])

    const history = messages.map((m) => ({
      speakerName: m.isUser ? "ユーザー" : m.characterName,
      text: m.text,
      isUser: !!m.isUser,
    }))

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userMessage: userMsg,
          characters,
          selectedPersonaIds: selectedChatPersonas,
          conversationHistory: history,
          knowledgeFiles,
          theme: theme || undefined,
          purpose: purpose || undefined,
          whiteboard: whiteboardHtml || undefined,
          turnCount: chatTurnCount,
        }),
      })

      if (!response.ok || !response.body) throw new Error("Chat API failed")

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          try {
            const event = JSON.parse(line.slice(6))
            if (event.type === "message") {
              setMessages((prev) => [...prev, event.data])
            } else if (event.type === "whiteboard_update") {
              setWhiteboardHtml(event.data.html || "")
            }
          } catch {}
        }
      }

      setChatTurnCount((c) => c + 1)
    } catch (e) {
      console.error("Chat send failed:", e)
      toast({ title: "エラー", description: "メッセージ送信に失敗しました。", variant: "destructive" })
    } finally {
      setIsSending(false)
    }
  }

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

    // 選択されたメンバーでフィルタ（未選択なら全員）
    const conferenceCharacters = selectedConferenceMembers.length >= 2
      ? characters.filter(c => selectedConferenceMembers.includes(c.id))
      : characters

    if (conferenceCharacters.length < 2) {
      toast({ title: "エラー", description: "会議には2人以上の参加者が必要です。", variant: "destructive" })
      return
    }

    console.log("=== Starting Conference ===")
    console.log("Theme:", theme)
    console.log("Purpose:", purpose)
    console.log("Characters:", conferenceCharacters.length, conferenceCharacters.map(c => c.name))

    setStatus("running")
    setMessages([])
    setWhiteboardHtml("")

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

    const maxTurns = 20
    const conversationHistory: Array<{ speakerIndex: number; utterance: string }> = []
    let nextSpeakerIndex = 0
    let currentWhiteboardHtml = ""
    let consecutiveErrors = 0

    try {
      for (let turn = 0; turn < maxTurns; turn++) {
        if (abortControllerRef.current?.signal.aborted) {
          console.log("Conference aborted by user")
          break
        }

        console.log(`=== Turn ${turn + 1}/${maxTurns} ===`)

        const isLastTurn = turn === maxTurns - 1
        const shouldUpdateWhiteboard = (turn > 0 && turn % 3 === 2) || isLastTurn

        // 1. ターン処理（発言生成 + 次の話者選択）
        const response = await fetch("/api/conference-network/turn", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            theme,
            purpose,
            characters: conferenceCharacters,
            knowledgeFiles,
            conversationHistory,
            turn,
            nextSpeakerIndex,
            whiteboardHtml: currentWhiteboardHtml,
          }),
          signal: abortControllerRef.current.signal,
        })

        if (!response.ok) {
          const errorText = await response.text().catch(() => "")
          console.error(`Turn ${turn + 1} failed:`, response.status, errorText)
          consecutiveErrors++
          if (consecutiveErrors >= 3) {
            toast({ title: "会議エラー", description: `連続エラーのため会議を終了しました (${response.status})`, variant: "destructive" })
            break
          }
          await new Promise(r => setTimeout(r, 2000))
          continue
        }

        consecutiveErrors = 0
        const result = await response.json()

        // Update conversation history
        conversationHistory.push({
          speakerIndex: nextSpeakerIndex,
          utterance: result.message.text,
        })

        // Update UI
        setMessages((prev) => [...prev, result.message])

        // 2. ホワイトボード更新（別API、非同期で並行実行）
        if (shouldUpdateWhiteboard) {
          fetch("/api/conference-network/whiteboard", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              theme,
              purpose,
              conversationHistory,
              characters: conferenceCharacters,
              currentWhiteboardHtml,
            }),
          }).then(async (wbRes) => {
            if (wbRes.ok) {
              const wbResult = await wbRes.json()
              if (wbResult.html) {
                currentWhiteboardHtml = wbResult.html
                setWhiteboardHtml(wbResult.html)
              }
            }
          }).catch((err) => console.error("Whiteboard update failed:", err))
        }

        nextSpeakerIndex = result.nextSpeakerIndex

        if (result.isFinished || turn >= maxTurns - 1) {
          console.log("Conference ended:", result.finishReason || "Max turns reached")
          toast({
            title: "会議完了",
            description: result.finishReason || "会議が完了しました。",
            duration: 5000,
          })
          break
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
        return
      } else {
        console.log("Conference was aborted by user")
      }
    }

    setStatus("finished")
    generateTopicSummaries()
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

      // ナレッジ参照をMarkdown脚注形式に変換する関数
      const convertUUIDReferencesToMarkdown = (text: string): { convertedText: string; referencedKnowledge: string[] } => {
        const uuidPattern = /\[UUID:([^\]]+)\]/g
        const referencedKnowledge: Set<string> = new Set()

        // IDを収集
        let match
        const tempPattern = new RegExp(uuidPattern.source, uuidPattern.flags)
        while ((match = tempPattern.exec(text)) !== null) {
          referencedKnowledge.add(match[1])
        }

        // 参照番号でIDを置き換え
        const knowledgeArray = Array.from(referencedKnowledge)
        let convertedText = text
        knowledgeArray.forEach((id, index) => {
          const refNumber = index + 1
          convertedText = convertedText.replace(
            new RegExp(`\\[UUID:${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\]`, 'g'),
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
      convertedMessages.forEach((msg, i) => {
        markdownContent += `**${msg.characterName}**: ${msg.text}\n`
        // 参照されたナレッジIDを表示
        const originalMsg = messages[i]
        if (originalMsg?.usedKnowledgeIds && originalMsg.usedKnowledgeIds.length > 0) {
          markdownContent += `> 参照ナレッジ: ${originalMsg.usedKnowledgeIds.join(", ")}\n`
        }
        markdownContent += `\n---\n\n`
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
          <CardTitle>{appMode === "conference" ? "会議設定" : "チャット設定"}</CardTitle>
          <CardDescription>
            {appMode === "conference"
              ? "AIキャラクター同士が自動で議論します。テーマを設定して開始してください。"
              : "AIキャラクターと直接会話します。相手を選んで開始してください。"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {status === "idle" && (
            <div className="flex gap-2">
              <Button
                variant={appMode === "conference" ? "default" : "outline"}
                size="sm"
                onClick={() => setAppMode("conference")}
              >
                会議モード
              </Button>
              <Button
                variant={appMode === "chat" ? "default" : "outline"}
                size="sm"
                onClick={() => setAppMode("chat")}
              >
                チャットモード
              </Button>
            </div>
          )}

          {status === "idle" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">
                {appMode === "conference" ? "参加メンバー" : "会話する相手"}
              </label>
              <div className="flex flex-wrap gap-2">
                {appMode === "conference" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs"
                    onClick={() => {
                      if (selectedConferenceMembers.length === characters.length) {
                        setSelectedConferenceMembers([])
                      } else {
                        setSelectedConferenceMembers(characters.map(c => c.id))
                      }
                    }}
                  >
                    {selectedConferenceMembers.length === characters.length ? "全解除" : "全選択"}
                  </Button>
                )}
                {characters.map((c) => {
                  const isSelected = appMode === "conference"
                    ? selectedConferenceMembers.includes(c.id)
                    : selectedChatPersonas.includes(c.id)
                  return (
                    <Button
                      key={c.id}
                      variant={isSelected ? "default" : "outline"}
                      size="sm"
                      onClick={() => {
                        if (appMode === "conference") {
                          setSelectedConferenceMembers((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          )
                        } else {
                          setSelectedChatPersonas((prev) =>
                            prev.includes(c.id) ? prev.filter((id) => id !== c.id) : [...prev, c.id]
                          )
                        }
                      }}
                    >
                      {c.name}
                    </Button>
                  )
                })}
              </div>
              <p className="text-xs text-gray-500">
                {appMode === "conference"
                  ? selectedConferenceMembers.length < 2
                    ? "2人以上選択してください"
                    : `${selectedConferenceMembers.length}人で会議`
                  : selectedChatPersonas.length === 0
                    ? "1人以上選択してください"
                    : selectedChatPersonas.length === 1
                      ? `${characters.find(c => c.id === selectedChatPersonas[0])?.name}と1対1で会話`
                      : `${selectedChatPersonas.length}人のグループチャット`}
              </p>
            </div>
          )}

          {status !== "running" && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">プリセット</label>
              <div className="flex flex-wrap gap-2">
                {appMode === "conference" ? (
                  <>
                    {[
                      { label: "🎯 NEDOデモ", theme: "SUS304 t1.5 深絞り形状の工程設計方針", purpose: "新規受注案件（SUS304 t1.5 深絞り形状）の量産工程を確立するにあたり、加工硬化による割れリスクへの対策と、品質・コスト・納期を両立する工程設計方針を策定する。確認すべき論点と判断基準を洗い出したい。" },
                      { label: "工程構想", theme: "新規受注品（自動車ブラケット、590MPaハイテン t1.2mm、月産8,000個）の工程設計を構想する", purpose: "製品形状・材質・生産量から最適な工程順序・型方式・加工条件の方向性を決定する。品質・コスト・納期のバランスを考慮し、工程設計の骨格を固める。" },
                      { label: "トラブル対応", theme: "量産中の絞り部品で割れ不良が突然発生率2%に上昇した。原因を特定し対策を検討する", purpose: "割れの発生パターンを分析し、4M変動の観点から原因候補を絞り込む。暫定対策でラインを止めずに生産を継続しつつ、恒久対策と再発防止策を決定する。" },
                      { label: "VE・コスト改善", theme: "既存製品（家電ブラケット、SPCC t1.0mm、5工程）の型費・加工費を30%削減するVE提案を検討する", purpose: "図面の公差・形状を見直し、工程数削減や材料歩留まり改善の余地を洗い出す。品質を維持しながらコスト削減を実現する具体的な提案をまとめる。" },
                      { label: "材質変更対応", theme: "軽量化要求でSPCC t1.6mmから590MPaハイテン t1.2mmへの材質変更が決定。既存金型の流用可否と工程変更を検討する", purpose: "材質変更に伴う成形荷重・スプリングバック・金型寿命・後工程への影響を網羅的に評価し、金型改造範囲・追加投資・リスクを明確にする。" },
                      { label: "新人育成方針", theme: "入社2年目の工程設計者を3年後に一人前にするための育成計画を議論する", purpose: "スキルマップを参照しながら、現時点の習熟度と目標レベルのギャップを特定する。OJTのアサイン方針、重点的に伸ばすスキル、育成上の注意点を決める。" },
                    ].map((p) => (
                      <Button key={p.label} variant="outline" size="sm" className="text-xs" onClick={() => { setTheme(p.theme); setPurpose(p.purpose) }}>
                        {p.label}
                      </Button>
                    ))}
                  </>
                ) : (
                  <>
                    {[
                      { label: "公差の相談", theme: "この図面の公差設定について相談したい" },
                      { label: "不良の原因切り分け", theme: "量産中に発生した不良の原因を一緒に考えてほしい" },
                      { label: "工程設計レビュー", theme: "考えた工程案をレビューしてほしい" },
                      { label: "材料選定の相談", theme: "この部品に最適な材料を選びたい" },
                      { label: "コスト削減アイデア", theme: "この部品のコストを下げる方法を相談したい" },
                    ].map((p) => (
                      <Button key={p.label} variant="outline" size="sm" className="text-xs" onClick={() => { setTheme(p.theme); setPurpose("") }}>
                        {p.label}
                      </Button>
                    ))}
                  </>
                )}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <label htmlFor="theme" className="text-sm font-medium text-gray-700">
              {appMode === "conference" ? "会議のテーマ" : "話題"}{" "}
              {appMode === "conference" && <span className="text-red-500">*</span>}
              {appMode === "chat" && <span className="text-gray-400 text-xs">(オプション)</span>}
            </label>
            <Input
              id="theme"
              type="text"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              placeholder={appMode === "conference" ? "例：新規受注品の工程設計を構想する" : "例：この図面の公差について相談したい"}
              disabled={status === "running"}
            />
          </div>

          {appMode === "conference" && (
            <div className="space-y-2">
              <label htmlFor="purpose" className="text-sm font-medium text-gray-700 flex items-center gap-2">
                <Target className="h-4 w-4" />
                会議の目的 <span className="text-gray-400 text-xs">(オプション)</span>
              </label>
              <Textarea
                id="purpose"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                placeholder="例：品質・コスト・納期のバランスを考慮し、工程設計の骨格を固める"
                disabled={status === "running"}
                rows={3}
                className="resize-none"
              />
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {appMode === "conference" ? (
              <>
                <Button onClick={startConference} disabled={status === "running" || !theme} className="flex-1 sm:flex-none">
                  {status === "running" ? (
                    <><Sparkles className="mr-2 h-4 w-4 animate-pulse" />会議中...</>
                  ) : "会議を開始"}
                </Button>
                {status === "running" && (
                  <Button variant="destructive" size="default" onClick={stopConference}>
                    <Square className="mr-1 h-4 w-4" />停止
                  </Button>
                )}
              </>
            ) : (
              <>
                <Button
                  onClick={() => {
                    setStatus("running")
                    setMessages([])
                    setWhiteboardHtml("")
                    setChatTurnCount(0)
                  }}
                  disabled={status === "running" || selectedChatPersonas.length === 0}
                  className="flex-1 sm:flex-none"
                >
                  チャットを開始
                </Button>
                {status === "running" && (
                  <Button variant="destructive" size="default" onClick={() => setStatus("finished")}>
                    <Square className="mr-1 h-4 w-4" />終了
                  </Button>
                )}
              </>
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
            <TabsTrigger value="chat">チャット</TabsTrigger>
            <TabsTrigger value="mindmap">マインドマップ</TabsTrigger>
            <TabsTrigger value="nodelist">ノードリスト</TabsTrigger>
            <TabsTrigger value="whiteboard">ホワイトボード</TabsTrigger>
            <TabsTrigger value="archipelago">群島MAP</TabsTrigger>
          </TabsList>
          <TabsContent value="chat">
            <Card>
              <CardHeader>
                <CardTitle>チャットビュー</CardTitle>
                <CardDescription>キャラクターたちのリアルタイム会議</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[50vh] w-full p-4 border rounded-md" ref={chatScrollRef}>
                  {appMode === "chat" && status === "running" && messages.length === 0 && (
                    <div className="text-center text-gray-500 text-sm py-4 mb-4 border-b border-gray-200">
                      <p className="font-medium mb-1">
                        {selectedChatPersonas.length === 1
                          ? `${characters.find(c => c.id === selectedChatPersonas[0])?.name}とのチャット`
                          : `グループチャット`}
                      </p>
                      <p className="text-xs text-gray-400">
                        参加者: {selectedChatPersonas.map(id => characters.find(c => c.id === id)?.name).filter(Boolean).join("、")}
                      </p>
                    </div>
                  )}
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      id={`message-${index}`}
                      className={`mb-4 flex items-start gap-3 p-2 rounded transition-colors duration-300 ${
                        msg.isUser ? "flex-row-reverse" : ""
                      } ${highlightedMessageIndex === index ? "bg-yellow-100 border-l-4 border-yellow-400" : ""}`}
                    >
                      <div className={`p-2 rounded-full ${msg.isUser ? "bg-blue-200" : "bg-gray-200"}`}>
                        {msg.isUser ? (
                          <Users className="h-5 w-5 text-blue-600" />
                        ) : (
                          <Bot className="h-5 w-5 text-gray-600" />
                        )}
                      </div>
                      <div className={`flex-1 ${msg.isUser ? "text-right" : ""}`}>
                        <div className={`flex items-center gap-2 mb-1 ${msg.isUser ? "justify-end" : ""}`}>
                          <p className="font-bold">{msg.characterName}</p>
                          {msg.tag && !msg.isUser && <MessageTag tag={msg.tag} />}
                        </div>
                        <MessageTextWithReferences
                          text={msg.text}
                          knowledgeFiles={knowledgeFiles}
                        />
                      </div>
                    </div>
                  ))}
                  {status === "running" && appMode === "conference" && (
                    <div className="text-center text-gray-500">
                      AIが思考中... <Sparkles className="inline-block h-4 w-4 animate-pulse" />
                    </div>
                  )}
                  {isSending && (
                    <div className="text-center text-gray-500">
                      <Sparkles className="inline-block h-4 w-4 animate-pulse mr-1" />考え中...
                    </div>
                  )}
                </ScrollArea>
                {appMode === "chat" && status === "running" && (
                  <div className="flex gap-2 mt-3">
                    <Input
                      value={chatInput}
                      onChange={(e) => setChatInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendChatMessage() } }}
                      placeholder="メッセージを入力..."
                      disabled={isSending}
                      className="flex-1"
                    />
                    <Button onClick={sendChatMessage} disabled={isSending || !chatInput.trim()}>
                      {isSending ? <Sparkles className="h-4 w-4 animate-pulse" /> : "送信"}
                    </Button>
                  </div>
                )}
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
          <TabsContent value="whiteboard">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    共有ホワイトボード
                  </h2>
                  <p className="text-sm text-gray-500">議論の構造をホワイトボード形式で可視化</p>
                </div>
                {whiteboardHtml && (
                  <button
                    className="text-xs text-gray-500 hover:text-gray-800 underline"
                    onClick={() => {
                      navigator.clipboard.writeText(whiteboardHtml)
                      toast({ title: "コピー完了", description: "HTMLソースをコピーしました。" })
                    }}
                  >
                    HTMLソースをコピー
                  </button>
                )}
              </div>
              {whiteboardHtml ? (
                <WhiteboardView html={whiteboardHtml} knowledgeFiles={knowledgeFiles} />
              ) : (
                <div className="text-center text-gray-400 py-16">
                  <Brain className="h-12 w-12 mx-auto mb-4 opacity-30" />
                  <p>ホワイトボードは3ターン目以降に自動生成されます</p>
                  <p className="text-sm mt-1">議論の進行に合わせて更新されます</p>
                </div>
              )}
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
