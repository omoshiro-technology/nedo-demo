"use client"

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { SkillTimeline } from "@/lib/compath/domain/skillMap/types"

type Props = {
  timeline: SkillTimeline | null
}

export function GrowthTimeline({ timeline }: Props) {
  if (!timeline || timeline.entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        タイムラインデータがありません
      </div>
    )
  }

  const data = timeline.entries.map((e, i) => ({
    index: i + 1,
    date: new Date(e.assessedAt).toLocaleDateString("ja-JP", {
      month: "short",
      day: "numeric",
    }),
    総合: e.compositeScore,
    観点網羅度: e.thoughtQuality.viewpointCoverage,
    構造的思考: e.thoughtQuality.structuralThinking,
    自発性: e.thoughtQuality.proactiveness,
    専門性: e.thoughtQuality.expertiseLevel,
  }))

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-4">成長曲線</h2>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#f3f4f6" />
          <XAxis
            dataKey="date"
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 11, fill: "#9ca3af" }}
            axisLine={{ stroke: "#e5e7eb" }}
          />
          <Tooltip
            contentStyle={{
              fontSize: 12,
              borderRadius: 8,
              border: "1px solid #e5e7eb",
            }}
          />
          <Legend
            wrapperStyle={{ fontSize: 11 }}
          />
          <Line
            type="monotone"
            dataKey="総合"
            stroke="#1d4ed8"
            strokeWidth={2}
            dot={{ r: 3 }}
          />
          <Line
            type="monotone"
            dataKey="観点網羅度"
            stroke="#3b82f6"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="構造的思考"
            stroke="#10b981"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="自発性"
            stroke="#f59e0b"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="専門性"
            stroke="#8b5cf6"
            strokeWidth={1}
            strokeDasharray="4 2"
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}
