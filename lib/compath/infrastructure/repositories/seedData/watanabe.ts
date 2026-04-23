/**
 * 渡辺 翔 — 食品製造 生産技術エンジニア（8年）
 *
 * 自動化・PLC 制御・設備診断・ライン設計が Lv.3-4。
 * 工場のライン改造・新技術導入を担当。
 * 佐藤（品質） / 田村（運営）とは別軸の「技術寄り」。
 */

import type { SkillAssessment } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes } from "./helpers";

export const WATANABE_SKILLS: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 3, "part-usage": 2, "drawing-read": 3, "customer-negotiation": 2, "industry-standard": 3, "quotation": 3, "delivery-coord": 2, "needs-analysis": 3,
  // 生産管理
  "production-plan": 3, "process-control": 4, "inventory-mgmt": 3, "cost-control": 3, "delivery-mgmt": 3, "outsource-mgmt": 3, "productivity": 4, "work-standard": 3,
  // 工程設計（生産技術の主戦場）
  "process-seq": 4, "tolerance": 3, "cost-est": 3, "process-fmea": 3, "jig-fixture": 4, "line-layout": 4, "cycle-time": 4, "dfa-dfm": 4,
  // 加工技術
  "press-forming": 3, "springback": 2, "welding": 3, "machining": 3, "surface-treat": 2, "assembly": 4, "grinding": 2, "bending": 3,
  // 金型・工法開発
  "die-design": 3, "die-structure": 3, "process-dev": 4, "tryout": 3, "forming-sim": 3, "method-eval": 4, "prototyping": 4, "die-material": 2,
  // 品質管理
  "qc-method": 3, "inspection": 3, "troubleshoot": 4, "measurement": 3, "supplier-quality": 2, "reliability": 3, "audit": 2, "spc": 3,
  // 保守・保全（エンジニアの強み）
  "preventive-maint": 4, "equip-diag": 4, "die-maint": 3, "automation": 4, "plc-control": 4, "daily-inspect": 3, "equip-eval": 4, "energy-mgmt": 3,
  // 素材・材料
  "steel": 2, "aluminum": 2, "stainless": 3, "copper": 2, "polymer": 3, "heat-treat": 3, "corrosion": 2, "material-test": 3,
  // 安全・環境
  "occupational-safety": 3, "env-regulation": 3, "waste-mgmt": 2, "chemical-mgmt": 3, "ergonomics": 3, "risk-assessment": 3, "emergency": 3, "five-s": 3,
};

export function watanabeAssessments(): SkillAssessment[] {
  return makeAssessments("watanabe-sho", WATANABE_SKILLS, [
    // 過去四半期（クオーター比較用）
    { source: "compath_chat", purpose: "既存ラインの設備点検運用レビュー", tq: tq(78, 75, 72, 82, qcdes(72, 75, 78, 38, 50)), skills: ["preventive-maint", "equip-diag", "work-standard"], daysAgo: 120 },
    { source: "brain_room_1shot", purpose: "ライン切替時間の短縮検討", tq: tq(80, 78, 75, 82, qcdes(78, 80, 75, 35, 52)), skills: ["cycle-time", "line-layout", "process-seq"], daysAgo: 100 },
    { source: "brain_room_1shot", purpose: "充填ラインの自動化率向上プロジェクト", tq: tq(82, 80, 78, 85, qcdes(75, 80, 82, 40, 55)), skills: ["automation", "plc-control", "line-layout", "productivity"], daysAgo: 49 },
    { source: "compath_decision_navigator", purpose: "新型包装機の導入評価", tq: tq(85, 88, 82, 88, qcdes(82, 85, 72, 50, 55)), skills: ["method-eval", "equip-eval", "cost-est", "process-dev"], daysAgo: 42 },
    { source: "compath_chat", purpose: "ラインバランシング改善とサイクルタイム", tq: tq(80, 82, 78, 85, qcdes(80, 82, 78, 35, 45)), skills: ["cycle-time", "line-layout", "work-standard", "productivity"], daysAgo: 35 },
    { source: "brain_room_1shot", purpose: "異物混入トラブルの根本原因分析", tq: tq(85, 88, 82, 88, qcdes(90, 70, 72, 45, 70)), skills: ["troubleshoot", "equip-diag", "inspection", "qc-method"], daysAgo: 28 },
    { source: "compath_decision_navigator", purpose: "殺菌装置の予防保全スケジュール", tq: tq(78, 80, 75, 82, qcdes(72, 82, 72, 45, 60)), skills: ["preventive-maint", "equip-diag", "heat-treat"], daysAgo: 21 },
    { source: "brain_room_1shot", purpose: "新商品向け工程 FMEA の実施", tq: tq(82, 80, 78, 85, qcdes(85, 72, 72, 50, 65)), skills: ["process-fmea", "process-seq", "reliability"], daysAgo: 14 },
    { source: "compath_chat", purpose: "CIP 洗浄システムの改造検討", tq: tq(80, 78, 75, 82, qcdes(82, 75, 70, 55, 70)), skills: ["process-dev", "chemical-mgmt", "automation"], daysAgo: 7 },
  ]);
}
