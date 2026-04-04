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
  "biz-strategy": 2, "tech-roadmap": 3, "innovation": 3, "ip-strategy": 1, "sustainability": 1, "global-perspective": 2, "alliance": 1,
  // マネジメント
  "project-mgmt": 2, "people-dev": 3, "resource-alloc": 2, "risk-mgmt": 3, "budget-mgmt": 1, "change-mgmt": 1, "kpi-design": 2,
  // 工程設計
  "process-seq": 4, "tolerance": 4, "cost-est": 3, "process-fmea": 4, "jig-fixture": 3, "line-layout": 3, "cycle-time": 4, "dfa-dfm": 3,
  // 加工技術
  "press-forming": 4, "springback": 4, "die-design": 4, "welding": 2, "machining": 3, "surface-treat": 2, "assembly": 3, "additive-mfg": 1,
  // 品質管理
  "qc-method": 3, "inspection": 3, "troubleshoot": 4, "measurement": 3, "supplier-quality": 2, "reliability": 2, "audit": 2,
  // 設備・保全
  "equip-eval": 4, "preventive-maint": 3, "automation": 2, "energy-mgmt": 1, "plc-control": 2,
  // 材料・素材
  "metal-prop": 4, "heat-treat": 3, "polymer": 1, "corrosion": 2, "material-test": 3,
  // デジタル・IT
  "cae": 2, "cad": 2, "data-analysis": 1, "iot-sensor": 1, "production-sys": 1, "digital-twin": 1,
  // 市場・競合
  "competitor": 2, "customer-needs": 3, "industry-trend": 2, "pricing": 1, "marketing": 1,
  // コミュニケーション
  "cust-negotiation": 3, "cross-dept": 3, "documentation": 2, "presentation": 2, "mentoring": 3,
  // 安全・環境
  "occupational-safety": 3, "env-regulation": 2, "waste-mgmt": 1, "chemical-mgmt": 2, "ergonomics": 2,
};

// ============================================================
// 中島 康太 — 中堅（マネジメント寄り）
//
// マネジメント Lv.3-4
// 市場・コミュニケーション Lv.2-3
// 技術系は Lv.2 中心
// ============================================================

const NAKAJIMA_SKILLS: SkillLevelMap = {
  // ビジョン・戦略
  "biz-strategy": 3, "tech-roadmap": 2, "innovation": 3, "ip-strategy": 2, "sustainability": 2, "global-perspective": 3, "alliance": 2,
  // マネジメント
  "project-mgmt": 4, "people-dev": 3, "resource-alloc": 3, "risk-mgmt": 3, "budget-mgmt": 3, "change-mgmt": 3, "kpi-design": 3,
  // 工程設計
  "process-seq": 2, "tolerance": 2, "cost-est": 3, "process-fmea": 2, "jig-fixture": 1, "line-layout": 2, "cycle-time": 2, "dfa-dfm": 2,
  // 加工技術
  "press-forming": 2, "springback": 1, "die-design": 2, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 2, "additive-mfg": 1,
  // 品質管理
  "qc-method": 2, "inspection": 2, "troubleshoot": 2, "measurement": 1, "supplier-quality": 3, "reliability": 2, "audit": 3,
  // 設備・保全
  "equip-eval": 2, "preventive-maint": 1, "automation": 2, "energy-mgmt": 2, "plc-control": 1,
  // 材料・素材
  "metal-prop": 2, "heat-treat": 1, "polymer": 1, "corrosion": 1, "material-test": 1,
  // デジタル・IT
  "cae": 1, "cad": 1, "data-analysis": 2, "iot-sensor": 2, "production-sys": 3, "digital-twin": 2,
  // 市場・競合
  "competitor": 3, "customer-needs": 3, "industry-trend": 3, "pricing": 2, "marketing": 2,
  // コミュニケーション
  "cust-negotiation": 3, "cross-dept": 4, "documentation": 3, "presentation": 3, "mentoring": 2,
  // 安全・環境
  "occupational-safety": 2, "env-regulation": 2, "waste-mgmt": 2, "chemical-mgmt": 1, "ergonomics": 1,
};

