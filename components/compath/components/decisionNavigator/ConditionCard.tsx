"use client"
/**
 * ConditionCard - 条件カードコンポーネント
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * 条件選択肢を表示するカード。
 * 選択すると候補値が絞り込まれる。
 */

import type { ConditionOption, ConditionCategory, ConditionOptionType } from "../../types/decisionNavigator";

type ConditionCardProps = {
  condition: ConditionOption;
  onSelect: (condition: ConditionOption) => void;
  isDisabled?: boolean;
};

/** カテゴリのラベルとカラー */
const CATEGORY_CONFIG: Record<ConditionCategory, { label: string; color: string; bgColor: string }> = {
  legal: { label: "法規", color: "#dc2626", bgColor: "#fef2f2" },
  safety: { label: "安全性", color: "#ea580c", bgColor: "#fff7ed" },
  cost: { label: "コスト", color: "#16a34a", bgColor: "#f0fdf4" },
  time: { label: "時間", color: "#2563eb", bgColor: "#eff6ff" },
  resource: { label: "リソース", color: "#7c3aed", bgColor: "#f5f3ff" },
  stakeholder: { label: "関係者", color: "#db2777", bgColor: "#fdf2f8" },
  technical: { label: "技術", color: "#0891b2", bgColor: "#ecfeff" },
  environmental: { label: "環境", color: "#65a30d", bgColor: "#f7fee7" },
  quality: { label: "品質", color: "#ca8a04", bgColor: "#fefce8" },
  other: { label: "その他", color: "#64748b", bgColor: "#f8fafc" },
};

/** 条件タイプのラベル */
const TYPE_LABELS: Record<ConditionOptionType, string> = {
  implicit_condition: "暗黙条件",
  unrecognized_condition: "未認識条件",
  knowhow: "ノウハウ",
  information_gap: "情報不足",
};

/** 条件タイプのアイコン */
const TYPE_ICONS: Record<ConditionOptionType, string> = {
  implicit_condition: "💡",
  unrecognized_condition: "⚠️",
  knowhow: "📚",
  information_gap: "❓",
};

export function ConditionCard({ condition, onSelect, isDisabled = false }: ConditionCardProps) {
  const categoryConfig = CATEGORY_CONFIG[condition.category];
  const typeLabel = TYPE_LABELS[condition.type];
  const typeIcon = TYPE_ICONS[condition.type];

  const handleClick = () => {
    if (!isDisabled && !condition.isSelected) {
      onSelect(condition);
    }
  };

  return (
    <div
      className={`condition-card ${condition.isSelected ? "condition-card--selected" : ""} ${isDisabled ? "condition-card--disabled" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* ヘッダー：タイプとカテゴリ */}
      <div className="condition-card__header">
        <span className="condition-card__type">
          <span className="condition-card__type-icon">{typeIcon}</span>
          {typeLabel}
        </span>
        <span
          className="condition-card__category"
          style={{ color: categoryConfig.color, backgroundColor: categoryConfig.bgColor }}
        >
          {categoryConfig.label}
        </span>
      </div>

      {/* ラベル */}
      <h4 className="condition-card__label">{condition.label}</h4>

      {/* 説明 */}
      <p className="condition-card__description">{condition.description}</p>

      {/* 影響（implications） */}
      {condition.implications.length > 0 && (
        <div className="condition-card__implications">
          <span className="condition-card__implications-label">この条件を選ぶと:</span>
          <ul className="condition-card__implications-list">
            {condition.implications.map((impl, idx) => (
              <li key={idx}>{impl}</li>
            ))}
          </ul>
        </div>
      )}

      {/* フッター：信頼度とソース */}
      <div className="condition-card__footer">
        <span className="condition-card__confidence">
          信頼度: {condition.confidence}%
        </span>
        <span className="condition-card__source">
          {condition.source === "user_context" && "ユーザー入力"}
          {condition.source === "past_case" && "過去事例"}
          {condition.source === "llm_inference" && "AI推論"}
        </span>
      </div>

      {/* 選択済みインジケーター */}
      {condition.isSelected && (
        <div className="condition-card__selected-indicator">
          <span>✓</span> 選択済み
        </div>
      )}
    </div>
  );
}
