/**
 * 山田 直人 — 半導体製造プロセスエンジニア（8年）
 *
 * 半導体製造工程の運営・管理を中心に、品質・計測・環境管理が高い。
 * プレス・金型系は半導体では使わないため低め。
 * クリーンルーム・統計品質管理・装置能力評価に強み。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const YAMADA_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 3, "part-usage": 2, "drawing-read": 3, "customer-negotiation": 2, "industry-standard": 3, "quotation": 2, "delivery-coord": 3, "needs-analysis": 3,
  // 生産管理
  "production-plan": 3, "process-control": 4, "inventory-mgmt": 3, "cost-control": 2, "delivery-mgmt": 3, "outsource-mgmt": 2, "productivity": 4, "work-standard": 4,
  // 工程設計
  "process-seq": 3, "tolerance": 3, "cost-est": 2, "process-fmea": 3, "jig-fixture": 2, "line-layout": 3, "cycle-time": 3, "dfa-dfm": 2,
  // 加工技術（半導体では低い）
  "press-forming": 1, "springback": 1, "welding": 1, "machining": 1, "surface-treat": 3, "assembly": 2, "grinding": 2, "bending": 1,
  // 金型・工法開発（半導体では低い）
  "die-design": 1, "die-structure": 1, "process-dev": 3, "tryout": 2, "forming-sim": 1, "method-eval": 3, "prototyping": 2, "die-material": 1,
  // 品質管理（半導体製造の中核）
  "qc-method": 4, "inspection": 4, "troubleshoot": 3, "measurement": 4, "supplier-quality": 3, "reliability": 4, "audit": 3, "spc": 4,
  // 保守・保全
  "preventive-maint": 3, "equip-diag": 3, "die-maint": 1, "automation": 3, "plc-control": 3, "daily-inspect": 4, "equip-eval": 4, "energy-mgmt": 3,
  // 素材・材料（シリコン・薬液など）
  "steel": 1, "aluminum": 2, "stainless": 2, "copper": 2, "polymer": 3, "heat-treat": 2, "corrosion": 3, "material-test": 3,
  // 安全・環境（クリーンルーム・化学物質管理）
  "occupational-safety": 4, "env-regulation": 4, "waste-mgmt": 3, "chemical-mgmt": 4, "ergonomics": 3, "risk-assessment": 3, "emergency": 3, "five-s": 4,
};

export function yamadaAssessments(): SkillAssessment[] {
  return makeAssessments("yamada-naoto", YAMADA_SKILLS, [
    // 過去四半期（クオーター比較用）
    { source: "brain_room_1shot", purpose: "前四半期のプロセス標準化見直し", tq: tq(78, 75, 72, 82, qcdes(82, 62, 38, 55, 42)), skills: ["process-control", "work-standard", "qc-method"], daysAgo: 120 },
    { source: "compath_decision_navigator", purpose: "クリーンルーム運用基準の更新", tq: tq(75, 72, 70, 78, qcdes(80, 58, 42, 70, 68)), skills: ["occupational-safety", "chemical-mgmt", "five-s"], daysAgo: 100 },
    { source: "brain_room_1shot", purpose: "CVD成膜工程の膜厚ばらつき原因分析", tq: tq(82, 78, 75, 85, qcdes(88, 65, 40, 60, 40)), skills: ["qc-method", "measurement", "troubleshoot", "spc"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "エッチング装置のメンテナンス周期最適化", tq: tq(78, 82, 80, 80, qcdes(72, 70, 55, 45, 35)), skills: ["preventive-maint", "equip-diag", "equip-eval", "productivity"], daysAgo: 49 },
    { source: "compath_chat", purpose: "クリーンルーム異物検出の初動対応フロー改訂", tq: tq(80, 75, 82, 78, qcdes(85, 30, 45, 72, 78)), skills: ["occupational-safety", "qc-method", "daily-inspect", "five-s"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "新規レジスト材料の立ち上がり検証", tq: tq(85, 82, 78, 88, qcdes(80, 60, 50, 65, 55)), skills: ["material-test", "polymer", "reliability", "inspection"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "SPC 管理限界値の見直しと逸脱対応基準の策定", tq: tq(88, 85, 82, 90, qcdes(92, 55, 60, 25, 40)), skills: ["spc", "qc-method", "work-standard", "process-control"], daysAgo: 28 },
    { source: "compath_chat", purpose: "薬液廃液処理の法改正対応レビュー", tq: tq(75, 72, 70, 75, qcdes(60, 35, 55, 88, 70)), skills: ["env-regulation", "chemical-mgmt", "waste-mgmt", "audit"], daysAgo: 21 },
    { source: "brain_room_1shot", purpose: "歩留まり改善プロジェクトの工程FMEA", tq: tq(90, 88, 85, 92, qcdes(92, 68, 65, 55, 70)), skills: ["process-fmea", "reliability", "troubleshoot", "productivity"], daysAgo: 14 },
    { source: "compath_chat", purpose: "装置能力評価(Cpk)の計算基準すり合わせ", tq: tq(85, 82, 80, 88, qcdes(90, 58, 62, 30, 35)), skills: ["equip-eval", "spc", "measurement", "qc-method"], daysAgo: 7 },
  ]);
}
