/**
 * スキルマップ サンプルデータ
 *
 * デモ用に4名分のスキルプロファイルを生成する。
 * 各ユーザーのスキルレベル・アセスメント・エビデンスは seedData/ 以下に分割。
 */

import type {
  SkillAssessment,
  SkillProfile,
  SkillLevel,
  SessionSource,
  SkillProficiency,
} from "../../domain/skillMap/types";
import { SKILL_DEFINITIONS } from "../../domain/skillMap/skillCatalog";

import { type SkillLevelMap } from "./seedData/helpers";
import { MURATA_SKILLS, murataAssessments } from "./seedData/murata";
import { NAKAJIMA_SKILLS, nakajimaAssessments } from "./seedData/nakajima";
import { FUJIWARA_SKILLS, fujiwaraAssessments } from "./seedData/fujiwara";
import { TANAKA_SKILLS_AFTER, tanakaAssessments, TANAKA_EVIDENCE } from "./seedData/tanaka";

// ============================================================
// 公開データ
// ============================================================

export const SAMPLE_USERS = [
  { id: "tanaka-daiki", name: "田中 大輝", role: "工程設計見習い（2年目）" },
  { id: "murata-tetsuo", name: "村田 鉄男", role: "ベテラン工程設計者（38年）" },
  { id: "nakajima-kota", name: "中島 康太", role: "生産技術マネージャー（12年）" },
  { id: "fujiwara-shota", name: "藤原 翔太", role: "若手CAEエンジニア（3年）" },
];

// ============================================================
// プロファイル構築
// ============================================================

function buildProfile(
  userId: string,
  skillLevels: SkillLevelMap,
  assessmentsList: SkillAssessment[]
): SkillProfile {
  const userAssessments = assessmentsList.filter((a) => a.userId === userId);
  const proficiencies: Record<string, SkillProficiency> = {};

  // 全スキルをプロファイルに含める（未接触のスキルもLv設定あり）
  for (const skill of SKILL_DEFINITIONS) {
    proficiencies[skill.id] = {
      skillId: skill.id,
      currentLevel: (skillLevels[skill.id] ?? 1) as SkillLevel,
      touchCount: 0,
      latestScores: null,
      lastAssessedAt: "",
    };
  }

  const sourceCount: Record<SessionSource, number> = {
    brain_room_1shot: 0,
    brain_room_conference: 0,
    compath_chat: 0,
    compath_decision_navigator: 0,
  };

  for (const a of userAssessments) {
    sourceCount[a.sessionSource] = (sourceCount[a.sessionSource] ?? 0) + 1;
    for (const skillId of a.touchedSkillIds) {
      const p = proficiencies[skillId];
      if (p) {
        p.touchCount += 1;
        p.latestScores = a.thoughtQuality;
        p.lastAssessedAt = a.assessedAt;
      }
    }
  }

  return {
    userId,
    proficiencies,
    totalAssessments: userAssessments.length,
    assessmentsBySource: sourceCount,
    createdAt: userAssessments[0]?.assessedAt ?? new Date().toISOString(),
    updatedAt: userAssessments[userAssessments.length - 1]?.assessedAt ?? new Date().toISOString(),
  };
}

// ============================================================
// エクスポート
// ============================================================

export function generateSeedData(): {
  assessments: SkillAssessment[];
  profiles: SkillProfile[];
} {
  const allAssessments = [
    ...tanakaAssessments(),
    ...murataAssessments(),
    ...nakajimaAssessments(),
    ...fujiwaraAssessments(),
  ];

  const tanakaProfile = buildProfile("tanaka-daiki", TANAKA_SKILLS_AFTER, allAssessments);

  // 田中大輝のレベルアップ根拠を注入（デモ用）
  for (const [skillId, evidence] of Object.entries(TANAKA_EVIDENCE)) {
    if (tanakaProfile.proficiencies[skillId]) {
      tanakaProfile.proficiencies[skillId].levelUpEvidence = evidence;
    }
  }

  const profiles = [
    tanakaProfile,
    buildProfile("murata-tetsuo", MURATA_SKILLS, allAssessments),
    buildProfile("nakajima-kota", NAKAJIMA_SKILLS, allAssessments),
    buildProfile("fujiwara-shota", FUJIWARA_SKILLS, allAssessments),
  ];

  return { assessments: allAssessments, profiles };
}
