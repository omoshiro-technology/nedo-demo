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
    const delta = past != null ? current - past : null
    return {
      axis: d.axis,
      current,
      past,
      delta,
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
              tick={(tickProps: { x: number; y: number; textAnchor: string; payload: { value: string; index: number } }) => {
                const { x, y, textAnchor, payload } = tickProps
                const datum = data[payload.index]
                const delta = datum?.delta
                const labelFont = compact ? 11 : 15
                const showChip = isOverlay && delta != null && delta !== 0
                const isUp = (delta ?? 0) > 0
                const absDelta = Math.abs(delta ?? 0)
                // 大きさで chip サイズを段階化
                const chipScale = absDelta >= 30 ? 1.3 : absDelta >= 15 ? 1.15 : 1
                const chipFont = (compact ? 11 : 13) * chipScale
                const chipText = `${isUp ? "▲" : "▼"} ${isUp ? "+" : ""}${delta}`
                const chipPadX = 8
                const chipH = chipFont + 8
                const chipW = chipText.length * (chipFont * 0.6) + chipPadX * 2
                const chipDx = textAnchor === "middle" ? 0 : textAnchor === "end" ? -chipW / 2 : chipW / 2
                const chipDy = labelFont + 8
                const chipFill = isUp ? "#fee2e2" : "#dbeafe"
                const chipStroke = isUp ? "#dc2626" : "#2563eb"
                return (
                  <g transform={`translate(${x},${y})`}>
                    <text textAnchor={textAnchor} fill="#374151" fontSize={labelFont} fontWeight="500">
                      {payload.value}
                    </text>
                    {showChip && (
                      <g transform={`translate(${chipDx}, ${chipDy})`}>
                        <rect
                          x={-chipW / 2}
                          y={0}
                          width={chipW}
                          height={chipH}
                          rx={chipH / 2}
                          fill={chipFill}
                          stroke={chipStroke}
                          strokeWidth={1.2}
                        />
                        <text
                          x={0}
                          y={chipH / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={chipFont}
                          fontWeight="700"
                          fill={chipStroke}
                        >
                          {chipText}
                        </text>
                      </g>
                    )}
                  </g>
                )
              }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            {isOverlay && (
              <Radar
                name={pastLabel}
                dataKey="past"
                stroke={pastColor}
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 4"
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
              fillOpacity={isOverlay ? 0.32 : currentFillOpacity}
              strokeWidth={isOverlay ? 2.5 : 2}
              isAnimationActive={true}
              animationDuration={600}
              animationEasing="ease-in-out"
            />
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
