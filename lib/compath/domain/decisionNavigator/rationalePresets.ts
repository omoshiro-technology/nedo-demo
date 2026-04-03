/**
 * ノードの属性に基づいて選択理由プリセットを動的生成するドメインロジック
 */

import type { RationalePreset, RiskStrategy, RiskCategory, DecisionFlowNodeCore, ThinkingPattern } from "./coreTypes";

/** 基本プリセット定義 */
const BASE_PRESETS: Record<string, RationalePreset> = {
  // QCDES（汎用）
  quality: { id: "quality", label: "品質確保", category: "qcdes", priority: 80 },
  cost: { id: "cost", label: "コスト最適", category: "qcdes", priority: 70 },
  delivery: { id: "delivery", label: "納期遵守", category: "qcdes", priority: 75 },
  environment: { id: "environment", label: "環境配慮", category: "qcdes", priority: 50 },
  safety: { id: "safety", label: "安全確保", category: "qcdes", priority: 90 },
  // リスク戦略（汎用）
  "avoid-risk": { id: "avoid-risk", label: "リスク回避", category: "risk", priority: 85 },
  "mitigate-risk": { id: "mitigate-risk", label: "リスク軽減", category: "risk", priority: 75 },
  "transfer-risk": { id: "transfer-risk", label: "リスク転嫁", category: "risk", priority: 65 },
  "accept-risk": { id: "accept-risk", label: "計画的リスク", category: "risk", priority: 55 },
  // 根拠（汎用）
  "past-case": { id: "past-case", label: "過去実績あり", category: "evidence", priority: 95 },
  "expert-advice": { id: "expert-advice", label: "専門家助言", category: "evidence", priority: 85 },

  // ============================================================
  // 思考パターン別プリセット（判断軸の内容に合わせた選択理由）
  // ============================================================

  // risk-avoidance / risk-efficiency-tradeoff: リスク回避か効率か
  "risk-priority": { id: "risk-priority", label: "リスク優先", category: "thinking", priority: 90 },
  "efficiency-priority": { id: "efficiency-priority", label: "効率優先", category: "thinking", priority: 85 },
  "balance-approach": { id: "balance-approach", label: "バランス重視", category: "thinking", priority: 80 },

  // cost-priority: 初期コストか保全性か
  "initial-cost": { id: "initial-cost", label: "初期コスト重視", category: "thinking", priority: 85 },
  "maintenance": { id: "maintenance", label: "保全性重視", category: "thinking", priority: 85 },
  "operation-cost": { id: "operation-cost", label: "運用コスト重視", category: "thinking", priority: 80 },

  // track-record-vs-innovation: 実績か新技術か
  "proven-record": { id: "proven-record", label: "実績重視", category: "thinking", priority: 90 },
  "innovation": { id: "innovation", label: "新技術採用", category: "thinking", priority: 80 },
  "cautious-new": { id: "cautious-new", label: "慎重に新技術", category: "thinking", priority: 75 },

  // safety-margin: マージン大か最小か
  "large-margin": { id: "large-margin", label: "余裕を持たせる", category: "thinking", priority: 85 },
  "minimal-margin": { id: "minimal-margin", label: "最小限で十分", category: "thinking", priority: 75 },
  "standard-margin": { id: "standard-margin", label: "標準マージン", category: "thinking", priority: 80 },

  // judgment-basis: 理論か事例か
  "theory-based": { id: "theory-based", label: "理論・計算根拠", category: "thinking", priority: 85 },
  "case-based": { id: "case-based", label: "類似事例根拠", category: "thinking", priority: 90 },
  "expert-opinion": { id: "expert-opinion", label: "専門家意見", category: "thinking", priority: 80 },

  // future-flexibility: 現状最適か拡張性か
  "current-optimal": { id: "current-optimal", label: "現状最適", category: "thinking", priority: 80 },
  "extensibility": { id: "extensibility", label: "拡張性確保", category: "thinking", priority: 85 },
  "flexibility": { id: "flexibility", label: "柔軟性重視", category: "thinking", priority: 80 },

  // veteran-experience: 経験則か標準か
  "experience-based": { id: "experience-based", label: "経験則", category: "thinking", priority: 85 },
  "standard-based": { id: "standard-based", label: "標準・規格準拠", category: "thinking", priority: 90 },
};

/** リスク戦略 → 関連プリセットのマッピング */
const RISK_STRATEGY_PRESETS: Record<RiskStrategy, string[]> = {
  avoid: ["avoid-risk", "safety", "quality"],  // 回避 → リスク回避、安全、品質
  mitigate: ["mitigate-risk", "quality", "cost"], // 軽減 → リスク軽減、品質、コスト
  transfer: ["transfer-risk", "cost", "expert-advice"], // 転嫁 → リスク転嫁、コスト、専門家
  accept: ["accept-risk", "cost", "delivery"], // 受容 → リスク受容、コスト、納期
};

