/**
 * 業界別スキルラベル対応表
 *
 * スキル ID・カテゴリ ID は共通のまま、業界ごとに表示ラベルを切り替える。
 * 板金加工（デフォルト）のラベルはスキルカタログの name を使う。
 * 他業界は INDUSTRY_SKILL_LABELS / INDUSTRY_CATEGORY_LABELS でラベルを上書きする。
 * 定義されていない場合はデフォルトラベルを使う。
 *
 * 注: 全てデモ用のモック表現です。業界的に正確である必要はなく、
 *     「それっぽく見える」程度で充分です。
 */

import type { Industry } from "./types";

// ============================================================
// スキル項目のラベル上書き
// ============================================================

export const INDUSTRY_SKILL_LABELS: Record<Industry, Record<string, string>> = {
  "sheet-metal": {
    // デフォルト（スキルカタログの name を使用）
  },
  "semiconductor": {
    // 顧客要求・仕様把握
    "req-spec": "規格要件の理解",
    "part-usage": "デバイス用途把握",
    "drawing-read": "レイアウト解読",
    "customer-negotiation": "ファブ顧客折衝",
    "industry-standard": "業界規格（SEMI 等）",
    "quotation": "見積・提案",
    "delivery-coord": "納期調整",
    "needs-analysis": "ニーズ分析",
    // 生産管理
    "production-plan": "生産計画",
    "process-control": "プロセス管理",
    "inventory-mgmt": "薬液・ウエハ在庫",
    "cost-control": "原価管理",
    "delivery-mgmt": "納期管理",
    "outsource-mgmt": "外注管理",
    "productivity": "歩留まり改善",
    "work-standard": "作業標準化",
    // 工程設計
    "process-seq": "プロセスフロー設計",
    "tolerance": "寸法公差設計",
    "cost-est": "コスト見積",
    "process-fmea": "プロセス FMEA",
    "jig-fixture": "治具・チャック設計",
    "line-layout": "ライン設計",
    "cycle-time": "サイクルタイム最適化",
    "dfa-dfm": "DFM（製造容易性）",
    // 加工技術
    "press-forming": "成膜プロセス",
    "springback": "応力制御",
    "welding": "ボンディング",
    "machining": "ドライエッチング",
    "surface-treat": "表面処理（洗浄）",
    "assembly": "組立技術",
    "grinding": "CMP（化学機械研磨）",
    "bending": "リソグラフィ",
    // 金型・工法開発（半導体ではマスク/プロセス）
    "die-design": "マスク設計",
    "die-structure": "マスク構造理解",
    "process-dev": "新プロセス開発",
    "tryout": "試作ウエハ評価",
    "forming-sim": "プロセスシミュレーション",
    "method-eval": "工法評価・選定",
    "prototyping": "試作・検証",
    "die-material": "マスク材料選定",
    // 品質管理
    "qc-method": "QC 手法",
    "inspection": "検査設計",
    "troubleshoot": "不良対策・是正",
    "measurement": "計測技術",
    "supplier-quality": "サプライヤー品質",
    "reliability": "信頼性工学",
    "audit": "工程監査",
    "spc": "統計的工程管理",
    // 保守・保全
    "preventive-maint": "予防保全",
    "equip-diag": "設備故障診断",
    "die-maint": "マスク保全",
    "automation": "自動化・ロボット",
    "plc-control": "制御・PLC",
    "daily-inspect": "日常点検",
    "equip-eval": "設備能力評価",
    "energy-mgmt": "エネルギー管理",
    // 素材・材料
    "steel": "金属配線",
    "aluminum": "アルミ配線",
    "stainless": "シリコンウエハ",
    "copper": "銅配線",
    "polymer": "レジスト材料",
    "heat-treat": "熱処理工程",
    "corrosion": "化学耐性",
    "material-test": "材料試験",
    // 安全・環境
    "occupational-safety": "労働安全",
    "env-regulation": "環境法規制",
    "waste-mgmt": "薬液廃液管理",
    "chemical-mgmt": "化学物質管理",
    "ergonomics": "人間工学",
    "risk-assessment": "リスクアセスメント",
    "emergency": "緊急時対応",
    "five-s": "5S 活動",
  },
  "food-manufacturing": {
    // 顧客要求・仕様把握
    "req-spec": "食品規格適合確認",
    "part-usage": "食品用途把握",
    "drawing-read": "仕様書読解",
    "customer-negotiation": "顧客折衝",
    "industry-standard": "業界規格（HACCP 等）",
    "quotation": "見積・提案",
    "delivery-coord": "納期・鮮度調整",
    "needs-analysis": "ニーズ分析",
    // 生産管理
    "production-plan": "生産計画",
    "process-control": "工程管理",
    "inventory-mgmt": "原材料在庫管理",
    "cost-control": "原価管理",
    "delivery-mgmt": "納期・賞味期限管理",
    "outsource-mgmt": "外注管理",
    "productivity": "生産性改善",
    "work-standard": "作業標準化",
    // 工程設計
    "process-seq": "工程順序構想",
    "tolerance": "計量公差設計",
    "cost-est": "コスト見積",
    "process-fmea": "工程 FMEA",
    "jig-fixture": "治具設計",
    "line-layout": "ライン設計",
    "cycle-time": "サイクルタイム最適化",
    "dfa-dfm": "製造容易性",
    // 加工技術
    "press-forming": "充填・成型",
    "springback": "食感調整",
    "welding": "シール・密封",
    "machining": "切削・スライス",
    "surface-treat": "コーティング",
    "assembly": "組立・盛付",
    "grinding": "粉砕・磨砕",
    "bending": "成形加工",
    // 金型・工法開発
    "die-design": "型抜き設計",
    "die-structure": "型構造",
    "process-dev": "新工法開発",
    "tryout": "試作検証",
    "forming-sim": "フローシミュレーション",
    "method-eval": "工法評価・選定",
    "prototyping": "試作・検証",
    "die-material": "型材料",
    // 品質管理
    "qc-method": "QC 手法",
    "inspection": "検査設計",
    "troubleshoot": "クレーム対応・是正",
    "measurement": "計測技術",
    "supplier-quality": "サプライヤー品質",
    "reliability": "賞味期限検証",
    "audit": "HACCP 監査",
    "spc": "統計的工程管理",
    // 保守・保全
    "preventive-maint": "予防保全",
    "equip-diag": "設備故障診断",
    "die-maint": "型保全",
    "automation": "自動化・ロボット",
    "plc-control": "制御・PLC",
    "daily-inspect": "日常点検・CIP",
    "equip-eval": "設備能力評価",
    "energy-mgmt": "エネルギー管理",
    // 素材・材料
    "steel": "金属部品",
    "aluminum": "アルミ部品",
    "stainless": "SUS 容器",
    "copper": "銅部品",
    "polymer": "包装材料",
    "heat-treat": "加熱殺菌",
    "corrosion": "耐食性",
    "material-test": "原材料試験",
    // 安全・環境
    "occupational-safety": "労働安全",
    "env-regulation": "食品表示法対応",
    "waste-mgmt": "廃棄物管理",
    "chemical-mgmt": "アレルゲン管理",
    "ergonomics": "人間工学",
    "risk-assessment": "リスクアセスメント",
    "emergency": "緊急時対応",
    "five-s": "5S 活動",
  },
};

