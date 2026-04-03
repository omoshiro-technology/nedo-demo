"use client"
/**
 * 意思決定ナビ再開カード
 *
 * 途中で閉じた場合に再開を提案するカード
 * - 新規: 同じテーマで最初からやり直す
 * - 再開: 途中から続ける（現状は準備中）
 * - 終了: カードを閉じる
 */

import type { DecisionNavigatorResume } from "../../types/chat";

type DecisionNavigatorResumeCardProps = {
  resume: DecisionNavigatorResume;
  /** 新規で始める（同じテーマで最初から） */
  onStartNew: () => void;
  /** 終了（カードを閉じる） */
  onDismiss: () => void;
};

export function DecisionNavigatorResumeCard({
  resume,
  onStartNew,
  onDismiss,
}: DecisionNavigatorResumeCardProps) {
  return (
    <div className="dn-resume-card">
      <div className="dn-resume-card__header">
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
        <span className="dn-resume-card__title">意思決定ナビを中断しました</span>
      </div>

      <div className="dn-resume-card__body">
        <div className="dn-resume-card__purpose">
          <span className="dn-resume-card__label">テーマ:</span>
          <span>{resume.purpose}</span>
        </div>
        <div className="dn-resume-card__status">
          <span className="dn-resume-card__label">状態:</span>
          <span className={`dn-resume-card__badge ${resume.isDecided ? "dn-resume-card__badge--decided" : "dn-resume-card__badge--undecided"}`}>
            {resume.isDecided ? "決定済み" : "未決定"}
          </span>
        </div>
        {!resume.isDecided && resume.lastSelection && (
          <div className="dn-resume-card__last">
            <span className="dn-resume-card__label">最後の選択:</span>
            <span>{resume.lastSelection}</span>
          </div>
        )}
      </div>

      <div className="dn-resume-card__actions">
        {/* 再開ボタン（現在は準備中） */}
        <button
          type="button"
          className="dn-resume-card__btn dn-resume-card__btn--disabled"
          disabled
          title="この機能は準備中です"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
          再開
        </button>
        {/* 新規ボタン（同じテーマで最初から） */}
        <button
          type="button"
          className="dn-resume-card__btn dn-resume-card__btn--primary"
          onClick={onStartNew}
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <polyline points="1 4 1 10 7 10" />
            <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
          </svg>
          新規
        </button>
        {/* 終了ボタン */}
        <button
          type="button"
          className="dn-resume-card__btn dn-resume-card__btn--tertiary"
          onClick={onDismiss}
        >
          終了
        </button>
      </div>
    </div>
  );
}
