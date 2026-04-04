"use client"

import { useState } from "react"
import type { SkillProfile, SkillLevel } from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import {
  SKILL_CATEGORIES,
  SKILL_DEFINITIONS,
  SKILL_MAP,
  getSkillsByCategory,
  type SkillDefinition,
} from "@/lib/compath/domain/skillMap/skillCatalog"

type Props = {
  profile: SkillProfile
}

// ============================================================
// 色マッピング
// ============================================================

const LEVEL_BG: Record<SkillLevel, string> = {
  1: "bg-gray-100",
  2: "bg-blue-200",
  3: "bg-blue-400",
  4: "bg-blue-600",
}

const LEVEL_TEXT: Record<SkillLevel, string> = {
  1: "text-gray-500",
  2: "text-blue-900",
  3: "text-white",
  4: "text-white",
}

// ============================================================
// メインコンポーネント
// ============================================================

export function SkillHeatmap({ profile }: Props) {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  const skillsByCategory = getSkillsByCategory()

  const handleMouseEnter = (skillId: string, e: React.MouseEvent) => {
    setHoveredSkill(skillId)
    const rect = (e.target as HTMLElement).getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    })
  }

  const handleMouseLeave = () => {
    setHoveredSkill(null)
  }

  // 最大列数（最もスキル数の多いカテゴリに合わせる）
  const maxSkillsInCategory = Math.max(
    ...Array.from(skillsByCategory.values()).map((s) => s.length)
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 relative">
      <h2 className="text-sm font-bold text-gray-900 mb-2">
        スキル習熟度マップ
      </h2>
      <p className="text-xs text-gray-400 mb-4">
        セルをホバーすると詳細と次のレベルに必要なことが表示されます
      </p>

      {/* 凡例 */}
      <div className="flex gap-3 mb-5">
        {([1, 2, 3, 4] as SkillLevel[]).map((lv) => (
          <div key={lv} className="flex items-center gap-1.5">
            <div className={`w-4 h-4 rounded ${LEVEL_BG[lv]}`} />
            <span className="text-xs text-gray-600">
              Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
            </span>
          </div>
        ))}
      </div>

      {/* 2Dマトリクス */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="text-left py-2 pr-3 text-xs font-medium text-gray-500 w-32 sticky left-0 bg-white z-10">
                カテゴリ
              </th>
              {Array.from({ length: maxSkillsInCategory }, (_, i) => (
                <th key={i} className="px-0.5 py-2 min-w-[56px]" />
              ))}
            </tr>
          </thead>
          <tbody>
            {SKILL_CATEGORIES.map((category) => {
              const skills = skillsByCategory.get(category.id) ?? []
              return (
                <tr key={category.id}>
                  {/* カテゴリラベル */}
                  <td className="py-1 pr-3 text-xs font-medium text-gray-700 sticky left-0 bg-white z-10 whitespace-nowrap">
                    {category.name}
                  </td>
                  {/* スキルセル */}
                  {skills.map((skill) => {
                    const proficiency = profile.proficiencies[skill.id]
                    const level = (proficiency?.currentLevel ?? 1) as SkillLevel
                    return (
                      <td key={skill.id} className="px-0.5 py-1">
                        <div
                          className={`
                            relative w-14 h-14 rounded-md cursor-pointer
                            flex items-center justify-center
                            transition-all hover:ring-2 hover:ring-blue-500 hover:scale-105
                            ${LEVEL_BG[level]}
                          `}
                          onMouseEnter={(e) => handleMouseEnter(skill.id, e)}
                          onMouseLeave={handleMouseLeave}
                        >
                          <span className={`text-[10px] font-medium leading-tight text-center px-0.5 ${LEVEL_TEXT[level]}`}>
                            {truncate(skill.name, 6)}
                          </span>
                        </div>
                      </td>
                    )
                  })}
                  {/* 空セル（列をそろえる） */}
                  {Array.from(
                    { length: maxSkillsInCategory - skills.length },
                    (_, i) => (
                      <td key={`empty-${i}`} className="px-0.5 py-1" />
                    )
                  )}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* ホバーツールチップ */}
      {hoveredSkill && (
        <SkillTooltip
          skillId={hoveredSkill}
          profile={profile}
          position={tooltipPos}
        />
      )}
    </div>
  )
}

// ============================================================
// ツールチップ
// ============================================================

function SkillTooltip({
  skillId,
  profile,
  position,
}: {
  skillId: string
  profile: SkillProfile
  position: { x: number; y: number }
}) {
  const skill = SKILL_MAP.get(skillId)
  if (!skill) return null

  const proficiency = profile.proficiencies[skillId]
  const level = (proficiency?.currentLevel ?? 1) as SkillLevel
  const levelDef = skill.levels[level]
  const categoryName =
    SKILL_CATEGORIES.find((c) => c.id === skill.categoryId)?.name ?? ""

  const isMaxLevel = level === 4

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="bg-gray-900 text-white rounded-lg shadow-xl p-4 max-w-xs">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 mb-2">
          <div>
            <div className="text-xs text-gray-400">{categoryName}</div>
            <div className="text-sm font-bold">{skill.name}</div>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${LEVEL_BG[level]} ${LEVEL_TEXT[level]}`}
          >
            Lv.{level}
          </span>
        </div>

        {/* 現在のレベル */}
        <div className="mb-3">
          <div className="text-xs text-gray-400 mb-0.5">現在のレベル</div>
          <div className="text-xs text-gray-200">{levelDef.description}</div>
        </div>

        {/* 次のステップ */}
        <div className={`rounded-md p-2 ${isMaxLevel ? "bg-green-900/30" : "bg-yellow-900/30"}`}>
          <div className={`text-xs font-medium mb-0.5 ${isMaxLevel ? "text-green-400" : "text-yellow-400"}`}>
            {isMaxLevel ? "到達状態" : "次のレベルに必要なこと"}
          </div>
          <div className="text-xs text-gray-200">{levelDef.nextStep}</div>
        </div>

        {/* 接触回数 */}
        {proficiency && proficiency.touchCount > 0 && (
          <div className="mt-2 text-xs text-gray-500">
            セッションで {proficiency.touchCount} 回接触
          </div>
        )}
      </div>
      {/* 矢印 */}
      <div className="flex justify-center">
        <div className="w-2 h-2 bg-gray-900 rotate-45 -mt-1" />
      </div>
    </div>
  )
}

// ============================================================
// ユーティリティ
// ============================================================

function truncate(str: string, maxLen: number): string {
  return str.length > maxLen ? str.slice(0, maxLen) : str
}
