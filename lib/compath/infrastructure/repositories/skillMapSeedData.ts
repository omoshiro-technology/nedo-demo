/**
 * スキルマップ サンプルデータ
 *
 * デモ用に4名分のスキルプロファイルを生成する。
 * 新スキルカタログ（9カテゴリ x 8項目 = 72項目）に対応。
 *
 * 村田 鉄男 — ベテラン（38年）: 加工・工程設計・金型は高い、顧客要求・生産管理は中程度（ハイパ��ォーマー）
 * 中島 康太 — 中堅（12年）: 生産管理・顧客要求寄り、加工技術は中程度
 * 藤原 翔太 — 若手（3年）: シミュレーション・加工中心、他は成長途上
 * 田中 大輝 — 新人（2年目）: BRAIN-Roomを使って学習中。デモの主人公（ビフォーアフター対象）
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
  { id: "tanaka-daiki", name: "田中 大輝", role: "工程設計見習い（2年目）" },
  { id: "murata-tetsuo", name: "村田 鉄男", role: "ベテラン工程設計者（38年）" },
  { id: "nakajima-kota", name: "中島 康太", role: "生産技術マネージャー（12年）" },
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
// 加工技術・工程設計・金型は Lv.3-4
// 品質・保守・素材も高い
// 顧客要求・生産管理は Lv.2-3
// ============================================================

const MURATA_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 3, "part-usage": 3, "drawing-read": 4, "customer-negotiation": 3, "industry-standard": 2, "quotation": 2, "delivery-coord": 2, "needs-analysis": 2,
  // 生産管理
  "production-plan": 2, "process-control": 3, "inventory-mgmt": 2, "cost-control": 2, "delivery-mgmt": 2, "outsource-mgmt": 2, "productivity": 3, "work-standard": 3,
  // 工程設計
  "process-seq": 4, "tolerance": 4, "cost-est": 3, "process-fmea": 4, "jig-fixture": 3, "line-layout": 3, "cycle-time": 4, "dfa-dfm": 3,
  // 加工技術
  "press-forming": 4, "springback": 4, "welding": 2, "machining": 3, "surface-treat": 2, "assembly": 3, "grinding": 3, "bending": 4,
  // 金型・工法開発
  "die-design": 4, "die-structure": 4, "process-dev": 3, "tryout": 4, "forming-sim": 2, "method-eval": 3, "prototyping": 3, "die-material": 3,
  // 品質管理
  "qc-method": 3, "inspection": 3, "troubleshoot": 4, "measurement": 3, "supplier-quality": 2, "reliability": 2, "audit": 2, "spc": 3,
  // 保守・保全
  "preventive-maint": 3, "equip-diag": 3, "die-maint": 4, "automation": 2, "plc-control": 2, "daily-inspect": 3, "equip-eval": 4, "energy-mgmt": 1,
  // 素材・材料
  "steel": 4, "aluminum": 3, "stainless": 3, "copper": 2, "polymer": 1, "heat-treat": 3, "corrosion": 2, "material-test": 3,
  // 安全・環境
  "occupational-safety": 3, "env-regulation": 2, "waste-mgmt": 1, "chemical-mgmt": 2, "ergonomics": 2, "risk-assessment": 3, "emergency": 2, "five-s": 3,
};

// ============================================================
// 中島 康太 — 中堅（生産管理寄り）
//
// 生産管理・顧客要求 Lv.3-4
// 品質・安全 Lv.2-3
// 加工技術・金型は Lv.1-2
// ============================================================

const NAKAJIMA_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 3, "part-usage": 3, "drawing-read": 2, "customer-negotiation": 3, "industry-standard": 3, "quotation": 3, "delivery-coord": 4, "needs-analysis": 3,
  // 生産管理
  "production-plan": 4, "process-control": 3, "inventory-mgmt": 3, "cost-control": 3, "delivery-mgmt": 4, "outsource-mgmt": 3, "productivity": 3, "work-standard": 3,
  // 工程設計
  "process-seq": 2, "tolerance": 2, "cost-est": 3, "process-fmea": 2, "jig-fixture": 1, "line-layout": 2, "cycle-time": 2, "dfa-dfm": 2,
  // 加工技術
  "press-forming": 2, "springback": 1, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 2, "grinding": 1, "bending": 1,
  // 金型・工法開発
  "die-design": 2, "die-structure": 2, "process-dev": 1, "tryout": 1, "forming-sim": 1, "method-eval": 2, "prototyping": 1, "die-material": 1,
  // 品質管理
  "qc-method": 2, "inspection": 2, "troubleshoot": 2, "measurement": 1, "supplier-quality": 3, "reliability": 2, "audit": 3, "spc": 2,
  // 保守・保全
  "preventive-maint": 1, "equip-diag": 1, "die-maint": 1, "automation": 2, "plc-control": 1, "daily-inspect": 2, "equip-eval": 2, "energy-mgmt": 2,
  // 素材・材料
  "steel": 2, "aluminum": 1, "stainless": 1, "copper": 1, "polymer": 1, "heat-treat": 1, "corrosion": 1, "material-test": 1,
  // 安全・環境
  "occupational-safety": 2, "env-regulation": 2, "waste-mgmt": 2, "chemical-mgmt": 1, "ergonomics": 1, "risk-assessment": 3, "emergency": 2, "five-s": 3,
};

// ============================================================
// 藤原 翔太 — 若手（シミュレーション特化・成長途上）
//
// CAE/シミュレーション寄り Lv.2-3
// 加工基礎は Lv.1-2
// 他は Lv.1 中心
// ============================================================

const FUJIWARA_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 1, "part-usage": 1, "drawing-read": 2, "customer-negotiation": 1, "industry-standard": 1, "quotation": 1, "delivery-coord": 1, "needs-analysis": 1,
  // 生産管理
  "production-plan": 1, "process-control": 1, "inventory-mgmt": 1, "cost-control": 1, "delivery-mgmt": 1, "outsource-mgmt": 1, "productivity": 1, "work-standard": 1,
  // 工程設計
  "process-seq": 1, "tolerance": 1, "cost-est": 1, "process-fmea": 1, "jig-fixture": 1, "line-layout": 1, "cycle-time": 1, "dfa-dfm": 1,
  // 加工技術
  "press-forming": 2, "springback": 2, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 1, "grinding": 1, "bending": 1,
  // 金型・工法開発
  "die-design": 1, "die-structure": 1, "process-dev": 1, "tryout": 1, "forming-sim": 3, "method-eval": 1, "prototyping": 2, "die-material": 1,
  // 品質管理
  "qc-method": 1, "inspection": 1, "troubleshoot": 1, "measurement": 1, "supplier-quality": 1, "reliability": 1, "audit": 1, "spc": 1,
  // 保守・保全
  "preventive-maint": 1, "equip-diag": 1, "die-maint": 1, "automation": 1, "plc-control": 1, "daily-inspect": 1, "equip-eval": 1, "energy-mgmt": 1,
  // 素材・材料
  "steel": 2, "aluminum": 2, "stainless": 1, "copper": 1, "polymer": 1, "heat-treat": 1, "corrosion": 1, "material-test": 2,
  // 安全・環境
  "occupational-safety": 1, "env-regulation": 1, "waste-mgmt": 1, "chemical-mgmt": 1, "ergonomics": 1, "risk-assessment": 1, "emergency": 1, "five-s": 1,
};

// ============================================================
// 田中 大輝 — 新人（2年目・デモ主人公）
//
// BRAIN-Roomを使って学習中。ほぼ全てLv.1からスタート。
// SUS304深絞りの議論を経て、工程設計・素材・金型の基礎がLv.1→Lv.2に成長。
// ============================================================

const TANAKA_SKILLS_BEFORE: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 1, "part-usage": 1, "drawing-read": 1, "customer-negotiation": 1, "industry-standard": 1, "quotation": 1, "delivery-coord": 1, "needs-analysis": 1,
  // 生産管理
  "production-plan": 1, "process-control": 1, "inventory-mgmt": 1, "cost-control": 1, "delivery-mgmt": 1, "outsource-mgmt": 1, "productivity": 1, "work-standard": 1,
  // 工程設計
  "process-seq": 1, "tolerance": 1, "cost-est": 1, "process-fmea": 1, "jig-fixture": 1, "line-layout": 1, "cycle-time": 1, "dfa-dfm": 1,
  // 加工技術
  "press-forming": 1, "springback": 1, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 1, "grinding": 1, "bending": 1,
  // 金型・工法開発
  "die-design": 1, "die-structure": 1, "process-dev": 1, "tryout": 1, "forming-sim": 1, "method-eval": 1, "prototyping": 1, "die-material": 1,
  // 品質管理
  "qc-method": 1, "inspection": 1, "troubleshoot": 1, "measurement": 1, "supplier-quality": 1, "reliability": 1, "audit": 1, "spc": 1,
  // 保守・保全
  "preventive-maint": 1, "equip-diag": 1, "die-maint": 1, "automation": 1, "plc-control": 1, "daily-inspect": 1, "equip-eval": 1, "energy-mgmt": 1,
  // 素材・材料
  "steel": 1, "aluminum": 1, "stainless": 1, "copper": 1, "polymer": 1, "heat-treat": 1, "corrosion": 1, "material-test": 1,
  // 安全・環境
  "occupational-safety": 1, "env-regulation": 1, "waste-mgmt": 1, "chemical-mgmt": 1, "ergonomics": 1, "risk-assessment": 1, "emergency": 1, "five-s": 1,
};

// BRAIN-Room議論後にスキルアップした結果（ビフォーアフターの「After」）
const TANAKA_SKILLS_AFTER: SkillLevelMap = {
  ...TANAKA_SKILLS_BEFORE,
  // SUS304深絞り議論で成長した領域
  "drawing-read": 2,     // 顧客仕様確認の重要性を学んだ
  "process-seq": 2,      // 工程数の逆算アプローチを理解
  "cost-est": 2,         // 3工程vs4工程のコスト比較の考え方
  "press-forming": 2,    // 加工硬化と割れリスクの基礎
  "stainless": 2,        // SUS304の特性を学んだ
  "die-maint": 2,        // 型摩耗管理の基本を知った
  "qc-method": 2,        // 試作→量産の品質再現性の考え方
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
    { source: "brain_room_1shot", purpose: "SUS304 板厚1.2mm曲げ加工の工程検討", tq: tq(85, 80, 78, 90, qcdes(true, true, true, false, true)), skills: ["stainless", "springback", "process-seq", "press-forming"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "金型摩耗による品質低下の原因切り分け", tq: tq(80, 85, 82, 88, qcdes(true, true, false, false, true)), skills: ["die-maint", "troubleshoot", "inspection", "measurement"], daysAgo: 49 },
    { source: "compath_chat", purpose: "新規顧客の公差要求と既存設備の適合確認", tq: tq(78, 82, 75, 88, qcdes(true, true, true, false, false)), skills: ["tolerance", "equip-eval", "needs-analysis", "customer-negotiation"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "順送金型 vs タンデム構成の比較検討", tq: tq(90, 92, 85, 92, qcdes(true, true, true, false, true)), skills: ["process-seq", "die-structure", "cost-est", "equip-eval", "cycle-time"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "若手への工程設計ノウハウ伝達方法の検討", tq: tq(72, 68, 65, 75, qcdes(true, false, false, false, false)), skills: ["work-standard", "prototyping", "process-seq", "tryout"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "スプリングバック補正量の妥当性検証", tq: tq(88, 90, 88, 95, qcdes(true, true, false, false, true)), skills: ["springback", "press-forming", "tolerance", "forming-sim"], daysAgo: 21 },
    { source: "compath_chat", purpose: "後工程（溶接）との公差積み上げ確認", tq: tq(82, 85, 78, 88, qcdes(true, true, true, true, false)), skills: ["tolerance", "delivery-coord", "qc-method", "welding", "dfa-dfm"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "安全カバー部品の工程FMEAレビュー", tq: tq(92, 95, 90, 93, qcdes(true, true, true, true, true)), skills: ["process-fmea", "troubleshoot", "preventive-maint", "occupational-safety", "risk-assessment"], daysAgo: 7 },
  ]);
}

function nakajimaAssessments(): SkillAssessment[] {
  return makeAssessments("nakajima-kota", NAKAJIMA_SKILLS, [
    { source: "compath_chat", purpose: "新ライン立ち上げの工程設計方針", tq: tq(55, 50, 45, 60, qcdes(true, true, true, false, false)), skills: ["production-plan", "productivity", "line-layout", "cost-control"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "材料変更に伴う曲げ条件の見直し", tq: tq(60, 55, 50, 55, qcdes(true, true, false, false, false)), skills: ["steel", "cost-est", "supplier-quality"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "外注先選定の判断基準整理", tq: tq(65, 68, 55, 58, qcdes(false, true, true, false, false)), skills: ["outsource-mgmt", "cost-est", "customer-negotiation", "quotation"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "作業標準化と技能伝承計画の見直し", tq: tq(62, 60, 52, 55, qcdes(false, false, true, false, false)), skills: ["work-standard", "productivity", "process-control", "five-s"], daysAgo: 21 },
    { source: "compath_chat", purpose: "品質クレーム対応の原因分析", tq: tq(70, 65, 60, 62, qcdes(true, true, false, false, true)), skills: ["troubleshoot", "customer-negotiation", "delivery-coord", "audit"], daysAgo: 14 },
    { source: "compath_decision_navigator", purpose: "設備投資判断の費用対効果", tq: tq(72, 70, 62, 65, qcdes(true, true, true, false, false)), skills: ["equip-eval", "production-plan", "cost-control", "automation", "forming-sim"], daysAgo: 7 },
  ]);
}

function fujiwaraAssessments(): SkillAssessment[] {
  return makeAssessments("fujiwara-shota", FUJIWARA_SKILLS, [
    { source: "brain_room_conference", purpose: "成形シミュレーション結果の読み方を確認", tq: tq(20, 15, 10, 18, qcdes(false, false, false, false, false)), skills: ["forming-sim", "press-forming", "springback"], daysAgo: 70 },
    { source: "brain_room_1shot", purpose: "板厚減少率の許容範囲を学ぶ", tq: tq(25, 20, 15, 22, qcdes(true, false, false, false, false)), skills: ["steel", "tolerance", "material-test"], daysAgo: 63 },
    { source: "compath_chat", purpose: "スプリングバックの補正方法", tq: tq(30, 25, 18, 28, qcdes(true, false, false, false, false)), skills: ["springback", "press-forming", "forming-sim"], daysAgo: 56 },
    { source: "brain_room_1shot", purpose: "初めての工程設計案の作成", tq: tq(32, 28, 20, 30, qcdes(true, true, false, false, false)), skills: ["process-seq", "steel", "drawing-read"], daysAgo: 49 },
    { source: "compath_decision_navigator", purpose: "材料選定の基本的な考え方", tq: tq(38, 35, 25, 35, qcdes(true, true, false, false, false)), skills: ["aluminum", "cost-est", "spc"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "先輩の工程設計を分析して学ぶ", tq: tq(42, 38, 30, 40, qcdes(true, true, true, false, false)), skills: ["process-seq", "die-design", "work-standard", "forming-sim"], daysAgo: 35 },
    { source: "compath_chat", purpose: "金型設計の基礎", tq: tq(45, 40, 32, 42, qcdes(true, true, true, false, false)), skills: ["die-design", "press-forming", "die-structure"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "品質検査の基本を学ぶ", tq: tq(48, 45, 35, 44, qcdes(true, true, true, false, true)), skills: ["qc-method", "inspection", "measurement"], daysAgo: 21 },
    { source: "compath_decision_navigator", purpose: "自分で工程順序を提案してレビュー", tq: tq(55, 50, 42, 50, qcdes(true, true, true, false, true)), skills: ["process-seq", "cost-est", "tolerance", "prototyping"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "品質とコストのバランスを考える", tq: tq(60, 55, 48, 55, qcdes(true, true, true, false, true)), skills: ["cost-est", "qc-method", "needs-analysis", "spc"], daysAgo: 7 },
  ]);
}

function tanakaAssessments(): SkillAssessment[] {
  return makeAssessments("tanaka-daiki", TANAKA_SKILLS_AFTER, [
    // 入社直後：基礎研修でBRAIN-Roomを体験
    { source: "brain_room_1shot", purpose: "プレス加工の基礎を学ぶ", tq: tq(15, 10, 8, 12, qcdes(false, false, false, false, false)), skills: ["press-forming", "steel", "drawing-read"], daysAgo: 60 },
    { source: "compath_chat", purpose: "図面の読み方を先輩AIに質問", tq: tq(18, 12, 10, 15, qcdes(true, false, false, false, false)), skills: ["drawing-read", "tolerance", "req-spec"], daysAgo: 50 },
    // SUS304深絞り案件：BRAIN-Roomの議論を閲覧
    { source: "brain_room_conference", purpose: "SUS304 t1.5 深絞り形状の工程設計方針", tq: tq(25, 20, 15, 22, qcdes(true, true, false, false, false)), skills: ["press-forming", "stainless", "process-seq", "cost-est"], daysAgo: 14 },
    // 議論を見た後にチャットで質問
    { source: "compath_chat", purpose: "SUS304で中間焼鈍を入れるかどうかの判断基準を質問", tq: tq(32, 28, 22, 30, qcdes(true, true, true, false, false)), skills: ["stainless", "process-seq", "die-maint", "qc-method"], daysAgo: 12 },
    // 意思決定キャンバスで自分の判断を構造化
    { source: "compath_decision_navigator", purpose: "3工程vs4工程の判断を整理", tq: tq(38, 35, 28, 35, qcdes(true, true, true, false, true)), skills: ["process-seq", "cost-est", "drawing-read", "press-forming", "qc-method", "die-maint", "stainless"], daysAgo: 7 },
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
    ...tanakaAssessments(),
    ...murataAssessments(),
    ...nakajimaAssessments(),
    ...fujiwaraAssessments(),
  ];

  const tanakaProfile = buildProfile("tanaka-daiki", TANAKA_SKILLS_AFTER, allAssessments);

  // 田中大輝のレベルアップ根拠を注入（デモ用）
  const tanakaEvidence: Record<string, import("../../domain/skillMap/types").LevelUpEvidence[]> = {
    "drawing-read": [
      { source: "compath_chat", sessionId: "sess-tanaka-daiki-001", project: "図面の読み方を先輩AIに質問", reason: "顧客仕様書と設計図面の突き合わせの重要性を理解。安藤AIから「公差の意味を問い直す」観点を学んだ", date: date(50) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-004", project: "3工程vs4工程の判断を整理", reason: "顧客要求仕様から工程数を逆算する際、図面の暗黙の品質要求を読み取る力が向上", date: date(7) },
    ],
    "process-seq": [
      { source: "brain_room_conference", sessionId: "sess-tanaka-daiki-002", project: "SUS304 t1.5 深絞り形状の工程設計方針", reason: "村田AIの「材質から工程数を逆算する」アプローチを学び、工程順序の設計思考を理解", date: date(14) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-004", project: "3工程vs4工程の判断を整理", reason: "工程数の選択がコスト・品質・納期に与える影響を構造的に整理できるようになった", date: date(7) },
    ],
    "cost-est": [
      { source: "brain_room_conference", sessionId: "sess-tanaka-daiki-002", project: "SUS304 t1.5 深絞り形状の工程設計方針", reason: "中島AIの「3工程vs4工程のLCC比較」の考え方を学び、型費と加工費の全体最適を理解", date: date(14) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-004", project: "3工程vs4工程の判断を整理", reason: "ライフサイクルコストの構成要素（型費・メンテ費・停止コスト）を自分で整理できるようになった", date: date(7) },
    ],
    "press-forming": [
      { source: "brain_room_1shot", sessionId: "sess-tanaka-daiki-000", project: "プレス加工の基礎を学ぶ", reason: "プレス成形の基本原理（絞り比、加工限界）を理解", date: date(60) },
      { source: "brain_room_conference", sessionId: "sess-tanaka-daiki-002", project: "SUS304 t1.5 深絞り形状の工程設計方針", reason: "SUS304の加工硬化メカニズムと割れリスクの実務的な判断基準を学んだ", date: date(14) },
    ],
    "stainless": [
      { source: "brain_room_conference", sessionId: "sess-tanaka-daiki-002", project: "SUS304 t1.5 深絞り形状の工程設計方針", reason: "SUS304の加工特性（加工硬化、熱伝導率の低さ、型のカジリリスク）を議論から吸収", date: date(14) },
      { source: "compath_chat", sessionId: "sess-tanaka-daiki-003", project: "SUS304で中間焼鈍を入れるかどうかの判断基準を質問", reason: "中間焼鈍の要否判断基準（加工硬化率、工程間の板厚減少率）を具体的に学んだ", date: date(12) },
    ],
    "die-maint": [
      { source: "compath_chat", sessionId: "sess-tanaka-daiki-003", project: "SUS304で中間焼鈍を入れるかどうかの判断基準を質問", reason: "黒田AIの「型摩耗の3段階検証」の考え方から、型メンテナンスの基本を理解", date: date(12) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-004", project: "3工程vs4工程の判断を整理", reason: "型摩耗速度とメンテナンス周期がLCCに与える影響を構造的に理解できるようになった", date: date(7) },
    ],
    "qc-method": [
      { source: "compath_chat", sessionId: "sess-tanaka-daiki-003", project: "SUS304で中間焼鈍を入れるかどうかの判断基準を質問", reason: "安藤AIから「試作→量産の再現性」という品質管理の本質的な課題を学んだ", date: date(12) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-004", project: "3工程vs4工程の判断を整理", reason: "試作検証フレームワーク（初期・中期・後期の3段階）の品質管理手法を整理できた", date: date(7) },
    ],
  };

  for (const [skillId, evidence] of Object.entries(tanakaEvidence)) {
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
