"use client"
/**
 * ExecutionResultForm
 *
 * 実行結果を記録するフォーム
 * - ステータスの更新
 * - 成果の記録
 * - 振り返りの入力
 */

import { useState } from "react";

// 型定義（Web側で使用）
type ExecutionStatus = "not_started" | "in_progress" | "completed" | "failed" | "cancelled" | "blocked";
type OutcomeEvaluation = "exceeded" | "met" | "partial" | "not_met";

type ExecutionOutcome = {
  evaluation: OutcomeEvaluation;
  actualResult: string;
  gapFromExpectation?: string;
  achievementRate?: number;
  issuesEncountered?: string[];
  unexpectedFindings?: string[];
};

type Retrospective = {
  whatWentWell: string[];
  whatCouldBeBetter: string[];
  suggestions: string[];
  decisionValidity: {
    wasCorrectDecision: boolean;
    reasoning: string;
    wouldChangeIf?: string;
  };
};

type ExecutionResultFormProps = {
  itemId: string;
  itemTitle: string;
  currentStatus: ExecutionStatus;
  onSubmit: (data: {
    status: ExecutionStatus;
    outcome?: ExecutionOutcome;
    retrospective?: Retrospective;
  }) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
};

/** ステータスのラベル */
const STATUS_OPTIONS: Array<{ value: ExecutionStatus; label: string; icon: string }> = [
  { value: "not_started", label: "未着手", icon: "○" },
  { value: "in_progress", label: "進行中", icon: "◐" },
  { value: "completed", label: "完了", icon: "●" },
  { value: "failed", label: "失敗", icon: "×" },
  { value: "cancelled", label: "キャンセル", icon: "—" },
  { value: "blocked", label: "ブロック中", icon: "!" },
];

/** 評価のラベル */
const EVALUATION_OPTIONS: Array<{ value: OutcomeEvaluation; label: string; description: string }> = [
  { value: "exceeded", label: "期待以上", description: "目標を上回る成果" },
  { value: "met", label: "目標達成", description: "期待通りの成果" },
  { value: "partial", label: "部分達成", description: "一部のみ達成" },
  { value: "not_met", label: "未達成", description: "目標に届かず" },
];

