/**
 * 中島 康太 — 生産技術マネージャー（12年）
 *
 * 生産管理・顧客要求 Lv.3-4
 * 品質・安全 Lv.2-3
 * 加工技術・金型は Lv.1-2
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const NAKAJIMA_SKILLS: SkillLevelMap = {
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

export function nakajimaAssessments(): SkillAssessment[] {
  return makeAssessments("nakajima-kota", NAKAJIMA_SKILLS, [
    { source: "compath_chat", purpose: "新ライン立ち上げの工程設計方針", tq: tq(55, 50, 45, 60, qcdes(55, 60, 50, 5, 10)), skills: ["production-plan", "productivity", "line-layout", "cost-control"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "材料変更に伴う曲げ条件の見直し", tq: tq(60, 55, 50, 55, qcdes(58, 55, 15, 5, 10)), skills: ["steel", "cost-est", "supplier-quality"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "外注先選定の判断基準整理", tq: tq(65, 68, 55, 58, qcdes(20, 68, 55, 5, 8)), skills: ["outsource-mgmt", "cost-est", "customer-negotiation", "quotation"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "作業標準化と技能伝承計画の見直し", tq: tq(62, 60, 52, 55, qcdes(15, 15, 50, 5, 10)), skills: ["work-standard", "productivity", "process-control", "five-s"], daysAgo: 21 },
    { source: "compath_chat", purpose: "品質クレーム対応の原因分析", tq: tq(70, 65, 60, 62, qcdes(65, 55, 20, 5, 35)), skills: ["troubleshoot", "customer-negotiation", "delivery-coord", "audit"], daysAgo: 14 },
    { source: "compath_decision_navigator", purpose: "設備投資判断の費用対効果", tq: tq(72, 70, 62, 65, qcdes(65, 72, 60, 10, 15)), skills: ["equip-eval", "production-plan", "cost-control", "automation", "forming-sim"], daysAgo: 7 },
  ]);
}
