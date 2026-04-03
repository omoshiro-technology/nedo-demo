"use client"
/**
 * 確認質問カード
 *
 * 過去の判断事例から抽出された確認質問を表示
 * デモストーリーの「選ぶと次の問いが出る」シーンを実現
 */

import { useState } from "react";
import type {
  DecisionCaseQuestion,
  QuestionAnswer,
} from "../../api/decisionCase";

type DecisionQuestionsCardProps = {
  /** 事例タイトル */
  caseTitle: string;
  /** 質問リスト */
  questions: DecisionCaseQuestion[];
  /** 回答完了時のコールバック */
  onComplete?: (answers: QuestionAnswer[]) => void;
  /** スキップ時のコールバック */
  onSkip?: () => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
};

export function DecisionQuestionsCard({
  caseTitle,
  questions,
  onComplete,
  onSkip,
  isDisabled = false,
}: DecisionQuestionsCardProps) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [currentIndex, setCurrentIndex] = useState(0);

  const currentQuestion = questions[currentIndex];
  const requiredQuestions = questions.filter((q) => q.required);
  const answeredRequired = requiredQuestions.filter(
    (q) => answers[q.id]
  ).length;

  const isLastQuestion = currentIndex === questions.length - 1;

  const handleAnswer = (questionId: string, answer: string, autoAdvance = false) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }));
    // 選択肢クリック時は自動的に次へ進む（最後の質問以外）
    // 最後の質問では「判断傾向を見る」ボタンを有効化して明示的に確定させる
    if (autoAdvance && !isLastQuestion) {
      setTimeout(() => {
        setCurrentIndex((prev) => prev + 1);
      }, 150); // 少し遅延させて選択されたことを視覚的に確認できるようにする
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handlePrev = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    }
  };

  const handleComplete = () => {
    if (!onComplete) return;
    const questionAnswers: QuestionAnswer[] = Object.entries(answers).map(
      ([questionId, answer]) => ({
        questionId,
        answer,
        answeredAt: new Date().toISOString(),
      })
    );
    onComplete(questionAnswers);
  };

  // 完了条件: 必須質問がすべて回答済み、かつ最後の質問にも回答済み
  const lastQuestion = questions[questions.length - 1];
  const isLastQuestionAnswered = lastQuestion && !!answers[lastQuestion.id];
  const canComplete = answeredRequired === requiredQuestions.length && isLastQuestionAnswered;

  // 無効化状態の場合は完了表示
  if (isDisabled) {
    return (
      <div className="decision-questions-card decision-questions-card--disabled">
        <div className="decision-questions-card__header">
          <span className="decision-questions-card__icon">✅</span>
          <span className="decision-questions-card__title">
            質問に回答しました
          </span>
        </div>
        <div className="decision-questions-card__case-ref">
          参照: {caseTitle}
        </div>
        <div className="decision-questions-card__status">
          回答済み: {Object.keys(answers).length} / {questions.length} 件
        </div>
      </div>
    );
  }

  return (
    <div className="decision-questions-card">
      <div className="decision-questions-card__header">
        <span className="decision-questions-card__icon">🔍</span>
        <span className="decision-questions-card__title">
          事例の判断を適用するには、以下を確認してください
        </span>
      </div>

      <div className="decision-questions-card__case-ref">
        参照: {caseTitle}
      </div>

      <div className="decision-questions-card__progress">
        <div className="decision-questions-card__progress-text">
          質問 {currentIndex + 1} / {questions.length}
          {requiredQuestions.length > 0 && (
            <span className="decision-questions-card__required-count">
              （必須: {answeredRequired}/{requiredQuestions.length}）
            </span>
          )}
        </div>
        <div className="decision-questions-card__progress-bar">
          <div
            className="decision-questions-card__progress-fill"
            style={{
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            }}
          />
        </div>
      </div>

      {currentQuestion && (
        <div className="decision-questions-card__question">
          <div className="decision-questions-card__question-header">
            <span className="decision-questions-card__question-category">
              {getCategoryLabel(currentQuestion.category)}
            </span>
            {currentQuestion.required && (
              <span className="decision-questions-card__required-badge">
                必須
              </span>
            )}
          </div>

          <div className="decision-questions-card__question-text">
            {currentQuestion.text}
          </div>

          {currentQuestion.options ? (
            <div className="decision-questions-card__options">
              {currentQuestion.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`decision-questions-card__option ${
                    answers[currentQuestion.id] === option
                      ? "decision-questions-card__option--selected"
                      : ""
                  }`}
                  onClick={() => handleAnswer(currentQuestion.id, option, true)}
                >
                  {option}
                </button>
              ))}
            </div>
          ) : (
            <input
              type="text"
              className="decision-questions-card__input"
              value={answers[currentQuestion.id] || ""}
              onChange={(e) => handleAnswer(currentQuestion.id, e.target.value, false)}
              placeholder="回答を入力..."
            />
          )}
        </div>
      )}

      <div className="decision-questions-card__nav">
        <button
          type="button"
          className="decision-questions-card__nav-btn"
          onClick={handlePrev}
          disabled={currentIndex === 0}
        >
          ← 前へ
        </button>

        {currentIndex < questions.length - 1 ? (
          <button
            type="button"
            className="decision-questions-card__nav-btn decision-questions-card__nav-btn--primary"
            onClick={handleNext}
          >
            次へ →
          </button>
        ) : (
          <button
            type="button"
            className="decision-questions-card__nav-btn decision-questions-card__nav-btn--complete"
            onClick={handleComplete}
            disabled={!canComplete}
          >
            判断傾向を見る
          </button>
        )}
      </div>

      {onSkip && (
        <div className="decision-questions-card__skip">
          <button
            type="button"
            className="decision-questions-card__skip-btn"
            onClick={onSkip}
          >
            質問をスキップして自分で判断する
          </button>
        </div>
      )}

      <div className="decision-questions-card__hint">
        💡 この質問は、過去のベテランが判断時に確認していた項目です
      </div>
    </div>
  );
}

function getCategoryLabel(
  category: DecisionCaseQuestion["category"]
): string {
  switch (category) {
    case "context":
      return "📋 条件確認";
    case "risk":
      return "⚠️ リスク確認";
    case "tradeoff":
      return "⚖️ トレードオフ";
    case "boundary":
      return "🔲 制約確認";
    default:
      return "❓ 確認事項";
  }
}
