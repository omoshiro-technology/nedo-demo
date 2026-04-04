"use client"

import { useState, useRef } from "react"
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
// 色マッピング（明るめ）
// ============================================================

const LEVEL_BG: Record<SkillLevel, string> = {
  1: "bg-slate-100",
  2: "bg-sky-200",
  3: "bg-sky-400",
  4: "bg-indigo-500",
}

const LEVEL_TEXT: Record<SkillLevel, string> = {
  1: "text-slate-400",
  2: "text-sky-800",
  3: "text-white",
  4: "text-white",
}

const LEVEL_BORDER: Record<SkillLevel, string> = {
  1: "border-slate-200",
  2: "border-sky-300",
  3: "border-sky-500",
  4: "border-indigo-600",
}

// ============================================================
// メインコンポーネント
// ============================================================

export function SkillHeatmap({ profile }: Props) {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  const skillsByCategory = getSkillsByCategory()

  const handleMouseEnter = (skillId: string, e: React.MouseEvent) => {
    setHoveredSkill(skillId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltipPos({
      x: rect.left + rect.width / 2,
      y: rect.top - 4,
    })
  }

  const handleMouseLeave = () => {
    setHoveredSkill(null)
  }

  return (
    <div ref={containerRef} className="space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5 relative">
        <h2 className="text-sm font-bold text-slate-800 mb-1">
          スキル習熟度マップ
        </h2>
        <p className="text-xs text-slate-400 mb-4">
          セルをホバ��すると全レベルの詳細が表示されます
        </p>

        {/* 凡例 */}
        <div className="flex gap-4 mb-4">
          {([1, 2, 3, 4] as SkillLevel[]).map((lv) => (
            <div key={lv} className="flex items-center gap-1.5">
              <div className={`w-3.5 h-3.5 rounded-sm ${LEVEL_BG[lv]} border ${LEVEL_BORDER[lv]}`} />
              <span className="text-[11px] text-slate-500">
                Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
              </span>
            </div>
          ))}
        </div>

        {/* 2Dヒートマップ — コンパクト */}
        <div className="overflow-x-auto">
          {SKILL_CATEGORIES.map((category) => {
            const skills = skillsByCategory.get(category.id) ?? []
            return (
              <div key={category.id} className="flex items-center gap-0 mb-0.5">
                {/* カ���ゴリラベル */}
                <div className="w-24 shrink-0 pr-2 text-right">
                  <span className="text-[10px] font-medium text-slate-500 leading-none">
                    {category.name}
                  </span>
                </div>
                {/* スキルセル */}
                <div className="flex gap-[2px]">
                  {skills.map((skill) => {
                    const proficiency = profile.proficiencies[skill.id]
                    const level = (proficiency?.currentLevel ?? 1) as SkillLevel
                    const isHovered = hoveredSkill === skill.id
                    return (
                      <div
                        key={skill.id}
                        className={`
                          w-[56px] h-[48px] rounded-[4px] cursor-pointer
                          flex items-center justify-center
                          border transition-all
                          ${LEVEL_BG[level]} ${LEVEL_BORDER[level]}
                          ${isHovered ? "ring-2 ring-indigo-400 scale-110 z-10" : "hover:brightness-95"}
                        `}
                        onMouseEnter={(e) => handleMouseEnter(skill.id, e)}
                        onMouseLeave={handleMouseLeave}
                      >
                        <span
                          className={`text-[9px] font-medium leading-[1.2] text-center px-0.5 select-none ${LEVEL_TEXT[level]}`}
                        >
                          {skill.name.length > 5
                            ? skill.name.slice(0, 5)
                            : skill.name}
                        </span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
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

      {/* レベル定義の説明 */}
      <LevelGuide />
    </div>
  )
}

// ============================================================
// ツールチッ��� — 全レベル表示 + 明るいUI
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
  const currentLevel = (proficiency?.currentLevel ?? 1) as SkillLevel
  const categoryName =
    SKILL_CATEGORIES.find((c) => c.id === skill.categoryId)?.name ?? ""

  const TOOLTIP_LEVEL_BG: Record<SkillLevel, string> = {
    1: "bg-slate-50 border-slate-200",
    2: "bg-sky-50 border-sky-200",
    3: "bg-sky-50 border-sky-300",
    4: "bg-indigo-50 border-indigo-200",
  }

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: "translate(-50%, -100%)",
      }}
    >
      <div className="bg-white rounded-xl shadow-lg border border-slate-200 p-4 w-[340px]">
        {/* ヘッダー */}
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-[10px] text-slate-400">{categoryName}</div>
            <div className="text-sm font-bold text-slate-800">{skill.name}</div>
          </div>
          <span
            className={`shrink-0 px-2 py-0.5 rounded text-xs font-bold ${LEVEL_BG[currentLevel]} ${LEVEL_TEXT[currentLevel]} border ${LEVEL_BORDER[currentLevel]}`}
          >
            Lv.{currentLevel} {SKILL_LEVEL_LABELS[currentLevel]}
          </span>
        </div>

        {/* 全レベルの詳細 */}
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
                    ? `${TOOLTIP_LEVEL_BG[lv]} ring-1 ring-indigo-300`
                    : isCompleted
                      ? "bg-slate-50/50 border-slate-100"
                      : "bg-white border-slate-100"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {/* レベルバッジ */}
                  <span
                    className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                      isCurrent
                        ? `${LEVEL_BG[lv]} ${LEVEL_TEXT[lv]}`
                        : isCompleted
                          ? "bg-emerald-100 text-emerald-600"
                          : "bg-slate-100 text-slate-400"
                    }`}
                  >
                    {isCompleted ? "✓" : ""} Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
                  </span>
                  {isCurrent && (
                    <span className="text-[9px] font-medium text-indigo-500">
                      ← 現在
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
                    → {levelDef.nextStep}
                  </p>
                )}
              </div>
            )
          })}
        </div>

        {proficiency && proficiency.touchCount > 0 && (
          <div className="mt-2 text-[10px] text-slate-400 text-right">
            {proficiency.touchCount} 回のセッションで接触
          </div>
        )}
      </div>
      {/* 矢印 */}
      <div className="flex justify-center">
        <div className="w-2.5 h-2.5 bg-white border-b border-r border-slate-200 rotate-45 -mt-[6px]" />
      </div>
    </div>
  )
}

// ============================================================
// レベル定義の説明
// ============================================================

const LEVEL_GUIDE: Array<{
  level: SkillLevel
  name: string
  description: string
  criteria: string
}> = [
  {
    level: 1,
    name: "認知",
    description: "そのスキル領域の存在と基本的な概念を知っている段階。",
    criteria:
      "用語や基本原理を聞いたことがある。マニュアルや指示に従って作業できるが、理由の説明はできない。",
  },
  {
    level: 2,
    name: "理解",
    description: "なぜそうするのかを含めて論理的に説明できる段階。",
    criteria:
      "原理・根拠を理解し、標準的な状況で自律的に判断できる。他者に概要を教えられる。",
  },
  {
    level: 3,
    name: "応用",
    description: "非定型な状況でも自ら論点を立てて対処できる段階。",
    criteria:
      "前例のない状況で仮説を立て、複数の選択肢を比較して最適解を導ける。改���提案や後輩指導ができる。",
  },
  {
    level: 4,
    name: "統合",
    description: "複数の領域を横断的に俯瞰し、組織をリードできる段階。",
    criteria:
      "異なる専門領域のトレードオフを統合的に判断し、戦略や仕組みを設計できる。組織の技術方針に影響を与えられる。",
  },
]

function LevelGuide() {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      <h3 className="text-xs font-bold text-slate-700 mb-3">
        習熟レベルの定義
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {LEVEL_GUIDE.map((item) => (
          <div
            key={item.level}
            className={`rounded-lg border p-3 ${LEVEL_BORDER[item.level]} bg-gradient-to-b from-white to-slate-50/50`}
          >
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2 py-0.5 rounded text-xs font-bold ${LEVEL_BG[item.level]} ${LEVEL_TEXT[item.level]}`}
              >
                Lv.{item.level}
              </span>
              <span className="text-sm font-bold text-slate-800">
                {item.name}
              </span>
            </div>
            <p className="text-xs text-slate-600 mb-1.5">{item.description}</p>
            <p className="text-[11px] text-slate-400">{item.criteria}</p>
          </div>
        ))}
      </div>
    </div>
  )
}
