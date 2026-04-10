"use client"

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  SkillProfile,
  SkillLevel,
} from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import { QCDESRadar } from "./QCDESRadar"
import { SkillHeatmap } from "./SkillHeatmap"

type SampleUser = { id: string; name: string; role: string }

export default function SkillMapDashboard() {
  const [users, setUsers] = useState<SampleUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [profile, setProfile] = useState<SkillProfile | null>(null)
  const [initialLoading, setInitialLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  // 切替時にフェード用
  const [transitioning, setTransitioning] = useState(false)
  const fetchRef = useRef(0)

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
    const fetchId = ++fetchRef.current
    // 初回のみフルローディング、切替時は前データを維持
    if (!profile) {
      setInitialLoading(true)
    } else {
      setTransitioning(true)
    }
    setError(null)
    try {
      const res = await fetch(
        `/api/compath/skill-map/profile?userId=${selectedUserId}`
      )
      // stale fetchを無視
      if (fetchRef.current !== fetchId) return
      if (res.ok) {
        setProfile(await res.json())
      } else {
        setProfile(null)
      }
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

  useEffect(() => {
    if (selectedUserId) fetchData()
  }, [selectedUserId]) // fetchDataを依存に入れるとprofile変更で無限ループするので意図的に除外

  const hasData = profile && profile.totalAssessments > 0
  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <div className="flex flex-col h-full bg-gray-50">
      {/* ヘッダー */}
      <div className="flex items-center gap-1 border-b border-gray-200 bg-white px-5 py-2">
        <h1 className="text-sm font-bold text-gray-900 mr-4">スキルマップ</h1>
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

      {/* メインコンテンツ — 一画面完結 */}
      <div className="flex-1 overflow-hidden p-4">
        {initialLoading ? (
          <LoadingState />
        ) : error && !hasData ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <div
            className={`flex gap-4 h-full transition-opacity duration-200 ${
              transitioning ? "opacity-60" : "opacity-100"
            }`}
          >
            {/* 左: ヒートマップ（メイン） */}
            <div className="flex-1 min-w-0">
              <SkillHeatmap profile={profile} />
            </div>

            {/* 右: レーダーチャート + サマリー */}
            <Sidebar profile={profile} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// サイドバー（レーダー + サマリー）
// ============================================================

function Sidebar({ profile }: { profile: SkillProfile }) {
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
    <div className="w-[280px] shrink-0 flex flex-col gap-3">
      {/* QCDES レーダー */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-xs font-bold text-gray-800 mb-2">
          観点網羅度（QCDES）
        </h2>
        {latestScores ? (
          <QCDESRadar scores={latestScores} />
        ) : (
          <p className="text-xs text-gray-400">データなし</p>
        )}
      </div>

      {/* サマリーカード */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <h2 className="text-xs font-bold text-gray-800 mb-3">サマリー</h2>
        <div className="grid grid-cols-2 gap-2">
          <StatCard label="アセスメント" value={profile.totalAssessments} />
          <StatCard label="スキル項目" value={totalSkills} />
          {([1, 2, 3, 4] as SkillLevel[]).map((lv) => (
            <StatCard
              key={lv}
              label={`Lv.${lv} ${SKILL_LEVEL_LABELS[lv]}`}
              value={levelCounts[lv]}
              sub={`/${totalSkills}`}
            />
          ))}
        </div>
      </div>

      {/* 思考品質スコア */}
      {latestScores && (
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h2 className="text-xs font-bold text-gray-800 mb-3">
            思考品質（直近）
          </h2>
          <div className="space-y-2">
            <ScoreBar label="観点網羅度" value={latestScores.viewpointCoverage} />
            <ScoreBar label="構造的思考" value={latestScores.structuralThinking} />
            <ScoreBar label="自発性" value={latestScores.proactiveness} />
            <ScoreBar label="専門性" value={latestScores.expertiseLevel} />
          </div>
        </div>
      )}
    </div>
  )
}

// ============================================================
// 小コンポーネント
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
    <div className="rounded-md bg-gray-50 p-2">
      <div className="text-[10px] text-gray-500">{label}</div>
      <div className="text-base font-bold text-gray-900">
        {value}
        {sub && (
          <span className="text-xs font-normal text-gray-400">{sub}</span>
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
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] text-gray-600">{label}</span>
        <span className="text-[10px] font-medium text-gray-900">{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-gray-100">
        <div
          className={`h-1.5 rounded-full ${color} transition-all duration-500`}
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