// ============================================================
// カテゴリのラベル上書き
// ============================================================

export const INDUSTRY_CATEGORY_LABELS: Record<Industry, Record<string, string>> = {
  "sheet-metal": {
    // デフォルト（カテゴリ定義の name を使用）
  },
  "semiconductor": {
    "manufacturing": "プロセス技術",
    "die-process": "マスク・工法",
    "material": "素材・配線材",
  },
  "food-manufacturing": {
    "manufacturing": "加工・成形",
    "die-process": "包装・型設計",
    "material": "原材料・容器",
    "maintenance": "設備衛生・保全",
  },
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * スキルの表示ラベルを取得する
 *
 * @param skillId - スキル ID
 * @param industry - 業界
 * @param defaultName - スキルカタログのデフォルト名（フォールバック）
 * @returns 業界別ラベル（未定義なら defaultName）
 */
export function getSkillLabel(
  skillId: string,
  industry: Industry,
  defaultName: string
): string {
  return INDUSTRY_SKILL_LABELS[industry]?.[skillId] ?? defaultName;
}

/**
 * カテゴリの表示ラベルを取得する
 *
 * @param categoryId - カテゴリ ID
 * @param industry - 業界
 * @param defaultName - カテゴリ定義のデフォルト名（フォールバック）
 * @returns 業界別ラベル（未定義なら defaultName）
 */
export function getCategoryLabel(
  categoryId: string,
  industry: Industry,
  defaultName: string
): string {
  return INDUSTRY_CATEGORY_LABELS[industry]?.[categoryId] ?? defaultName;
}
