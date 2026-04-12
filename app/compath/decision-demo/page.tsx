"use client"

import { useState, useEffect } from "react"
import dynamic from "next/dynamic"
import { DemoScenarioProvider } from "@/components/compath/data/DemoScenarioContext"

// DecisionNavigatorPanelはReactFlowを使うのでSSR不可
const DecisionNavigatorPanel = dynamic(
  () => import("@/components/compath/components/chat/DecisionNavigatorPanel").then(m => ({ default: m.DecisionNavigatorPanel })),
  { ssr: false, loading: () => <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#6b655c" }}>読み込み中...</div> }
)

export default function DecisionDemoPage() {
  const [session, setSession] = useState<any>(null)

  useEffect(() => {
    fetch("/preset-conferences/nedo-demo-decision-session.json")
      .then(r => r.json())
      .then(data => setSession(data))
      .catch(e => console.error("Load failed:", e))
  }, [])

  if (!session) {
    return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#6b655c" }}>読み込み中...</div>
  }

  return (
    <DemoScenarioProvider>
      <div className="compath-scope" style={{ height: "100vh" }}>
        <DecisionNavigatorPanel
          initialPurpose={session.purpose}
          onClose={() => window.history.back()}
          skipPreconditionModal={true}
          skipPastCasePanel={true}
          presetSession={session}
        />
      </div>
    </DemoScenarioProvider>
  )
}
