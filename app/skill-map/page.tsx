"use client"

import dynamic from "next/dynamic"

const SkillMapDashboard = dynamic(
  () => import("@/components/skill-map/SkillMapDashboard"),
  { ssr: false }
)

export default function SkillMapPage() {
  return (
    <div className="h-full">
      <SkillMapDashboard />
    </div>
  )
}
