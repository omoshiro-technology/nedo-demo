"use client"

import { useState } from "react"
import type { SkillProfile, SkillLevel } from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import {
  SKILL_CATEGORIES,
  SKILL_MAP,
  getSkillsByCategory,
} from "@/lib/compath/domain/skillMap/skillCatalog"

type Props = {
  profile: SkillProfile
}

// ============================================================
// 色マッピング
// ============================================================

export const LEVEL_BG: Record<SkillLevel, string> = {
  1: "bg-slate-100",
  2: "bg-sky-200",
  3: "bg-sky-400",
  4: "bg-indigo-500",
}

export const LEVEL_TEXT: Record<SkillLevel, string> = {
  1: "text-slate-400",
  2: "text-sky-800",
  3: "text-white",
  4: "text-white",
}

export const LEVEL_BORDER: Record<SkillLevel, string> = {
  1: "border-slate-200",
  2: "border-sky-300",
  3: "border-sky-500",
  4: "border-indigo-600",
}

// ============================================================
// グリッド部分のみ（カードラッパーなし）
// ============================================================

export function SkillHeatmapGrid({ profile }: Props) {
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null)

  const skillsByCategory = getSkillsByCategory()

  return (
    <>
      {SKILL_CATEGORIES.map((category) => {
        const skills = skillsByCategory.get(category.id) ?? []
        return (
          <div key={category.id} className="flex items-center gap-0 mb-[2px]">
            {/* カテゴリラベル */}
            <div className="w-28 shrink-0 pr-2 text-right">
              <span className="text-[10px] font-medium text-slate-500 leading-none">
                {category.name}
              </span>
            </div>
            {/* スキルセル */}
            <div className="flex gap-[2px]">
              {skills.map((skill) => {
                const proficiency = profile.proficiencies[skill.id]
                const level = (proficiency?.currentLevel ?? 1) as SkillLevel
                const isSelected = selectedSkill === skill.id
                return (
                  <div
                    key={skill.id}
                    className={`
                      w-[60px] h-[44px] rounded-[4px] cursor-pointer
                      flex items-center justify-center
                      border transition-all
                      ${LEVEL_BG[level]} ${LEVEL_BORDER[level]}
                      ${isSelected ? "ring-2 ring-indigo-400 scale-110 z-10" : "hover:brightness-95"}
                    `}
                    onClick={() => setSelectedSkill(skill.id)}
                  >
                    <span
                      className={`text-[9px] font-medium leading-[1.2] text-center px-0.5 select-none ${LEVEL_TEXT[level]}`}
                    >
                      {skill.name.length > 6
                        ? skill.name.slice(0, 6)
                        : skill.name}
                    </span>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })}

      {/* スキル詳細モーダル */}
      {selectedSkill && (
        <SkillDetailModal
          skillId={selectedSkill}
          profile={profile}
          onClose={() => setSelectedSkill(null)}
        />
      )}
    </>
  )
}

// ============================================================
// レベル定義ガイド（エクスポート）
// ============================================================

const LEVEL_GUIDE_DATA: Array<{
  level: SkillLevel
  description: string
  criteria: string
}> = [
  {
    level: 1,
    description: "基本手順に従い定型作業を遂行できる段階。",
    criteria:
      "マニュアルや指示に沿って作業できるが、判断理由の説明はまだ難しい。",
  },
  {
    level: 2,
    description: "標準的な問題を自力で特定・解決できる段階。",
    criteria:
      "原理を理解し、標準的な状況で自律的に判断・対処できる。基本的な問題解決が可能。",
  },
  {
    level: 3,
    description: "非定型な問題にQCDEの観点から解決策を立案できる段階。",
    criteria:
      "前例のない状況でも仮説を立て、品質・コスト・納期・環境のトレードオフを評価して最適解を導ける。",
  },
  {
    level: 4,
    description: "複数領域を横断しQCDEの最適バランスで問題解決できる段階。",
    criteria:
      "異なる専門領域の問題を統合的に判断し、工程全体の最適解を導ける。技術的課題を確実に解決できる。",
  },
]

export function LevelGuide() {
  return (
    <div className="grid grid-cols-4 gap-2">
      {LEVEL_GUIDE_DATA.map((item) => (
        <div
          key={item.level}
          className={`rounded-lg border p-2 ${LEVEL_BORDER[item.level]} bg-gradient-to-b from-white to-slate-50/50`}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span
              className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${LEVEL_BG[item.level]} ${LEVEL_TEXT[item.level]}`}
            >
              Lv.{item.level}
            </span>
            <span className="text-[11px] font-bold text-slate-800">
              {SKILL_LEVEL_LABELS[item.level]}
            </span>
          </div>
          <p className="text-[10px] text-slate-600 leading-relaxed mb-0.5">{item.description}</p>
          <p className="text-[9px] text-slate-400 leading-relaxed">{item.criteria}</p>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// 凡例（エクスポート）
// ============================================================

export function HeatmapLegend() {
  return (
    <div className="flex gap-3">
      {([1, 2, 3, 4] as SkillLevel[]).map((lv) => (
        <div key={lv} className="flex items-center gap-1">
          <div className={`w-3 h-3 rounded-sm ${LEVEL_BG[lv]} border ${LEVEL_BORDER[lv]}`} />
          <span className="text-[10px] text-slate-500">
            Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
          </span>
        </div>
      ))}
    </div>
  )
}

// ============================================================
// スキル詳細モーダル
// ============================================================

function SkillDetailModal({
  skillId,
  profile,
  onClose,
}: {
  skillId: string
  profile: SkillProfile
  onClose: () => void
}) {
  const skill = SKILL_MAP.get(skillId)
  if (!skill) return null

  const proficiency = profile.proficiencies[skillId]
  const currentLevel = (proficiency?.currentLevel ?? 1) as SkillLevel
  const categoryName =
    SKILL_CATEGORIES.find((c) => c.id === skill.categoryId)?.name ?? ""

  const MODAL_LEVEL_BG: Record<SkillLevel, string> = {
    1: "bg-slate-50 border-slate-200",
    2: "bg-sky-50 border-sky-200",
    3: "bg-sky-50 border-sky-300",
    4: "bg-indigo-50 border-indigo-200",
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl border border-slate-200 p-5 w-[380px] max-h-[80vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <div className="text-[10px] text-slate-400">{categoryName}</div>
            <div className="text-sm font-bold text-slate-800">{skill.name}</div>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${LEVEL_BG[currentLevel]} ${LEVEL_TEXT[currentLevel]} border ${LEVEL_BORDER[currentLevel]}`}
            >
              Lv.{currentLevel} {SKILL_LEVEL_LABELS[currentLevel]}
            </span>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 text-lg leading-none"
            >
              &times;
            </button>
          </div>
        </div>

        <div className="space-y-1.5">
          {([1, 2, 3, 4] as SkillLevel[]).map((lv) => {
            const levelDef = skill.levels[lv]
            const isCurrent = lv === currentLevel
            const isCompleted = lv < currentLevel
            const isFuture = lv > currentLevel

            return (
              <div
                key={lv}
                className={`rounded-lg border p-2.5 transition-all ${
                  isCurrent
                    ? `${MODAL_LEVEL_BG[lv]} ring-1 ring-indigo-300`
                    : isCompleted
                      ? "bg-slate-50/50 border-slate-100"
                      : "bg-white border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? `${LEVEL_BG[lv]} ${LEVEL_TEXT[lv]}`
                        : isCompleted
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? "\u2713" : ""} Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-medium text-indigo-500">
                      &larr; 現在
                    </span>
                  )}
                </div>
                <p
                  className={`text-[11px] leading-relaxed ${
                    isFuture ? "text-slate-400" : "text-slate-600"
                  }`}
                >
                  {levelDef.description}
                </p>
                {isCurrent && lv < 4 && (
                  <p className="text-[10px] text-amber-600 mt-1 font-medium">
                    &rarr; {levelDef.nextStep}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {proficiency && proficiency.touchCount > 0 && (
          <div className="mt-3 text-[10px] text-slate-400 text-right">
            {proficiency.touchCount} 回のセッションで接触
          </div>
        )}
      </div>
    </div>
  )
}
