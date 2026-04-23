/**
 * 鈴木 翔 — 半導体 装置エンジニア（10年）
 *
 * 装置保守・自動化・PLC 制御が Lv.3-4。
 * プロセス設計自体よりも「装置を動かし続ける」側の専門性。
 * 日常点検・装置能力評価・予防保全が強み。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const SUZUKI_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 2, "part-usage": 2, "drawing-read": 3, "customer-negotiation": 2, "industry-standard": 2, "quotation": 2, "delivery-coord": 3, "needs-analysis": 2,
  // 生産管理
  "production-plan": 2, "process-control": 3, "inventory-mgmt": 2, "cost-control": 2, "delivery-mgmt": 3, "outsource-mgmt": 2, "productivity": 4, "work-standard": 3,
  // 工程設計
  "process-seq": 2, "tolerance": 3, "cost-est": 2, "process-fmea": 3, "jig-fixture": 4, "line-layout": 3, "cycle-time": 4, "dfa-dfm": 3,
  // 加工技術
  "press-forming": 3, "springback": 2, "welding": 3, "machining": 3, "surface-treat": 3, "assembly": 3, "grinding": 3, "bending": 2,
  // 金型・工法開発
  "die-design": 2, "die-structure": 3, "process-dev": 3, "tryout": 3, "forming-sim": 2, "method-eval": 3, "prototyping": 3, "die-material": 2,
  // 品質管理
  "qc-method": 3, "inspection": 3, "troubleshoot": 4, "measurement": 3, "supplier-quality": 2, "reliability": 3, "audit": 2, "spc": 3,
  // 保守・保全（装置エンジニアの主戦場）
  "preventive-maint": 4, "equip-diag": 4, "die-maint": 4, "automation": 4, "plc-control": 4, "daily-inspect": 4, "equip-eval": 4, "energy-mgmt": 3,
  // 素材・材料
  "steel": 2, "aluminum": 2, "stainless": 3, "copper": 2, "polymer": 2, "heat-treat": 2, "corrosion": 3, "material-test": 2,
  // 安全・環境
  "occupational-safety": 3, "env-regulation": 2, "waste-mgmt": 2, "chemical-mgmt": 3, "ergonomics": 3, "risk-assessment": 3, "emergency": 3, "five-s": 3,
};

export function suzukiAssessments(): SkillAssessment[] {
  return makeAssessments("suzuki-sho", SUZUKI_SKILLS, [
    { source: "brain_room_1shot", purpose: "エッチング装置の自動化ロジック改善", tq: tq(75, 78, 72, 80, qcdes(68, 75, 70, 35, 40)), skills: ["automation", "plc-control", "equip-eval", "productivity"], daysAgo: 49 },
    { source: "compath_decision_navigator", purpose: "真空ポンプの交換タイミング最適化", tq: tq(72, 80, 75, 78, qcdes(55, 88, 65, 40, 50)), skills: ["preventive-maint", "equip-diag", "cost-control"], daysAgo: 42 },
    { source: "compath_chat", purpose: "装置トラブル時の初動対応フロー", tq: tq(78, 75, 70, 80, qcdes(80, 55, 72, 30, 65)), skills: ["troubleshoot", "emergency", "daily-inspect"], daysAgo: 35 },
    { source: "brain_room_1shot", purpose: "装置能力指数（Cmk）評価の標準化", tq: tq(82, 80, 78, 85, qcdes(88, 62, 60, 25, 35)), skills: ["equip-eval", "spc", "measurement", "work-standard"], daysAgo: 28 },
    { source: "compath_decision_navigator", purpose: "エネルギー消費削減の工程改善", tq: tq(78, 75, 72, 82, qcdes(68, 82, 65, 75, 50)), skills: ["energy-mgmt", "process-control", "productivity"], daysAgo: 21 },
    { source: "brain_room_1shot", purpose: "マスク保全の頻度と品質トレードオフ", tq: tq(80, 78, 75, 85, qcdes(82, 72, 62, 35, 45)), skills: ["die-maint", "reliability", "qc-method"], daysAgo: 14 },
    { source: "compath_chat", purpose: "新設ラインの治具・チャック設計レビュー", tq: tq(82, 82, 78, 85, qcdes(80, 68, 70, 35, 60)), skills: ["jig-fixture", "line-layout", "cycle-time"], daysAgo: 7 },
  ]);
}
