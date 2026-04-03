"use client"
/**
 * 意思決定ナビ条件設定カード
 *
 * 意思決定ナビを起動する前に、チャット上で条件を確認・編集できるカード
 * 過去事例から条件を自動セットし、ユーザーが編集可能
 */

import { useState } from "react";
import type { DecisionNavigatorConditionData } from "../../types/chat";

type DecisionNavigatorConditionCardProps = {
  /** 条件データ */
  data: DecisionNavigatorConditionData;
  /** 条件確定して意思決定ナビを起動 */
  onConfirmAndLaunch?: (data: DecisionNavigatorConditionData) => void;
  /** スキップして意思決定ナビを起動（条件なし） */
  onSkip?: () => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
};

export function DecisionNavigatorConditionCard({
  data,
  onConfirmAndLaunch,
  onSkip,
  isDisabled = false,
}: DecisionNavigatorConditionCardProps) {
  const [editedData, setEditedData] = useState<DecisionNavigatorConditionData>(data);
  const [isEditing, setIsEditing] = useState(false);

  const handlePurposeChange = (value: string) => {
    setEditedData((prev) => ({ ...prev, purpose: value }));
  };

  const handleSituationChange = (value: string) => {
    setEditedData((prev) => ({ ...prev, currentSituation: value }));
  };

  const handleConditionChange = (key: string, value: string) => {
    setEditedData((prev) => ({
      ...prev,
      conditions: { ...prev.conditions, [key]: value },
    }));
  };

  const handleConfirm = () => {
    onConfirmAndLaunch?.(editedData);
  };

  // 無効化状態の場合は完了表示
  if (isDisabled) {
    return (
      <div className="dn-condition-card dn-condition-card--disabled">
        <div className="dn-condition-card__header">
          <span className="dn-condition-card__icon">✅</span>
          <span className="dn-condition-card__title">
            条件を設定して意思決定ナビを起動しました
          </span>
        </div>
        <div className="dn-condition-card__summary">
          <div className="dn-condition-card__summary-item">
            <span className="dn-condition-card__summary-label">目的:</span>
            <span className="dn-condition-card__summary-value">{editedData.purpose}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dn-condition-card">
      <div className="dn-condition-card__header">
        <span className="dn-condition-card__icon">🎯</span>
        <span className="dn-condition-card__title">
          意思決定ナビの条件設定
        </span>
      </div>

      {data.isAutoSet && data.sourceCaseTitle && (
        <div className="dn-condition-card__source">
          <span className="dn-condition-card__source-icon">📚</span>
          <span className="dn-condition-card__source-text">
            「{data.sourceCaseTitle}」から条件を自動セットしました
          </span>
        </div>
      )}

      <div className="dn-condition-card__content">
        {/* 目的 */}
        <div className="dn-condition-card__field">
          <label className="dn-condition-card__label">
            検討の目的
            <span className="dn-condition-card__required">*</span>
          </label>
          {isEditing ? (
            <input
              type="text"
              className="dn-condition-card__input"
              value={editedData.purpose}
              onChange={(e) => handlePurposeChange(e.target.value)}
              placeholder="例: 新規AI技術の特許出願方針を決定したい"
            />
          ) : (
            <div className="dn-condition-card__value">{editedData.purpose}</div>
          )}
        </div>

        {/* 現在の状況 */}
        <div className="dn-condition-card__field">
          <label className="dn-condition-card__label">現在の状況</label>
          {isEditing ? (
            <textarea
              className="dn-condition-card__textarea"
              value={editedData.currentSituation}
              onChange={(e) => handleSituationChange(e.target.value)}
              placeholder="例: 起動頻度20回/年、復旧時間は3時間以内が目標"
              rows={2}
            />
          ) : (
            <div className="dn-condition-card__value">
              {editedData.currentSituation || "（未設定）"}
            </div>
          )}
        </div>

        {/* 条件リスト */}
        {Object.keys(editedData.conditions).length > 0 && (
          <div className="dn-condition-card__conditions">
            <div className="dn-condition-card__conditions-header">
              設定された条件
            </div>
            <div className="dn-condition-card__conditions-list">
              {Object.entries(editedData.conditions).map(([key, value]) => (
                <div key={key} className="dn-condition-card__condition-item">
                  <span className="dn-condition-card__condition-key">{key}</span>
                  {isEditing ? (
                    <input
                      type="text"
                      className="dn-condition-card__condition-input"
                      value={value}
                      onChange={(e) => handleConditionChange(key, e.target.value)}
                    />
                  ) : (
                    <span className="dn-condition-card__condition-value">{value}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="dn-condition-card__actions">
        {isEditing ? (
          <>
            <button
              type="button"
              className="dn-condition-card__btn dn-condition-card__btn--secondary"
              onClick={() => {
                setEditedData(data);
                setIsEditing(false);
              }}
            >
              キャンセル
            </button>
            <button
              type="button"
              className="dn-condition-card__btn dn-condition-card__btn--primary"
              onClick={() => setIsEditing(false)}
            >
              編集を確定
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              className="dn-condition-card__btn dn-condition-card__btn--edit"
              onClick={() => setIsEditing(true)}
            >
              条件を編集
            </button>
            <button
              type="button"
              className="dn-condition-card__btn dn-condition-card__btn--primary"
              onClick={handleConfirm}
              disabled={!onConfirmAndLaunch || !editedData.purpose.trim()}
            >
              この条件で意思決定ナビを起動
            </button>
          </>
        )}
      </div>

      {onSkip && !isEditing && (
        <div className="dn-condition-card__skip">
          <button
            type="button"
            className="dn-condition-card__skip-btn"
            onClick={onSkip}
          >
            条件設定をスキップして起動
          </button>
        </div>
      )}

      <div className="dn-condition-card__hint">
        💡 条件を設定すると、より適切な判断の整理ができます
      </div>
    </div>
  );
}
