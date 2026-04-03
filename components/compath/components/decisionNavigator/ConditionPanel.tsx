"use client"
/**
 * ConditionPanel - 条件パネル（タグ形式）
 * Phase 9: シミュレーション条件の表示・編集
 *
 * チャットで確認した条件をタグ形式で表示し、
 * クリックで変更モーダルを開く
 * 詳細設定ボタンからConditionSetupModalを開き、条件の追加・削除が可能
 */

import { useState, useCallback } from "react";
import type { SimulationCondition } from "../../types/decisionNavigator";
import { ConditionSetupModal } from "./ConditionSetupModal";

type ConditionPanelProps = {
  conditions: SimulationCondition[];
  onConditionChange: (conditionId: string, newValue: string) => void;
  /** 詳細設定完了時のコールバック（条件の追加・削除時） */
  onDetailedSettingsChange?: (updatedConditions: SimulationCondition[]) => void;
  /** 全ての利用可能な条件（詳細設定モーダル用） */
  allAvailableConditions?: SimulationCondition[];
  /** 目的（詳細設定モーダル用） */
  purpose?: string;
  isLoading?: boolean;
};

export function ConditionPanel({
  conditions,
  onConditionChange,
  onDetailedSettingsChange,
  allAvailableConditions,
  purpose = "",
  isLoading = false,
}: ConditionPanelProps) {
  const [editingCondition, setEditingCondition] = useState<SimulationCondition | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDetailedModalOpen, setIsDetailedModalOpen] = useState(false);

  const handleTagClick = (condition: SimulationCondition) => {
    if (isLoading) return;
    setEditingCondition(condition);
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setEditingCondition(null);
  };

  const handleValueChange = (newValue: string) => {
    if (editingCondition) {
      onConditionChange(editingCondition.id, newValue);
      handleModalClose();
    }
  };

  // 詳細設定モーダル
  const handleOpenDetailedSettings = useCallback(() => {
    if (isLoading) return;
    setIsDetailedModalOpen(true);
  }, [isLoading]);

  const handleDetailedSettingsConfirm = useCallback(
    (selectedConditions: Array<{ id: string; label: string; category: string; description: string; isSelected?: boolean }>, additionalInput?: string) => {
      // 選択された条件をSimulationCondition形式に変換
      const updatedConditions: SimulationCondition[] = selectedConditions
        .filter(c => c.isSelected !== false)
        .map((c) => {
          // 既存のアクティブ条件から取得を試みる
          const existing = conditions.find(ec => ec.id === c.id);
          // なければallAvailableConditionsから取得（詳細設定で新しく追加された場合）
          const available = allAvailableConditions?.find(ac => ac.id === c.id);
          return {
            id: c.id,
            label: c.label,
            value: existing?.value || available?.value || c.description,
            options: existing?.options || available?.options || [c.description],
            criteriaId: existing?.criteriaId || available?.criteriaId || c.category,
            isUserDefined: c.id.startsWith("custom-"),
          };
        });

      // additionalInputがあれば追加条件として追加
      if (additionalInput) {
        updatedConditions.push({
          id: `additional-${Date.now()}`,
          label: "追加条件",
          value: additionalInput,
          options: [additionalInput],
          isUserDefined: true,
        });
      }

      setIsDetailedModalOpen(false);
      onDetailedSettingsChange?.(updatedConditions);
    },
    [conditions, allAvailableConditions, onDetailedSettingsChange]
  );

  if (conditions.length === 0) {
    return null;
  }

  return (
    <div className="condition-panel">
      <div className="condition-panel__header">
        <span className="condition-panel__icon">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </span>
        <span className="condition-panel__title">条件設定</span>
        <span className="condition-panel__hint">（クリックで変更）</span>
        {onDetailedSettingsChange && (
          <button
            type="button"
            className="condition-panel__detailed-btn"
            onClick={handleOpenDetailedSettings}
            disabled={isLoading}
            title="詳細な条件設定を開く"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
            詳細設定
          </button>
        )}
      </div>
      <div className="condition-panel__tags">
        {conditions.map((condition) => (
          <button
            key={condition.id}
            type="button"
            className={`condition-panel__tag ${isLoading ? "condition-panel__tag--disabled" : ""}`}
            onClick={() => handleTagClick(condition)}
            disabled={isLoading}
            title={`${condition.label}: ${condition.value}`}
          >
            <span className="condition-panel__tag-label">{condition.label}</span>
            <span className="condition-panel__tag-value">{condition.value}</span>
            <span className="condition-panel__tag-edit">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
            </span>
          </button>
        ))}
      </div>

      {/* 条件編集モーダル */}
      {isModalOpen && editingCondition && (
        <ConditionEditModal
          condition={editingCondition}
          onClose={handleModalClose}
          onSave={handleValueChange}
        />
      )}

      {/* 詳細設定モーダル */}
      <ConditionSetupModal
        isOpen={isDetailedModalOpen}
        purpose={purpose}
        extractedConditions={(allAvailableConditions || conditions).map(c => {
          // 現在アクティブな条件かどうかをチェック
          const isActive = conditions.some(active => active.id === c.id);
          return {
            id: c.id,
            label: c.label,
            category: c.criteriaId || "other",
            description: c.value,
            isSelected: isActive, // アクティブな条件のみ選択済み
          };
        })}
        onConfirm={handleDetailedSettingsConfirm}
        onCancel={() => setIsDetailedModalOpen(false)}
      />
    </div>
  );
}

/**
 * 条件編集モーダル
 */
type ConditionEditModalProps = {
  condition: SimulationCondition;
  onClose: () => void;
  onSave: (newValue: string) => void;
};

function ConditionEditModal({ condition, onClose, onSave }: ConditionEditModalProps) {
  const [selectedValue, setSelectedValue] = useState(condition.value);

  const handleSave = () => {
    onSave(selectedValue);
  };

  return (
    <div className="condition-modal-overlay" onClick={onClose}>
      <div className="condition-modal" onClick={(e) => e.stopPropagation()}>
        <div className="condition-modal__header">
          <h3 className="condition-modal__title">{condition.label}を変更</h3>
          <button
            type="button"
            className="condition-modal__close"
            onClick={onClose}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
        <div className="condition-modal__body">
          <p className="condition-modal__description">
            条件を変更すると、推奨パスがリアルタイムで再計算されます。
          </p>
          <div className="condition-modal__options">
            {condition.options.map((option) => (
              <button
                key={option}
                type="button"
                className={`condition-modal__option ${selectedValue === option ? "condition-modal__option--selected" : ""}`}
                onClick={() => setSelectedValue(option)}
              >
                <span className="condition-modal__option-radio">
                  {selectedValue === option ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" />
                      <circle cx="12" cy="12" r="5" />
                    </svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                    </svg>
                  )}
                </span>
                <span className="condition-modal__option-label">{option}</span>
              </button>
            ))}
          </div>
        </div>
        <div className="condition-modal__footer">
          <button
            type="button"
            className="condition-modal__cancel"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="condition-modal__save"
            onClick={handleSave}
            disabled={selectedValue === condition.value}
          >
            変更を適用
          </button>
        </div>
      </div>
    </div>
  );
}
