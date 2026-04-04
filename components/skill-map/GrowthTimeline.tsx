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
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import { SKILL_CATEGORIES } from "@/lib/compath/domain/skillMap/skillCatalog"

type Props = {
  timeline: SkillTimeline | null
}

/** カテゴリごとの色 */
const CATEGORY_COLORS: Record<string, string> = {
  vision: "#8b5cf6",
  management: "#f59e0b",
  "process-design": "#3b82f6",
  manufacturing: "#06b6d4",
  quality: "#10b981",
  equipment: "#6366f1",
  market: "#ec4899",
  communication: "#f97316",
}

/** カテゴリID → 表示名 */
const CATEGORY_NAMES: Record<string, string> = Object.fromEntries(
  SKILL_CATEGORIES.map((c) => [c.id, c.name])
)

export function GrowthTimeline({ timeline }: Props) {
  if (!timeline || timeline.entries.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        タイムラインデータがありません
      </div>
    )
  }

  const data = timeline.entries.map((e, i) => {
    const point: Record<string, string | number> = {
      index: i + 1,
      date: new Date(e.assessedAt).toLocaleDateString("ja-JP", {
        month: "short",
        day: "numeric",
      }),
      総合: e.compositeScore,
    }
    // カテゴリスコアを追加
    for (const cat of SKILL_CATEGORIES) {
      point[cat.name] = e.categoryScores[cat.id] ?? 0
    }
    return point
  })

  return (
    <div className="space-y-5">
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">成長曲線</h2>
        <ResponsiveContainer width="100%" height={400}>
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
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {/* 総合（太い実線） */}
            <Line
              type="monotone"
              dataKey="総合"
              stroke="#1d4ed8"
              strokeWidth={3}
              dot={{ r: 3 }}
            />
            {/* カテゴリ別（細い実線） */}
            {SKILL_CATEGORIES.map((cat) => (
              <Line
                key={cat.id}
                type="monotone"
                dataKey={cat.name}
                stroke={CATEGORY_COLORS[cat.id] ?? "#9ca3af"}
                strokeWidth={1.5}
                dot={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
