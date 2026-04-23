/**
 * 田村 正雄 — 食品製造 工場長（25年）
 *
 * 生産管理・品質管理・顧客折衝・監査・作業標準化が Lv.4。
 * 工場運営全般のバランスが高い。設備技術系は Lv.3 程度。
 * 佐藤・伊藤とは別軸の「マネジメント寄り」。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const TAMURA_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握（工場長の強み）
  "req-spec": 4, "part-usage": 3, "drawing-read": 3, "customer-negotiation": 4, "industry-standard": 4, "quotation": 4, "delivery-coord": 4, "needs-analysis": 4,
  // 生産管理（主戦場）
  "production-plan": 4, "process-control": 4, "inventory-mgmt": 4, "cost-control": 4, "delivery-mgmt": 4, "outsource-mgmt": 4, "productivity": 4, "work-standard": 4,
  // 工程設計
  "process-seq": 3, "tolerance": 3, "cost-est": 4, "process-fmea": 3, "jig-fixture": 2, "line-layout": 4, "cycle-time": 3, "dfa-dfm": 3,
  // 加工技術
  "press-forming": 3, "springback": 2, "welding": 2, "machining": 2, "surface-treat": 2, "assembly": 3, "grinding": 2, "bending": 2,
  // 金型・工法開発
  "die-design": 2, "die-structure": 2, "process-dev": 3, "tryout": 3, "forming-sim": 2, "method-eval": 3, "prototyping": 3, "die-material": 2,
  // 品質管理（工場長として必須）
  "qc-method": 4, "inspection": 3, "troubleshoot": 4, "measurement": 3, "supplier-quality": 4, "reliability": 4, "audit": 4, "spc": 3,
  // 保守・保全
  "preventive-maint": 3, "equip-diag": 3, "die-maint": 2, "automation": 3, "plc-control": 2, "daily-inspect": 4, "equip-eval": 3, "energy-mgmt": 3,
  // 素材・材料
  "steel": 2, "aluminum": 2, "stainless": 3, "copper": 2, "polymer": 3, "heat-treat": 3, "corrosion": 2, "material-test": 3,
  // 安全・環境（工場運営で必須）
  "occupational-safety": 4, "env-regulation": 4, "waste-mgmt": 3, "chemical-mgmt": 4, "ergonomics": 3, "risk-assessment": 4, "emergency": 4, "five-s": 4,
};

export function tamuraAssessments(): SkillAssessment[] {
  return makeAssessments("tamura-masao", TAMURA_SKILLS, [
    // 過去四半期（クオーター比較用）
    { source: "brain_room_1shot", purpose: "前年度の工場運営振り返り", tq: tq(90, 85, 82, 92, qcdes(90, 88, 88, 52, 72)), skills: ["production-plan", "work-standard", "cost-control"], daysAgo: 120 },
    { source: "compath_decision_navigator", purpose: "新年度予算計画の策定", tq: tq(88, 85, 80, 92, qcdes(85, 92, 85, 50, 70)), skills: ["cost-control", "production-plan", "outsource-mgmt"], daysAgo: 100 },
    { source: "brain_room_1shot", purpose: "年度計画と月次 KPI の設計", tq: tq(92, 88, 85, 95, qcdes(92, 92, 90, 55, 75)), skills: ["production-plan", "cost-control", "productivity", "delivery-mgmt"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "大口顧客のクレーム対応と再発防止", tq: tq(90, 92, 88, 92, qcdes(95, 70, 85, 50, 92)), skills: ["customer-negotiation", "troubleshoot", "qc-method", "risk-assessment"], daysAgo: 49 },
    { source: "brain_room_1shot", purpose: "HACCP 内部監査の実施と改善", tq: tq(88, 85, 82, 90, qcdes(92, 60, 72, 80, 92)), skills: ["audit", "qc-method", "occupational-safety", "industry-standard"], daysAgo: 42 },
    { source: "compath_chat", purpose: "外注先の品質監査と評価", tq: tq(85, 82, 80, 88, qcdes(92, 72, 75, 50, 65)), skills: ["supplier-quality", "audit", "outsource-mgmt", "reliability"], daysAgo: 35 },
    { source: "compath_decision_navigator", purpose: "新ラインの立ち上げ計画", tq: tq(88, 85, 82, 92, qcdes(85, 85, 88, 55, 70)), skills: ["line-layout", "production-plan", "cost-est", "work-standard"], daysAgo: 28 },
    { source: "brain_room_1shot", purpose: "エネルギー効率改善プロジェクト", tq: tq(80, 78, 75, 85, qcdes(72, 88, 70, 85, 55)), skills: ["energy-mgmt", "cost-control", "env-regulation", "productivity"], daysAgo: 21 },
    { source: "compath_chat", purpose: "工場全体の 5S 見直しと標準化", tq: tq(82, 80, 78, 88, qcdes(85, 70, 75, 65, 88)), skills: ["five-s", "work-standard", "occupational-safety"], daysAgo: 14 },
    { source: "brain_room_1shot", purpose: "緊急時対応マニュアルの改訂", tq: tq(85, 82, 80, 88, qcdes(90, 55, 72, 70, 95)), skills: ["emergency", "risk-assessment", "work-standard", "occupational-safety"], daysAgo: 7 },
  ]);
}
