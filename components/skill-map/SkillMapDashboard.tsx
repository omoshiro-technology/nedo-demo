"use client"

/**
 * スキルマップ — 一画面統合レイアウト
 *
 * 16:9 (1920x1080) でのレイアウト計算:
 *   ヘッダー: 44px
 *   コンテンツ余白: 16px x 2 = 32px
 *   カード内余白: 20px x 2 = 40px
 *   → カード内利用可能: 1808 x 964px
 *
 *   グリッド部: 112px(ラベル) + 8*(60+2)px(セル) = 608px
 *   右パネル: 残り 1808 - 608 - 24(gap) = 1176px → max-w-[340px] に制限
 *   レベルガイド: 下部全幅
 *
 * グリッド右の空白にレーダー+サマリーを配置することで
 * 空間を有効活用し、スクロール不要の一画面に収める。
 */

import { useState, useEffect, useCallback, useRef } from "react"
import type {
  SkillProfile,
  SkillLevel,
} from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import { QCDESRadar } from "./QCDESRadar"
import {
  SkillHeatmapGrid,
  LevelGuide,
  HeatmapLegend,
} from "./SkillHeatmap"

type SampleUser = { id: string; name: string; role: string }

export default function SkillMapDashboard() {
  const [users, setUsers] = useState<SampleUser[]>([])
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [profile, setProfile] = useState<SkillProfile | null>(null)
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
  }, [selectedUserId]) // eslint-disable-line react-hooks/exhaustive-deps

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

      {/* メインコンテンツ */}
      <div className="flex-1 overflow-auto p-4">
        {initialLoading ? (
          <LoadingState />
        ) : error && !hasData ? (
          <ErrorState message={error} onRetry={fetchData} />
        ) : !hasData ? (
          <EmptyState />
        ) : (
          <div
            className={`transition-opacity duration-200 ${
              transitioning ? "opacity-60" : "opacity-100"
            }`}
          >
            <UnifiedCard profile={profile} />
          </div>
        )}
      </div>
    </div>
  )
}

// ============================================================
// 統合カード: グリッド + レーダー + サマリー + レベルガイド
// ============================================================

function UnifiedCard({ profile }: { profile: SkillProfile }) {
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
    <div className="bg-white rounded-xl border border-slate-200 p-5">
      {/* タイトル行 */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-bold text-slate-800">
            スキル習熟度マップ
          </h2>
          <p className="text-[10px] text-slate-400">
            セルをホバーすると詳細が表示されます
          </p>
        </div>
        <HeatmapLegend />
      </div>

      {/* メイン: グリッド(左) + 情報パネル(右) */}
      <div className="flex gap-6">
        {/* 左: ヒートマップグリッド — shrink-0 で自然幅を保持 */}
        <div className="shrink-0">
          <SkillHeatmapGrid profile={profile} />
        </div>

        {/* 右: レーダー + サマリー — 残りスペースを使用 */}
        <div className="flex-1 min-w-[280px] max-w-[380px] flex flex-col gap-3">
          {/* QCDES レーダー */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <h3 className="text-[10px] font-bold text-gray-600 mb-1">
              観点網羅度（QCDES）
            </h3>
            {latestScores ? (
              <QCDESRadar scores={latestScores} />
            ) : (
              <p className="text-xs text-gray-400 py-8 text-center">データなし</p>
            )}
          </div>

          {/* サマリー */}
          <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
            <h3 className="text-[10px] font-bold text-gray-600 mb-2">サマリー</h3>
            <div className="grid grid-cols-3 gap-1.5">
              <MiniStat label="アセスメント" value={profile.totalAssessments} />
              <MiniStat label="スキル項目" value={totalSkills} />
              <MiniStat
                label={`Lv.4 ${SKILL_LEVEL_LABELS[4]}`}
                value={levelCounts[4]}
              />
              {([1, 2, 3] as SkillLevel[]).map((lv) => (
                <MiniStat
                  key={lv}
                  label={`Lv.${lv} ${SKILL_LEVEL_LABELS[lv]}`}
                  value={levelCounts[lv]}
                />
              ))}
            </div>
          </div>

          {/* 思考品質スコア */}
          {latestScores && (
            <div className="rounded-lg border border-gray-100 bg-gray-50/50 p-3">
              <h3 className="text-[10px] font-bold text-gray-600 mb-2">
                思考品質（直近）
              </h3>
              <div className="space-y-1.5">
                <ScoreBar label="観点網羅度" value={latestScores.viewpointCoverage} />
                <ScoreBar label="構造的思考" value={latestScores.structuralThinking} />
                <ScoreBar label="自発性" value={latestScores.proactiveness} />
                <ScoreBar label="専門性" value={latestScores.expertiseLevel} />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* レベル定義ガイド — 全幅 */}
      <div className="mt-4 pt-3 border-t border-slate-100">
        <h3 className="text-[10px] font-bold text-slate-500 mb-2">
          習熟レベルの定義
        </h3>
        <LevelGuide />
      </div>
    </div>
  )
}

// ============================================================
// 小コンポーネント
// ============================================================

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded bg-white border border-gray-100 px-2 py-1.5">
      <div className="text-[9px] text-gray-400">{label}</div>
      <div className="text-sm font-bold text-gray-900">{value}</div>
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
        <span className="text-[9px] text-gray-600">{label}</span>
        <span className="text-[9px] font-medium text-gray-900">{value}</span>
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
