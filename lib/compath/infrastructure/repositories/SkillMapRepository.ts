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

function computeCompositeScore(tq: SkillAssessment["thoughtQuality"]): number {
  return Math.round(
    tq.viewpointCoverage * 0.25 +
      tq.structuralThinking * 0.30 +
      tq.proactiveness * 0.25 +
      tq.expertiseLevel * 0.20
  );
}

export const SkillMapRepository: ISkillMapRepository = {
  // ----------------------------------------------------------
  // Assessment
  // ----------------------------------------------------------
  saveAssessment(assessment: SkillAssessment): void {
    assessments.set(assessment.id, assessment);
    const ids = assessmentsByUser.get(assessment.userId) ?? [];
    ids.push(assessment.id);
    assessmentsByUser.set(assessment.userId, ids);
  },

  findAssessmentsByUser(userId: string): SkillAssessment[] {
    const ids = assessmentsByUser.get(userId) ?? [];
    return ids
      .map((id) => assessments.get(id))
      .filter((a): a is SkillAssessment => a !== undefined);
  },

  findAssessmentById(id: string): SkillAssessment | undefined {
    return assessments.get(id);
  },

  // ----------------------------------------------------------
  // Profile
  // ----------------------------------------------------------
  saveProfile(profile: SkillProfile): void {
    profiles.set(profile.userId, profile);
  },

  findProfileByUser(userId: string): SkillProfile | undefined {
    return profiles.get(userId);
  },

  // ----------------------------------------------------------
  // Timeline
  // ----------------------------------------------------------
  getTimeline(userId: string, limit = 50): SkillTimeline {
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
