"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import type { DecisionNavigatorSession } from "@/components/compath/types/decisionNavigator"

// ReactFlowはSSR不可なのでdynamic import（named export）
const FlowChart = dynamic(
  () => import("@/components/compath/components/decisionNavigator/FlowChart").then(m => ({ default: m.FlowChart })),
  { ssr: false }
)
const DecisionJourneyView = dynamic(
  () => import("@/components/compath/components/decisionNavigator/DecisionJourneyView").then(m => ({ default: m.DecisionJourneyView })),
  { ssr: false }
)

export default function DecisionDemoPage() {
  const [session, setSession] = useState<DecisionNavigatorSession | null>(null)
  const [loading, setLoading] = useState(true)
  const [showJourney, setShowJourney] = useState(false)

  useEffect(() => {
    fetch("/preset-conferences/nedo-demo-decision-session.json")
      .then((r) => r.json())
      .then((data) => {
        setSession(data as DecisionNavigatorSession)
        setLoading(false)
      })
      .catch((e) => {
        console.error("Failed to load preset:", e)
        setLoading(false)
      })
  }, [])

  if (loading) return <div className="flex items-center justify-center h-screen text-gray-400">読み込み中...</div>
  if (!session) return <div className="flex items-center justify-center h-screen text-red-400">データの読み込みに失敗しました</div>

  return (
    <div className="compath-scope h-screen flex flex-col" style={{ fontFamily: "'Space Grotesk', 'Zen Kaku Gothic New', 'Noto Sans JP', sans-serif" }}>
      {/* Header */}
      <div className="flex items-center justify-between border-b px-6 py-3 bg-white shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-bold" style={{ color: "#1f1c16" }}>意思決定キャンバス</h1>
          <span className="text-sm" style={{ color: "#6b655c" }}>{session.purpose}</span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowJourney(!showJourney)}
            className="text-sm px-4 py-1.5 rounded-md border transition-colors"
            style={{
              borderColor: showJourney ? "#1f7a6d" : "#e2d8c7",
              backgroundColor: showJourney ? "#e8f1f0" : "white",
              color: showJourney ? "#1f7a6d" : "#6b655c",
            }}
          >
            {showJourney ? "フローチャート表示" : "判断履歴を表示"}
          </button>
        </div>
      </div>

      {/* Main */}
      <div className="flex-1 min-h-0 flex">
        {showJourney ? (
          <div className="flex-1 overflow-auto p-6" style={{ backgroundColor: "#f6f2ea" }}>
            <DecisionJourneyView session={session} />
          </div>
        ) : (
          <div className="flex-1 min-h-0" style={{ backgroundColor: "#f6f2ea" }}>
            <FlowChart
              session={session}
              onNodeClick={(nodeId, pos, vp) => console.log("Node clicked:", nodeId)}
            />
          </div>
        )}
      </div>
    </div>
  )
}
