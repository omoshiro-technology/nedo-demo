/**
 * 業界別スキルラベル対応表
 *
 * スキル ID は共通のまま、業界ごとに表示ラベルを切り替える。
 * 板金加工（デフォルト）のラベルはスキルカタログの name を使う。
 * 他業界は INDUSTRY_SKILL_LABELS でラベルを上書きする。
 * 定義されていないスキルはフォールバックとしてデフォルトラベルを使う。
 */

import type { Industry } from "./types";

/**
 * 業界別ラベル上書き定義
 *
 * キー: スキル ID（skillCatalog と共通）
 * 値: 業界ごとの表示ラベル
 *
 * 板金加工はデフォルト（空オブジェクト）でカタログの name を使う。
 */
export const INDUSTRY_SKILL_LABELS: Record<Industry, Record<string, string>> = {
  "sheet-metal": {
    // デフォルト（スキルカタログの name を使用）
  },
  "semiconductor": {
    // 加工技術（半導体用語）
    "press-forming": "成膜プロセス",
    "springback": "応力制御",
    "welding": "ボンディング",
    "machining": "ドライエッチング",
    "grinding": "CMP（化学機械研磨）",
    "bending": "リソグラフィ",
    "surface-treat": "表面処理（洗浄）",
    // 金型・工法（半導体ではマスク/プロセス）
    "die-design": "マスク設計",
    "die-structure": "マスク構造理解",
    "die-maint": "マスク保全",
    "die-material": "マスク材料選定",
    "forming-sim": "プロセスシミュレーション",
    "tryout": "試作ウエハ評価",
    // 素材・材料（半導体用）
    "steel": "金属配線",
    "aluminum": "アルミ配線",
    "stainless": "シリコンウエハ",
    "copper": "銅配線",
    "polymer": "レジスト材料",
    "heat-treat": "熱処理工程",
    "corrosion": "化学耐性",
    // 品質・監査（半導体用）
    "audit": "工程監査",
  },
  "food-manufacturing": {
    // 加工技術（食品用語）
    "press-forming": "充填・成型",
    "springback": "食感調整",
    "welding": "シール・密封",
    "machining": "切削・スライス",
    "grinding": "粉砕・磨砕",
    "bending": "成形加工",
    "surface-treat": "コーティング",
    // 金型・工法（食品ではほぼ使わない）
    "die-design": "型抜き設計",
    "die-structure": "型構造",
    "die-maint": "型保全",
    "die-material": "型材料",
    "forming-sim": "フローシミュレーション",
    "tryout": "試作検証",
    // 素材・材料（食品用）
    "steel": "金属部品",
    "aluminum": "アルミ部品",
    "stainless": "SUS容器",
    "copper": "銅部品",
    "polymer": "包装材料",
    "heat-treat": "加熱殺菌",
    "corrosion": "耐食性",
    // 品質・監査（食品用）
    "audit": "HACCP監査",
    "chemical-mgmt": "アレルゲン管理",
  },
};

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
