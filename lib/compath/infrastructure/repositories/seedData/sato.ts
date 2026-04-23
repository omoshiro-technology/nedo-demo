/**
 * 佐藤 由美 — 食品製造 品質管理リーダー（12年）
 *
 * 食品工場における品質保証・衛生管理・HACCP運用を中心に、
 * 品質管理・監査・安全環境が特に高い。金型・プレス系は食品では使わないため低い。
 * 原材料管理とサプライヤー品質に強み。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const SATO_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握（食品スペック・ラベル規制）
  "req-spec": 4, "part-usage": 2, "drawing-read": 2, "customer-negotiation": 3, "industry-standard": 4, "quotation": 2, "delivery-coord": 3, "needs-analysis": 3,
  // 生産管理（日配品の計画性高い）
  "production-plan": 4, "process-control": 4, "inventory-mgmt": 4, "cost-control": 3, "delivery-mgmt": 4, "outsource-mgmt": 3, "productivity": 3, "work-standard": 4,
  // 工程設計（食品工程）
  "process-seq": 3, "tolerance": 2, "cost-est": 2, "process-fmea": 3, "jig-fixture": 2, "line-layout": 3, "cycle-time": 3, "dfa-dfm": 2,
  // 加工技術（食品では低い）
  "press-forming": 1, "springback": 1, "welding": 1, "machining": 1, "surface-treat": 2, "assembly": 2, "grinding": 1, "bending": 1,
  // 金型・工法開発（食品では低い）
  "die-design": 1, "die-structure": 1, "process-dev": 2, "tryout": 2, "forming-sim": 1, "method-eval": 2, "prototyping": 2, "die-material": 1,
  // 品質管理（食品品質の中核）
  "qc-method": 4, "inspection": 4, "troubleshoot": 4, "measurement": 3, "supplier-quality": 4, "reliability": 3, "audit": 4, "spc": 3,
  // 保守・保全（食品設備は自動化度高い）
  "preventive-maint": 3, "equip-diag": 2, "die-maint": 1, "automation": 3, "plc-control": 2, "daily-inspect": 4, "equip-eval": 3, "energy-mgmt": 3,
  // 素材・材料（食品原材料）
  "steel": 1, "aluminum": 2, "stainless": 3, "copper": 1, "polymer": 3, "heat-treat": 3, "corrosion": 3, "material-test": 3,
  // 安全・環境（食品衛生・HACCP・アレルゲン）
  "occupational-safety": 4, "env-regulation": 4, "waste-mgmt": 3, "chemical-mgmt": 4, "ergonomics": 3, "risk-assessment": 4, "emergency": 3, "five-s": 4,
};

export function satoAssessments(): SkillAssessment[] {
  return makeAssessments("sato-yumi", SATO_SKILLS, [
    { source: "brain_room_1shot", purpose: "HACCP計画の重要管理点見直し", tq: tq(88, 85, 82, 90, qcdes(92, 50, 68, 80, 92)), skills: ["qc-method", "audit", "occupational-safety", "risk-assessment"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "アレルゲン混入防止のゾーニング再設計", tq: tq(82, 80, 85, 82, qcdes(88, 55, 50, 72, 88)), skills: ["chemical-mgmt", "line-layout", "work-standard", "five-s"], daysAgo: 49 },
    { source: "compath_chat", purpose: "原材料サプライヤー監査項目の更新", tq: tq(85, 82, 78, 88, qcdes(92, 68, 72, 48, 60)), skills: ["supplier-quality", "audit", "inspection", "industry-standard"], daysAgo: 42 },
    { source: "brain_room_1shot", purpose: "賞味期限設定の加速試験プロトコル策定", tq: tq(88, 85, 80, 92, qcdes(95, 65, 75, 40, 55)), skills: ["material-test", "reliability", "qc-method", "measurement"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "異物混入クレームの根本原因分析", tq: tq(85, 88, 82, 85, qcdes(92, 45, 58, 35, 82)), skills: ["troubleshoot", "inspection", "qc-method", "risk-assessment"], daysAgo: 28 },
    { source: "compath_chat", purpose: "食品表示法改正への対応レビュー", tq: tq(78, 75, 72, 80, qcdes(72, 55, 65, 78, 45)), skills: ["req-spec", "industry-standard", "env-regulation", "customer-negotiation"], daysAgo: 21 },
    { source: "brain_room_1shot", purpose: "CIP洗浄サイクルの効果検証と工数削減", tq: tq(85, 82, 78, 88, qcdes(88, 78, 70, 55, 82)), skills: ["process-control", "preventive-maint", "productivity", "chemical-mgmt"], daysAgo: 14 },
    { source: "compath_chat", purpose: "新商品立ち上がり時の品質ゲート定義", tq: tq(88, 85, 82, 90, qcdes(92, 62, 78, 40, 60)), skills: ["qc-method", "work-standard", "process-fmea", "production-plan"], daysAgo: 7 },
  ]);
}
