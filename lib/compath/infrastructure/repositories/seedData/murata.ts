/**
 * 村田 鉄男 — ベテラン工程設計者（38年）
 *
 * 加工技術・工程設計・金型は Lv.3-4
 * 品質・保守・素材も高い
 * 顧客要求・生産管理は Lv.2-3
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const MURATA_SKILLS: SkillLevelMap = {
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

export function murataAssessments(): SkillAssessment[] {
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
