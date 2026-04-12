"use client"

import { useState, useEffect } from "react"
import { DecisionJourneyView } from "@/components/compath/components/decisionNavigator/DecisionJourneyView"

export default function DecisionDemoPage() {
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch("/preset-conferences/nedo-demo-decision-session.json")
      .then((r) => r.json())
      .then((data) => {
        setSession(data)
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
    <div className="h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b px-6 py-3 flex items-center gap-4">
        <h1 className="text-xl font-bold text-gray-900">意思決定キャンバス</h1>
        <span className="text-sm text-gray-400">NEDOデモ — {session.title}</span>
      </div>
      <div className="flex-1 overflow-auto p-6">
        <DecisionJourneyView session={session} />
      </div>
    </div>
  )
}
