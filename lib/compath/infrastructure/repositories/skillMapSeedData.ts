/**
 * スキルマップ サンプル��ータ
 *
 * デモ用に3名分のスキルプロファイルを生成する。
 * 新しいスキルカタログ（8カテゴリ x 25項目）に対応。
 *
 * 村田 鉄男 — ベテラン（38年）: 技術系は高い、マネジメント・市場は中程度
 * 中島 康太 — 中堅（12年）: マネジメント寄り、技術は中程度
 * 藤原 翔太 — 若手（3年）: CAE/加工中心、他は成長途上
 */

import type {
  SkillAssessment,
  SkillProfile,
  SkillLevel,
  SessionSource,
  ThoughtQualityScore,
  QCDESCoverage,
  SkillProficiency,
} from "../../domain/skillMap/types";
import { SKILL_DEFINITIONS } from "../../domain/skillMap/skillCatalog";

// ============================================================
// 公開データ
// ============================================================

export const SAMPLE_USERS = [
  { id: "murata-tetsuo", name: "村田 鉄男", role: "ベテラン工程設計者（38年）" },
  { id: "nakajima-kota", name: "中島 康太", role: "生産技術マネー���ャー（12年）" },
  { id: "fujiwara-shota", name: "藤原 翔太", role: "若手CAEエンジニア（3年）" },
];

// ============================================================
// ヘルパー
// ============================================================

function date(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toISOString();
}

function qcdes(q: boolean, c: boolean, d: boolean, e: boolean, s: boolean): QCDESCoverage {
  return { quality: q, cost: c, delivery: d, environment: e, safety: s };
}

function tq(vc: number, st: number, pr: number, el: number, qc: QCDESCoverage): ThoughtQualityScore {
  return { viewpointCoverage: vc, qcdesCoverage: qc, structuralThinking: st, proactiveness: pr, expertiseLevel: el };
}

type SkillLevelMap = Record<string, SkillLevel>;

// ============================================================
// 村田 鉄男 — ベテラン
//
// 技術系（工程設計・加工・品質・設備）は Lv.3-4
// マネジメント・市場��� Lv.2-3
// コミュニケーションは Lv.3
// ============================================================

const MURATA_SKILLS: SkillLevelMap = {
  // ビジョン・戦略
  "biz-strategy": 2,
  "tech-roadmap": 3,
  "innovation-mindset": 3,
  // マネジメント
  "project-mgmt": 2,
  "people-dev": 3,
  "resource-allocation": 2,
  // 工程設計
  "process-sequence": 4,
  "material-selection": 4,
  "tolerance-design": 4,
  "cost-estimation": 3,
  // 加工技術
  "press-forming": 4,
  "springback": 4,
  "die-design": 4,
  // 品質管理
  "qc-method": 3,
  "inspection-design": 3,
  "troubleshooting": 4,
  // 設���・保���
  "equipment-eval": 4,
  "preventive-maint": 3,
  // ��場・競合
  "competitor-analysis": 2,
  "customer-needs": 3,
  "industry-trends": 2,
  // コミュニケーション
  "customer-negotiation": 3,
  "cross-dept": 3,
  "documentation": 2,
};

// ============================================================
// 中島 康太 — 中堅（マネジメント寄り）
//
// マネジメント Lv.3-4
// 市場・コミュニケーション Lv.2-3
// 技術系は Lv.2 中心
// ============================================================

const NAKAJIMA_SKILLS: SkillLevelMap = {
  "biz-strategy": 3,
  "tech-roadmap": 2,
  "innovation-mindset": 3,
  "project-mgmt": 4,
  "people-dev": 3,
  "resource-allocation": 3,
  "process-sequence": 2,
  "material-selection": 2,
  "tolerance-design": 2,
  "cost-estimation": 3,
  "press-forming": 2,
  "springback": 1,
  "die-design": 2,
  "qc-method": 2,
  "inspection-design": 2,
  "troubleshooting": 2,
  "equipment-eval": 2,
  "preventive-maint": 1,
  "competitor-analysis": 3,
  "customer-needs": 3,
  "industry-trends": 3,
  "customer-negotiation": 3,
  "cross-dept": 4,
  "documentation": 3,
};

