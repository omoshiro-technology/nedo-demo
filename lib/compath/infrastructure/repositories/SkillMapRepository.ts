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
  SessionSource,
  TimelineEntry,
  SkillTimeline,
} from "../../domain/skillMap/types";

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

function computeCompositeScore(tq: SkillAssessment["thoughtQuality"]): number {
  return Math.round(
    tq.viewpointCoverage * 0.25 +
      tq.structuralThinking * 0.30 +
      tq.proactiveness * 0.25 +
      tq.expertiseLevel * 0.20
  );
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

    const entries: TimelineEntry[] = userAssessments
      .sort(
        (a, b) =>
          new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
      )
      .slice(-limit)
      .map((a) => ({
        assessmentId: a.id,
        sessionSource: a.sessionSource,
        compositeScore: computeCompositeScore(a.thoughtQuality),
        thoughtQuality: a.thoughtQuality,
        assessedAt: a.assessedAt,
      }));

    return { userId, entries };
  },
};
