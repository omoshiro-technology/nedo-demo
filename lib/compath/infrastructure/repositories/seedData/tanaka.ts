/**
 * 田中 大輝 — 工程設計見習い（2年目）デモの主人公
 *
 * BRAIN-Roomを使って学習中。ほぼ全てLv.1からスタート。
 * SUS304深絞りの議論を経て、工程設計・素材・金型の基礎がLv.1→Lv.2に成長。
 */

import type { SkillAssessment, LevelUpEvidence } from "../../../domain/skillMap/types";
import { type SkillLevelMap, makeAssessments, tq, qcdes, date } from "./helpers";

// ============================================================
// スキルレベル（ビフォー / アフター）
// ============================================================

export const TANAKA_SKILLS_BEFORE: SkillLevelMap = {
  // 顧客要求・仕様把握
  "req-spec": 1, "part-usage": 1, "drawing-read": 1, "customer-negotiation": 1, "industry-standard": 1, "quotation": 1, "delivery-coord": 1, "needs-analysis": 1,
  // 生産管理
  "production-plan": 1, "process-control": 1, "inventory-mgmt": 1, "cost-control": 1, "delivery-mgmt": 1, "outsource-mgmt": 1, "productivity": 1, "work-standard": 1,
  // 工程設計
  "process-seq": 1, "tolerance": 1, "cost-est": 1, "process-fmea": 1, "jig-fixture": 1, "line-layout": 1, "cycle-time": 1, "dfa-dfm": 1,
  // 加工技術
  "press-forming": 1, "springback": 1, "welding": 1, "machining": 1, "surface-treat": 1, "assembly": 1, "grinding": 1, "bending": 1,
  // 金型・工法開発
  "die-design": 1, "die-structure": 1, "process-dev": 1, "tryout": 1, "forming-sim": 1, "method-eval": 1, "prototyping": 1, "die-material": 1,
  // 品質管理
  "qc-method": 1, "inspection": 1, "troubleshoot": 1, "measurement": 1, "supplier-quality": 1, "reliability": 1, "audit": 1, "spc": 1,
  // 保守・保全
  "preventive-maint": 1, "equip-diag": 1, "die-maint": 1, "automation": 1, "plc-control": 1, "daily-inspect": 1, "equip-eval": 1, "energy-mgmt": 1,
  // 素材・材料
  "steel": 1, "aluminum": 1, "stainless": 1, "copper": 1, "polymer": 1, "heat-treat": 1, "corrosion": 1, "material-test": 1,
  // 安全・環境
  "occupational-safety": 1, "env-regulation": 1, "waste-mgmt": 1, "chemical-mgmt": 1, "ergonomics": 1, "risk-assessment": 1, "emergency": 1, "five-s": 1,
};

export const TANAKA_SKILLS_AFTER: SkillLevelMap = {
  ...TANAKA_SKILLS_BEFORE,
  // SUS304深絞り議論で成長した領域
  "drawing-read": 2,     // 顧客仕様確認の重要性を学んだ
  "process-seq": 2,      // 工程数の逆算アプローチを理解
  "cost-est": 2,         // 3工程vs4工程のコスト比較の考え方
  "press-forming": 2,    // 加工硬化と割れリスクの基礎
  "stainless": 2,        // SUS304の特性を学んだ
  "die-maint": 2,        // 型摩耗管理の基本を知った
  "qc-method": 2,        // 試作→量産の品質再現性の考え方
};

// ============================================================
// アセスメント
// ============================================================

export function tanakaAssessments(): SkillAssessment[] {
  return makeAssessments("tanaka-daiki", TANAKA_SKILLS_AFTER, [
    // 入社直後：基礎研修でBRAIN-Roomを体験
    { source: "brain_room_1shot", purpose: "プレス加工の基礎を学ぶ", tq: tq(15, 10, 8, 12, qcdes(0, 0, 0, 0, 0)), skills: ["press-forming", "steel", "drawing-read"], daysAgo: 60 },
    { source: "compath_chat", purpose: "図面の読み方を先輩AIに質問", tq: tq(18, 12, 10, 15, qcdes(12, 0, 0, 0, 0)), skills: ["drawing-read", "tolerance", "req-spec"], daysAgo: 50 },
    // 初めての意思決定キャンバス：図面読解の優先度を整理
    { source: "compath_decision_navigator", purpose: "図面から読み取るべき品質要求の整理", tq: tq(20, 16, 12, 18, qcdes(18, 8, 5, 0, 0)), skills: ["drawing-read", "tolerance", "req-spec"], daysAgo: 38 },
    // 材料と工程の関係を意思決定キャンバスで構造化
    { source: "compath_decision_navigator", purpose: "材料選定がコスト・品質に与える影響の整理", tq: tq(25, 22, 18, 25, qcdes(25, 20, 10, 0, 5)), skills: ["steel", "press-forming", "cost-est"], daysAgo: 25 },
    // SUS304深絞り案件：BRAIN-Roomの議論を閲覧
    { source: "brain_room_conference", purpose: "SUS304 t1.5 深絞り形状の工程設計方針", tq: tq(28, 22, 15, 24, qcdes(22, 18, 5, 0, 0)), skills: ["press-forming", "stainless", "process-seq", "cost-est"], daysAgo: 14 },
    // 議論を見た後にチャットで質問
    { source: "compath_chat", purpose: "SUS304で中間焼鈍を入れるかどうかの判断基準を質問", tq: tq(32, 28, 22, 30, qcdes(28, 22, 12, 0, 0)), skills: ["stainless", "process-seq", "die-maint", "qc-method"], daysAgo: 12 },
    // 意思決定キャンバスで自分の判断を構造化
    { source: "compath_decision_navigator", purpose: "3工程vs4工程の判断を整理", tq: tq(38, 35, 28, 35, qcdes(35, 28, 18, 0, 10)), skills: ["process-seq", "cost-est", "drawing-read", "press-forming", "qc-method", "die-maint", "stainless"], daysAgo: 7 },
  ]);
}

