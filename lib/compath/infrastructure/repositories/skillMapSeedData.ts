/**
 * スキルマップ サンプルデータ
 *
 * デモ用に3名分のアセスメント・プロファイルを生成する。
 *
 * 村田 鉄男 — ベテラン（38年）: 高スコア、全軸カバー
 * 中島 康太 — 中堅（12年）: 中スコア、コスト・品質中心
 * 藤原 翔太 — 若手（3年）: 低→成長中、CAE寄り
 */

import type {
  SkillAssessment,
  SkillProfile,
  SkillItem,
  SkillLevel,
  SessionSource,
  ThoughtQualityScore,
  QCDESCoverage,
  SkillProficiency,
} from "../../domain/skillMap/types";

// ============================================================
// スキル項目マスタ（板金プレス工程設計ドメイン）
// ============================================================

export const SAMPLE_SKILLS: SkillItem[] = [
  { id: "material-selection", name: "材料選定", domain: "生産技術", relatedNodeIds: [] },
  { id: "mold-constraint", name: "金型制約の理解", domain: "金型設計", relatedNodeIds: [] },
  { id: "tolerance-design", name: "公差設計", domain: "設計", relatedNodeIds: [] },
  { id: "process-sequence", name: "工程順序の構想", domain: "生産技術", relatedNodeIds: [] },
  { id: "springback", name: "スプリングバック予測", domain: "加工技術", relatedNodeIds: [] },
  { id: "post-process", name: "後工程整合", domain: "生産技術", relatedNodeIds: [] },
  { id: "quality-inspection", name: "品質検査設計", domain: "品質管理", relatedNodeIds: [] },
  { id: "cost-optimization", name: "コスト最適化", domain: "生産管理", relatedNodeIds: [] },
  { id: "equipment-capability", name: "設備能力評価", domain: "生産技術", relatedNodeIds: [] },
  { id: "safety-assessment", name: "安全性評価", domain: "安全管理", relatedNodeIds: [] },
  { id: "cae-simulation", name: "CAEシミュレーション", domain: "解析", relatedNodeIds: [] },
  { id: "troubleshooting", name: "トラブルシューティング", domain: "保守", relatedNodeIds: [] },
];

