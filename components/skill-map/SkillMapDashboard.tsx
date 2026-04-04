"use client"

import { useState, useEffect, useCallback } from "react"
import type {
  SkillProfile,
  SkillTimeline,
  SkillLevel,
} from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import { QCDESRadar } from "./QCDESRadar"
import { GrowthTimeline } from "./GrowthTimeline"
import { SkillHeatmap } from "./SkillHeatmap"

type SampleUser = { id: string; name: string; role: string }

type TabId = "overview" | "timeline" | "heatmap"

const TABS: { id: TabId; label: string }[] = [
  { id: "overview", label: "概要" },
  { id: "heatmap", label: "スキル習熟度" },
  { id: "timeline", label: "成長曲線" },
]

export default function SkillMapDashboard() {
  const [activeTab, setActiveTab] = useState<TabId>("overview")
  const [users, setUsers] = useState<SampleUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [profile, setProfile] = useState<SkillProfile | null>(null)
  const [timeline, setTimeline] = useState<SkillTimeline | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ユーザー一覧を取得
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
    setLoading(true)
    setError(null)
    try {
      const [profileRes, timelineRes] = await Promise.allSettled([
        fetch(`/api/compath/skill-map/profile?userId=${selectedUserId}`),
        fetch(`/api/compath/skill-map/timeline?userId=${selectedUserId}`),
      ])

      if (profileRes.status === "fulfilled" && profileRes.value.ok) {
        setProfile(await profileRes.value.json())
      } else {
        setProfile(null)
      }
      if (timelineRes.status === "fulfilled" && timelineRes.value.ok) {
        setTimeline(await timelineRes.value.json())
      } else {
        setTimeline(null)
      }
    } catch {
      setError("データの取得に失敗しました。")
    } finally {
      setLoading(false)
    }
  }, [selectedUserId])

  useEffect(() => {
    if (selectedUserId) fetchData()
  }, [selectedUserId, fetchData])

  const hasData = profile && profile.totalAssessments > 0
  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* Tab header */}
      <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-5 py-2">
        <h1 className="text-sm font-bold text-gray-900 mr-4">スキルマップ</h1>
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? "bg-blue-50 text-blue-700"
                : "text-gray-500 hover:bg-gray-50 hover:text-gray-900"
            }`}
          >
            {tab.label}
          </button>
        ))}

        {/* User selector */}
        <div className="ml-auto flex items-center gap-2">
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="text-sm border border-gray-200 rounded-md px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-blue-400"
          >
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
          {selectedUser && (
            <span className="text-xs text-gray-400">{selectedUser.role}</span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-5">
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <>
            {activeTab === "overview" && <OverviewTab profile={profile} />}
            {activeTab === "heatmap" && <SkillHeatmap profile={profile} />}
            {activeTab === "timeline" && <GrowthTimeline timeline={timeline} />}
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================
// Overview tab
// ============================================================

function OverviewTab({ profile }: { profile: SkillProfile }) {
  const proficiencies = Object.values(profile.proficiencies)
  const totalSkills = proficiencies.length
  const levelCounts: Record<SkillLevel, number> = { 1: 0, 2: 0, 3: 0, 4: 0 }
  for (const p of proficiencies) {
    levelCounts[p.currentLevel] += 1
  }

  const latestScores = proficiencies
    .filter((p) => p.latestScores)
    .sort(
      (a, b) =>
        new Date(b.lastAssessedAt).getTime() -
        new Date(a.lastAssessedAt).getTime()
    )[0]?.latestScores ?? null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
      {/* Summary cards */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">サマリー</h2>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="総アセスメント数" value={profile.totalAssessments} />
          <StatCard label="スキル項目数" value={totalSkills} />
          {([1, 2, 3, 4] as SkillLevel[]).map((lv) => (
            <StatCard
              key={lv}
              label={`Lv.${lv} ${SKILL_LEVEL_LABELS[lv]}`}
              value={levelCounts[lv]}
              sub={`/ ${totalSkills}`}
            />
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-gray-100">
          <h3 className="text-xs font-medium text-gray-500 mb-2">
            セッション種別ごとの回数
          </h3>
          <div className="flex flex-wrap gap-3 text-xs text-gray-600">
            {Object.entries(profile.assessmentsBySource).map(
              ([source, count]) =>
                (count as number) > 0 && (
                  <span key={source} className="bg-gray-50 px-2 py-1 rounded">
                    {sourceLabel(source)} : {count as number}
                  </span>
                )
            )}
          </div>
        </div>
      </div>

      {/* QCDES Radar */}
      <div className="bg-white rounded-lg border border-gray-200 p-5">
        <h2 className="text-sm font-bold text-gray-900 mb-4">
          観点網羅度（QCDES）
        </h2>
        {latestScores ? (
          <QCDESRadar scores={latestScores} />
        ) : (
          <p className="text-sm text-gray-400">データがありません</p>
        )}
      </div>

      {/* Thought quality breakdown */}
      {latestScores && (
        <div className="bg-white rounded-lg border border-gray-200 p-5 lg:col-span-2">
          <h2 className="text-sm font-bold text-gray-900 mb-4">
            思考品質スコア（直近）
          </h2>
          <div className="grid grid-cols-4 gap-4">
            <ScoreBar label="観点網羅度" value={latestScores.viewpointCoverage} />
            <ScoreBar
              label="構造的思考度"
              value={latestScores.structuralThinking}
            />
            <ScoreBar label="自発性" value={latestScores.proactiveness} />
            <ScoreBar label="専門性レベル" value={latestScores.expertiseLevel} />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// Small components
// ============================================================

function StatCard({
  label,
  value,
  sub,
}: {
  label: string
  value: number
  sub?: string
}) {
  return (
    <div className="rounded-md bg-gray-50 p-3">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 text-lg font-bold text-gray-900">
        {value}
        {sub && (
          <span className="text-sm font-normal text-gray-400">{sub}</span>
        )}
      </div>
    </div>
  )
}

function ScoreBar({ label, value }: { label: string; value: number }) {
  const color =
    value >= 75
      ? "bg-blue-500"
      : value >= 50
        ? "bg-blue-400"
        : value >= 25
          ? "bg-blue-300"
          : "bg-gray-300"

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-xs text-gray-600">{label}</span>
        <span className="text-xs font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-2 rounded-full bg-gray-100">
        <div
          className={`h-2 rounded-full ${color} transition-all`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  )
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64 text-sm text-gray-400">
      読み込み中...
    </div>
  )
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string
  onRetry: () => void
}) {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3">
      <p className="text-sm text-red-500">{message}</p>
      <button
        onClick={onRetry}
        className="px-3 py-1.5 rounded-md bg-gray-100 text-sm text-gray-700 hover:bg-gray-200"
      >
        再試行
      </button>
    </div>
  )
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 gap-3 text-center">
      <p className="text-sm text-gray-500">
        まだスキルアセスメントのデータがありません。
      </p>
      <p className="text-xs text-gray-400">
        BRAIN-Room や ComPath でセッションを行うと、
        <br />
        思考品質の評価結果がここに表示されます。
      </p>
    </div>
  )
}

function sourceLabel(source: string): string {
  switch (source) {
    case "brain_room_1shot":
      return "1Shot"
    case "brain_room_conference":
      return "Conference"
    case "compath_chat":
      return "ComPath Chat"
    case "compath_decision_navigator":
      return "Decision Nav"
    default:
      return source
  }
}
