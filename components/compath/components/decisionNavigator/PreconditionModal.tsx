"use client"
/**
 * PreconditionModal - 前提条件設定モーダル
 *
 * セッション開始前に表示され、意思決定全体に適用される前提条件を設定する。
 * 全ての制約項目は必須で満たす必要があるため、チェックボックスは使用しない。
 * 確認質問セクションで暗黙条件を引き出す。
 * Phase 6: 過去事例から前提条件を反映する機能を追加。
 */

import { useState, useCallback, useEffect } from "react";
import type { ClarificationQuestion, PreconditionClarificationAnswer } from "../../types/decisionNavigator";
import * as api from "../../api/decisionNavigator";
import type { PastPreconditionEntry } from "../../api/decisionNavigator";

/** 抽出された前提条件 */
export type ExtractedPrecondition = {
  id: string;
  label: string;
  category: string;
  description?: string;
  isSelected: boolean; // 後方互換性のため残す（常にtrue扱い）
  detail?: string; // ユーザーが入力する詳細
};

/** 前提条件モーダルのプロップス */
type PreconditionModalProps = {
  isOpen: boolean;
  purpose: string;
  /** チャットから抽出された前提条件 */
  extractedConditions: ExtractedPrecondition[];
  /** 確認質問（暗黙条件引き出し用） */
  clarificationQuestions?: ClarificationQuestion[];
  /** 確認質問のローディング状態 */
  isLoadingQuestions?: boolean;
  onConfirm: (
    preconditions: ExtractedPrecondition[],
    additionalContext: string,
    clarificationAnswers?: PreconditionClarificationAnswer[]
  ) => void;
  onClose: () => void;
};

/** カテゴリに応じたプレースホルダーを返す */
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

