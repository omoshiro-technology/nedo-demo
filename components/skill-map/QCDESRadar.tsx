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
  const cov = scores.qcdesCoverage
  const data = [
    { axis: "品質 (Q)", value: cov.quality },
    { axis: "コスト (C)", value: cov.cost },
    { axis: "納期 (D)", value: cov.delivery },
    { axis: "環境 (E)", value: cov.environment },
    { axis: "安全 (S)", value: cov.safety },
  ]

  const vals = Object.values(cov) as number[]
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis dataKey="axis" tick={{ fontSize: 15, fill: "#6b7280" }} />
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
      <p className="text-center text-sm text-gray-500 mt-1 shrink-0">
        QCDES 平均: {avg} / 100
      </p>
    </div>
  )
}
