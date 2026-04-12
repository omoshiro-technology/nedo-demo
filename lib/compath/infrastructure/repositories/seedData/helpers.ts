import type {
  SkillAssessment,
  SkillLevel,
  SessionSource,
  ThoughtQualityScore,
  QCDESCoverage,
} from "../../../domain/skillMap/types";

export type SkillLevelMap = Record<string, SkillLevel>;

export function date(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

export function qcdes(q: number, c: number, d: number, e: number, s: number): QCDESCoverage {
  return { quality: q, cost: c, delivery: d, environment: e, safety: s };
}

export function tq(vc: number, st: number, pr: number, el: number, qc: QCDESCoverage): ThoughtQualityScore {
  return { viewpointCoverage: vc, qcdesCoverage: qc, structuralThinking: st, proactiveness: pr, expertiseLevel: el };
}

export function makeAssessments(
  userId: string,
  skillLevels: SkillLevelMap,
  sessions: Array<{
    source: SessionSource;
    purpose: string;
    tq: ThoughtQualityScore;
    skills: string[];
    daysAgo: number;
  }>
): SkillAssessment[] {
  return sessions.map((s, i) => ({
    id: `sa-${userId}-${String(i).padStart(3, "0")}`,
    userId,
    sessionSource: s.source,
    sessionId: `sess-${userId}-${String(i).padStart(3, "0")}`,
    sessionPurpose: s.purpose,
    thoughtQuality: s.tq,
    userRaisedPoints: [],
    touchedSkillIds: s.skills,
    skillLevels: Object.fromEntries(
      s.skills.map((sid) => [sid, skillLevels[sid] ?? 1])
    ),
    assessedAt: date(s.daysAgo),
  }));
}
