"use client"

import type {
  SkillProfile,
  SkillLevel,
} from "@/lib/compath/domain/skillMap/types"
import { SKILL_LEVEL_LABELS } from "@/lib/compath/domain/skillMap/types"
import { SAMPLE_SKILLS } from "@/lib/compath/infrastructure/repositories/skillMapSeedData"

/** スキルID → 日本語名 */
const SKILL_NAMES: Record<string, string> = Object.fromEntries(
  SAMPLE_SKILLS.map((s) => [s.id, s.name])
)

type Props = {
  profile: SkillProfile
}

const LEVELS: SkillLevel[] = [1, 2, 3, 4]

const LEVEL_COLORS: Record<SkillLevel, string> = {
  1: "bg-blue-100 text-blue-800",
  2: "bg-blue-200 text-blue-900",
  3: "bg-blue-400 text-white",
  4: "bg-blue-600 text-white",
}

export function SkillHeatmap({ profile }: Props) {
  const proficiencies = Object.values(profile.proficiencies)

  if (proficiencies.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-sm text-gray-400">
        スキルデータがありません
      </div>
    )
  }

  // スキルをtouchCount降順でソート
  const sorted = [...proficiencies].sort(
    (a, b) => b.touchCount - a.touchCount
  )

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5">
      <h2 className="text-sm font-bold text-gray-900 mb-4">
        スキル項目 × 習熟レベル
      </h2>

      {/* レベル凡例 */}
      <div className="flex gap-3 mb-4">
        {LEVELS.map((lv) => (
          <span
            key={lv}
            className={`px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[lv]}`}
          >
            Lv.{lv} {SKILL_LEVEL_LABELS[lv]}
          </span>
        ))}
      </div>

      {/* Grid */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left py-2 pr-4 text-xs font-medium text-gray-500 w-48">
                スキル項目
              </th>
              <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 w-20">
                習熟度
              </th>
              <th className="text-center py-2 px-2 text-xs font-medium text-gray-500 w-20">
                接触回数
              </th>
              <th className="text-left py-2 pl-4 text-xs font-medium text-gray-500">
                レベルバー
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((p) => (
              <tr
                key={p.skillId}
                className="border-b border-gray-50 hover:bg-gray-50"
              >
                <td className="py-2 pr-4 text-gray-900 font-medium">
                  {SKILL_NAMES[p.skillId] ?? p.skillId}
                </td>
                <td className="py-2 px-2 text-center">
                  <span
                    className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${LEVEL_COLORS[p.currentLevel]}`}
                  >
                    Lv.{p.currentLevel}
                  </span>
                </td>
                <td className="py-2 px-2 text-center text-gray-500">
                  {p.touchCount}
                </td>
                <td className="py-2 pl-4">
                  <LevelBar level={p.currentLevel} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function LevelBar({ level }: { level: SkillLevel }) {
  const width = (level / 4) * 100

  return (
    <div className="h-3 rounded-full bg-gray-100 w-full max-w-[200px]">
      <div
        className="h-3 rounded-full bg-blue-500 transition-all"
        style={{ width: `${width}%` }}
      />
    </div>
  )
}
