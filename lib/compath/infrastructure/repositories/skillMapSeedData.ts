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
  Industry,
} from "../../domain/skillMap/types";
import { SKILL_DEFINITIONS } from "../../domain/skillMap/skillCatalog";

import { type SkillLevelMap } from "./seedData/helpers";
import { MURATA_SKILLS, murataAssessments } from "./seedData/murata";
import { NAKAJIMA_SKILLS, nakajimaAssessments } from "./seedData/nakajima";
import { FUJIWARA_SKILLS, fujiwaraAssessments } from "./seedData/fujiwara";
import { TANAKA_SKILLS_AFTER, tanakaAssessments, TANAKA_EVIDENCE } from "./seedData/tanaka";
import { YAMADA_SKILLS, yamadaAssessments } from "./seedData/yamada";
import { KIMURA_SKILLS, kimuraAssessments } from "./seedData/kimura";
import { TAKAHASHI_SKILLS, takahashiAssessments } from "./seedData/takahashi";
import { SUZUKI_SKILLS, suzukiAssessments } from "./seedData/suzuki";
import { SATO_SKILLS, satoAssessments } from "./seedData/sato";
import { ITO_SKILLS, itoAssessments } from "./seedData/ito";
import { TAMURA_SKILLS, tamuraAssessments } from "./seedData/tamura";
import { WATANABE_SKILLS, watanabeAssessments } from "./seedData/watanabe";

// ============================================================
// 公開データ
// ============================================================

export type SampleUser = {
  id: string;
  name: string;
  role: string;
  industry: Industry;
};

export const SAMPLE_USERS: SampleUser[] = [
  // 板金加工
  { id: "tanaka-daiki", name: "田中 大輝", role: "工程設計見習い（2年目）", industry: "sheet-metal" },
  { id: "murata-tetsuo", name: "村田 鉄男", role: "ベテラン工程設計者（38年）", industry: "sheet-metal" },
  { id: "nakajima-kota", name: "中島 康太", role: "生産技術マネージャー（12年）", industry: "sheet-metal" },
  { id: "fujiwara-shota", name: "藤原 翔太", role: "若手CAEエンジニア（3年）", industry: "sheet-metal" },
  // 半導体製造
  { id: "yamada-naoto", name: "山田 直人", role: "プロセスエンジニア（8年）", industry: "semiconductor" },
  { id: "kimura-yu", name: "木村 優", role: "プロセスエンジニア見習い（2年目）", industry: "semiconductor" },
  { id: "takahashi-kenji", name: "高橋 健二", role: "プロセス設計ベテラン（30年）", industry: "semiconductor" },
  { id: "suzuki-sho", name: "鈴木 翔", role: "装置エンジニア（10年）", industry: "semiconductor" },
  // 食品製造
  { id: "sato-yumi", name: "佐藤 由美", role: "品質管理リーダー（12年）", industry: "food-manufacturing" },
  { id: "ito-ai", name: "伊藤 愛", role: "品質管理見習い（2年目）", industry: "food-manufacturing" },
  { id: "tamura-masao", name: "田村 正雄", role: "工場長（25年）", industry: "food-manufacturing" },
  { id: "watanabe-sho", name: "渡辺 翔", role: "生産技術エンジニア（8年）", industry: "food-manufacturing" },
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
    ...yamadaAssessments(),
    ...kimuraAssessments(),
    ...takahashiAssessments(),
    ...suzukiAssessments(),
    ...satoAssessments(),
    ...itoAssessments(),
    ...tamuraAssessments(),
    ...watanabeAssessments(),
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
    buildProfile("yamada-naoto", YAMADA_SKILLS, allAssessments),
    buildProfile("kimura-yu", KIMURA_SKILLS, allAssessments),
    buildProfile("takahashi-kenji", TAKAHASHI_SKILLS, allAssessments),
    buildProfile("suzuki-sho", SUZUKI_SKILLS, allAssessments),
    buildProfile("sato-yumi", SATO_SKILLS, allAssessments),
    buildProfile("ito-ai", ITO_SKILLS, allAssessments),
    buildProfile("tamura-masao", TAMURA_SKILLS, allAssessments),
    buildProfile("watanabe-sho", WATANABE_SKILLS, allAssessments),
  ];

  return { assessments: allAssessments, profiles };
}
