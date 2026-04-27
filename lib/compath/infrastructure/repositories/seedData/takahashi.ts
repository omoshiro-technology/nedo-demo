/**
 * 高橋 健二 — 半導体プロセス設計ベテラン（30年）
 *
 * プロセス設計・マスク設計・装置能力評価が Lv.4。
 * 若手育成・信頼性工学・工程 FMEA も高い。
 * 顧客折衝・コスト系は Lv.2-3。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const TAKAHASHI_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 3, "part-usage": 3, "drawing-read": 4, "customer-negotiation": 3, "industry-standard": 4, "quotation": 2, "delivery-coord": 2, "needs-analysis": 3,
  // 生産管理
  "production-plan": 3, "process-control": 4, "inventory-mgmt": 3, "cost-control": 2, "delivery-mgmt": 2, "outsource-mgmt": 3, "productivity": 4, "work-standard": 4,
  // 工程設計（ベテランの主戦場）
  "process-seq": 4, "tolerance": 4, "cost-est": 3, "process-fmea": 4, "jig-fixture": 3, "line-layout": 3, "cycle-time": 4, "dfa-dfm": 4,
  // 加工技術（半導体プロセス）
  "press-forming": 4, "springback": 3, "welding": 3, "machining": 4, "surface-treat": 4, "assembly": 3, "grinding": 4, "bending": 4,
  // 金型・工法開発（マスク設計）
  "die-design": 4, "die-structure": 4, "process-dev": 4, "tryout": 4, "forming-sim": 3, "method-eval": 4, "prototyping": 4, "die-material": 3,
  // 品質管理
  "qc-method": 4, "inspection": 3, "troubleshoot": 4, "measurement": 4, "supplier-quality": 3, "reliability": 4, "audit": 3, "spc": 4,
  // 保守・保全
  "preventive-maint": 3, "equip-diag": 3, "die-maint": 4, "automation": 3, "plc-control": 2, "daily-inspect": 3, "equip-eval": 4, "energy-mgmt": 2,
  // 素材・材料
  "steel": 2, "aluminum": 3, "stainless": 3, "copper": 3, "polymer": 4, "heat-treat": 4, "corrosion": 4, "material-test": 4,
  // 安全・環境
  "occupational-safety": 4, "env-regulation": 3, "waste-mgmt": 3, "chemical-mgmt": 4, "ergonomics": 2, "risk-assessment": 4, "emergency": 3, "five-s": 4,
};

export function takahashiAssessments(): SkillAssessment[] {
  return makeAssessments("takahashi-kenji", TAKAHASHI_SKILLS, [
    // 過去四半期（クオーター比較用）
    { source: "brain_room_1shot", purpose: "前世代ノードの振り返り設計レビュー", tq: tq(88, 85, 82, 92, qcdes(88, 80, 72, 50, 65)), skills: ["process-seq", "die-design", "process-dev"], daysAgo: 120 },
    { source: "compath_decision_navigator", purpose: "歩留まり改善の恒久対策検討", tq: tq(90, 88, 85, 92, qcdes(92, 72, 68, 48, 65)), skills: ["reliability", "troubleshoot", "spc"], daysAgo: 100 },
    { source: "brain_room_1shot", purpose: "新世代ノードのプロセスフロー設計方針", tq: tq(92, 90, 88, 95, qcdes(92, 85, 75, 55, 70)), skills: ["process-seq", "die-design", "forming-sim", "process-dev"], daysAgo: 56 },
    { source: "compath_decision_navigator", purpose: "CMP 装置の更新 vs 既存改造の比較", tq: tq(88, 92, 85, 90, qcdes(90, 88, 70, 40, 55)), skills: ["equip-eval", "cost-est", "method-eval", "grinding"], daysAgo: 49 },
    { source: "brain_room_1shot", purpose: "歩留まり改善プロジェクト FMEA", tq: tq(95, 92, 90, 95, qcdes(95, 75, 70, 50, 70)), skills: ["process-fmea", "reliability", "troubleshoot", "productivity"], daysAgo: 42 },
    { source: "compath_chat", purpose: "若手エンジニアへの設計ノウハウ伝承", tq: tq(78, 72, 68, 80, qcdes(75, 30, 25, 20, 15)), skills: ["work-standard", "process-seq", "prototyping"], daysAgo: 35 },
    { source: "brain_room_1shot", purpose: "応力制御とウエハ反り対策", tq: tq(90, 88, 85, 92, qcdes(92, 80, 70, 45, 55)), skills: ["springback", "material-test", "heat-treat", "forming-sim"], daysAgo: 28 },
    { source: "compath_decision_navigator", purpose: "薬液廃液処理の環境対応強化", tq: tq(82, 78, 75, 85, qcdes(70, 55, 60, 92, 80)), skills: ["env-regulation", "chemical-mgmt", "waste-mgmt", "risk-assessment"], daysAgo: 21 },
    { source: "brain_room_1shot", purpose: "SPC による工程異常検知の高度化", tq: tq(92, 90, 88, 92, qcdes(95, 65, 68, 40, 55)), skills: ["spc", "qc-method", "measurement", "process-control"], daysAgo: 14 },
    { source: "compath_chat", purpose: "次期マスク材料の評価と選定", tq: tq(88, 85, 82, 92, qcdes(90, 75, 70, 50, 55)), skills: ["die-material", "material-test", "reliability", "method-eval"], daysAgo: 7 },
  ]);
}