export const SAMPLE_USERS = [
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

function makeId(prefix: string, i: number): string {
  return `${prefix}-${String(i).padStart(3, "0")}`;
}

function qcdes(q: boolean, c: boolean, d: boolean, e: boolean, s: boolean): QCDESCoverage {
  return { quality: q, cost: c, delivery: d, environment: e, safety: s };
}

function tq(vc: number, st: number, pr: number, el: number, qc: QCDESCoverage): ThoughtQualityScore {
  return { viewpointCoverage: vc, qcdesCoverage: qc, structuralThinking: st, proactiveness: pr, expertiseLevel: el };
}

// ============================================================
// 村田 鉄男 — ベテラン
// ============================================================

function muratAssessments(): SkillAssessment[] {
  const userId = "murata-tetsuo";
  const sources: SessionSource[] = ["brain_room_1shot", "compath_decision_navigator", "compath_chat", "brain_room_1shot", "compath_decision_navigator", "brain_room_1shot", "compath_chat", "brain_room_1shot"];
  const purposes = [
    "SUS304 板厚1.2mm曲げ加工の工程検討",
    "金型摩耗による品質低下の原因切り分け",
    "新規顧客の公差要求と既存設備の適合確認",
    "多工程プレスの順送金型 vs タンデム構成比較",
    "A社向けブラケットのコスト最適化",
    "スプリングバック補正量の妥当性検証",
    "後工程（溶接）との公差積み上げ確認",
    "安全カバー部品の工程FMEAレビュー",
  ];

  return purposes.map((purpose, i) => ({
    id: makeId("sa-murata", i),
    userId,
    sessionSource: sources[i],
    sessionId: makeId("sess-murata", i),
    sessionPurpose: purpose,
    thoughtQuality: [
      tq(85, 80, 78, 90, qcdes(true, true, true, false, true)),
      tq(80, 85, 82, 88, qcdes(true, true, false, false, true)),
      tq(75, 78, 72, 85, qcdes(true, true, true, false, false)),
      tq(90, 92, 85, 92, qcdes(true, true, true, false, true)),
      tq(82, 75, 70, 80, qcdes(true, true, true, false, false)),
      tq(88, 90, 88, 95, qcdes(true, true, false, false, true)),
      tq(78, 82, 75, 88, qcdes(true, true, true, true, false)),
      tq(92, 95, 90, 93, qcdes(true, true, true, true, true)),
    ][i],
    userRaisedPoints: [],
    touchedSkillIds: [
      ["material-selection", "springback", "process-sequence", "quality-inspection"],
      ["mold-constraint", "troubleshooting", "quality-inspection"],
      ["tolerance-design", "equipment-capability", "post-process"],
      ["process-sequence", "mold-constraint", "cost-optimization", "equipment-capability"],
      ["cost-optimization", "material-selection", "process-sequence"],
      ["springback", "cae-simulation", "tolerance-design"],
      ["post-process", "tolerance-design", "quality-inspection"],
      ["safety-assessment", "process-sequence", "quality-inspection", "troubleshooting"],
    ][i],
    skillLevels: Object.fromEntries(
      [
        ["material-selection", "springback", "process-sequence", "quality-inspection"],
        ["mold-constraint", "troubleshooting", "quality-inspection"],
        ["tolerance-design", "equipment-capability", "post-process"],
        ["process-sequence", "mold-constraint", "cost-optimization", "equipment-capability"],
        ["cost-optimization", "material-selection", "process-sequence"],
        ["springback", "cae-simulation", "tolerance-design"],
        ["post-process", "tolerance-design", "quality-inspection"],
        ["safety-assessment", "process-sequence", "quality-inspection", "troubleshooting"],
      ][i].map((sid) => [sid, 4 as SkillLevel])
    ),
    assessedAt: date(56 - i * 7),
  }));
}

// ============================================================
// 中島 康太 — 中堅
// ============================================================

function nakajimaAssessments(): SkillAssessment[] {
  const userId = "nakajima-kota";
  const sources: SessionSource[] = ["compath_chat", "brain_room_1shot", "compath_decision_navigator", "brain_room_1shot", "compath_chat", "compath_decision_navigator"];
  const purposes = [
    "新ライン立ち上げの工程設計方針",
    "材料変更に伴う曲げ条件の見直し",
    "外注先選定の判断基準整理",
    "生産効率とコストのトレードオフ検討",
    "品質クレーム対応の原因分析",
    "設備投資判断の費用対効果",
  ];

  return purposes.map((purpose, i) => ({
    id: makeId("sa-nakajima", i),
    userId,
    sessionSource: sources[i],
    sessionId: makeId("sess-nakajima", i),
    sessionPurpose: purpose,
    thoughtQuality: [
      tq(55, 50, 45, 60, qcdes(true, true, true, false, false)),
      tq(60, 55, 50, 55, qcdes(true, true, false, false, false)),
      tq(58, 62, 48, 50, qcdes(false, true, true, false, false)),
      tq(65, 68, 55, 58, qcdes(true, true, true, false, false)),
      tq(70, 65, 60, 62, qcdes(true, true, false, false, true)),
      tq(72, 70, 62, 65, qcdes(true, true, true, false, false)),
    ][i],
    userRaisedPoints: [],
    touchedSkillIds: [
      ["process-sequence", "equipment-capability", "cost-optimization"],
      ["material-selection", "springback"],
      ["cost-optimization", "quality-inspection"],
      ["cost-optimization", "process-sequence", "equipment-capability"],
      ["quality-inspection", "troubleshooting", "mold-constraint"],
      ["cost-optimization", "equipment-capability"],
    ][i],
    skillLevels: Object.fromEntries(
      [
        ["process-sequence", "equipment-capability", "cost-optimization"],
        ["material-selection", "springback"],
        ["cost-optimization", "quality-inspection"],
        ["cost-optimization", "process-sequence", "equipment-capability"],
        ["quality-inspection", "troubleshooting", "mold-constraint"],
        ["cost-optimization", "equipment-capability"],
      ][i].map((sid) => {
        const lv: SkillLevel = ["cost-optimization", "process-sequence"].includes(sid) ? 3 : 2;
        return [sid, lv];
      })
    ),
    assessedAt: date(42 - i * 7),
  }));
}

// ============================================================
// 藤原 翔太 — 若手（成長途上）
// ============================================================

function fujiwaraAssessments(): SkillAssessment[] {
  const userId = "fujiwara-shota";
  const sources: SessionSource[] = ["brain_room_1shot", "brain_room_conference", "compath_chat", "brain_room_1shot", "compath_decision_navigator", "brain_room_1shot", "compath_chat", "brain_room_1shot", "compath_decision_navigator", "brain_room_1shot"];
  const purposes = [
    "CAE解析結果の読み方を確認",
    "プレス成形シミュレーションの前提条件",
    "板厚減少率の許容範囲",
    "スプリングバックの補正方法",
    "初めての工程設計案の作成",
    "材料選定の基本的な考え方",
    "金型設計の基礎を学ぶ",
    "先輩の工程設計を分析して学ぶ",
    "自分で工程順序を提案してレビュー",
    "品質とコストのバランスを考える",
  ];

  // 成長を表現: スコアが徐々に上がる
  return purposes.map((purpose, i) => {
    const growth = i * 5;
    const base = 15 + growth;
    return {
      id: makeId("sa-fujiwara", i),
      userId,
      sessionSource: sources[i],
      sessionId: makeId("sess-fujiwara", i),
      sessionPurpose: purpose,
      thoughtQuality: tq(
        Math.min(base + 5, 75),
        Math.min(base, 65),
        Math.min(base - 5, 55),
        Math.min(base - 3, 60),
        qcdes(
          i >= 3,
          i >= 1,
          i >= 5,
          false,
          i >= 7
        )
      ),
      userRaisedPoints: [],
      touchedSkillIds: [
        ["cae-simulation"],
        ["cae-simulation", "springback"],
        ["material-selection"],
        ["springback", "tolerance-design"],
        ["process-sequence", "material-selection"],
        ["material-selection", "cost-optimization"],
        ["mold-constraint"],
        ["process-sequence", "post-process", "quality-inspection"],
        ["process-sequence", "cost-optimization", "tolerance-design"],
        ["quality-inspection", "cost-optimization"],
      ][i],
      skillLevels: Object.fromEntries(
        [
          ["cae-simulation"],
          ["cae-simulation", "springback"],
          ["material-selection"],
          ["springback", "tolerance-design"],
          ["process-sequence", "material-selection"],
          ["material-selection", "cost-optimization"],
          ["mold-constraint"],
          ["process-sequence", "post-process", "quality-inspection"],
          ["process-sequence", "cost-optimization", "tolerance-design"],
          ["quality-inspection", "cost-optimization"],
        ][i].map((sid) => {
          let lv: SkillLevel = 1;
          if (i >= 6 && sid === "cae-simulation") lv = 3;
          else if (i >= 4 && ["cae-simulation", "springback"].includes(sid)) lv = 2;
          else if (i >= 7) lv = 2;
          return [sid, lv];
        })
      ),
      assessedAt: date(70 - i * 7),
    };
  });
}

// ============================================================
// プロファイル構築
// ============================================================

function buildProfile(allAssessments: SkillAssessment[], userId: string): SkillProfile {
  const userAssessments = allAssessments.filter((a) => a.userId === userId);
  const proficiencies: Record<string, SkillProficiency> = {};

  const sourceCount: Record<SessionSource, number> = {
    brain_room_1shot: 0,
    brain_room_conference: 0,
    compath_chat: 0,
    compath_decision_navigator: 0,
  };

  for (const a of userAssessments) {
    sourceCount[a.sessionSource] = (sourceCount[a.sessionSource] ?? 0) + 1;
    for (const skillId of a.touchedSkillIds) {
      const prev = proficiencies[skillId];
      const newLevel = (a.skillLevels[skillId] ?? 1) as SkillLevel;
      proficiencies[skillId] = {
        skillId,
        currentLevel: prev ? (Math.max(prev.currentLevel, newLevel) as SkillLevel) : newLevel,
        touchCount: (prev?.touchCount ?? 0) + 1,
        latestScores: a.thoughtQuality,
        lastAssessedAt: a.assessedAt,
      };
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
// エクスポート: シード実行
// ============================================================

export function generateSeedData(): {
  assessments: SkillAssessment[];
  profiles: SkillProfile[];
} {
  const allAssessments = [
    ...muratAssessments(),
    ...nakajimaAssessments(),
    ...fujiwaraAssessments(),
  ];

  const profiles = SAMPLE_USERS.map((u) => buildProfile(allAssessments, u.id));

  return { assessments: allAssessments, profiles };
}
