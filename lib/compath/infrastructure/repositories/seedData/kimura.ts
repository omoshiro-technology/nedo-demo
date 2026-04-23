/**
 * 木村 優 — 半導体プロセスエンジニア見習い（2年目）
 *
 * ほぼ全スキル Lv.1。基本的な計測・日常点検は Lv.2 になってきている。
 * 山田（8年）と比較すると、まだ経験不足。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const KIMURA_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握（見習いなのでほぼLv.1）
  "req-spec": 1, "part-usage": 1, "drawing-read": 2, "customer-negotiation": 1, "industry-standard": 1, "quotation": 1, "delivery-coord": 1, "needs-analysis": 1,
  // 生産管理
  "production-plan": 1, "process-control": 2, "inventory-mgmt": 2, "cost-control": 1, "delivery-mgmt": 1, "outsource-mgmt": 1, "productivity": 1, "work-standard": 2,
  // 工程設計
  "process-seq": 1, "tolerance": 1, "cost-est": 1, "process-fmea": 1, "jig-fixture": 1, "line-layout": 1, "cycle-time": 1, "dfa-dfm": 1,
  // 加工技術（半導体でも低）
  "press-forming": 2, "springback": 1, "welding": 1, "machining": 2, "surface-treat": 2, "assembly": 1, "grinding": 1, "bending": 1,
  // 金型・工法開発
  "die-design": 1, "die-structure": 1, "process-dev": 1, "tryout": 2, "forming-sim": 1, "method-eval": 1, "prototyping": 2, "die-material": 1,
  // 品質管理（見習いでも基本は学習中）
  "qc-method": 2, "inspection": 2, "troubleshoot": 1, "measurement": 2, "supplier-quality": 1, "reliability": 1, "audit": 1, "spc": 2,
  // 保守・保全
  "preventive-maint": 1, "equip-diag": 1, "die-maint": 1, "automation": 1, "plc-control": 1, "daily-inspect": 2, "equip-eval": 1, "energy-mgmt": 1,
  // 素材・材料
  "steel": 1, "aluminum": 1, "stainless": 1, "copper": 1, "polymer": 2, "heat-treat": 1, "corrosion": 1, "material-test": 2,
  // 安全・環境
  "occupational-safety": 2, "env-regulation": 1, "waste-mgmt": 1, "chemical-mgmt": 2, "ergonomics": 1, "risk-assessment": 1, "emergency": 1, "five-s": 2,
};

export function kimuraAssessments(): SkillAssessment[] {
  return makeAssessments("kimura-yu", KIMURA_SKILLS, [
    { source: "brain_room_1shot", purpose: "成膜工程の基礎を学ぶ", tq: tq(25, 20, 18, 30, qcdes(30, 15, 10, 20, 15)), skills: ["press-forming", "surface-treat", "measurement"], daysAgo: 45 },
    { source: "compath_chat", purpose: "クリーンルームの5S活動と基本ルール", tq: tq(30, 25, 22, 35, qcdes(35, 10, 15, 40, 45)), skills: ["occupational-safety", "five-s", "daily-inspect"], daysAgo: 35 },
    { source: "brain_room_1shot", purpose: "異物検出装置の日常点検方法", tq: tq(35, 30, 28, 40, qcdes(40, 15, 20, 15, 20)), skills: ["daily-inspect", "inspection", "qc-method"], daysAgo: 21 },
    { source: "compath_chat", purpose: "レジスト塗布工程のロット管理", tq: tq(32, 28, 25, 38, qcdes(35, 20, 18, 25, 15)), skills: ["inventory-mgmt", "work-standard", "polymer"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "SPC の基本と管理限界の読み方", tq: tq(40, 35, 32, 42, qcdes(45, 20, 20, 15, 15)), skills: ["spc", "qc-method", "measurement"], daysAgo: 7 },
  ]);
}
