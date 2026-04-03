"use client"
/**
 * ConditionSetupModal - 条件設定モーダル
 *
 * スタートノード選択後に表示され、追加の条件を設定できる
 * - 既存条件の確認・編集
 * - 新しい条件の追加
 * - 優先順位の設定
 */

import { useState, useCallback, useEffect } from "react";

type Condition = {
  id: string;
  label: string;
  category: string;
  description: string;
  isSelected?: boolean;
};

type ConditionSetupModalProps = {
  isOpen: boolean;
  purpose: string;
  extractedConditions: Condition[];
  onConfirm: (selectedConditions: Condition[], additionalInput?: string) => void;
  onCancel: () => void;
};

/** QCEDS汎用カテゴリ（条件追加時の分類用） */
const CATEGORY_OPTIONS = [
  { value: "quality", label: "品質" },
  { value: "cost", label: "コスト" },
  { value: "time", label: "納期" },
  { value: "environment", label: "環境" },
  { value: "safety", label: "安全" },
  { value: "legal", label: "法規・規制" },
  { value: "technical", label: "技術" },
  { value: "other", label: "その他" },
];

export function ConditionSetupModal({
  isOpen,
  purpose,
  extractedConditions,
  onConfirm,
  onCancel,
}: ConditionSetupModalProps) {
  const [conditions, setConditions] = useState<Condition[]>(
    extractedConditions.map((c) => ({ ...c, isSelected: c.isSelected ?? true }))
  );
  const [additionalInput, setAdditionalInput] = useState("");
  const [newConditionLabel, setNewConditionLabel] = useState("");
  const [newConditionCategory, setNewConditionCategory] = useState("other");

  // extractedConditions が変更されたとき、または isOpen が true になったときに状態を同期
  // これにより、条件パネルのタグと詳細設定モーダルの条件が常に一致する
  useEffect(() => {
    if (isOpen) {
      setConditions(extractedConditions.map((c) => ({ ...c, isSelected: c.isSelected ?? true })));
      setAdditionalInput(""); // モーダルを開くたびにリセット
      setNewConditionLabel("");
    }
  }, [isOpen, extractedConditions]);

  // 条件の選択/非選択を切り替え
  const toggleCondition = useCallback((id: string) => {
    setConditions((prev) =>
      prev.map((c) => (c.id === id ? { ...c, isSelected: !c.isSelected } : c))
    );
  }, []);

  // 新しい条件を追加
  const handleAddCondition = useCallback(() => {
    if (!newConditionLabel.trim()) return;

    const newCondition: Condition = {
      id: `custom-${Date.now()}`,
      label: newConditionLabel.trim(),
      category: newConditionCategory,
      description: "ユーザーが追加した条件",
      isSelected: true,
    };

    setConditions((prev) => [...prev, newCondition]);
    setNewConditionLabel("");
  }, [newConditionLabel, newConditionCategory]);

  // 確定
  const handleConfirm = useCallback(() => {
    const selectedConditions = conditions.filter((c) => c.isSelected);
    onConfirm(selectedConditions, additionalInput.trim() || undefined);
  }, [conditions, additionalInput, onConfirm]);

  if (!isOpen) return null;

  return (
    <div className="condition-modal__overlay">
      <div className="condition-modal">
        <div className="condition-modal__header">
          <h2 className="condition-modal__title">条件の設定</h2>
          <button
            type="button"
            className="condition-modal__close"
            onClick={onCancel}
            aria-label="閉じる"
          >
            ×
          </button>
        </div>

        <div className="condition-modal__content">
          {/* 目的の表示 */}
          <div className="condition-modal__purpose">
            <span className="condition-modal__purpose-label">目的:</span>
            <span className="condition-modal__purpose-text">{purpose}</span>
          </div>

          {/* 抽出された条件 */}
          <div className="condition-modal__section">
            <h3 className="condition-modal__section-title">
              入力から抽出された条件
              <span className="condition-modal__section-hint">
                （選択した条件が考慮されます）
              </span>
            </h3>
            {conditions.length === 0 ? (
              <p className="condition-modal__empty">
                条件が抽出されませんでした。下記から追加できます。
              </p>
            ) : (
              <ul className="condition-modal__list">
                {conditions.map((c) => (
                  <li
                    key={c.id}
                    className={`condition-modal__item ${c.isSelected ? "condition-modal__item--selected" : ""}`}
                  >
                    <label className="condition-modal__item-label">
                      <input
                        type="checkbox"
                        checked={c.isSelected}
                        onChange={() => toggleCondition(c.id)}
                      />
                      <span className="condition-modal__item-text">{c.label}</span>
                      {/* 手動追加した条件のみQCEDSカテゴリを表示 */}
                      {c.id.startsWith("custom-") && (
                        <span className="condition-modal__item-category">
                          {CATEGORY_OPTIONS.find(opt => opt.value === c.category)?.label || c.category}
                        </span>
                      )}
                    </label>
                    <p className="condition-modal__item-desc">{c.description}</p>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* 新しい条件の追加 */}
          <div className="condition-modal__section">
            <h3 className="condition-modal__section-title">条件を追加</h3>
            <div className="condition-modal__add-form">
              <input
                type="text"
                className="condition-modal__input"
                placeholder="条件を入力（例: 予算は100万円以内）"
                value={newConditionLabel}
                onChange={(e) => setNewConditionLabel(e.target.value)}
                onKeyDown={(e) => {
                  // IME変換中（日本語入力確定時）はスキップ
                  if (e.nativeEvent.isComposing) return;
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleAddCondition();
                  }
                }}
              />
              <select
                className="condition-modal__select"
                value={newConditionCategory}
                onChange={(e) => setNewConditionCategory(e.target.value)}
              >
                {CATEGORY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                className="condition-modal__add-btn"
                onClick={handleAddCondition}
                disabled={!newConditionLabel.trim()}
              >
                追加
              </button>
            </div>
          </div>

          {/* 追加の状況説明 */}
          <div className="condition-modal__section">
            <h3 className="condition-modal__section-title">
              追加の状況説明
              <span className="condition-modal__section-hint">（任意）</span>
            </h3>
            <textarea
              className="condition-modal__textarea"
              placeholder="現在の状況や制約について追加で説明があれば入力してください..."
              value={additionalInput}
              onChange={(e) => setAdditionalInput(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <div className="condition-modal__footer">
          <button
            type="button"
            className="condition-modal__btn condition-modal__btn--cancel"
            onClick={onCancel}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="condition-modal__btn condition-modal__btn--confirm"
            onClick={handleConfirm}
          >
            決定支援を開始
          </button>
        </div>
      </div>
    </div>
  );
}
