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
 */
export function getSkillProfile(
  userId: string
): SkillProfile | undefined {
  return SkillMapRepository.findProfileByUser(userId);
}

/**
 * ユーザーのタイムラインを取得
 */
export function getSkillTimeline(userId: string, limit?: number) {
  return SkillMapRepository.getTimeline(userId, limit);
}
