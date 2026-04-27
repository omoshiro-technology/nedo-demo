"use client"

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  LabelList,
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
      ringMax: 100,
    }
  })

  const vals = Object.values(cov) as number[]
  const avg = Math.round(vals.reduce((a, b) => a + b, 0) / vals.length)

  // 色付けモード判定
  const isOverlay = !!compareScores

  // 現在 = 青塗り / 過去 = 赤点線
  const currentColor = "#2563eb"  // blue-600
  const currentFillOpacity = overlayColor === "growth" ? 0.32 : 0.25
  const pastColor = "#dc2626"      // red-600

  return (
    <div className="h-full flex flex-col">
      <div className="flex-1 min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart data={data} margin={compact ? { top: 8, right: 8, bottom: 8, left: 8 } : undefined}>
            <PolarGrid stroke="#e5e7eb" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: compact ? 11 : 15, fill: "#374151", fontWeight: 500 }}
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
                fill="none"
                strokeWidth={2}
                strokeDasharray="6 4"
                isAnimationActive={true}
                animationBegin={0}
              animationDuration={500}
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
              animationBegin={0}
              animationDuration={500}
              animationEasing="ease-in-out"
            >
              {isOverlay ? (
                <LabelList
                  dataKey="delta"
                  content={(props: { x?: number | string; y?: number | string; value?: number | string; index?: number }) => {
                    const { x: xRaw, y: yRaw, value: vRaw, index } = props
                    const x = typeof xRaw === "number" ? xRaw : Number(xRaw)
                    const y = typeof yRaw === "number" ? yRaw : Number(yRaw)
                    const value = typeof vRaw === "number" ? vRaw : vRaw == null ? null : Number(vRaw)
                    if (!Number.isFinite(x) || !Number.isFinite(y) || value == null || value === 0) return null
                    const delta = value
                    const isUp = delta > 0
                    const absDelta = Math.abs(delta)
                    const chipScale = absDelta >= 30 ? 1.25 : absDelta >= 20 ? 1.12 : 1
                    const chipFont = (compact ? 11 : 13) * chipScale
                    const chipText = `${isUp ? "+" : ""}${delta}`
                    const chipPadX = 9
                    const chipH = chipFont + 8
                    const chipW = chipText.length * (chipFont * 0.62) + chipPadX * 2
                    const chipFill = isUp ? "#d1fae5" : "#fee2e2"
                    const chipTextFill = isUp ? "#047857" : "#b91c1c"
                    const N = data.length
                    const angleRad = (Math.PI / 180) * (90 - (360 / N) * (index ?? 0))
                    // 現在値が大きい(頂点が外側)場合はチップを内側へ。軸ラベルとの衝突回避
                    const currentAtAxis = data[index ?? 0]?.current ?? 0
                    const offsetPx = currentAtAxis >= 70 ? -22 : 22
                    const finalX = x + offsetPx * Math.cos(angleRad)
                    const finalY = y - offsetPx * Math.sin(angleRad)
                    return (
                      <g key={index} transform={`translate(${finalX - chipW / 2}, ${finalY - chipH / 2})`}>
                        <rect
                          x={0}
                          y={0}
                          width={chipW}
                          height={chipH}
                          rx={chipH / 2}
                          fill={chipFill}
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <text
                          x={chipW / 2}
                          y={chipH / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={chipFont}
                          fontWeight="700"
                          fill={chipTextFill}
                        >
                          {chipText}
                        </text>
                      </g>
                    )
                  }}
                />
              ) : (
                <LabelList
                  dataKey="current"
                  content={(props: { x?: number | string; y?: number | string; value?: number | string; index?: number }) => {
                    const { x: xRaw, y: yRaw, value: vRaw, index } = props
                    const x = typeof xRaw === "number" ? xRaw : Number(xRaw)
                    const y = typeof yRaw === "number" ? yRaw : Number(yRaw)
                    const value = typeof vRaw === "number" ? vRaw : vRaw == null ? null : Number(vRaw)
                    if (!Number.isFinite(x) || !Number.isFinite(y) || value == null) return null
                    const chipFont = compact ? 11 : 13
                    const chipText = `${value}`
                    const chipPadX = 9
                    const chipH = chipFont + 8
                    const chipW = chipText.length * (chipFont * 0.62) + chipPadX * 2
                    const N = data.length
                    const angleRad = (Math.PI / 180) * (90 - (360 / N) * (index ?? 0))
                    // 値が大きい(頂点が外側)場合はチップを内側へ。軸ラベルとの衝突回避
                    const offsetPx = value >= 70 ? -22 : 22
                    const finalX = x + offsetPx * Math.cos(angleRad)
                    const finalY = y - offsetPx * Math.sin(angleRad)
                    return (
                      <g key={index} transform={`translate(${finalX - chipW / 2}, ${finalY - chipH / 2})`}>
                        <rect
                          x={0}
                          y={0}
                          width={chipW}
                          height={chipH}
                          rx={chipH / 2}
                          fill="#dbeafe"
                          stroke="#ffffff"
                          strokeWidth={1.5}
                        />
                        <text
                          x={chipW / 2}
                          y={chipH / 2}
                          textAnchor="middle"
                          dominantBaseline="central"
                          fontSize={chipFont}
                          fontWeight="700"
                          fill="#1e40af"
                        >
                          {chipText}
                        </text>
                      </g>
                    )
                  }}
                />
              )}
            </Radar>
          </RadarChart>
        </ResponsiveContainer>
      </div>
      {!isOverlay && (
        <p className={`text-center text-gray-500 mt-1 shrink-0 ${compact ? "text-xs" : "text-sm"}`}>
          QCDES 平均: {avg} / 100
        </p>
      )}
    </div>
  )
}