export function ExecutionResultForm({
  itemId,
  itemTitle,
  currentStatus,
  onSubmit,
  onCancel,
  isSubmitting = false,
}: ExecutionResultFormProps) {
  // フォーム状態
  const [status, setStatus] = useState<ExecutionStatus>(currentStatus);
  const [showOutcome, setShowOutcome] = useState(currentStatus === "completed" || currentStatus === "failed");
  const [showRetrospective, setShowRetrospective] = useState(false);

  // Outcome状態
  const [evaluation, setEvaluation] = useState<OutcomeEvaluation>("met");
  const [actualResult, setActualResult] = useState("");
  const [gapFromExpectation, setGapFromExpectation] = useState("");
  const [achievementRate, setAchievementRate] = useState<number>(100);
  const [issuesEncountered, setIssuesEncountered] = useState("");
  const [unexpectedFindings, setUnexpectedFindings] = useState("");

  // Retrospective状態
  const [whatWentWell, setWhatWentWell] = useState("");
  const [whatCouldBeBetter, setWhatCouldBeBetter] = useState("");
  const [suggestions, setSuggestions] = useState("");
  const [wasCorrectDecision, setWasCorrectDecision] = useState(true);
  const [decisionReasoning, setDecisionReasoning] = useState("");
  const [wouldChangeIf, setWouldChangeIf] = useState("");

  // ステータス変更時の処理
  const handleStatusChange = (newStatus: ExecutionStatus) => {
    setStatus(newStatus);
    if (newStatus === "completed" || newStatus === "failed") {
      setShowOutcome(true);
    }
  };

  // 送信処理
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const data: {
      status: ExecutionStatus;
      outcome?: ExecutionOutcome;
      retrospective?: Retrospective;
    } = { status };

    // Outcomeがある場合
    if (showOutcome && actualResult.trim()) {
      data.outcome = {
        evaluation,
        actualResult: actualResult.trim(),
        gapFromExpectation: gapFromExpectation.trim() || undefined,
        achievementRate,
        issuesEncountered: issuesEncountered.trim()
          ? issuesEncountered.split("\n").filter(Boolean)
          : undefined,
        unexpectedFindings: unexpectedFindings.trim()
          ? unexpectedFindings.split("\n").filter(Boolean)
          : undefined,
      };
    }

    // Retrospectiveがある場合
    if (showRetrospective) {
      data.retrospective = {
        whatWentWell: whatWentWell.trim()
          ? whatWentWell.split("\n").filter(Boolean)
          : [],
        whatCouldBeBetter: whatCouldBeBetter.trim()
          ? whatCouldBeBetter.split("\n").filter(Boolean)
          : [],
        suggestions: suggestions.trim()
          ? suggestions.split("\n").filter(Boolean)
          : [],
        decisionValidity: {
          wasCorrectDecision,
          reasoning: decisionReasoning.trim(),
          wouldChangeIf: wouldChangeIf.trim() || undefined,
        },
      };
    }

    onSubmit(data);
  };

  return (
    <form className="erf" onSubmit={handleSubmit}>
      {/* ヘッダー */}
      <div className="erf__header">
        <h3 className="erf__title">実行結果を記録</h3>
        <p className="erf__item-title">{itemTitle}</p>
      </div>

      {/* ステータス選択 */}
      <div className="erf__section">
        <label className="erf__label">ステータス</label>
        <div className="erf__status-grid">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              type="button"
              className={`erf__status-btn ${status === option.value ? "erf__status-btn--active" : ""} erf__status-btn--${option.value}`}
              onClick={() => handleStatusChange(option.value)}
            >
              <span className="erf__status-icon">{option.icon}</span>
              <span className="erf__status-label">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* 成果記録（完了または失敗時） */}
      {showOutcome && (
        <div className="erf__section erf__section--outcome">
          <div className="erf__section-header">
            <h4 className="erf__section-title">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
              成果の記録
            </h4>
          </div>

          {/* 評価 */}
          <div className="erf__field">
            <label className="erf__label">評価</label>
            <div className="erf__evaluation-grid">
              {EVALUATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  className={`erf__eval-btn ${evaluation === option.value ? "erf__eval-btn--active" : ""} erf__eval-btn--${option.value}`}
                  onClick={() => setEvaluation(option.value)}
                >
                  <span className="erf__eval-label">{option.label}</span>
                  <span className="erf__eval-desc">{option.description}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 実際の成果 */}
          <div className="erf__field">
            <label className="erf__label">実際の成果 *</label>
            <textarea
              className="erf__textarea"
              value={actualResult}
              onChange={(e) => setActualResult(e.target.value)}
              placeholder="何が達成されましたか？"
              rows={3}
              required
            />
          </div>

          {/* 達成率 */}
          <div className="erf__field">
            <label className="erf__label">達成率: {achievementRate}%</label>
            <input
              type="range"
              className="erf__range"
              min={0}
              max={100}
              value={achievementRate}
              onChange={(e) => setAchievementRate(Number(e.target.value))}
            />
          </div>

          {/* ギャップ */}
          <div className="erf__field">
            <label className="erf__label">期待との差異</label>
            <textarea
              className="erf__textarea"
              value={gapFromExpectation}
              onChange={(e) => setGapFromExpectation(e.target.value)}
              placeholder="期待と実際の結果の差は？"
              rows={2}
            />
          </div>

          {/* 発生した問題 */}
          <div className="erf__field">
            <label className="erf__label">発生した問題（1行1項目）</label>
            <textarea
              className="erf__textarea"
              value={issuesEncountered}
              onChange={(e) => setIssuesEncountered(e.target.value)}
              placeholder="問題があれば記入"
              rows={2}
            />
          </div>

          {/* 予想外の発見 */}
          <div className="erf__field">
            <label className="erf__label">予想外の発見（1行1項目）</label>
            <textarea
              className="erf__textarea"
              value={unexpectedFindings}
              onChange={(e) => setUnexpectedFindings(e.target.value)}
              placeholder="新しい発見があれば記入"
              rows={2}
            />
          </div>
        </div>
      )}

      {/* 振り返りセクション（オプション） */}
      <div className="erf__section">
        <button
          type="button"
          className="erf__toggle-btn"
          onClick={() => setShowRetrospective(!showRetrospective)}
        >
          <svg
            className={`erf__toggle-icon ${showRetrospective ? "erf__toggle-icon--expanded" : ""}`}
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
          <span>振り返りを追加</span>
        </button>

        {showRetrospective && (
          <div className="erf__retrospective">
            {/* うまくいったこと */}
            <div className="erf__field">
              <label className="erf__label erf__label--good">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                </svg>
                うまくいったこと（1行1項目）
              </label>
              <textarea
                className="erf__textarea"
                value={whatWentWell}
                onChange={(e) => setWhatWentWell(e.target.value)}
                placeholder="成功要因を記録"
                rows={2}
              />
            </div>

            {/* 改善点 */}
            <div className="erf__field">
              <label className="erf__label erf__label--improve">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
                改善できること（1行1項目）
              </label>
              <textarea
                className="erf__textarea"
                value={whatCouldBeBetter}
                onChange={(e) => setWhatCouldBeBetter(e.target.value)}
                placeholder="次回への改善点"
                rows={2}
              />
            </div>

            {/* 提案 */}
            <div className="erf__field">
              <label className="erf__label">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
                </svg>
                次回への提案（1行1項目）
              </label>
              <textarea
                className="erf__textarea"
                value={suggestions}
                onChange={(e) => setSuggestions(e.target.value)}
                placeholder="提案があれば記入"
                rows={2}
              />
            </div>

            {/* 判断の妥当性 */}
            <div className="erf__field">
              <label className="erf__label">この判断は正しかったか？</label>
              <div className="erf__decision-validity">
                <label className="erf__radio-label">
                  <input
                    type="radio"
                    name="decision-validity"
                    checked={wasCorrectDecision}
                    onChange={() => setWasCorrectDecision(true)}
                  />
                  <span>はい</span>
                </label>
                <label className="erf__radio-label">
                  <input
                    type="radio"
                    name="decision-validity"
                    checked={!wasCorrectDecision}
                    onChange={() => setWasCorrectDecision(false)}
                  />
                  <span>いいえ</span>
                </label>
              </div>
            </div>

            <div className="erf__field">
              <label className="erf__label">理由</label>
              <textarea
                className="erf__textarea"
                value={decisionReasoning}
                onChange={(e) => setDecisionReasoning(e.target.value)}
                placeholder="なぜそう思いますか？"
                rows={2}
              />
            </div>

            {!wasCorrectDecision && (
              <div className="erf__field">
                <label className="erf__label">もし変えるなら？</label>
                <textarea
                  className="erf__textarea"
                  value={wouldChangeIf}
                  onChange={(e) => setWouldChangeIf(e.target.value)}
                  placeholder="次回はどうしますか？"
                  rows={2}
                />
              </div>
            )}
          </div>
        )}
      </div>

      {/* アクションボタン */}
      <div className="erf__actions">
        <button
          type="button"
          className="erf__btn erf__btn--cancel"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          キャンセル
        </button>
        <button
          type="submit"
          className="erf__btn erf__btn--submit"
          disabled={isSubmitting || (showOutcome && !actualResult.trim())}
        >
          {isSubmitting ? "保存中..." : "保存"}
        </button>
      </div>
    </form>
  );
}
