"use client"

import dynamic from "next/dynamic"

const ComPathApp = dynamic(
  () => import("@/components/compath/App"),
  { ssr: false }
)

export default function ComPathPage() {
  return (
    <div className="compath-scope h-full">
      <ComPathApp />
    </div>
  )
}
