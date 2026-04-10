"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts"
import type { ThoughtQualityScore } from "@/lib/compath/domain/skillMap/types"

type Props = {
  scores: ThoughtQualityScore
}

export function QCDESRadar({ scores }: Props) {
  const data = [
    { axis: "品質 (Q)", value: scores.qcdesCoverage.quality ? 100 : 0 },
    { axis: "コスト (C)", value: scores.qcdesCoverage.cost ? 100 : 0 },
    { axis: "納期 (D)", value: scores.qcdesCoverage.delivery ? 100 : 0 },
    { axis: "環境 (E)", value: scores.qcdesCoverage.environment ? 100 : 0 },
    { axis: "安全 (S)", value: scores.qcdesCoverage.safety ? 100 : 0 },
  ]

  const covered = Object.values(scores.qcdesCoverage).filter(Boolean).length

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 11, fill: "#6b7280" }} />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Radar
              name="QCDES"
              dataKey="value"
              stroke="#3b82f6"
              fill="#3b82f6"
              fillOpacity={0.2}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className="text-center text-xs text-gray-500 mt-1 shrink-0">
        カバー率: {covered} / 5 軸
      </p>
    </div>
  )
}
