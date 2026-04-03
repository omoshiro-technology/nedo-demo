"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import type { Character, Message, SummaryNode } from "@/lib/brain-room/types"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Badge } from "@/components/ui/badge"
import { X, ZoomIn, ZoomOut, RotateCcw, ExternalLink, FileText, Users } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/components/ui/use-toast"
import { MarkdownModal } from "@/components/brain-room/markdown-modal"
import { Separator } from "@/components/ui/separator"

interface MindMapViewProps {
  nodes: Record<string, SummaryNode>
  messages: Message[]
  characters: Character[]
  theme: string
  onJumpToMessage: (messageIndex: number) => void
}

interface NodePosition {
  x: number
  y: number
  level: number
  angle: number
  branch: number
  width: number
  height: number
}

export function MindMapView({ nodes, messages, characters, theme, onJumpToMessage }: MindMapViewProps) {
  const [selectedNode, setSelectedNode] = useState<SummaryNode | null>(null)
  const [nodePositions, setNodePositions] = useState<Record<string, NodePosition>>({})
  const [zoom, setZoom] = useState(0.8)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isGeneratingReport, setIsGeneratingReport] = useState(false)
  const [topicReport, setTopicReport] = useState<string>("")
  const svgRef = useRef<SVGSVGElement>(null)
  const { toast } = useToast()

  useEffect(() => {
    calculateNodePositions()
  }, [nodes])

  const getNodeDimensions = (level: number, text: string) => {
    const baseHeight = level === 0 ? 60 : Math.max(35, 55 - level * 4)
    const fontSize = level === 0 ? 16 : Math.max(10, 14 - level * 1)
    const avgCharWidth = fontSize * 0.9
    const generousPadding = level === 0 ? 40 : Math.max(30, 35 - level * 2)
    const minWidth = level === 0 ? 120 : Math.max(80, 100 - level * 10)
    const calculatedWidth = text.length * avgCharWidth + generousPadding
    const width = Math.max(minWidth, calculatedWidth)
    const maxWidth = level === 0 ? 300 : Math.max(200, 250 - level * 20)
    const finalWidth = Math.min(width, maxWidth)
    let finalHeight = baseHeight
    if (width > maxWidth) {
      const extraLines = Math.ceil((width - maxWidth) / (maxWidth * 0.8))
      finalHeight = baseHeight + extraLines * fontSize * 1.2
    }
    return { width: finalWidth, height: finalHeight }
  }

  const calculateNodePositions = () => {
    const positions: Record<string, NodePosition> = {}
    const centerX = 600
    const centerY = 400
    const baseDistance = 80
    const levelMultiplier = 1.25
    const minAngleGap = 0.25

    const rootNode = nodes["root"]
    if (!rootNode) return

    const rootDimensions = getNodeDimensions(0, rootNode.label)
    positions["root"] = {
      x: centerX,
      y: centerY,
      level: 0,
      angle: 0,
      branch: 0,
      width: rootDimensions.width,
      height: rootDimensions.height,
    }

    const getDescendantCount = (nodeId: string, visited: Set<string> = new Set(), maxDepth = 10): number => {
      if (visited.has(nodeId) || maxDepth <= 0) return 1
      const node = nodes[nodeId]
      if (!node || !node.children || node.children.length === 0) return 1
      visited.add(nodeId)
      let count = 1
      try {
        for (const childId of node.children) {
          if (nodes[childId] && !visited.has(childId)) {
            count += getDescendantCount(childId, new Set(visited), maxDepth - 1)
          }
        }
      } catch (error) {
        console.warn("Error calculating descendant count for", nodeId, error)
        return 1
      }
      return count
    }

    const getMinDistance = (
      parentDimensions: { width: number; height: number },
      childDimensions: { width: number; height: number },
      level: number,
    ) => {
      const parentRadius = Math.max(parentDimensions.width, parentDimensions.height) / 2
      const childRadius = Math.max(childDimensions.width, childDimensions.height) / 2
      const safetyMargin = 40
      const baseDist = parentRadius + childRadius + safetyMargin
      return Math.max(baseDist, baseDist * Math.pow(levelMultiplier, level * 0.5))
    }

    const processNode = (
      nodeId: string,
      parentX: number,
      parentY: number,
      parentDimensions: { width: number; height: number },
      level: number,
      angleStart: number,
      angleRange: number,
      branchIndex: number,
      visited: Set<string> = new Set(),
      maxDepth = 8,
    ) => {
      if (visited.has(nodeId) || level > maxDepth) return
      const node = nodes[nodeId]
      if (!node || !node.children || node.children.length === 0) return
      visited.add(nodeId)
      const children = node.children.filter((childId) => nodes[childId] && !visited.has(childId))
      if (children.length === 0) return

      const childWeights = children.map((childId) => getDescendantCount(childId, new Set(visited), 5))
      const totalWeight = childWeights.reduce((sum, weight) => sum + weight, 0)
      if (totalWeight === 0) return

      const adjustedAngleRange = Math.min(angleRange * (1 + level * 0.07), Math.PI * 0.8)
      let currentAngle = angleStart - adjustedAngleRange / 2

      children.forEach((childId, index) => {
        const childNode = nodes[childId]
        if (!childNode) return
        const childDimensions = getNodeDimensions(level + 1, childNode.label)
        const distance = getMinDistance(parentDimensions, childDimensions, level)
        const weight = childWeights[index] || 1
        const childAngleRange = (adjustedAngleRange * weight) / totalWeight
        const childAngle = currentAngle + childAngleRange / 2
        const adjustedAngle = Math.max(currentAngle + minAngleGap, childAngle)

        const x = parentX + Math.cos(adjustedAngle) * distance * 1.15
        const y = parentY + Math.sin(adjustedAngle) * distance

        positions[childId] = {
          x,
          y,
          level: level + 1,
          angle: adjustedAngle,
          branch: branchIndex * 100 + index,
          width: childDimensions.width,
          height: childDimensions.height,
        }

        const nextAngleRange = Math.max(childAngleRange * 0.7, Math.PI / 8)
        try {
          processNode(
            childId,
            x,
            y,
            childDimensions,
            level + 1,
            adjustedAngle,
            nextAngleRange,
            branchIndex * 100 + index,
            new Set(visited),
            maxDepth,
          )
        } catch (error) {
          console.warn("Error processing node", childId, error)
        }
        currentAngle += childAngleRange
      })
    }

    if (rootNode.children && rootNode.children.length > 0) {
      const rootChildren = rootNode.children.filter((childId) => nodes[childId])
      const rootAngleStep = (2 * Math.PI) / rootChildren.length

      rootChildren.forEach((childId, index) => {
        const childNode = nodes[childId]
        if (!childNode) return
        const childDimensions = getNodeDimensions(1, childNode.label)

        const angle = index * rootAngleStep - Math.PI / 2
        const distance = getMinDistance(rootDimensions, childDimensions, 0)

        const x = centerX + Math.cos(angle) * distance * 1.15
        const y = centerY + Math.sin(angle) * distance

        positions[childId] = {
          x,
          y,
          level: 1,
          angle,
          branch: index,
          width: childDimensions.width,
          height: childDimensions.height,
        }

        const branchAngleRange = Math.PI / Math.max(2, rootChildren.length - 0.2)
        try {
          processNode(childId, x, y, childDimensions, 1, angle, branchAngleRange, index, new Set(["root"]), 8)
        } catch (error) {
          console.warn("Error processing root child", childId, error)
        }
      })
    }
    setNodePositions(positions)
  }

  const handleNodeClick = (nodeId: string) => {
    const node = nodes[nodeId]
    if (node && nodeId !== "root") {
      setSelectedNode(node)
    }
  }

  const handleShowDetailReport = async () => {
    if (!selectedNode) return
    setIsModalOpen(true)
    setIsGeneratingReport(true)
    setTopicReport("")
    await generateTopicReport(selectedNode)
  }

  const generateTopicReport = async (node: SummaryNode) => {
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
      toast({
        title: "エラー",
        description: "トピック詳細レポートの生成に失敗しました。",
        variant: "destructive",
      })
    } finally {
      setIsGeneratingReport(false)
    }
  }

  const getNodeColor = (level: number, branch: number) => {
    const branchColors = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#84cc16", "#f97316"]
    const baseColorIndex = Math.floor(branch / 100) % branchColors.length
    const baseColor = branchColors[baseColorIndex]
    const opacity = Math.max(0.7, 1 - level * 0.06)
    return { color: baseColor, opacity }
  }

  const getRelatedMessages = (node: SummaryNode) => {
    return node.relatedMessages.map((index) => messages[index]).filter(Boolean)
  }

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true)
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y })
  }
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) setPan({ x: e.clientX - dragStart.x, y: e.clientY - dragStart.y })
  }
  const handleMouseUp = () => setIsDragging(false)
  const handleZoomIn = () => setZoom((prev) => Math.min(prev * 1.2, 3))
  const handleZoomOut = () => setZoom((prev) => Math.max(prev / 1.2, 0.1))
  const handleReset = () => {
    setZoom(0.8)
    setPan({ x: 0, y: 0 })
  }
  const getTextSize = (level: number) => (level === 0 ? 16 : Math.max(10, 14 - level * 1))

  return (
    <div className="flex h-full gap-4">
      <div className="flex-1 border rounded-lg bg-white relative overflow-hidden">
        <div className="absolute top-4 left-4 z-10 bg-black bg-opacity-70 text-white p-2 rounded text-xs">
          <div>ノード数: {Object.keys(nodes).length}</div>
          <div>最大階層: {Math.max(0, ...Object.values(nodePositions).map((p) => p.level))}</div>
        </div>
        <div className="absolute top-4 right-4 z-10 flex gap-2">
          <Button size="sm" variant="outline" onClick={handleZoomIn}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleZoomOut}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        <svg
          ref={svgRef}
          width="100%"
          height="100%"
          viewBox="0 0 1200 800"
          className="w-full h-full cursor-grab active:cursor-grabbing"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <g transform={`translate(${pan.x}, ${pan.y}) scale(${zoom})`}>
            {Object.entries(nodes).map(
              ([nodeId, node]) =>
                node.children?.map((childId) => {
                  const parentPos = nodePositions[nodeId]
                  const childPos = nodePositions[childId]
                  if (!parentPos || !childPos) return null
                  const { color } = getNodeColor(childPos.level, childPos.branch)
                  const strokeWidth = Math.max(2, 6 - childPos.level)
                  const parentRadius = Math.max(parentPos.width, parentPos.height) / 2
                  const childRadius = Math.max(childPos.width, childPos.height) / 2
                  const angle = Math.atan2(childPos.y - parentPos.y, childPos.x - parentPos.x)
                  const startX = parentPos.x + Math.cos(angle) * (parentRadius * 0.9)
                  const startY = parentPos.y + Math.sin(angle) * (parentRadius * 0.9)
                  const endX = childPos.x - Math.cos(angle) * (childRadius * 0.9)
                  const endY = childPos.y - Math.sin(angle) * (childRadius * 0.9)
                  return (
                    <g key={`${nodeId}-${childId}`}>
                      <path
                        d={`M ${startX} ${startY} Q ${(startX + endX) / 2} ${(startY + endY) / 2 - (30 + childPos.level * 10)} ${endX} ${endY}`}
                        stroke={color}
                        strokeWidth={strokeWidth}
                        fill="none"
                        opacity={0.8}
                      />
                    </g>
                  )
                }) || [],
            )}
            {Object.entries(nodePositions).map(([nodeId, position]) => {
              const node = nodes[nodeId]
              if (!node) return null
              const isRoot = nodeId === "root"
              const { color, opacity } = getNodeColor(position.level, position.branch)
              const textSize = getTextSize(position.level)
              return (
                <g key={nodeId}>
                  <ellipse
                    cx={position.x + 4}
                    cy={position.y + 4}
                    rx={position.width / 2}
                    ry={position.height / 2}
                    fill="rgba(0,0,0,0.2)"
                  />
                  <ellipse
                    cx={position.x}
                    cy={position.y}
                    rx={position.width / 2}
                    ry={position.height / 2}
                    fill={color}
                    fillOpacity={opacity}
                    stroke="white"
                    strokeWidth={isRoot ? 5 : Math.max(2, 4 - position.level * 0.3)}
                    className={`${!isRoot ? "cursor-pointer hover:stroke-gray-400" : ""} transition-all duration-200`}
                    onClick={() => handleNodeClick(nodeId)}
                  />
                  <text
                    x={position.x}
                    y={position.y}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill="white"
                    fontSize={textSize}
                    fontWeight={isRoot ? "bold" : position.level <= 2 ? "600" : "500"}
                    className="pointer-events-none select-none"
                    style={{ textShadow: "0 2px 4px rgba(0,0,0,0.5)" }}
                  >
                    {node.label}
                  </text>
                  {!isRoot && (
                    <text
                      x={position.x}
                      y={position.y + position.height / 2 + 16}
                      textAnchor="middle"
                      fill="#666"
                      fontSize="9"
                      className="pointer-events-none"
                    >
                      L{position.level}
                    </text>
                  )}
                  {!isRoot && node.children && node.children.length > 0 && (
                    <g>
                      <circle
                        cx={position.x + position.width / 2 - 15}
                        cy={position.y - position.height / 2 + 15}
                        r="12"
                        fill="#ffffff"
                        stroke={color}
                        strokeWidth="2"
                      />
                      <text
                        x={position.x + position.width / 2 - 15}
                        y={position.y - position.height / 2 + 15}
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fill={color}
                        fontSize="10"
                        fontWeight="bold"
                        className="pointer-events-none"
                      >
                        {node.children.length}
                      </text>
                    </g>
                  )}
                </g>
              )
            })}
          </g>
        </svg>
        <div className="absolute bottom-4 left-4 bg-black bg-opacity-70 text-white p-3 rounded text-sm space-y-1">
          <div>• ノードをクリックして詳細を表示</div>
          <div>• ドラッグしてマップを移動</div>
          <div>• 右上のボタンでズーム操作</div>
        </div>
      </div>

      {selectedNode && (
        <Card className="w-96 flex-shrink-0 h-full flex flex-col">
          <CardHeader className="pb-3 flex-shrink-0">
            <div className="flex items-start justify-between">
              <CardTitle className="text-base leading-tight pr-2">{selectedNode.label}</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6 -mt-1 -mr-2" onClick={() => setSelectedNode(null)}>
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
                    {selectedNode.summary || "このトピックに関する概要を生成中..."}
                  </CardDescription>
                </div>
                <Separator />
                {selectedNode.children && selectedNode.children.length > 0 && (
                  <div>
                    <h4 className="font-semibold text-sm mb-2">サブトピック ({selectedNode.children.length})</h4>
                    <div className="space-y-1">
                      {selectedNode.children.map((childId) => {
                        const childNode = nodes[childId]
                        if (!childNode) return null
                        return (
                          <div
                            key={childId}
                            className="text-xs p-2 bg-blue-50 rounded cursor-pointer hover:bg-blue-100"
                            onClick={() => handleNodeClick(childId)}
                          >
                            {childNode.label}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">関連する発言 ({selectedNode.relatedMessages.length})</h4>
                  <div className="max-h-48 overflow-y-auto space-y-2">
                    {selectedNode.relatedMessages.map((messageIndex, index) => {
                      const message = messages[messageIndex]
                      if (!message) return null
                      return (
                        <div
                          key={messageIndex}
                          className="p-2 bg-gray-50 rounded-md cursor-pointer hover:bg-gray-100"
                          onClick={() => onJumpToMessage(messageIndex)}
                        >
                          <div className="flex items-center justify-between text-xs mb-1">
                            <Badge variant="secondary">{message.characterName}</Badge>
                            <ExternalLink className="h-3 w-3 text-gray-400" />
                          </div>
                          <p className="text-xs text-gray-700 line-clamp-3">{message.text}</p>
                        </div>
                      )
                    })}
                    {selectedNode.relatedMessages.length === 0 && (
                      <p className="text-xs text-gray-500 text-center py-4">関連する発言がありません</p>
                    )}
                  </div>
                </div>
                <Separator />
                <div>
                  <h4 className="font-semibold text-sm mb-2">参加キャラクター</h4>
                  <div className="flex flex-wrap gap-1">
                    {Array.from(new Set(getRelatedMessages(selectedNode).map((msg) => msg.characterName))).map(
                      (name) => (
                        <Badge key={name} variant="outline" className="text-xs">
                          <Users className="h-3 w-3 mr-1" />
                          {name}
                        </Badge>
                      ),
                    )}
                  </div>
                </div>
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

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
