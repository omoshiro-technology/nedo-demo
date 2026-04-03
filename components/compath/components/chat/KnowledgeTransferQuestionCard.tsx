"use client"
/**
 * 技術伝承デモ: 条件収集カード
 *
 * 3つの質問を一度に表示し、各質問の下に選択ボタンを配置
 * 最後に「これで回答」ボタン
 */

import { useState } from "react";
import type { KnowledgeTransferConditions } from "../../types/chat";
import { useDemoScenario } from "../../data/DemoScenarioContext";

type Props = {
  onSubmit: (conditions: KnowledgeTransferConditions) => void;
  disabled?: boolean;
};

export function KnowledgeTransferQuestionCard({ onSubmit, disabled }: Props) {
  const { scenario } = useDemoScenario();
  const QUESTIONS = scenario.knowledgeTransferQuestions;
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [otherInputs, setOtherInputs] = useState<Record<string, string>>({});
  const [showOther, setShowOther] = useState<Record<string, boolean>>({});

  const handleSelect = (questionId: string, value: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: value }));
    // 「その他」以外を選択したら、その他入力をクリア
    if (value !== "other") {
      setShowOther((prev) => ({ ...prev, [questionId]: false }));
      setOtherInputs((prev) => {
        const next = { ...prev };
        delete next[questionId];
        return next;
      });
    }
  };

  const handleOtherClick = (questionId: string) => {
    setSelections((prev) => ({ ...prev, [questionId]: "other" }));
    setShowOther((prev) => ({ ...prev, [questionId]: true }));
  };

  const handleOtherInput = (questionId: string, value: string) => {
    setOtherInputs((prev) => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = () => {
    const conditions: KnowledgeTransferConditions = {};

    // 各質問の回答を変換
    // ユーザーが明示的に選択した項目のみ含める（未選択・その他は含めない）
    for (const q of QUESTIONS) {
      const selected = selections[q.id];
      if (selected && selected !== "other") {
        // 通常の選択肢（low, medium, high, strict, moderate, flexible, tight, standard, ample）
        (conditions as Record<string, string>)[q.id] = selected;
      }
      // 未選択または「その他」の場合は条件に含めない（ナビで表示されない）
    }

    onSubmit(conditions);
  };

  // 少なくとも1つ選択されているか
  const hasAnySelection = Object.keys(selections).length > 0;

  return (
    <div className={`kt-question-card${disabled ? " kt-question-card--disabled" : ""}`}>
      <div className="kt-question-card__questions">
        {QUESTIONS.map((q) => (
          <div key={q.id} className="kt-question-card__question">
            <div className="kt-question-card__question-header">
              <span className="kt-question-card__question-title">{q.title}</span>
              <span className="kt-question-card__question-text">{q.question}</span>
            </div>

            <div className="kt-question-card__options">
              {q.options.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  className={`kt-question-card__option${selections[q.id] === opt.value ? " kt-question-card__option--selected" : ""}`}
                  onClick={() => handleSelect(q.id, opt.value)}
                  disabled={disabled}
                >
                  <span className="kt-question-card__option-label">{opt.label}</span>
                  <span className="kt-question-card__option-desc">{opt.description}</span>
                </button>
              ))}
              <button
                type="button"
                className={`kt-question-card__option kt-question-card__option--other${selections[q.id] === "other" ? " kt-question-card__option--selected" : ""}`}
                onClick={() => handleOtherClick(q.id)}
                disabled={disabled}
              >
                <span className="kt-question-card__option-label">その他</span>
              </button>
            </div>

            {showOther[q.id] && (
              <input
                type="text"
                className="kt-question-card__other-input"
                placeholder="具体的な条件を入力..."
                value={otherInputs[q.id] || ""}
                onChange={(e) => handleOtherInput(q.id, e.target.value)}
                disabled={disabled}
              />
            )}

            <div className="kt-question-card__intent">
              ※ {q.intent}
            </div>
          </div>
        ))}
      </div>

      <div className="kt-question-card__actions">
        <button
          type="button"
          className="kt-question-card__submit"
          onClick={handleSubmit}
          disabled={disabled || !hasAnySelection}
        >
          これで回答
        </button>
      </div>
    </div>
  );
}
