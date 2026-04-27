"use client"

import dynamic from "next/dynamic"

const SkillMapDashboard = dynamic(
  () => import("@/components/skill-map/SkillMapDashboard"),
  { ssr: false }
)

export default function SkillMapPage() {
  return (
    <div className="h-full overflow-x-auto">
      <div className="min-w-[1280px] h-full">
        <SkillMapDashboard />
      </div>
    </div>
  )
}
