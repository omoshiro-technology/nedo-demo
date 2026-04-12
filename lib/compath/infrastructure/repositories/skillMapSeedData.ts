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

function qcdes(q: number, c: number, d: number, e: number, s: number): QCDESCoverage {
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
    { source: "brain_room_1shot", purpose: "SUS304 板厚1.2mm曲げ加工の工程検討", tq: tq(85, 80, 78, 90, qcdes(85, 80, 75, 15, 80)), skills: ["stainless", "springback", "process-seq", "press-forming"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "金型摩耗による品質低下の原因切り分け", tq: tq(80, 85, 82, 88, qcdes(88, 78, 25, 10, 75)), skills: ["die-maint", "troubleshoot", "inspection", "measurement"], daysAgo: 49 },
    { source: "compath_chat", purpose: "新規顧客の公差要求と既存設備の適合確認", tq: tq(78, 82, 75, 88, qcdes(82, 75, 80, 10, 20)), skills: ["tolerance", "equip-eval", "needs-analysis", "customer-negotiation"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "順送金型 vs タンデム構成の比較検討", tq: tq(90, 92, 85, 92, qcdes(90, 88, 82, 15, 78)), skills: ["process-seq", "die-structure", "cost-est", "equip-eval", "cycle-time"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "若手への工程設計ノウハウ伝達方法の検討", tq: tq(72, 68, 65, 75, qcdes(70, 25, 20, 10, 15)), skills: ["work-standard", "prototyping", "process-seq", "tryout"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "スプリングバック補正量の妥当性検証", tq: tq(88, 90, 88, 95, qcdes(88, 82, 30, 10, 80)), skills: ["springback", "press-forming", "tolerance", "forming-sim"], daysAgo: 21 },
    { source: "compath_chat", purpose: "後工程（溶接）との公差積み上げ確認", tq: tq(82, 85, 78, 88, qcdes(82, 80, 78, 55, 20)), skills: ["tolerance", "delivery-coord", "qc-method", "welding", "dfa-dfm"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "安全カバー部品の工程FMEAレビュー", tq: tq(92, 95, 90, 93, qcdes(95, 88, 85, 70, 92)), skills: ["process-fmea", "troubleshoot", "preventive-maint", "occupational-safety", "risk-assessment"], daysAgo: 7 },
  ]);
}

function nakajimaAssessments(): SkillAssessment[] {
  return makeAssessments("nakajima-kota", NAKAJIMA_SKILLS, [
    { source: "compath_chat", purpose: "新ライン立ち上げの工程設計方針", tq: tq(55, 50, 45, 60, qcdes(55, 60, 50, 5, 10)), skills: ["production-plan", "productivity", "line-layout", "cost-control"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "材料変更に伴う曲げ条件の見直し", tq: tq(60, 55, 50, 55, qcdes(58, 55, 15, 5, 10)), skills: ["steel", "cost-est", "supplier-quality"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "外注先選定の判断基準整理", tq: tq(65, 68, 55, 58, qcdes(20, 68, 55, 5, 8)), skills: ["outsource-mgmt", "cost-est", "customer-negotiation", "quotation"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "作業標準化と技能伝承計画の見直し", tq: tq(62, 60, 52, 55, qcdes(15, 15, 50, 5, 10)), skills: ["work-standard", "productivity", "process-control", "five-s"], daysAgo: 21 },
    { source: "compath_chat", purpose: "品質クレーム対応の原因分析", tq: tq(70, 65, 60, 62, qcdes(65, 55, 20, 5, 35)), skills: ["troubleshoot", "customer-negotiation", "delivery-coord", "audit"], daysAgo: 14 },
    { source: "compath_decision_navigator", purpose: "設備投資判断の費用対効果", tq: tq(72, 70, 62, 65, qcdes(65, 72, 60, 10, 15)), skills: ["equip-eval", "production-plan", "cost-control", "automation", "forming-sim"], daysAgo: 7 },
  ]);
}

function fujiwaraAssessments(): SkillAssessment[] {
  return makeAssessments("fujiwara-shota", FUJIWARA_SKILLS, [
    { source: "brain_room_conference", purpose: "成形シミュレーション結果の読み方を確認", tq: tq(20, 15, 10, 18, qcdes(5, 0, 0, 0, 0)), skills: ["forming-sim", "press-forming", "springback"], daysAgo: 70 },
    { source: "brain_room_1shot", purpose: "板厚減少率の許容範囲を学ぶ", tq: tq(25, 20, 15, 22, qcdes(15, 5, 0, 0, 0)), skills: ["steel", "tolerance", "material-test"], daysAgo: 63 },
    { source: "compath_chat", purpose: "スプリングバックの補正方法", tq: tq(30, 25, 18, 28, qcdes(20, 8, 0, 0, 0)), skills: ["springback", "press-forming", "forming-sim"], daysAgo: 56 },
    { source: "brain_room_1shot", purpose: "初めての工程設計案の作成", tq: tq(32, 28, 20, 30, qcdes(25, 18, 8, 0, 0)), skills: ["process-seq", "steel", "drawing-read"], daysAgo: 49 },
    { source: "compath_decision_navigator", purpose: "材料選定の基本的な考え方", tq: tq(38, 35, 25, 35, qcdes(30, 25, 8, 0, 0)), skills: ["aluminum", "cost-est", "spc"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "先輩の工程設計を分析して学ぶ", tq: tq(42, 38, 30, 40, qcdes(35, 28, 18, 0, 0)), skills: ["process-seq", "die-design", "work-standard", "forming-sim"], daysAgo: 35 },
    { source: "compath_chat", purpose: "金型設計の基礎", tq: tq(45, 40, 32, 42, qcdes(40, 32, 22, 0, 5)), skills: ["die-design", "press-forming", "die-structure"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "品質検査の基本を学ぶ", tq: tq(48, 45, 35, 44, qcdes(45, 35, 25, 0, 18)), skills: ["qc-method", "inspection", "measurement"], daysAgo: 21 },
    { source: "compath_decision_navigator", purpose: "自分で工程順序を提案してレビュー", tq: tq(55, 50, 42, 50, qcdes(50, 45, 35, 5, 22)), skills: ["process-seq", "cost-est", "tolerance", "prototyping"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "品質とコストのバランスを考える", tq: tq(60, 55, 48, 55, qcdes(55, 50, 40, 5, 28)), skills: ["cost-est", "qc-method", "needs-analysis", "spc"], daysAgo: 7 },
  ]);
}

function tanakaAssessments(): SkillAssessment[] {
  return makeAssessments("tanaka-daiki", TANAKA_SKILLS_AFTER, [
    // 入社直後：基礎研修でBRAIN-Roomを体験
    { source: "brain_room_1shot", purpose: "プレス加工の基礎を学ぶ", tq: tq(15, 10, 8, 12, qcdes(0, 0, 0, 0, 0)), skills: ["press-forming", "steel", "drawing-read"], daysAgo: 60 },
    { source: "compath_chat", purpose: "図面の読み方を先輩AIに質問", tq: tq(18, 12, 10, 15, qcdes(12, 0, 0, 0, 0)), skills: ["drawing-read", "tolerance", "req-spec"], daysAgo: 50 },
    // 初めての意思決定キャンバス：図面読解の優先度を整理
    { source: "compath_decision_navigator", purpose: "図面から読み取るべき品質要求の整理", tq: tq(20, 16, 12, 18, qcdes(18, 8, 5, 0, 0)), skills: ["drawing-read", "tolerance", "req-spec"], daysAgo: 38 },
    // 材料と工程の関係を意思決定キャンバスで構造化
    { source: "compath_decision_navigator", purpose: "材料選定がコスト・品質に与える影響の整理", tq: tq(25, 22, 18, 25, qcdes(25, 20, 10, 0, 5)), skills: ["steel", "press-forming", "cost-est"], daysAgo: 25 },
    // SUS304深絞り案件：BRAIN-Roomの議論を閲覧
    { source: "brain_room_conference", purpose: "SUS304 t1.5 深絞り形状の工程設計方針", tq: tq(28, 22, 15, 24, qcdes(22, 18, 5, 0, 0)), skills: ["press-forming", "stainless", "process-seq", "cost-est"], daysAgo: 14 },
    // 議論を見た後にチャットで質問
    { source: "compath_chat", purpose: "SUS304で中間焼鈍を入れるかどうかの判断基準を質問", tq: tq(32, 28, 22, 30, qcdes(28, 22, 12, 0, 0)), skills: ["stainless", "process-seq", "die-maint", "qc-method"], daysAgo: 12 },
    // 意思決定キャンバスで自分の判断を構造化
    { source: "compath_decision_navigator", purpose: "3工程vs4工程の判断を整理", tq: tq(38, 35, 28, 35, qcdes(35, 28, 18, 0, 10)), skills: ["process-seq", "cost-est", "drawing-read", "press-forming", "qc-method", "die-maint", "stainless"], daysAgo: 7 },
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
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-002", project: "A社ブラケットの品質要求整理", reason: "図面の寸法公差だけ見て工程設計しかけたが、注記欄の幾何公差（平面度0.05）を見落としていた。加工基準面の取り方を変えないと達成できないと判断し、工程案を修正した", date: date(38) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "図面注記「バリなきこと」をトリム工程だけで対応するか、後工程にバレル研磨を追加するか検討。トリム型の刃先管理コストとバレル研磨の工程追加コストを比較し、バレル研磨追加を選択", date: date(7) },
    ],
    "tolerance": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-002", project: "A社ブラケットの品質要求整理", reason: "穴位置公差±0.1mmを単発型で保証するか順送型にするか検討。単発型では工程間搬送で±0.15mm程度のズレが生じるリスクがあり、順送型のパイロットピン方式を選択", date: date(38) },
    ],
    "steel": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-003", project: "B社カバー部品の材料選定", reason: "SPCC-SD（伸び率28%）のままで絞り比2.1に挑むか、SPCEに変更するか比較。SPCCでは試作で底部コーナーに微小亀裂が出ており、伸び率41%のSPCEに変更して割れリスクを回避する判断をした", date: date(25) },
    ],
    "press-forming": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-003", project: "B社カバー部品の材料選定", reason: "SPCE変更後のBHFを現行45kNで据え置くか下げるか検討。伸び率向上でしわ押さえを緩められるため38kNに下げる案を選択。ただし下げすぎるとフランジしわが出るため、試作で35kN/38kN/40kNの3条件を比較する計画とした", date: date(25) },
    ],
    "cost-est": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-003", project: "B社カバー部品の材料選定", reason: "SPCE変更の材料費増（+8円/kg×月産5000個）を許容するか、SPCCのまま金型改修で対応するかを比較。金型改修費120万円+不良率3%維持 vs 材料費増+不良率1%を試算し、6ヶ月で材料変更案が逆転する判断に至った", date: date(25) },
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "初期投資を抑える3工程案（型費1,800万円）か、ランニングで有利な4工程案（型費2,200万円）かをLCCで比較。月産3000個���5年の前提で4工程案が累計約340万円有利となり、型費増を許容する判断をした", date: date(7) },
    ],
    "process-seq": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "3工程案では2工程目の絞り比が1.8となり加工限界（1.6〜1.7）を超えるリスクが��った。4工程に分割して各工程の絞り比を1.4以下に抑えるか、3工程+中間焼鈍で対応するか検討し、品質安定性を優先して4工程案を選択", date: date(7) },
    ],
    "stainless": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "SUS304の加工硬化（HV180→HV280）に対し、中間焼鈍なしで4工程とするか、3工程+中間焼鈍（1050℃×3min）とするか比較。焼鈍の外注リードタイム（+3日）と酸化スケール除去コストを考慮し、中間焼鈍なし4工程を選択", date: date(7) },
    ],
    "die-maint": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "SUS304のカジリ対策としてダイス表面処理をTD処理（寿命10万ショット・処理費40万円）とTiCNコーティング（寿命8万ショット・処理費15万円）で比較。型本数4本×年2回の再処理頻度を考慮し、トータルコストで有利なTiCNを選択", date: date(7) },
    ],
    "qc-method": [
      { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "試作検証を一括500個で行うか段階的に進めるか検討。初期50個で板厚減少率が許容15%を超えた場合に早期に条件修正できるよう、3段階（初期50個→中期200個でCpk確認→後期500個で工程能力検証）に分割する方針を選択", date: date(7) },
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
