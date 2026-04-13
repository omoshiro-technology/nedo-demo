"use client"

/**
 * スキルマップ — 16:9 フルスクリーン対応レイアウト
 *
 * 全要素をパーセント / flex で制御し、どの解像度でも
 * ビューポートいっぱいに広がる設計。
 *
 * 構成:
 *   ヘッダー      : auto (~44px)
 *   メインカード   : flex-1 (残り全部)
 *     ┣ 上段 (flex-1): グリッド(65%) + 情報パネル(35%)
 *     ┗ 下段 (auto)  : レベル定義ガイド
 */

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  SkillProfile,
  SkillLevel,
} from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import {
  SKILL_CATEGORIES,
  SKILL_MAP,
  getSkillsByCategory,
} from "@/lib/compath/domain/skillMap/skillCatalog"
import { QCDESRadar } from "./QCDESRadar"

type SampleUser = { id: string; name: string; role: string }

// ============================================================
// 色定義
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

export default function SkillMapDashboard() {
  const [users, setUsers] = useState<SampleUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [profile, setProfile] = useState<SkillProfile | null>(null)
  const [compareProfile, setCompareProfile] = useState<SkillProfile | null>(null)
  const [compareDate, setCompareDate] = useState<string>("")
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [transitioning, setTransitioning] = useState(false)
  const fetchRef = useRef(0)

  useEffect(() => {
    fetch("/api/compath/skill-map/users")
      .then((r) => r.json())
      .then((data) => {
        const list: SampleUser[] = data.users ?? []
        setUsers(list)
        if (list.length > 0 && !selectedUserId) {
          setSelectedUserId(list[0].id)
        }
      })
      .catch(() => {})
  }, [])

  const fetchData = useCallback(async () => {
    if (!selectedUserId) return
    const fetchId = ++fetchRef.current
    if (!profile) setInitialLoading(true)
    else setTransitioning(true)
    setError(null)
    try {
      const res = await fetch(`/api/compath/skill-map/profile?userId=${selectedUserId}`)
      if (fetchRef.current !== fetchId) return
      if (res.ok) setProfile(await res.json())
      else setProfile(null)
    } catch {
      if (fetchRef.current !== fetchId) return
      setError("データの取得に失敗しました。")
    } finally {
      if (fetchRef.current === fetchId) {
        setInitialLoading(false)
        setTransitioning(false)
      }
    }
  }, [selectedUserId, profile])

  // 比較日付が変わったら比較用プロファイルを取得
  useEffect(() => {
    if (!selectedUserId || !compareDate) {
      setCompareProfile(null)
      return
    }
    fetch(`/api/compath/skill-map/profile?userId=${selectedUserId}&asOf=${compareDate}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => setCompareProfile(data))
      .catch(() => setCompareProfile(null))
  }, [selectedUserId, compareDate])

  useEffect(() => {
    if (selectedUserId) fetchData()
  }, [selectedUserId]) // eslint-disable-line react-hooks/exhaustive-deps

  const hasData = profile && profile.totalAssessments > 0
  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ヘッダー */}
      <div className="flex items-center border-b border-gray-200 bg-white px-5 py-2.5 shrink-0">
        <h1 className="text-xl font-bold text-gray-900 mr-4">スキルマップ</h1>
        <div className="ml-auto flex items-center gap-3">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="text-base border border-gray-200 rounded-md px-3 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>{u.name}</option>
            ))}
          </select>
          {selectedUser && (
            <span className="text-base text-gray-400">{selectedUser.role}</span>
          )}
          <div className="flex items-center gap-2 ml-4 border-l pl-4">
            <label className="text-sm text-gray-500 whitespace-nowrap">比較基準日:</label>
            <input
              type="date"
              value={compareDate}
              onChange={(e) => setCompareDate(e.target.value)}
              className="text-sm border border-gray-200 rounded-md px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
            {compareDate && (
              <button
                onClick={() => setCompareDate("")}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
            {compareDate && compareProfile && (
              <span className="text-xs text-emerald-600 font-medium">差分表示中</span>
            )}
          </div>
        </div>
      </div>

      {/* メイン — flex-1 でビューポート残り全部使う */}
      <div className="flex-1 min-h-0 p-3">
        {initialLoading ? (
          <Placeholder text="読み込み中..." />
        ) : error && !hasData ? (
          <Placeholder text={error} />
        ) : !hasData ? (
          <Placeholder text="まだスキルアセスメントのデータがありません。" />
        ) : (
          <div className={`h-full transition-opacity duration-200 ${transitioning ? "opacity-60" : "opacity-100"}`}>
            <FullScreenCard profile={profile} compareProfile={compareProfile} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// フルスクリーンカード
// ============================================================

function FullScreenCard({ profile, compareProfile }: { profile: SkillProfile; compareProfile?: SkillProfile | null }) {
  const [hoveredSkill, setHoveredSkill] = useState<string | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 })

  // 差分計算: compareProfile(過去)と現在のprofileを比較し、上がったスキルを特定
  const improvedSkills = new Set<string>()
  if (compareProfile) {
    for (const [skillId, current] of Object.entries(profile.proficiencies)) {
      const past = compareProfile.proficiencies[skillId]
      if (past && current.currentLevel > past.currentLevel) {
        improvedSkills.add(skillId)
      }
    }
  }

  const skillsByCategory = getSkillsByCategory()

  const proficiencies = Object.values(profile.proficiencies)
  const latestScores = proficiencies
    .filter((p) => p.latestScores)
    .sort((a, b) => new Date(b.lastAssessedAt).getTime() - new Date(a.lastAssessedAt).getTime())
    [0]?.latestScores ?? null

  const handleMouseEnter = (skillId: string, e: React.MouseEvent) => {
    setHoveredSkill(skillId)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setTooltipPos({ x: rect.left + rect.width / 2, y: rect.top - 4 })
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 h-full flex flex-col">
      {/* タイトル + 凡例 */}
      <div className="flex items-center justify-between mb-2 shrink-0">
        <h2 className="text-lg font-bold text-slate-800">スキル習熟度マップ</h2>
        <div className="flex gap-4">
          {([1, 2, 3, 4] as SkillLevel[]).map((lv) => (
            <div key={lv} className="flex items-center gap-1.5">
              <div className={`w-4 h-4 rounded-sm ${LEVEL_BG[lv]} border ${LEVEL_BORDER[lv]}`} />
              <span className="text-sm text-slate-500">Lv.{lv} {SKILL_LEVEL_LABELS[lv]}</span>
            </div>
          ))}
          {improvedSkills.size > 0 && (
            <div className="flex items-center gap-1.5 ml-2 pl-2 border-l">
              <div className="w-4 h-4 rounded-sm bg-emerald-200 border border-emerald-500 ring-1 ring-emerald-400" />
              <span className="text-sm font-medium text-emerald-700">スキル向上（{improvedSkills.size}件）</span>
            </div>
          )}
        </div>
      </div>

      {/* 上段: グリッド(65%) + 情報パネル(35%) — flex-1 で残りを埋める */}
      <div className="flex-1 min-h-0 flex gap-4">
        {/* 左: ヒートマップグリッド — 9行 x 8列がビューポートに合わせて伸縮 */}
        <div className="w-[65%] flex flex-col gap-[2px]">
          {SKILL_CATEGORIES.map((category) => {
            const skills = skillsByCategory.get(category.id) ?? []
            return (
              <div key={category.id} className="flex-1 flex items-stretch min-h-0">
                {/* カテゴリラベル — 15%幅 */}
                <div className="w-[15%] shrink-0 flex items-center justify-end pr-2">
                  <span className="text-sm font-medium text-slate-500 leading-tight text-right">
                    {category.name}
                  </span>
                </div>
                {/* セル群 — 85%幅を8等分 */}
                <div className="flex-1 flex gap-[2px]">
                  {skills.map((skill) => {
                    const prof = profile.proficiencies[skill.id]
                    const level = (prof?.currentLevel ?? 1) as SkillLevel
                    const isHovered = hoveredSkill === skill.id
                    const isImproved = improvedSkills.has(skill.id)
                    const pastLevel = compareProfile?.proficiencies[skill.id]?.currentLevel
                    return (
                      <div
                        key={skill.id}
                        className={`
                          flex-1 rounded-[4px] cursor-pointer overflow-hidden
                          flex items-center justify-center
                          border transition-all px-1 relative
                          ${isImproved ? "bg-emerald-200 border-emerald-500 ring-2 ring-emerald-400" : `${LEVEL_BG[level]} ${LEVEL_BORDER[level]}`}
                          ${isHovered ? "ring-2 ring-indigo-400 scale-105 z-10" : !isImproved ? "hover:brightness-95" : ""}
                        `}
                        onMouseEnter={(e) => handleMouseEnter(skill.id, e)}
                        onMouseLeave={() => setHoveredSkill(null)}
                      >
                        <span className={`text-xs font-medium truncate select-none ${isImproved ? "text-emerald-900" : LEVEL_TEXT[level]}`}>
                          {skill.name}
                        </span>
                        {isImproved && (
                          <span className="absolute top-0 right-0.5 text-[9px] font-bold text-emerald-700">
                            Lv.{pastLevel}→{level}
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {/* 右: レーダーチャートのみ — 35%幅 */}
        <div className="w-[35%] min-h-0 rounded-lg border border-gray-100 bg-gray-50/50 p-4 flex flex-col">
          <h3 className="text-base font-bold text-gray-600 mb-1 shrink-0">観点網羅度（QCDES）</h3>
          <div className="flex-1 min-h-0">
            {latestScores ? (
              <QCDESRadar scores={latestScores} />
            ) : (
              <div className="h-full flex items-center justify-center text-sm text-gray-400">データなし</div>
            )}
          </div>
        </div>
      </div>

      {/* 下段: レベル定義 — shrink-0 で固定高 */}
      <div className="shrink-0 mt-3 pt-3 border-t border-slate-100">
        <h3 className="text-sm font-bold text-slate-500 mb-2">習熟レベルの定義</h3>
        <div className="grid grid-cols-4 gap-2">
          {LEVEL_GUIDE.map((item) => (
            <div key={item.level} className={`rounded-lg border p-2.5 ${LEVEL_BORDER[item.level]} bg-gradient-to-b from-white to-slate-50/50`}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className={`px-2 py-0.5 rounded text-xs font-bold ${LEVEL_BG[item.level]} ${LEVEL_TEXT[item.level]}`}>
                  Lv.{item.level}
                </span>
                <span className="text-base font-bold text-slate-800">{SKILL_LEVEL_LABELS[item.level]}</span>
              </div>
              <p className="text-sm text-slate-600 leading-relaxed">{item.description}</p>
              <p className="text-xs text-slate-400 leading-relaxed">{item.criteria}</p>
            </div>
          ))}
        </div>
      </div>

      {/* ツールチップ */}
      {hoveredSkill && <SkillTooltip skillId={hoveredSkill} profile={profile} position={tooltipPos} />}
    </div>
  )
}

// ============================================================
// レベルガイドデータ
// ============================================================

const LEVEL_GUIDE: Array<{ level: SkillLevel; description: string; criteria: string }> = [
  { level: 1, description: "基本手順に従い定型作業を遂行できる段階。", criteria: "マニュアルや指示に沿って作業できるが、判断理由の説明はまだ難しい。" },
  { level: 2, description: "標準的な問題を自力で特定・解決できる段階。", criteria: "原理を理解し、標準的な状況で自律的に判断・対処できる。" },
  { level: 3, description: "非定型な問題にQCDEの観点から解決策を立案できる段階。", criteria: "前例のない状況でも仮説を立て、QCDEのトレードオフを評価して最適解を導ける。" },
  { level: 4, description: "複数領域を横断しQCDEの最適バランスで問題解決できる段階。", criteria: "異なる専門領域の問題を統合的に判断し、工程全体の最適解を導ける。" },
]

// ============================================================
// ツールチップ
// ============================================================

function SkillTooltip({ skillId, profile, position }: { skillId: string; profile: SkillProfile; position: { x: number; y: number } }) {
  const skill = SKILL_MAP.get(skillId)
  if (!skill) return null
  const proficiency = profile.proficiencies[skillId]
  const currentLevel = (proficiency?.currentLevel ?? 1) as SkillLevel
  const categoryName = SKILL_CATEGORIES.find((c) => c.id === skill.categoryId)?.name ?? ""

  const TT_BG: Record<SkillLevel, string> = { 1: "bg-slate-50 border-slate-200", 2: "bg-sky-50 border-sky-200", 3: "bg-sky-50 border-sky-300", 4: "bg-indigo-50 border-indigo-200" }
  const evidence = proficiency?.levelUpEvidence?.filter(ev => ev.source === "compath_decision_navigator") ?? []
  const hasEvidence = evidence.length > 0

  // 画面上部にスペースが足りなければ下方向に表示
  const showBelow = position.y < 350

  // 横方向のはみ出し防止
  const tooltipWidth = hasEvidence ? 820 : 420
  const halfW = tooltipWidth / 2
  const vw = typeof window !== "undefined" ? window.innerWidth : 1920
  const clampedX = Math.max(halfW + 8, Math.min(position.x, vw - halfW - 8))

  return (
    <div className="fixed z-50 pointer-events-none" style={{ left: `${clampedX}px`, top: `${position.y}px`, transform: showBelow ? "translate(-50%, 16px)" : "translate(-50%, -100%)" }}>
      {/* 下向き表示のとき矢印を上に */}
      {showBelow && (
        <div className="flex justify-center">
          <div className="w-2.5 h-2.5 bg-white border-t border-l border-slate-200 rotate-45 mb-[-6px]" />
        </div>
      )}
      <div className={`bg-white rounded-xl shadow-lg border border-slate-200 p-5 ${hasEvidence ? "w-[820px]" : "w-[420px]"}`}>
        <div className="flex items-center justify-between gap-3 mb-3">
          <div>
            <div className="text-sm text-slate-400">{categoryName}</div>
            <div className="text-lg font-bold text-slate-800">{skill.name}</div>
          </div>
          <span className={`shrink-0 px-3 py-1 rounded text-base font-bold ${LEVEL_BG[currentLevel]} ${LEVEL_TEXT[currentLevel]} border ${LEVEL_BORDER[currentLevel]}`}>
            Lv.{currentLevel} {SKILL_LEVEL_LABELS[currentLevel]}
          </span>
        </div>
        <div className={hasEvidence ? "flex gap-4" : ""}>
          <div className={hasEvidence ? "flex-1 min-w-0" : ""}>
            <div className="space-y-1.5">
              {([1, 2, 3, 4] as SkillLevel[]).map((lv) => {
                const def = skill.levels[lv]
                const isCurrent = lv === currentLevel
                const isCompleted = lv < currentLevel
                const isFuture = lv > currentLevel
                return (
                  <div key={lv} className={`rounded-lg border p-2.5 ${isCurrent ? `${TT_BG[lv]} ring-1 ring-indigo-300` : isCompleted ? "bg-slate-50/50 border-slate-100" : "bg-white border-slate-100"}`}>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-sm font-bold px-2 py-0.5 rounded ${isCurrent ? `${LEVEL_BG[lv]} ${LEVEL_TEXT[lv]}` : isCompleted ? "bg-emerald-100 text-emerald-600" : "bg-slate-100 text-slate-400"}`}>
                        {isCompleted ? "\u2713" : ""} Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
                      </span>
                      {isCurrent && <span className="text-sm font-medium text-indigo-500">&larr; 現在</span>}
                    </div>
                    <p className={`text-sm leading-relaxed ${isFuture ? "text-slate-400" : "text-slate-600"}`}>{def.description}</p>
                    {isCurrent && lv < 4 && (
                      <div className="mt-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200">
                        <div className="text-xs font-bold text-amber-700 mb-1">
                          📈 Lv.{lv + 1} {SKILL_LEVEL_LABELS[(lv + 1) as SkillLevel]} に上がるには
                        </div>
                        <p className="text-sm text-amber-800 leading-relaxed font-medium">{def.nextStep}</p>
                        {skill.levels[(lv + 1) as SkillLevel] && (
                          <p className="text-xs text-amber-600 mt-1">
                            到達基準: {skill.levels[(lv + 1) as SkillLevel].description}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
            {proficiency && proficiency.touchCount > 0 && (
              <div className="mt-2 text-sm text-slate-400 text-right">{proficiency.touchCount} 回のセッションで接触</div>
            )}
          </div>
          {hasEvidence && (
            <div className="w-[370px] shrink-0 border-l border-emerald-200 pl-4">
              <div className="text-sm font-bold text-emerald-700 mb-2">履歴</div>
              <div className="space-y-2 max-h-[350px] overflow-y-auto">
                {evidence.map((ev, i) => (
                  <div key={i} className="bg-emerald-50 rounded-lg border border-emerald-100 p-2.5">
                    <div className="text-sm font-medium text-slate-700 mb-0.5">{ev.project}</div>
                    <p className="text-xs text-slate-500 leading-relaxed">{ev.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
      {!showBelow && (
        <div className="flex justify-center">
          <div className="w-2.5 h-2.5 bg-white border-b border-r border-slate-200 rotate-45 -mt-[6px]" />
        </div>
      )}
    </div>
  )
}

// ============================================================
// 小コンポーネント
// ============================================================

function Placeholder({ text }: { text: string }) {
  return (
    <div className="flex items-center justify-center h-full text-sm text-gray-400">{text}</div>
  )
}
