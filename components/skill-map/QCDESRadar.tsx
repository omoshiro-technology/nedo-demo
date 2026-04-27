"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from "recharts"
import type { ThoughtQualityScore } from "@/lib/compath/domain/skillMap/types"

type Props = {
  scores: ThoughtQualityScore
  compareScores?: ThoughtQualityScore | null
  compact?: boolean
  /**
   * 重ね表示時の色付けモード
   * - "off": 色付けなし（過去=グレー / 現在=青）
   * - "growth": 成長 = 緑系 / 低下 = 赤系 / 停滞 = グレー
   */
  overlayColor?: "off" | "growth"
  currentLabel?: string
  pastLabel?: string
}

export function QCDESRadar({
  scores,
  compareScores = null,
  compact = false,
  overlayColor = "off",
  currentLabel = "現在",
  pastLabel = "過去",
}: Props) {
  const cov = scores.qcdesCoverage
  const pastCov = compareScores?.qcdesCoverage ?? null

  const axisDefs = compact
    ? [
        { key: "quality", axis: "Q" },
        { key: "cost", axis: "C" },
        { key: "delivery", axis: "D" },
        { key: "environment", axis: "E" },
        { key: "safety", axis: "S" },
      ]
    : [
        { key: "quality", axis: "品質 (Q)" },
        { key: "cost", axis: "コスト (C)" },
        { key: "delivery", axis: "納期 (D)" },
        { key: "environment", axis: "環境 (E)" },
        { key: "safety", axis: "安全 (S)" },
      ]

  const data = axisDefs.map((d) => {
    const current = cov[d.key as keyof typeof cov]
    const past = pastCov ? pastCov[d.key as keyof typeof pastCov] : null
    return {
      axis: d.axis,
      current,
      past,
      ringMax: 100,
    }
  })

  const vals = Object.values(cov) as number[]
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)
  const pastAvg = pastCov
    ? Math.round((Object.values(pastCov) as number[]).reduce((a, b) => a + b, 0) / 5)
    : null

  // 色付けモード判定
  const isOverlay = !!compareScores
  const growthDelta = pastCov
    ? Math.round((avg - (pastAvg ?? 0)))
    : 0

  // overlayColor === "growth" の場合、現在は赤系 / 過去は青系 の2色はっきり表示
  const currentColor = overlayColor === "growth" ? "#ef4444" : "#3b82f6"  // red-500 / blue-500
  const currentFillOpacity = overlayColor === "growth" ? 0.35 : 0.25
  const pastColor = overlayColor === "growth" ? "#2563eb" : "#94a3b8"      // blue-600 / slate-400
  const pastFillOpacity = overlayColor === "growth" ? 0.3 : 0.15

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={compact ? { top: 8, right: 8, bottom: 8, left: 8 } : undefined}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: compact ? 11 : 15, fill: "#6b7280" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            {/* 背景: 最大値ポリゴン（全モード共通の視覚スキャフォールディング） */}
            <Radar
              dataKey="ringMax"
              stroke="none"
              fill="#cbd5e1"
              fillOpacity={0.18}
              isAnimationActive={false}
              legendType="none"
            />
            {isOverlay && (
              <Radar
                name={pastLabel}
                dataKey="past"
                stroke={pastColor}
                fill={pastColor}
                fillOpacity={pastFillOpacity}
                strokeWidth={2}
                strokeDasharray={overlayColor === "growth" ? undefined : "4 4"}
                isAnimationActive={true}
                animationDuration={600}
                animationEasing="ease-in-out"
              />
            )}
            <Radar
              name={isOverlay ? currentLabel : "QCDES"}
              dataKey="current"
              stroke={currentColor}
              fill={currentColor}
              fillOpacity={currentFillOpacity}
              strokeWidth={2}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
            {isOverlay && !compact && (
              <Legend wrapperStyle={{ fontSize: 12 }} iconType="line" />
            )}
          </RadarChart>
        </ResponsiveContainer>
      </div>
      <p className={`text-center text-gray-500 mt-1 shrink-0 ${compact ? "text-xs" : "text-sm"}`}>
        {isOverlay && pastAvg !== null ? (
          <>
            <span className="text-blue-600 font-medium">{pastAvg}</span>
            <span className="mx-1 text-gray-400">→</span>
            <span className="text-rose-600 font-medium">{avg}</span>
            {overlayColor === "growth" && growthDelta !== 0 && (
              <span className={growthDelta > 0 ? "ml-2 text-emerald-600 font-medium" : "ml-2 text-rose-600 font-medium"}>
                ({growthDelta > 0 ? `+${growthDelta}` : growthDelta})
              </span>
            )}
          </>
        ) : (
          <>QCDES 平均: {avg} / 100</>
        )}
      </p>
    </div>
  )
}