// ============================================================
// 意思決定キャンバスの履歴（レベルアップ根拠）
//
// 各エントリは「何と何を比較し、QCDESのどの観点を考慮して、
// なぜその判断に至ったか」を記録する。
// ============================================================

export const TANAKA_EVIDENCE: Record<string, LevelUpEvidence[]> = {
  "drawing-read": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-002", project: "A社ブラケットの品質要求整理", reason: "【Q】寸法公差だけで工程設計しかけたが、注記欄の幾何公差（平面度0.05）を見落としていた。これを満たすには加工基準面を変える必要があると判断し工程案を修正。品質要求の読み取り漏れが後工程の手戻りに直結するリスクを認識した", date: date(38) },
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "【Q×C】図面注記「バリなきこと」への対応として、トリム型の刃先管理頻度を上げる案とバレル研磨工程を追加する案を比較。刃先管理は品質ばらつきリスクが残るため、コスト増（+1.2円/個）を許容してバレル研磨追加を選択", date: date(7) },
  ],
  "tolerance": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-002", project: "A社ブラケットの品質要求整理", reason: "【Q×C】穴位置公差±0.1mmに対し、単発型（型費安い）vs 順送型（精度高い）を比較。単発型は工程間搬送で±0.15mmのズレリスクがあり品質保証できないと判断、型費増を許容して順送型を選択", date: date(38) },
  ],
  "steel": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-003", project: "B社カバー部品の材料選定", reason: "【Q×C】SPCC-SD（伸び率28%）のまま絞り比2.1に挑むか、SPCE（伸び率41%）に変更するか比較。SPCCでは試作で底部コーナーに微小亀裂が出ており、品質リスク回避を優先。材料単価+8円/kgのコスト増を許容してSPCEに変更", date: date(25) },
  ],
  "press-forming": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-003", project: "B社カバー部品の材料選定", reason: "【Q】SPCE変更後のBHFを現行45kNで据え置くか下げるか検討。しわ押さえが強すぎると割れ、弱すぎるとフランジしわになるため、品質確認として試作で35kN/38kN/40kNの3条件を比較し最適値を決める計画とした", date: date(25) },
  ],
  "cost-est": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-003", project: "B社カバー部品の材料選定", reason: "【C×Q】SPCE変更の材料費増を許容するか、SPCCのまま金型改修で対応するかを比較。金型改修費120万円+不良率3%維持 vs 材料費増+不良率1%を試算。品質改善によるコスト回収が6ヶ月で逆転するため材料変更案を選択", date: date(25) },
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "【C×D】初期投資を抑える3工程案（型費1,800万円）vs ランニングで有利な4工程案（型費2,200万円・サイクル3s短縮）をLCCで比較。月産3000個×5年で4工程案が約340万円有利。納期面でもサイクル短縮が月次生産能力の余裕に繋がると判断", date: date(7) },
  ],
  "process-seq": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "【Q×D】3工程案は2工程目の絞り比1.8が加工限界を超え品質リスクあり。4工程（絞り比1.4以下）vs 3工程+中間焼鈍を比較。焼鈍は外注リードタイム+3日で納期に影響するため、品質・納期の両面から4工程案を選択", date: date(7) },
  ],
  "stainless": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "【D×C】SUS304の加工硬化（HV180→HV280）対策として、中間焼鈍あり3工程 vs 焼鈍なし4工程を比較。焼鈍の外注リードタイム+3日が納期制約に合わず、かつ酸化スケール除去の追加コストも発生するため、焼鈍なし4工程を選択", date: date(7) },
  ],
  "die-maint": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "【C×Q】SUS304のカジリ対策でTD処理（寿命10万ショット・処理費40万円）vs TiCNコーティング（8万ショット・15万円）を比較。寿命はTDが長いが、型4本×年2回再処理のトータルコストではTiCNが有利。品質面も実績十分と判断しTiCNを選択", date: date(7) },
  ],
  "qc-method": [
    { source: "compath_decision_navigator", sessionId: "sess-tanaka-daiki-006", project: "SUS304深絞り品の3工程vs4工程比較", reason: "【Q×D】試作検証を一括500個か段階的かを検討。一括は納期的に早いが、不良発見が遅れ材料ロスが大きい。品質確認を優先し3段階（初期50個で板厚減少率→中期200個でCpk→後期500個で工程能力）に分割。早期フィードバックで手戻りリスクを軽減", date: date(7) },
  ],
};