// ============================================================
// 藤原 翔太 — 若手（技術特化・成長途上）
//
// 加工技術（CAE寄り）Lv.1-2
// 工程設計は Lv.1
// マネジメント・市場・ビジョンは Lv.1
// ============================================================

const FUJIWARA_SKILLS: SkillLevelMap = {
  "biz-strategy": 1,
  "tech-roadmap": 1,
  "innovation-mindset": 1,
  "project-mgmt": 1,
  "people-dev": 1,
  "resource-allocation": 1,
  "process-sequence": 1,
  "material-selection": 2,
  "tolerance-design": 1,
  "cost-estimation": 1,
  "press-forming": 2,
  "springback": 2,
  "die-design": 1,
  "qc-method": 1,
  "inspection-design": 1,
  "troubleshooting": 1,
  "equipment-eval": 1,
  "preventive-maint": 1,
  "competitor-analysis": 1,
  "customer-needs": 1,
  "industry-trends": 1,
  "customer-negotiation": 1,
  "cross-dept": 1,
  "documentation": 2,
};

// ============================================================
// アセスメント生成
// ============================================================

function makeAssessments(
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

function murataAssessments(): SkillAssessment[] {
  return makeAssessments("murata-tetsuo", MURATA_SKILLS, [
    { source: "brain_room_1shot", purpose: "SUS304 板厚1.2mm曲げ加工の工程検討", tq: tq(85, 80, 78, 90, qcdes(true, true, true, false, true)), skills: ["material-selection", "springback", "process-sequence", "press-forming"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "金型摩耗による品質低下の原因切り分け", tq: tq(80, 85, 82, 88, qcdes(true, true, false, false, true)), skills: ["die-design", "troubleshooting", "inspection-design"], daysAgo: 49 },
    { source: "compath_chat", purpose: "新規顧客の公差要求と既存設備の適合確認", tq: tq(78, 82, 75, 88, qcdes(true, true, true, false, false)), skills: ["tolerance-design", "equipment-eval", "customer-needs"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "順送金型 vs タンデム構成の比較検討", tq: tq(90, 92, 85, 92, qcdes(true, true, true, false, true)), skills: ["process-sequence", "die-design", "cost-estimation", "equipment-eval"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "若手への工程設計ノウハウ伝達方法の検討", tq: tq(72, 68, 65, 75, qcdes(true, false, false, false, false)), skills: ["people-dev", "documentation", "process-sequence"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "スプリングバック補正量の妥当��検証", tq: tq(88, 90, 88, 95, qcdes(true, true, false, false, true)), skills: ["springback", "press-forming", "tolerance-design"], daysAgo: 21 },
    { source: "compath_chat", purpose: "後工程（溶接）との公差積み上げ確認", tq: tq(82, 85, 78, 88, qcdes(true, true, true, true, false)), skills: ["tolerance-design", "cross-dept", "qc-method"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "安全カバー部品の工程FMEAレビュー", tq: tq(92, 95, 90, 93, qcdes(true, true, true, true, true)), skills: ["process-sequence", "troubleshooting", "preventive-maint", "inspection-design"], daysAgo: 7 },
  ]);
}

function nakajimaAssessments(): SkillAssessment[] {
  return makeAssessments("nakajima-kota", NAKAJIMA_SKILLS, [
    { source: "compath_chat", purpose: "新ライン立ち上げの工程設計方針", tq: tq(55, 50, 45, 60, qcdes(true, true, true, false, false)), skills: ["project-mgmt", "resource-allocation", "process-sequence"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "材料変更に伴う曲げ条件の見直し", tq: tq(60, 55, 50, 55, qcdes(true, true, false, false, false)), skills: ["material-selection", "cost-estimation"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "外注先選定の判断基準整理", tq: tq(65, 68, 55, 58, qcdes(false, true, true, false, false)), skills: ["competitor-analysis", "cost-estimation", "customer-negotiation"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "チーム育成計画の見直し", tq: tq(62, 60, 52, 55, qcdes(false, false, true, false, false)), skills: ["people-dev", "resource-allocation", "cross-dept"], daysAgo: 21 },
    { source: "compath_chat", purpose: "品質クレーム対応の原因分析", tq: tq(70, 65, 60, 62, qcdes(true, true, false, false, true)), skills: ["troubleshooting", "customer-negotiation", "cross-dept"], daysAgo: 14 },
    { source: "compath_decision_navigator", purpose: "設備投資判断の費用対効果", tq: tq(72, 70, 62, 65, qcdes(true, true, true, false, false)), skills: ["equipment-eval", "biz-strategy", "cost-estimation"], daysAgo: 7 },
  ]);
}

function fujiwaraAssessments(): SkillAssessment[] {
  return makeAssessments("fujiwara-shota", FUJIWARA_SKILLS, [
    { source: "brain_room_conference", purpose: "CAE解析結果の読み方を確認", tq: tq(20, 15, 10, 18, qcdes(false, false, false, false, false)), skills: ["press-forming", "springback"], daysAgo: 70 },
    { source: "brain_room_1shot", purpose: "板厚減少率の許容範囲を学ぶ", tq: tq(25, 20, 15, 22, qcdes(true, false, false, false, false)), skills: ["material-selection", "tolerance-design"], daysAgo: 63 },
    { source: "compath_chat", purpose: "スプリングバックの補正方法", tq: tq(30, 25, 18, 28, qcdes(true, false, false, false, false)), skills: ["springback", "press-forming"], daysAgo: 56 },
    { source: "brain_room_1shot", purpose: "初めての工程設計案の作成", tq: tq(32, 28, 20, 30, qcdes(true, true, false, false, false)), skills: ["process-sequence", "material-selection"], daysAgo: 49 },
    { source: "compath_decision_navigator", purpose: "材料選定の基本的な考え方", tq: tq(38, 35, 25, 35, qcdes(true, true, false, false, false)), skills: ["material-selection", "cost-estimation"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "先輩の工程設計を分析して学ぶ", tq: tq(42, 38, 30, 40, qcdes(true, true, true, false, false)), skills: ["process-sequence", "die-design", "documentation"], daysAgo: 35 },
    { source: "compath_chat", purpose: "金型設計の基礎", tq: tq(45, 40, 32, 42, qcdes(true, true, true, false, false)), skills: ["die-design", "press-forming"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "品質検査の基本を学ぶ", tq: tq(48, 45, 35, 44, qcdes(true, true, true, false, true)), skills: ["qc-method", "inspection-design"], daysAgo: 21 },
    { source: "compath_decision_navigator", purpose: "自分で工程順序を提案してレビュー", tq: tq(55, 50, 42, 50, qcdes(true, true, true, false, true)), skills: ["process-sequence", "cost-estimation", "tolerance-design"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "品質とコストのバランスを考える", tq: tq(60, 55, 48, 55, qcdes(true, true, true, false, true)), skills: ["cost-estimation", "qc-method", "customer-needs"], daysAgo: 7 },
  ]);
}

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
    ...murataAssessments(),
    ...nakajimaAssessments(),
    ...fujiwaraAssessments(),
  ];

  const profiles = [
    buildProfile("murata-tetsuo", MURATA_SKILLS, allAssessments),
    buildProfile("nakajima-kota", NAKAJIMA_SKILLS, allAssessments),
    buildProfile("fujiwara-shota", FUJIWARA_SKILLS, allAssessments),
  ];

  return { assessments: allAssessments, profiles };
}
