"use client"
/**
 * 判断記録カード
 *
 * 判断の記録フォームと完了表示
 * デモストーリーの「理由が自動記録される」シーンを実現
 */

import { useState } from "react";
import type {
  DecisionContent,
  DecisionConditions,
  DecisionRationale,
  RecordDecisionInput,
} from "../../api/decisionCase";

type DecisionRecordFormProps = {
  /** 参照した事例のID */
  referencedCaseId?: string;
  /** 参照した事例のタイトル */
  referencedCaseTitle?: string;
  /** 初期値（傾向から自動入力） */
  initialValues?: {
    decision?: string;
    conditions?: string;
    rationale?: string;
  };
  /** 記録完了時のコールバック */
  onRecord: (input: RecordDecisionInput) => void;
  /** キャンセル時のコールバック */
  onCancel?: () => void;
};

export function DecisionRecordForm({
  referencedCaseId,
  referencedCaseTitle,
  initialValues,
  onRecord,
  onCancel,
}: DecisionRecordFormProps) {
  const [title, setTitle] = useState("");
  const [decisionSummary, setDecisionSummary] = useState(
    initialValues?.decision || ""
  );
  const [conditionsContext, setConditionsContext] = useState(
    initialValues?.conditions || ""
  );
  const [rationalePrimary, setRationalePrimary] = useState(
    initialValues?.rationale || ""
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit =
    title.trim() &&
    decisionSummary.trim() &&
    conditionsContext.trim() &&
    rationalePrimary.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    const decision: DecisionContent = {
      summary: decisionSummary.trim(),
      date: new Date().toISOString().split("T")[0],
    };

    const conditions: DecisionConditions = {
      context: conditionsContext.trim(),
    };

    const rationale: DecisionRationale = {
      primary: rationalePrimary.trim(),
    };

    const input: RecordDecisionInput = {
      title: title.trim(),
      decision,
      conditions,
      rationale,
      referencedCaseId,
      metadata: {
        source: "demo_input",
        year: new Date().getFullYear(),
      },
    };

    onRecord(input);
  };

  return (
    <div className="decision-record-form">
      <div className="decision-record-form__header">
        <span className="decision-record-form__icon">✏️</span>
        <span className="decision-record-form__title">判断を記録する</span>
      </div>

      {referencedCaseTitle && (
        <div className="decision-record-form__reference">
          📎 参照事例: {referencedCaseTitle}
        </div>
      )}

      <div className="decision-record-form__fields">
        <div className="decision-record-form__field">
          <label className="decision-record-form__label">
            案件タイトル <span className="required">*</span>
          </label>
          <input
            type="text"
            className="decision-record-form__input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="例: センシングAI技術 特許出願方針決定"
          />
        </div>

        <div className="decision-record-form__field">
          <label className="decision-record-form__label">
            判断内容 <span className="required">*</span>
          </label>
          <input
            type="text"
            className="decision-record-form__input"
            value={decisionSummary}
            onChange={(e) => setDecisionSummary(e.target.value)}
            placeholder="例: 1-A案（ホールドアップ式）を採用"
          />
        </div>

        <div className="decision-record-form__field">
          <label className="decision-record-form__label">
            条件・前提 <span className="required">*</span>
          </label>
          <textarea
            className="decision-record-form__textarea"
            value={conditionsContext}
            onChange={(e) => setConditionsContext(e.target.value)}
            placeholder="例: 起動頻度25回/年を想定、復旧時間4時間以内が必須要件"
            rows={2}
          />
        </div>

        <div className="decision-record-form__field">
          <label className="decision-record-form__label">
            判断理由 <span className="required">*</span>
          </label>
          <textarea
            className="decision-record-form__textarea"
            value={rationalePrimary}
            onChange={(e) => setRationalePrimary(e.target.value)}
            placeholder="例: 起動頻度が高く、復旧時間短縮を最優先したため"
            rows={2}
          />
        </div>
      </div>

      <div className="decision-record-form__actions">
        <button
          type="button"
          className="decision-record-form__btn decision-record-form__btn--primary"
          onClick={handleSubmit}
          disabled={!canSubmit || isSubmitting}
        >
          {isSubmitting ? "記録中..." : "判断を記録する"}
        </button>
        {onCancel && (
          <button
            type="button"
            className="decision-record-form__btn decision-record-form__btn--secondary"
            onClick={onCancel}
          >
            キャンセル
          </button>
        )}
      </div>

      <div className="decision-record-form__hint">
        💡 この判断は今後の類似案件で参照可能になります
      </div>
    </div>
  );
}

/**
 * 判断記録完了カード
 */
type DecisionRecordCompleteProps = {
  /** 記録されたID */
  recordedId: string;
  /** 記録されたタイトル */
  recordedTitle: string;
  /** 閉じるコールバック */
  onClose?: () => void;
};

export function DecisionRecordComplete({
  recordedId,
  recordedTitle,
  onClose,
}: DecisionRecordCompleteProps) {
  return (
    <div className="decision-record-complete">
      <div className="decision-record-complete__header">
        <span className="decision-record-complete__icon">✅</span>
        <span className="decision-record-complete__title">
          判断が記録されました
        </span>
      </div>

      <div className="decision-record-complete__content">
        <div className="decision-record-complete__info">
          <div className="decision-record-complete__info-row">
            <span className="decision-record-complete__info-label">📋 案件:</span>
            <span className="decision-record-complete__info-value">
              {recordedTitle}
            </span>
          </div>
          <div className="decision-record-complete__info-row">
            <span className="decision-record-complete__info-label">🆔 ID:</span>
            <span className="decision-record-complete__info-value">
              {recordedId}
            </span>
          </div>
        </div>

        <div className="decision-record-complete__related">
          <div className="decision-record-complete__related-header">
            🔄 この判断は今後の類似案件で参照可能になります
          </div>
          <ul className="decision-record-complete__related-list">
            <li>手順書・解説書との関連付け</li>
            <li>参照事例との関連付け</li>
            <li>将来の若手エンジニアへの知見として蓄積</li>
          </ul>
        </div>
      </div>

      <div className="decision-record-complete__message">
        <span className="decision-record-complete__message-icon">🌟</span>
        <span className="decision-record-complete__message-text">
          今、あなたが行った判断は、将来の別の若手にとっての"ベテランの知見"になります。
          <strong>知識が循環し、組織として賢くなり続ける</strong>仕組みです。
        </span>
      </div>

      {onClose && (
        <div className="decision-record-complete__actions">
          <button
            type="button"
            className="decision-record-complete__btn"
            onClick={onClose}
          >
            閉じる
          </button>
        </div>
      )}
    </div>
  );
}
