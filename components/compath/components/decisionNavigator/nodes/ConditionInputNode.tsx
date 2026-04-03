"use client"
/**
 * ConditionInputNode - 条件入力ノード
 *
 * Phase 5改: 意思決定サイクルの第1段階
 * スタートノード選択後に表示され、条件の選択・入力を行う
 *
 * UI改善:
 * - クリック不要で展開表示
 * - 各条件の右に絶対条件（詳細）入力欄を追加
 * - 補足条件を常時表示
 */

import { memo, useState, useCallback } from "react";
import { Handle, Position, type NodeProps } from "reactflow";
import type { ConditionInputState } from "../../../types/decisionNavigator";

type ConditionInputNodeData = {
  label: string;
  description?: string;
  conditionInputState?: ConditionInputState;
  isActive: boolean;
  onConditionToggle?: (conditionId: string) => void;
  onConditionAdd?: (label: string, category: string) => void;
  onAdditionalContextChange?: (context: string) => void;
  onComplete?: () => void;
};

function ConditionInputNodeComponent({ data }: NodeProps<ConditionInputNodeData>) {
  const {
    label,
    conditionInputState,
    onConditionToggle,
    onComplete,
  } = data;

  // 各条件の絶対条件入力を管理するローカルステート
  const [absoluteConditions, setAbsoluteConditions] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    if (conditionInputState?.extractedConditions) {
      for (const c of conditionInputState.extractedConditions) {
        if (c.absoluteCondition) {
          initial[c.id] = c.absoluteCondition;
        }
      }
    }
    return initial;
  });

  // 補足条件
  const [additionalCondition, setAdditionalCondition] = useState(
    conditionInputState?.additionalCondition ?? ""
  );

  const handleToggleCondition = useCallback(
    (conditionId: string) => {
      onConditionToggle?.(conditionId);
    },
    [onConditionToggle]
  );

  const handleAbsoluteConditionChange = useCallback(
    (conditionId: string, value: string) => {
      setAbsoluteConditions((prev) => ({
        ...prev,
        [conditionId]: value,
      }));
    },
    []
  );

  const handleAdditionalConditionChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setAdditionalCondition(e.target.value);
    },
    []
  );

  const handleComplete = useCallback(() => {
    onComplete?.();
  }, [onComplete]);

  const selectedCount =
    conditionInputState?.extractedConditions.filter((c) => c.isSelected).length ?? 0;

  // 絶対条件が入力されている数
  const absoluteCount = Object.values(absoluteConditions).filter((v) => v.trim()).length;

  // 検索可能かどうか（何か条件が設定されていれば可）
  const canSearch = selectedCount > 0 || absoluteCount > 0 || additionalCondition.trim().length > 0;

  // 確定済みの場合はサマリー表示
  if (conditionInputState?.isComplete) {
    return (
      <div className="condition-input-node condition-input-node--completed">
        <Handle type="target" position={Position.Left} className="handle-target" />
        <div className="condition-input-node__header">
          <span className="condition-input-node__icon">✓</span>
          <span className="condition-input-node__title">条件設定完了</span>
        </div>
        <div className="condition-input-node__summary">
          <span className="condition-input-node__summary-count">
            {selectedCount}件の条件で検索済み
          </span>
        </div>
        <Handle type="source" position={Position.Right} className="handle-source" />
      </div>
    );
  }

  // 条件入力がない場合
  if (!conditionInputState) {
    return (
      <div className="condition-input-node">
        <Handle type="target" position={Position.Left} className="handle-target" />
        <div className="condition-input-node__header">
          <span className="condition-input-node__icon">📋</span>
          <span className="condition-input-node__title">{label}</span>
        </div>
        <div className="condition-input-node__empty">
          条件情報がありません
        </div>
        <Handle type="source" position={Position.Right} className="handle-source" />
      </div>
    );
  }

  // 常に展開表示（クリック不要）
  return (
    <div className="condition-input-node condition-input-node--expanded">
      <Handle type="target" position={Position.Left} className="handle-target" />

      {/* ヘッダー */}
      <div className="condition-input-node__header">
        <span className="condition-input-node__icon">📋</span>
        <span className="condition-input-node__title">良い決定のための条件設定</span>
      </div>

      <div className="condition-input-node__content">
        {/* 条件リスト */}
        {conditionInputState.extractedConditions.length > 0 && (
          <div className="condition-input-node__section">
            <div className="condition-input-node__section-header">
              <span className="condition-input-node__section-title">特に守りたい条件</span>
              <span className="condition-input-node__section-hint">
                詳細を入力すると検索キーになります
              </span>
            </div>
            <ul className="condition-input-node__list">
              {conditionInputState.extractedConditions.map((c) => (
                <li
                  key={c.id}
                  className={`condition-input-node__condition-row ${
                    c.isSelected || absoluteConditions[c.id]?.trim()
                      ? "condition-input-node__condition-row--active"
                      : ""
                  }`}
                >
                  <div className="condition-input-node__condition-left">
                    <label className="condition-input-node__checkbox-label">
                      <input
                        type="checkbox"
                        checked={c.isSelected}
                        onChange={() => handleToggleCondition(c.id)}
                      />
                      <span className="condition-input-node__condition-name">{c.label}</span>
                    </label>
                  </div>
                  <div className="condition-input-node__condition-right">
                    <input
                      type="text"
                      className="condition-input-node__absolute-input"
                      placeholder={`例: ${getPlaceholder(c.category)}`}
                      value={absoluteConditions[c.id] ?? ""}
                      onChange={(e) => handleAbsoluteConditionChange(c.id, e.target.value)}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 補足条件（常時表示） */}
        <div className="condition-input-node__section condition-input-node__section--additional">
          <div className="condition-input-node__section-header">
            <span className="condition-input-node__section-title">補足条件</span>
            <span className="condition-input-node__section-hint">任意</span>
          </div>
          <textarea
            className="condition-input-node__additional-textarea"
            placeholder="その他の条件や制約があれば入力..."
            value={additionalCondition}
            onChange={handleAdditionalConditionChange}
            rows={2}
          />
        </div>

        {/* 検索ボタン */}
        <button
          type="button"
          className="condition-input-node__search-btn"
          onClick={handleComplete}
          disabled={!canSearch}
        >
          この条件で次の選択を検索
        </button>
      </div>

      <Handle type="source" position={Position.Right} className="handle-source" />
    </div>
  );
}

/**
 * カテゴリに応じたプレースホルダーを返す
 */
function getPlaceholder(category: string): string {
  const placeholders: Record<string, string> = {
    safety: "人が近づかない構造",
    legal: "消防法に準拠",
    cost: "100万円以下",
    time: "3ヶ月以内",
    quality: "精度0.1mm以下",
    technical: "既存設備と互換",
    "制約": "具体的な制約内容",
  };
  return placeholders[category] ?? "具体的な条件を入力";
}

export const ConditionInputNode = memo(ConditionInputNodeComponent);