// ============================================================
// 藤原 翔太 — 若手（技術特化・成長途上）
//
// 加工技術（CAE寄り）Lv.1-2
// 工程設計は Lv.1
// マネジメント・市場・ビジョンは Lv.1
// ============================================================

const FUJIWARA_SKILLS: SkillLevelMap = {
  // ビジョン・戦略
  "biz-strategy": 1, "tech-roadmap": 1, "innovation": 1, "ip-strategy": 1, "sustainability": 1, "global-perspective": 1, "alliance": 1,
  // マネジメント
  "project-mgmt": 1, "people-dev": 1, "resource-alloc": 1, "risk-mgmt": 1, "budget-mgmt": 1, "change-mgmt": 1, "kpi-design": 1,
  // 工程設計
  "process-seq": 1, "tolerance": 1, "cost-est": 1, "process-fmea": 1, "jig-fixture": 1, "line-layout": 1, "cycle-time": 1, "dfa-dfm": 1,
  // 加工技術
  "press-forming": 2, "springback": 2, "die-design": 1, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 1, "additive-mfg": 2,
  // 品質管理
  "qc-method": 1, "inspection": 1, "troubleshoot": 1, "measurement": 1, "supplier-quality": 1, "reliability": 1, "audit": 1,
  // 設備・保全
  "equip-eval": 1, "preventive-maint": 1, "automation": 1, "energy-mgmt": 1, "plc-control": 1,
  // 材料・素材
  "metal-prop": 2, "heat-treat": 1, "polymer": 1, "corrosion": 1, "material-test": 2,
  // デジタル・IT
  "cae": 3, "cad": 3, "data-analysis": 2, "iot-sensor": 1, "production-sys": 1, "digital-twin": 1,
  // 市場・競合
  "competitor": 1, "customer-needs": 1, "industry-trend": 1, "pricing": 1, "marketing": 1,
  // コミュニケーション
  "cust-negotiation": 1, "cross-dept": 1, "documentation": 2, "presentation": 1, "mentoring": 1,
  // 安全・環境
  "occupational-safety": 1, "env-regulation": 1, "waste-mgmt": 1, "chemical-mgmt": 1, "ergonomics": 1,
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
    { source: "brain_room_1shot", purpose: "SUS304 板厚1.2mm曲げ加工の工程検討", tq: tq(85, 80, 78, 90, qcdes(true, true, true, false, true)), skills: ["metal-prop", "springback", "process-seq", "press-forming"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "金型摩耗による品質低下の原因切り分け", tq: tq(80, 85, 82, 88, qcdes(true, true, false, false, true)), skills: ["die-design", "troubleshoot", "inspection", "measurement"], daysAgo: 49 },
    { source: "compath_chat", purpose: "新規顧客の公差要求と既存設備の適合確認", tq: tq(78, 82, 75, 88, qcdes(true, true, true, false, false)), skills: ["tolerance", "equip-eval", "customer-needs", "cust-negotiation"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "順送金型 vs タンデム構成の比較検討", tq: tq(90, 92, 85, 92, qcdes(true, true, true, false, true)), skills: ["process-seq", "die-design", "cost-est", "equip-eval", "cycle-time"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "若手への工程設計ノウハウ伝達方法の検討", tq: tq(72, 68, 65, 75, qcdes(true, false, false, false, false)), skills: ["people-dev", "documentation", "mentoring", "process-seq"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "スプリングバック補正量の妥当性検証", tq: tq(88, 90, 88, 95, qcdes(true, true, false, false, true)), skills: ["springback", "press-forming", "tolerance", "cae"], daysAgo: 21 },
    { source: "compath_chat", purpose: "後工程（溶接）との公差積み上げ確認", tq: tq(82, 85, 78, 88, qcdes(true, true, true, true, false)), skills: ["tolerance", "cross-dept", "qc-method", "welding", "dfa-dfm"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "安全カバー部品の工程FMEAレビュー", tq: tq(92, 95, 90, 93, qcdes(true, true, true, true, true)), skills: ["process-fmea", "troubleshoot", "preventive-maint", "occupational-safety", "risk-mgmt"], daysAgo: 7 },
  ]);
}

function nakajimaAssessments(): SkillAssessment[] {
  return makeAssessments("nakajima-kota", NAKAJIMA_SKILLS, [
    { source: "compath_chat", purpose: "新ライン立ち上げの工程設計方針", tq: tq(55, 50, 45, 60, qcdes(true, true, true, false, false)), skills: ["project-mgmt", "resource-alloc", "line-layout", "budget-mgmt"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "材料変更に伴う曲げ条件の見直し", tq: tq(60, 55, 50, 55, qcdes(true, true, false, false, false)), skills: ["metal-prop", "cost-est", "supplier-quality"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "外注先選定の判断基準整理", tq: tq(65, 68, 55, 58, qcdes(false, true, true, false, false)), skills: ["competitor", "cost-est", "cust-negotiation", "pricing"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "チーム育成計画の見直し", tq: tq(62, 60, 52, 55, qcdes(false, false, true, false, false)), skills: ["people-dev", "resource-alloc", "cross-dept", "kpi-design"], daysAgo: 21 },
    { source: "compath_chat", purpose: "品質クレーム対応の原因分析", tq: tq(70, 65, 60, 62, qcdes(true, true, false, false, true)), skills: ["troubleshoot", "cust-negotiation", "cross-dept", "audit"], daysAgo: 14 },
    { source: "compath_decision_navigator", purpose: "設備投資判断の費用対効果", tq: tq(72, 70, 62, 65, qcdes(true, true, true, false, false)), skills: ["equip-eval", "biz-strategy", "budget-mgmt", "automation", "digital-twin"], daysAgo: 7 },
  ]);
}

function fujiwaraAssessments(): SkillAssessment[] {
  return makeAssessments("fujiwara-shota", FUJIWARA_SKILLS, [
    { source: "brain_room_conference", purpose: "CAE解析結果の読み方を確認", tq: tq(20, 15, 10, 18, qcdes(false, false, false, false, false)), skills: ["cae", "press-forming", "springback"], daysAgo: 70 },
    { source: "brain_room_1shot", purpose: "板厚減少率の許容範囲を学ぶ", tq: tq(25, 20, 15, 22, qcdes(true, false, false, false, false)), skills: ["metal-prop", "tolerance", "material-test"], daysAgo: 63 },
    { source: "compath_chat", purpose: "スプリングバックの補正方法", tq: tq(30, 25, 18, 28, qcdes(true, false, false, false, false)), skills: ["springback", "press-forming", "cae"], daysAgo: 56 },
    { source: "brain_room_1shot", purpose: "初めての工程設計案の作成", tq: tq(32, 28, 20, 30, qcdes(true, true, false, false, false)), skills: ["process-seq", "metal-prop", "cad"], daysAgo: 49 },
    { source: "compath_decision_navigator", purpose: "材料選定の基本的な考え方", tq: tq(38, 35, 25, 35, qcdes(true, true, false, false, false)), skills: ["metal-prop", "cost-est", "data-analysis"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "先輩の工程設計を分析して学ぶ", tq: tq(42, 38, 30, 40, qcdes(true, true, true, false, false)), skills: ["process-seq", "die-design", "documentation", "cae"], daysAgo: 35 },
    { source: "compath_chat", purpose: "金型設計の基礎", tq: tq(45, 40, 32, 42, qcdes(true, true, true, false, false)), skills: ["die-design", "press-forming", "cad"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "品質検査の基本を学ぶ", tq: tq(48, 45, 35, 44, qcdes(true, true, true, false, true)), skills: ["qc-method", "inspection", "measurement"], daysAgo: 21 },
    { source: "compath_decision_navigator", purpose: "自分で工程順序を提案してレビュー", tq: tq(55, 50, 42, 50, qcdes(true, true, true, false, true)), skills: ["process-seq", "cost-est", "tolerance", "additive-mfg"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "品質とコストのバランスを考える", tq: tq(60, 55, 48, 55, qcdes(true, true, true, false, true)), skills: ["cost-est", "qc-method", "customer-needs", "data-analysis"], daysAgo: 7 },
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
