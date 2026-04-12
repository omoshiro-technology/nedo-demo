/**
 * 藤原 翔太 — 若手CAEエンジニア（3年）
 *
 * CAE/シミュレーション寄り Lv.2-3
 * 加工基礎は Lv.1-2
 * 他は Lv.1 中心
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const FUJIWARA_SKILLS: SkillLevelMap = {
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

export function fujiwaraAssessments(): SkillAssessment[] {
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
