"use client"
/**
 * ClarificationPanel
 *
 * LLMが追加情報を必要とする場合に表示されるインラインパネル
 * 質問に回答すると選択肢が再生成される
 */

import { useState, useCallback } from "react";

type ClarificationPanelProps = {
  questions: string[];
  onSubmit: (answers: Array<{ question: string; answer: string }>) => void;
  onCancel: () => void;
  isLoading: boolean;
};

export function ClarificationPanel({
  questions,
  onSubmit,
  onCancel,
  isLoading,
}: ClarificationPanelProps) {
  const [answers, setAnswers] = useState<Record<number, string>>({});

  const handleAnswerChange = useCallback((index: number, value: string) => {
    setAnswers((prev) => ({ ...prev, [index]: value }));
  }, []);

  const handleSubmit = useCallback(() => {
    const formattedAnswers = questions.map((question, index) => ({
      question,
      answer: answers[index]?.trim() || "",
    }));

    // 少なくとも1つの回答が必要
    if (formattedAnswers.some((a) => a.answer)) {
      onSubmit(formattedAnswers.filter((a) => a.answer));
    }
  }, [questions, answers, onSubmit]);

  const hasAnyAnswer = Object.values(answers).some((a) => a?.trim());

  return (
    <div className="dn-clarification">
      <div className="dn-clarification__header">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
          <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
        <span>追加情報が必要です</span>
      </div>

      <div className="dn-clarification__body">
        <p className="dn-clarification__description">
          より適切な選択肢を提案するために、以下の質問にお答えください。
        </p>

        <div className="dn-clarification__questions">
          {questions.map((question, index) => (
            <div key={index} className="dn-clarification__question">
              <label className="dn-clarification__label">
                <span className="dn-clarification__number">{index + 1}.</span>
                {question}
              </label>
              <textarea
                className="dn-clarification__input"
                value={answers[index] || ""}
                onChange={(e) => handleAnswerChange(index, e.target.value)}
                placeholder="回答を入力してください..."
                rows={2}
                disabled={isLoading}
              />
            </div>
          ))}
        </div>
      </div>

      <div className="dn-clarification__footer">
        <button
          type="button"
          className="dn-clarification__cancel-btn"
          onClick={onCancel}
          disabled={isLoading}
        >
          スキップ
        </button>
        <button
          type="button"
          className="dn-clarification__submit-btn"
          onClick={handleSubmit}
          disabled={!hasAnyAnswer || isLoading}
        >
          {isLoading ? (
            <>
              <span className="dn-clarification__spinner" />
              送信中...
            </>
          ) : (
            "回答を送信"
          )}
        </button>
      </div>
    </div>
  );
}