/** 思考パターン → 関連プリセットのマッピング（判断軸に合わせた選択理由） */
const THINKING_PATTERN_PRESETS: Record<ThinkingPattern, string[]> = {
  "risk-avoidance": ["risk-priority", "efficiency-priority", "balance-approach"],
  "risk-efficiency-tradeoff": ["risk-priority", "efficiency-priority", "balance-approach"],
  "cost-priority": ["initial-cost", "maintenance", "operation-cost"],
  "track-record-vs-innovation": ["proven-record", "innovation", "cautious-new"],
  "safety-margin": ["large-margin", "minimal-margin", "standard-margin"],
  "judgment-basis": ["theory-based", "case-based", "expert-opinion"],
  "future-flexibility": ["current-optimal", "extensibility", "flexibility"],
  "veteran-experience": ["experience-based", "standard-based"],
};

/** リスク種別 → 関連プリセットのマッピング */
const RISK_CATEGORY_PRESETS: Record<RiskCategory, string[]> = {
  safety: ["safety", "avoid-risk"],
  quality: ["quality", "mitigate-risk"],
  cost: ["cost"],
  delivery: ["delivery"],
  environment: ["environment"],
  scope: ["quality", "delivery"],
};

/** デフォルトプリセット（何も該当しない場合） */
const DEFAULT_PRESET_IDS = ["quality", "cost", "delivery", "safety"];

/**
 * ノードの属性に基づいて選択理由プリセットを生成
 * @param node 対象ノード（部分的なデータでも可）
 * @returns 優先度順にソートされたプリセット配列
 */
export function generateRationalePresets(
  node: Partial<Pick<DecisionFlowNodeCore, "riskStrategy" | "riskCategories" | "hasPastCase" | "isRecommended">>
): RationalePreset[] {
  const presetIds = new Set<string>();

  // 1. リスク戦略から関連プリセットを追加
  if (node.riskStrategy) {
    const strategyPresets = RISK_STRATEGY_PRESETS[node.riskStrategy];
    for (const id of strategyPresets) {
      presetIds.add(id);
    }
  }

  // 2. リスク種別から関連プリセットを追加
  if (node.riskCategories?.length) {
    for (const category of node.riskCategories) {
      const categoryPresets = RISK_CATEGORY_PRESETS[category];
      for (const id of categoryPresets) {
        presetIds.add(id);
      }
    }
  }

  // 3. 過去事例がある場合は「過去実績あり」を追加
  if (node.hasPastCase) {
    presetIds.add("past-case");
  }

  // 4. 推奨ノードの場合は「専門家助言」を追加
  if (node.isRecommended) {
    presetIds.add("expert-advice");
  }

  // 5. 何も該当しない場合はデフォルトセット
  if (presetIds.size === 0) {
    for (const id of DEFAULT_PRESET_IDS) {
      presetIds.add(id);
    }
  }

  // 6. プリセットを優先度順にソート
  const presets = Array.from(presetIds)
    .map(id => BASE_PRESETS[id])
    .filter((preset): preset is RationalePreset => preset !== undefined)
    .sort((a, b) => b.priority - a.priority);

  return presets;
}

/**
 * プリセットIDからラベルを取得（選択理由の表示用）
 */
export function getPresetLabelById(id: string): string | undefined {
  return BASE_PRESETS[id]?.label;
}

/**
 * 複数のプリセットIDからラベル文字列を結合
 */
export function formatRationaleFromPresetIds(ids: string[]): string {
  return ids
    .map(id => BASE_PRESETS[id]?.label)
    .filter(Boolean)
    .join("・");
}

/**
 * 思考パターンに基づいて選択理由プリセットを生成
 * 判断軸（criteria）の thinkingPattern を参照して、その判断軸に適したプリセットを返す
 *
 * @param thinkingPattern 判断軸の思考パターン
 * @returns 優先度順にソートされたプリセット配列
 */
export function generatePresetsForThinkingPattern(
  thinkingPattern: ThinkingPattern | undefined
): RationalePreset[] {
  if (!thinkingPattern) {
    // 思考パターンがない場合はデフォルト
    return DEFAULT_PRESET_IDS
      .map(id => BASE_PRESETS[id])
      .filter((preset): preset is RationalePreset => preset !== undefined);
  }

  const presetIds = THINKING_PATTERN_PRESETS[thinkingPattern];
  if (!presetIds || presetIds.length === 0) {
    // マッピングがない場合はデフォルト
    return DEFAULT_PRESET_IDS
      .map(id => BASE_PRESETS[id])
      .filter((preset): preset is RationalePreset => preset !== undefined);
  }

  return presetIds
    .map(id => BASE_PRESETS[id])
    .filter((preset): preset is RationalePreset => preset !== undefined)
    .sort((a, b) => b.priority - a.priority);
}
