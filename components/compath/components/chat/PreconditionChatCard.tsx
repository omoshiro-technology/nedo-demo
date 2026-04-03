"use client"
/**
 * チャット内前提条件確認カード
 *
 * 技術伝承デモから意思決定ナビ起動時に、
 * ポップアップではなくチャット内で前提条件を確認するカード。
 * カウントダウン（残りステップ数）表示付き。
 */

import { useState, useCallback } from "react";
import type { PreconditionChatData } from "../../types/chat";

type PreconditionChatCardProps = {
  /** 前提条件データ */
  data: PreconditionChatData;
  /** 確認完了時のコールバック */
  onConfirm: (
    constraints: Array<{ id: string; label: string; category: string; value?: string }>,
    additionalContext?: string
  ) => void;
  /** スキップ時のコールバック（前提条件なしでナビ起動） */
  onSkip?: () => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
};

/** カテゴリに応じたプレースホルダーを返す */
function getPlaceholder(category: string): string {
  const placeholders: Record<string, string> = {
    safety: "例: 人が近づかない構造",
    legal: "例: 消防法に準拠",
    cost: "例: 100万円以下",
    time: "例: 3ヶ月以内",
    quality: "例: 精度0.1mm以下",
  };
  return placeholders[category] ?? "具体的な条件があれば入力";
}

export function PreconditionChatCard({
  data,
  onConfirm,
  onSkip,
  isDisabled = false,
}: PreconditionChatCardProps) {
  const [constraints, setConstraints] = useState(data.constraints);
  const [additionalContext, setAdditionalContext] = useState(data.additionalContext || "");
  const [currentStep, setCurrentStep] = useState(1);

  const totalSteps = 2; // ステップ1: 制約確認, ステップ2: 補足条件

  const handleConstraintChange = useCallback((id: string, value: string) => {
    setConstraints(prev =>
      prev.map(c => (c.id === id ? { ...c, value } : c))
    );
  }, []);

  const handleNextStep = useCallback(() => {
    if (currentStep < totalSteps) {
      setCurrentStep(prev => prev + 1);
    }
  }, [currentStep]);

  const handlePrevStep = useCallback(() => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  }, [currentStep]);

  const handleConfirm = useCallback(() => {
    onConfirm(constraints, additionalContext || undefined);
  }, [constraints, additionalContext, onConfirm]);

  // 無効化状態の場合は完了表示
  if (isDisabled) {
    return (
      <div className="precondition-chat-card precondition-chat-card--disabled">
        <div className="precondition-chat-card__header">
          <span className="precondition-chat-card__icon">✅</span>
          <span className="precondition-chat-card__title">
            前提条件を確認しました
          </span>
        </div>
        <div className="precondition-chat-card__summary">
          {constraints.filter(c => c.value).length > 0 && (
            <div className="precondition-chat-card__summary-constraints">
              <strong>設定した制約:</strong>
              <ul>
                {constraints.filter(c => c.value).map(c => (
                  <li key={c.id}>{c.label}: {c.value}</li>
                ))}
              </ul>
            </div>
          )}
          {additionalContext && (
            <div className="precondition-chat-card__summary-additional">
              <strong>補足:</strong> {additionalContext}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="precondition-chat-card">
      {/* ヘッダー: カウントダウン表示 */}
      <div className="precondition-chat-card__header">
        <div className="precondition-chat-card__header-left">
          <span className="precondition-chat-card__icon">⚙️</span>
          <span className="precondition-chat-card__title">
            意思決定ナビの前提条件
          </span>
        </div>
        <div className="precondition-chat-card__countdown">
          <span className="precondition-chat-card__countdown-current">
            ステップ {currentStep}
          </span>
          <span className="precondition-chat-card__countdown-separator">/</span>
          <span className="precondition-chat-card__countdown-total">
            {totalSteps}
          </span>
          <span className="precondition-chat-card__countdown-remaining">
            （残り {totalSteps - currentStep + 1}）
          </span>
        </div>
      </div>

      {/* 参照元事例の表示 */}
      {data.sourceCaseTitle && (
        <div className="precondition-chat-card__source">
          <span className="precondition-chat-card__source-label">参照:</span>
          <span className="precondition-chat-card__source-title">{data.sourceCaseTitle}</span>
        </div>
      )}

      {/* 目的の表示 */}
      <div className="precondition-chat-card__purpose">
        <span className="precondition-chat-card__purpose-label">目的:</span>
        <span className="precondition-chat-card__purpose-text">{data.purpose}</span>
      </div>

      {/* プログレスバー */}
      <div className="precondition-chat-card__progress">
        <div
          className="precondition-chat-card__progress-fill"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>

      {/* ステップ1: 制約確認 */}
      {currentStep === 1 && (
        <div className="precondition-chat-card__step">
          <div className="precondition-chat-card__step-header">
            <span className="precondition-chat-card__step-title">
              必ず守る制約を確認
            </span>
            <span className="precondition-chat-card__step-hint">
              具体的な条件があれば入力してください
            </span>
          </div>
          <div className="precondition-chat-card__constraints">
            {constraints.map(c => (
              <div key={c.id} className="precondition-chat-card__constraint">
                <label className="precondition-chat-card__constraint-label">
                  {c.label}
                </label>
                <input
                  type="text"
                  className="precondition-chat-card__constraint-input"
                  placeholder={getPlaceholder(c.category)}
                  value={c.value || ""}
                  onChange={(e) => handleConstraintChange(c.id, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ステップ2: 補足条件 */}
      {currentStep === 2 && (
        <div className="precondition-chat-card__step">
          <div className="precondition-chat-card__step-header">
            <span className="precondition-chat-card__step-title">
              補足条件（任意）
            </span>
            <span className="precondition-chat-card__step-hint">
              その他の条件や制約があれば入力
            </span>
          </div>
          <textarea
            className="precondition-chat-card__additional-input"
            placeholder="その他の条件や制約があれば入力..."
            value={additionalContext}
            onChange={(e) => setAdditionalContext(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* ナビゲーション */}
      <div className="precondition-chat-card__nav">
        {currentStep > 1 && (
          <button
            type="button"
            className="precondition-chat-card__nav-btn precondition-chat-card__nav-btn--secondary"
            onClick={handlePrevStep}
          >
            ← 戻る
          </button>
        )}

        {currentStep < totalSteps ? (
          <button
            type="button"
            className="precondition-chat-card__nav-btn precondition-chat-card__nav-btn--primary"
            onClick={handleNextStep}
          >
            次へ →
          </button>
        ) : (
          <button
            type="button"
            className="precondition-chat-card__nav-btn precondition-chat-card__nav-btn--complete"
            onClick={handleConfirm}
          >
            この条件で意思決定ナビを開始
          </button>
        )}
      </div>

      {/* スキップオプション */}
      {onSkip && (
        <div className="precondition-chat-card__skip">
          <button
            type="button"
            className="precondition-chat-card__skip-btn"
            onClick={onSkip}
          >
            条件設定をスキップして開始
          </button>
        </div>
      )}
    </div>
  );
}
