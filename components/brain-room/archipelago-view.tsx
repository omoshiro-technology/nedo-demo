"use client"

import { useState, useRef, useEffect, useCallback, useMemo } from "react"
import type { TopicData, Message, Character } from "@/lib/brain-room/types"
import { P5IslandMap } from "@/lib/brain-room/p5-island-map"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Map, Info, Loader2, ZoomIn, ZoomOut, RotateCcw, X, FileText, Users, ExternalLink } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { MarkdownModal } from "@/components/brain-room/markdown-modal"
import { useToast } from "@/components/ui/use-toast"

interface ArchipelagoViewProps {
  theme: string
  messages: Message[]
  characters: Character[]
  onJumpToMessage: (messageIndex: number) => void
  topics: TopicData[]
  isLoading: boolean
  error: string | null
  onGenerateMap: () => void
}

export function ArchipelagoView({
  theme,
  messages,
  characters,
  onJumpToMessage,
  topics,
  isLoading,
  error,
  onGenerateMap,
}: ArchipelagoViewProps) {
  const [selectedTopic, setSelectedTopic] = useState<TopicData | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [topicReport, setTopicReport] = useState<string>("")

  const containerRef = useRef<HTMLDivElement>(null)
  const p5MapRef = useRef<P5IslandMap | null>(null)
  const needsFitViewRef = useRef(false) // Use a ref to track if fitting is needed
  const { toast } = useToast()

  // Use a ref to hold the latest topics to avoid stale closures in the ResizeObserver
  const topicsRef = useRef(topics)
  useEffect(() => {
    topicsRef.current = topics
  }, [topics])

  const handleClick = useCallback((topic: TopicData | null) => {
    setSelectedTopic(topic)
  }, [])

  // Effect for handling topic data updates
  useEffect(() => {
    if (topics) {
      // Always schedule a fit view when topics change.
      needsFitViewRef.current = true

      if (p5MapRef.current) {
        console.log("[ArchipelagoView] Topics updated. Applying to map and scheduling fitView.")
        p5MapRef.current.updateOptions({ topics })

        // If the map is already visible, perform the fit immediately.
        const container = containerRef.current
        if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
          console.log("[ArchipelagoView] Map is visible, fitting view immediately.")
          p5MapRef.current.fitView()
          needsFitViewRef.current = false // Reset flag
        }
      }
    }
  }, [topics])

  // Effect for managing the p5.js instance lifecycle and resizing
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(async (entries) => {
      const entry = entries[0]
      if (!entry) return
      const { width, height } = entry.contentRect

      if (width > 0 && height > 0) {
        if (!p5MapRef.current) {
          console.log(`[ArchipelagoView] Container visible. Initializing map with size ${width}x${height}.`)
          const p5map = new P5IslandMap({
            container_width: width,
            container_height: height,
            background_color: "#f0f4f8",
            topics: topicsRef.current, // Use ref for initial topics
            click_callback: handleClick,
          })
          await p5map.createInstance(container)
          p5MapRef.current = p5map

          // Fit view on initial creation if there are topics
          if (topicsRef.current.length > 0) {
            p5MapRef.current.fitView()
            needsFitViewRef.current = false // Reset flag after initial fit
          }
        } else {
          // Map already exists, just update size and check for pending fit
          p5MapRef.current.updateOptions({ container_width: width, container_height: height })

          if (needsFitViewRef.current) {
            console.log("[ArchipelagoView] View became visible, executing scheduled fitView.")
            p5MapRef.current.fitView()
            needsFitViewRef.current = false // Reset the flag
          } else {
            p5MapRef.current.resume()
          }
        }
      } else if (p5MapRef.current) {
        p5MapRef.current.pause()
      }
    })

    observer.observe(container)

    return () => {
      observer.disconnect()
      p5MapRef.current?.destroy()
      p5MapRef.current = null
    }
  }, [handleClick])

  const getRelatedMessages = useMemo(() => {
    if (!selectedTopic || !messages) return []

    if (selectedTopic.related_message_indices && selectedTopic.related_message_indices.length > 0) {
      return selectedTopic.related_message_indices
        .map((index) => ({ msg: messages[index], index }))
        .filter(({ msg }) => msg)
    }

    const topicText = `${selectedTopic.name} ${selectedTopic.content}`.toLowerCase()
    const keywords = Array.from(new Set(topicText.match(/[\u4e00-\u9faf\u3040-\u309f\u30a0-\u30ff\w]{2,}/g) || []))
    if (keywords.length === 0) return []

    return messages
      .map((msg, index) => ({ msg, index }))
      .filter(({ msg }) => {
        const msgText = msg.text.toLowerCase()
        return keywords.some((kw) => msgText.includes(kw))
      })
      .slice(0, 10)
  }, [selectedTopic, messages])

  const participatingCharacters = useMemo(
    () => Array.from(new Set(getRelatedMessages.map(({ msg }) => msg.characterName))),
    [getRelatedMessages],
  )

  const handleShowDetailReport = async () => {
    if (!selectedTopic) return
    setIsModalOpen(true)
    setIsGeneratingReport(true)
    setTopicReport("")

    try {
      const response = await fetch("/api/generate-topic-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic: selectedTopic.name,
          theme,
          messages: messages,
          characters,
          allMessages: messages,
          summaryNodes: {},
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
      toast({
        title: "エラー",
        description: "トピック詳細レポートの生成に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const handleZoomIn = () => p5MapRef.current?.zoomIn()
  const handleZoomOut = () => p5MapRef.current?.zoomOut()
  const handleResetView = () => p5MapRef.current?.resetView()

  return (
    <>
      <div className="flex h-full gap-4">
        <Card className="flex-1 flex flex-col">
          <CardHeader>
            <CardTitle>群島(archipelago)ビュー</CardTitle>
            <CardDescription>議論分析結果を群島マップとして可視化します。各島がトピックを表します。</CardDescription>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col space-y-4">
            <div className="flex items-center justify-between">
              <Button onClick={onGenerateMap} disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    分析中...
                  </>
                ) : (
                  <>
                    <Map className="mr-2 h-4 w-4" />
                    マップを生成
                  </>
                )}
              </Button>
            </div>

            {error && (
              <Alert variant="destructive">
                <Info className="h-4 w-4" />
                <AlertTitle>エラー</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="relative flex-1">
              <div
                ref={containerRef}
                className="absolute inset-0 border rounded-lg bg-gray-50 cursor-grab active:cursor-grabbing"
              />
              <div className="absolute top-3 right-3 flex flex-col gap-2 z-10">
                <Button size="icon" variant="outline" onClick={handleZoomIn} className="bg-white/80 hover:bg-white">
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={handleZoomOut} className="bg-white/80 hover:bg-white">
                  <ZoomOut className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="outline" onClick={handleResetView} className="bg-white/80 hover:bg-white">
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedTopic && (
          <Card className="w-96 flex-shrink-0 flex flex-col">
            <CardHeader className="pb-3 flex-shrink-0">
              <div className="flex items-start justify-between">
                <CardTitle className="text-base leading-tight pr-2">{selectedTopic.name}</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 -mt-1 -mr-2"
                  onClick={() => setSelectedTopic(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="flex-1 min-h-0">
              <ScrollArea className="h-full">
                <div className="space-y-4 pr-4">
                  <Separator />
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold text-sm">トピック概要</h4>
                      <Button size="xs" variant="outline" onClick={handleShowDetailReport}>
                        <FileText className="h-3 w-3 mr-1" />
                        詳細レポート
                      </Button>
                    </div>
                    <CardDescription className="text-sm bg-gray-50 p-3 rounded">
                      {selectedTopic.content}
                    </CardDescription>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-sm mb-2">関連する発言 ({getRelatedMessages.length})</h4>
                    <div className="max-h-48 overflow-y-auto space-y-2">
                      {getRelatedMessages.map(({ msg, index }) => (
                        <div
                          key={index}
                          className="p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => onJumpToMessage(index)}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <Badge variant="secondary">{msg.characterName}</Badge>
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-3">{msg.text}</p>
                        </div>
                      ))}
                      {getRelatedMessages.length === 0 && (
                        <p className="text-xs text-gray-500 text-center py-4">関連する発言が見つかりません</p>
                      )}
                    </div>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-semibold text-sm mb-2">参加キャラクター</h4>
                    <div className="flex flex-wrap gap-1">
                      {participatingCharacters.map((name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        )}
      </div>
      <MarkdownModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedTopic ? `トピック詳細レポート: ${selectedTopic.name}` : ""}
        content={topicReport}
        isLoading={isGeneratingReport}
        node={null}
        theme={theme}
        messages={messages}
      />
    </>
  )
}
