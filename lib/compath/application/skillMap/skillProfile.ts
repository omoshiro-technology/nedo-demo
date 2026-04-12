/**
 * スキルプロファイル集約
 *
 * 新しいアセスメント結果を既存プロファイルにマージし、
 * スキルごとの習熟レベルを更新する。
 */

import type {
  SkillAssessment,
  SkillProfile,
  SkillProficiency,
  SkillLevel,
  SessionSource,
} from "../../domain/skillMap/types";
import { SkillMapRepository } from "../../infrastructure/repositories/SkillMapRepository";

const SESSION_SOURCES: SessionSource[] = [
  "brain_room_1shot",
  "brain_room_conference",
  "compath_chat",
  "compath_decision_navigator",
];

/**
 * 新しいアセスメントをプロファイルに反映する
 *
 * - 既存プロファイルがなければ新規作成
 * - スキルレベルは「下がらない」（ハイウォーターマーク方式）
 * - touchCount は単調増加
 */
export function applyAssessmentToProfile(
  assessment: SkillAssessment
): SkillProfile {
  const existing = SkillMapRepository.findProfileByUser(assessment.userId);

  const profile: SkillProfile = existing ?? {
    userId: assessment.userId,
    proficiencies: {},
    totalAssessments: 0,
    assessmentsBySource: Object.fromEntries(
      SESSION_SOURCES.map((s) => [s, 0])
    ) as Record<SessionSource, number>,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  // カウンタ更新
  profile.totalAssessments += 1;
  profile.assessmentsBySource[assessment.sessionSource] =
    (profile.assessmentsBySource[assessment.sessionSource] ?? 0) + 1;

  // 接触したスキルを更新
  for (const skillId of assessment.touchedSkillIds) {
    const prev: SkillProficiency = profile.proficiencies[skillId] ?? {
      skillId,
      currentLevel: 1 as SkillLevel,
      touchCount: 0,
      latestScores: null,
      lastAssessedAt: "",
    };

    const newLevel = assessment.skillLevels[skillId] ?? 1;

    profile.proficiencies[skillId] = {
      skillId,
      currentLevel: Math.max(prev.currentLevel, newLevel) as SkillLevel,
      touchCount: prev.touchCount + 1,
      latestScores: assessment.thoughtQuality,
      lastAssessedAt: assessment.assessedAt,
    };
  }

  profile.updatedAt = new Date().toISOString();

  // 永続化
  SkillMapRepository.saveAssessment(assessment);
  SkillMapRepository.saveProfile(profile);

  return profile;
}

/**
 * ユーザーのスキルプロファイルを取得（存在しなければ null）
 * asOf が指定された場合、その日付以前のアセスメントだけでプロファイルを再構築する
 */
export function getSkillProfile(
  userId: string,
  asOf?: string
): SkillProfile | undefined {
  if (!asOf) {
    return SkillMapRepository.findProfileByUser(userId);
  }

  // asOf指定: アセスメント履歴から指定日時点のプロファイルを再構築
  const allAssessments = SkillMapRepository.findAssessmentsByUser(userId);
  const cutoff = new Date(asOf).getTime();
  const filtered = allAssessments.filter(
    (a) => new Date(a.assessedAt).getTime() <= cutoff
  );

  if (filtered.length === 0) {
    // 指定日以前にアセスメントがない場合、全Lv.1の空プロファイルを返す
    const baseProfile = SkillMapRepository.findProfileByUser(userId);
    if (!baseProfile) return undefined;
    const emptyProfile: SkillProfile = {
      ...baseProfile,
      totalAssessments: 0,
      proficiencies: Object.fromEntries(
        Object.entries(baseProfile.proficiencies).map(([id, p]) => [
          id,
          { ...p, currentLevel: 1 as SkillLevel, touchCount: 0, latestScores: null, lastAssessedAt: "" },
        ])
      ),
    };
    return emptyProfile;
  }

  // アセスメントを時系列順に適用してプロファイルを再構築
  const baseProfile = SkillMapRepository.findProfileByUser(userId);
  if (!baseProfile) return undefined;

  const rebuilt: SkillProfile = {
    ...baseProfile,
    totalAssessments: filtered.length,
    proficiencies: Object.fromEntries(
      Object.entries(baseProfile.proficiencies).map(([id, p]) => [
        id,
        { ...p, currentLevel: 1 as SkillLevel, touchCount: 0, latestScores: null, lastAssessedAt: "" },
      ])
    ),
  };

  const sorted = [...filtered].sort(
    (a, b) => new Date(a.assessedAt).getTime() - new Date(b.assessedAt).getTime()
  );

  for (const assessment of sorted) {
    for (const skillId of assessment.touchedSkillIds) {
      const prev = rebuilt.proficiencies[skillId];
      if (!prev) continue;
      const newLevel = assessment.skillLevels[skillId] ?? 1;
      rebuilt.proficiencies[skillId] = {
        ...prev,
        currentLevel: Math.max(prev.currentLevel, newLevel) as SkillLevel,
        touchCount: prev.touchCount + 1,
        latestScores: assessment.thoughtQuality,
        lastAssessedAt: assessment.assessedAt,
      };
    }
  }

  return rebuilt;
}

/**
 * ユーザーのタイムラインを取得
 */
export function getSkillTimeline(userId: string, limit?: number) {
  return SkillMapRepository.getTimeline(userId, limit);
}
