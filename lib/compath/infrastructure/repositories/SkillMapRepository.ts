/**
 * スキルマップリポジトリ
 *
 * SkillAssessment（セッション単位）と SkillProfile（ユーザー単位）の永続化。
 * 既存の KnowledgeRepository / SessionStore と同じパターン: インメモリ Map。
 * 将来的に PostgreSQL へ差し替え可能。
 */

import type {
  SkillAssessment,
  SkillProfile,
  SkillLevel,
  TimelineEntry,
  SkillTimeline,
} from "../../domain/skillMap/types";
import {
  SKILL_CATEGORIES,
  SKILL_DEFINITIONS,
} from "../../domain/skillMap/skillCatalog";

// ============================================================
// インターフェース
// ============================================================

export interface ISkillMapRepository {
  // --- Assessment ---
  saveAssessment(assessment: SkillAssessment): void;
  findAssessmentsByUser(userId: string): SkillAssessment[];
  findAssessmentById(id: string): SkillAssessment | undefined;

  // --- Profile ---
  saveProfile(profile: SkillProfile): void;
  findProfileByUser(userId: string): SkillProfile | undefined;

  // --- Timeline ---
  getTimeline(userId: string, limit?: number): SkillTimeline;
}

// ============================================================
// インメモリ実装
// ============================================================

/** assessmentId → SkillAssessment */
const assessments = new Map<string, SkillAssessment>();
/** userId → SkillAssessment[] (indexing) */
const assessmentsByUser = new Map<string, string[]>();
/** userId → SkillProfile */
const profiles = new Map<string, SkillProfile>();

let seeded = false;

/** スキルID → カテゴリID のルックアップ */
const skillToCategoryMap = new Map(
  SKILL_DEFINITIONS.map((s) => [s.id, s.categoryId])
);
const categoryIds = SKILL_CATEGORIES.map((c) => c.id);

/**
 * ア��スメントを時系列で累積し、各時点でのカテゴリ別スコアを算出する。
 *
 * 各アセスメント時点で「それまでの全アセスメントで到達した最高レベル」を
 * スキルごとに保持し、カテゴリ単位で平均を取る。
 */
function computeTimelineEntries(sorted: SkillAssessment[]): TimelineEntry[] {
  // skillId → 累積最高レベル
  const cumulativeLevels = new Map<string, SkillLevel>();

  return sorted.map((a) => {
    // この時点までのスキルレベルを更新
    for (const [skillId, level] of Object.entries(a.skillLevels)) {
      const prev = cumulativeLevels.get(skillId) ?? 0;
      if (level > prev) cumulativeLevels.set(skillId, level as SkillLevel);
    }

    // カテゴリ別スコア算出
    const categoryScores: Record<string, number> = {};
    for (const catId of categoryIds) {
      const skillsInCat = SKILL_DEFINITIONS.filter((s) => s.categoryId === catId);
      const total = skillsInCat.reduce((sum, s) => {
        return sum + (cumulativeLevels.get(s.id) ?? 0);
      }, 0);
      // 0-100 にスケール (max = skillsInCat.length * 4)
      categoryScores[catId] = skillsInCat.length > 0
        ? Math.round((total / (skillsInCat.length * 4)) * 100)
        : 0;
    }

    // 総合 = カテゴリスコアの平均
    const catValues = Object.values(categoryScores);
    const compositeScore = catValues.length > 0
      ? Math.round(catValues.reduce((a, b) => a + b, 0) / catValues.length)
      : 0;

    return {
      assessmentId: a.id,
      sessionSource: a.sessionSource,
      compositeScore,
      categoryScores,
      assessedAt: a.assessedAt,
    };
  });
}

/** サンプルデータを投入（初回のみ） */
function ensureSeeded() {
  if (seeded) return;
  seeded = true;
  // 動的importを避けて同期的に呼ぶため、lazy initパターン
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { generateSeedData } = require("./skillMapSeedData") as typeof import("./skillMapSeedData");
  const { assessments: seedAssessments, profiles: seedProfiles } = generateSeedData();
  for (const a of seedAssessments) {
    assessments.set(a.id, a);
    const ids = assessmentsByUser.get(a.userId) ?? [];
    ids.push(a.id);
    assessmentsByUser.set(a.userId, ids);
  }
  for (const p of seedProfiles) {
    profiles.set(p.userId, p);
  }
}

export const SkillMapRepository: ISkillMapRepository = {
  // ----------------------------------------------------------
  // Assessment
  // ----------------------------------------------------------
  saveAssessment(assessment: SkillAssessment): void {
    ensureSeeded();
    assessments.set(assessment.id, assessment);
    const ids = assessmentsByUser.get(assessment.userId) ?? [];
    ids.push(assessment.id);
    assessmentsByUser.set(assessment.userId, ids);
  },

  findAssessmentsByUser(userId: string): SkillAssessment[] {
    ensureSeeded();
    const ids = assessmentsByUser.get(userId) ?? [];
    return ids
      .map((id) => assessments.get(id))
      .filter((a): a is SkillAssessment => a !== undefined);
  },

  findAssessmentById(id: string): SkillAssessment | undefined {
    ensureSeeded();
    return assessments.get(id);
  },

  // ----------------------------------------------------------
  // Profile
  // ----------------------------------------------------------
  saveProfile(profile: SkillProfile): void {
    ensureSeeded();
    profiles.set(profile.userId, profile);
  },

  findProfileByUser(userId: string): SkillProfile | undefined {
    ensureSeeded();
    return profiles.get(userId);
  },

  // ----------------------------------------------------------
  // Timeline
  // ----------------------------------------------------------
  getTimeline(userId: string, limit = 50): SkillTimeline {
    ensureSeeded();
    const userAssessments = this.findAssessmentsByUser(userId);

    const sorted = [...userAssessments].sort(
      (a, b) =>
        new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
    );

    const entries = computeTimelineEntries(sorted).slice(-limit);

    return { userId, entries };
  },
};
