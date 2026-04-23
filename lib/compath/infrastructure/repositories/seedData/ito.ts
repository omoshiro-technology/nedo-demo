/**
 * 伊藤 愛 — 食品製造 品質管理見習い（2年目）
 *
 * ほぼ全スキル Lv.1。HACCP と検査業務、日常点検を Lv.2 まで学習中。
 * 佐藤（12年）と比較すると経験不足。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const ITO_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握（見習いなので低）
  "req-spec": 2, "part-usage": 1, "drawing-read": 1, "customer-negotiation": 1, "industry-standard": 2, "quotation": 1, "delivery-coord": 1, "needs-analysis": 1,
  // 生産管理
  "production-plan": 1, "process-control": 2, "inventory-mgmt": 2, "cost-control": 1, "delivery-mgmt": 2, "outsource-mgmt": 1, "productivity": 1, "work-standard": 2,
  // 工程設計
  "process-seq": 1, "tolerance": 1, "cost-est": 1, "process-fmea": 1, "jig-fixture": 1, "line-layout": 1, "cycle-time": 1, "dfa-dfm": 1,
  // 加工技術
  "press-forming": 1, "springback": 1, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 2, "grinding": 1, "bending": 1,
  // 金型・工法開発
  "die-design": 1, "die-structure": 1, "process-dev": 1, "tryout": 1, "forming-sim": 1, "method-eval": 1, "prototyping": 1, "die-material": 1,
  // 品質管理（見習いでも品質は基本を学習）
  "qc-method": 2, "inspection": 2, "troubleshoot": 1, "measurement": 2, "supplier-quality": 1, "reliability": 1, "audit": 1, "spc": 1,
  // 保守・保全
  "preventive-maint": 1, "equip-diag": 1, "die-maint": 1, "automation": 1, "plc-control": 1, "daily-inspect": 2, "equip-eval": 1, "energy-mgmt": 1,
  // 素材・材料
  "steel": 1, "aluminum": 1, "stainless": 1, "copper": 1, "polymer": 2, "heat-treat": 2, "corrosion": 1, "material-test": 1,
  // 安全・環境（食品では基本を学習）
  "occupational-safety": 2, "env-regulation": 2, "waste-mgmt": 1, "chemical-mgmt": 2, "ergonomics": 1, "risk-assessment": 1, "emergency": 1, "five-s": 2,
};

export function itoAssessments(): SkillAssessment[] {
  return makeAssessments("ito-ai", ITO_SKILLS, [
    { source: "brain_room_1shot", purpose: "HACCP の基本と重要管理点の考え方", tq: tq(28, 22, 20, 32, qcdes(35, 10, 15, 30, 45)), skills: ["qc-method", "risk-assessment", "industry-standard"], daysAgo: 45 },
    { source: "compath_chat", purpose: "食品工場の 5S とアレルゲン管理", tq: tq(30, 25, 22, 35, qcdes(40, 10, 15, 35, 50)), skills: ["five-s", "chemical-mgmt", "occupational-safety"], daysAgo: 35 },
    { source: "brain_room_1shot", purpose: "異物検査装置の日常点検", tq: tq(32, 28, 25, 38, qcdes(45, 15, 20, 15, 25)), skills: ["daily-inspect", "inspection", "qc-method"], daysAgo: 21 },
    { source: "compath_chat", purpose: "原材料の入荷検査とロット管理", tq: tq(35, 30, 28, 40, qcdes(45, 20, 25, 25, 15)), skills: ["inventory-mgmt", "inspection", "measurement"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "賞味期限表示の基本ルール", tq: tq(38, 32, 30, 42, qcdes(50, 15, 30, 45, 20)), skills: ["industry-standard", "env-regulation", "req-spec"], daysAgo: 7 },
  ]);
}