export function PreconditionModal({
  isOpen,
  purpose,
  extractedConditions,
  clarificationQuestions = [],
  isLoadingQuestions = false,
  onConfirm,
  onClose,
}: PreconditionModalProps) {
  // 条件の詳細を管理（全項目が必須なのでisSelectedは不要）
  const [conditions, setConditions] = useState<ExtractedPrecondition[]>([]);
  const [additionalContext, setAdditionalContext] = useState("");
  // 確認質問への回答
  const [answers, setAnswers] = useState<Record<string, PreconditionClarificationAnswer>>({});

  // Phase 6: 過去事例から反映
  const [pastCases, setPastCases] = useState<PastPreconditionEntry[]>([]);
  const [isLoadingPastCases, setIsLoadingPastCases] = useState(false);
  const [showPastCases, setShowPastCases] = useState(false);

  // extractedConditionsが変わったら状態を更新（全てisSelected: trueに設定）
  useEffect(() => {
    setConditions(extractedConditions.map(c => ({ ...c, isSelected: true })));
  }, [extractedConditions]);

  // 確認質問が変わったら回答をリセット
  useEffect(() => {
    const initialAnswers: Record<string, PreconditionClarificationAnswer> = {};
    for (const q of clarificationQuestions) {
      initialAnswers[q.id] = { questionId: q.id, answer: "skip" };
    }
    setAnswers(initialAnswers);
  }, [clarificationQuestions]);

  const handleDetailChange = useCallback((conditionId: string, detail: string) => {
    setConditions(prev =>
      prev.map(c =>
        c.id === conditionId ? { ...c, detail } : c
      )
    );
  }, []);

  const handleAnswerChange = useCallback((questionId: string, answer: "yes" | "no" | "skip", detail?: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: { questionId, answer, detail },
    }));
  }, []);

  const handleConfirm = useCallback(() => {
    // 全ての条件をisSelected: trueで渡す
    const allSelected = conditions.map(c => ({ ...c, isSelected: true }));
    // 回答をリストに変換
    const answerList = Object.values(answers).filter(a => a.answer !== "skip");
    onConfirm(allSelected, additionalContext, answerList.length > 0 ? answerList : undefined);
  }, [conditions, additionalContext, answers, onConfirm]);

  // Phase 6: 過去事例から前提条件を取得
  const handleLoadPastCases = useCallback(async () => {
    if (isLoadingPastCases) return;

    setIsLoadingPastCases(true);
    try {
      const response = await api.getPastPreconditions(purpose, 5);
      setPastCases(response.entries);
      setShowPastCases(true);
    } catch (err) {
      console.error("過去事例の取得に失敗:", err);
    } finally {
      setIsLoadingPastCases(false);
    }
  }, [purpose, isLoadingPastCases]);

  // Phase 6: 過去事例の前提条件を現在の条件にマージ
  const handleApplyPastCase = useCallback((entry: PastPreconditionEntry) => {
    // 過去事例の条件を現在の条件にマージ
    setConditions(prev => {
      const updated = [...prev];
      for (const pastCond of entry.preconditions.conditions) {
        const existingIndex = updated.findIndex(c => c.category === pastCond.category);
        if (existingIndex >= 0) {
          // 既存のカテゴリがある場合は詳細をマージ
          if (pastCond.detail && !updated[existingIndex].detail) {
            updated[existingIndex] = {
              ...updated[existingIndex],
              detail: pastCond.detail,
              isSelected: true,
            };
          }
        } else {
          // 新しいカテゴリの場合は追加
          updated.push({
            id: pastCond.id,
            label: pastCond.label,
            category: pastCond.category,
            description: pastCond.description,
            isSelected: true,
            detail: pastCond.detail,
          });
        }
      }
      return updated;
    });

    // 補足条件もマージ
    if (entry.preconditions.additionalContext) {
      setAdditionalContext(prev => {
        if (prev.includes(entry.preconditions.additionalContext!)) {
          return prev;
        }
        return prev ? `${prev}\n${entry.preconditions.additionalContext}` : entry.preconditions.additionalContext!;
      });
    }

    // 適用後はリストを閉じる
    setShowPastCases(false);
  }, []);

  // Escキーで閉じる
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  // 何か入力があれば確定可能（制約は全て必須だが詳細入力は任意）
  const canConfirm = conditions.length > 0 || additionalContext.trim().length > 0;

  return (
    <div className="precondition-modal-overlay">
      <div className="precondition-modal">
        {/* ヘッダー */}
        <div className="precondition-modal__header">
          <h2 className="precondition-modal__title">良い決定のための前提条件</h2>
          <button
            type="button"
            className="precondition-modal__close"
            onClick={onClose}
            aria-label="閉じる"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* 目的の表示 */}
        <div className="precondition-modal__purpose">
          <span className="precondition-modal__purpose-label">目的:</span>
          <span className="precondition-modal__purpose-text">{purpose}</span>
        </div>

        {/* 説明 */}
        <p className="precondition-modal__description">
          以下の制約は全て満たす必要があります。詳細を入力すると検索キーとして使用されます。
        </p>

        {/* 条件リスト */}
        <div className="precondition-modal__content">
          <div className="precondition-modal__section">
            <div className="precondition-modal__section-header">
              <span className="precondition-modal__section-title">必ず守る制約</span>
              <span className="precondition-modal__section-hint">
                詳細を入力すると検索キーになります
              </span>
            </div>
            <ul className="precondition-modal__list">
              {conditions.map(c => (
                <li
                  key={c.id}
                  className={`precondition-modal__condition-row ${
                    c.detail?.trim()
                      ? "precondition-modal__condition-row--active"
                      : ""
                  }`}
                >
                  <div className="precondition-modal__condition-left">
                    <span className="precondition-modal__condition-name">{c.label}</span>
                  </div>
                  <div className="precondition-modal__condition-right">
                    <input
                      type="text"
                      className="precondition-modal__detail-input"
                      placeholder={`例: ${getPlaceholder(c.category)}`}
                      value={c.detail ?? ""}
                      onChange={(e) => handleDetailChange(c.id, e.target.value)}
                    />
                  </div>
                </li>
              ))}
              {conditions.length === 0 && (
                <li className="precondition-modal__empty">
                  制約が設定されていません
                </li>
              )}
            </ul>
          </div>

          {/* 確認質問（暗黙条件引き出し） */}
          {(clarificationQuestions.length > 0 || isLoadingQuestions) && (
            <div className="precondition-modal__section precondition-modal__section--questions">
              <div className="precondition-modal__section-header">
                <span className="precondition-modal__section-title">確認質問</span>
                <span className="precondition-modal__section-hint">
                  より良い提案のために
                </span>
              </div>
              {isLoadingQuestions ? (
                <div className="precondition-modal__loading">
                  <span className="precondition-modal__loading-spinner" />
                  質問を生成中...
                </div>
              ) : (
                <ul className="precondition-modal__questions">
                  {clarificationQuestions.map(q => {
                    const isFreeText = q.answerType === "free_text";
                    return (
                      <li key={q.id} className="precondition-modal__question">
                        <div className="precondition-modal__question-text">
                          {q.question}
                          {q.reason && (
                            <span className="precondition-modal__question-reason">
                              {q.reason}
                            </span>
                          )}
                        </div>
                        {isFreeText ? (
                          /* 記述式の場合 */
                          <input
                            type="text"
                            className="precondition-modal__question-freetext"
                            placeholder={q.placeholder ?? "回答を入力..."}
                            value={answers[q.id]?.detail ?? ""}
                            onChange={(e) => handleAnswerChange(q.id, e.target.value || "skip", e.target.value)}
                          />
                        ) : (
                          /* はい/いいえ形式の場合 */
                          <>
                            <div className="precondition-modal__question-actions">
                              <button
                                type="button"
                                className={`precondition-modal__answer-btn ${
                                  answers[q.id]?.answer === "yes" ? "precondition-modal__answer-btn--active" : ""
                                }`}
                                onClick={() => handleAnswerChange(q.id, "yes")}
                              >
                                はい
                              </button>
                              <button
                                type="button"
                                className={`precondition-modal__answer-btn ${
                                  answers[q.id]?.answer === "no" ? "precondition-modal__answer-btn--active" : ""
                                }`}
                                onClick={() => handleAnswerChange(q.id, "no")}
                              >
                                いいえ
                              </button>
                              <button
                                type="button"
                                className={`precondition-modal__answer-btn precondition-modal__answer-btn--skip ${
                                  answers[q.id]?.answer === "skip" ? "precondition-modal__answer-btn--active" : ""
                                }`}
                                onClick={() => handleAnswerChange(q.id, "skip")}
                              >
                                スキップ
                              </button>
                            </div>
                            {/* 「はい」の場合に詳細入力欄を表示 */}
                            {answers[q.id]?.answer === "yes" && (
                              <input
                                type="text"
                                className="precondition-modal__question-detail"
                                placeholder="詳細があれば入力..."
                                value={answers[q.id]?.detail ?? ""}
                                onChange={(e) => handleAnswerChange(q.id, "yes", e.target.value)}
                              />
                            )}
                          </>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {/* Phase 6: 過去事例から反映 */}
          <div className="precondition-modal__section precondition-modal__section--past-cases">
            <div className="precondition-modal__section-header">
              <span className="precondition-modal__section-title">過去事例から反映</span>
              <button
                type="button"
                className="precondition-modal__past-cases-btn"
                onClick={handleLoadPastCases}
                disabled={isLoadingPastCases}
              >
                {isLoadingPastCases ? (
                  <span className="precondition-modal__loading-spinner" />
                ) : (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 8v4l3 3" />
                    <circle cx="12" cy="12" r="10" />
                  </svg>
                )}
                {isLoadingPastCases ? "読込中..." : "過去事例を検索"}
              </button>
            </div>
            {showPastCases && (
              <div className="precondition-modal__past-cases-list">
                {pastCases.length === 0 ? (
                  <p className="precondition-modal__past-cases-empty">
                    類似の過去事例が見つかりませんでした
                  </p>
                ) : (
                  <ul className="precondition-modal__past-cases-items">
                    {pastCases.map((entry) => (
                      <li key={entry.sessionId} className="precondition-modal__past-case-item">
                        <div className="precondition-modal__past-case-info">
                          <span className="precondition-modal__past-case-purpose">
                            {entry.purpose.length > 40 ? entry.purpose.slice(0, 40) + "..." : entry.purpose}
                          </span>
                          <span className="precondition-modal__past-case-meta">
                            類似度: {entry.similarity}% ・ {new Date(entry.createdAt).toLocaleDateString("ja-JP")}
                          </span>
                          <span className="precondition-modal__past-case-conditions">
                            {entry.preconditions.conditions.filter(c => c.detail).map(c => c.detail).join(", ")}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="precondition-modal__apply-btn"
                          onClick={() => handleApplyPastCase(entry)}
                        >
                          反映
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* 補足条件 */}
          <div className="precondition-modal__section precondition-modal__section--additional">
            <div className="precondition-modal__section-header">
              <span className="precondition-modal__section-title">補足条件</span>
              <span className="precondition-modal__section-hint">任意</span>
            </div>
            <textarea
              className="precondition-modal__additional-textarea"
              placeholder="その他の条件や制約があれば入力..."
              value={additionalContext}
              onChange={(e) => setAdditionalContext(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        {/* フッター */}
        <div className="precondition-modal__footer">
          <button
            type="button"
            className="precondition-modal__cancel-btn"
            onClick={onClose}
          >
            キャンセル
          </button>
          <button
            type="button"
            className="precondition-modal__confirm-btn"
            onClick={handleConfirm}
            disabled={!canConfirm}
          >
            この前提条件で開始
          </button>
        </div>
      </div>
    </div>
  );
}
