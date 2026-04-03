"use client"
/**
 * ArtifactCardFooter - 成果物カードのフッター部品
 *
 * アクションボタン:
 * - 採用: status → accepted
 * - 修正依頼: 入力欄表示→修正指示を会話に追加
 * - 詳細を開く（オプション）: 右パネル or 全画面モードへ
 */

import { useState } from "react";
import type { ArtifactStatus } from "../../types/artifact";

type ArtifactCardFooterProps = {
  status: ArtifactStatus;
  onAccept?: () => void;
  onRevise?: (instruction: string) => void;
  onOpenDetail?: () => void;
  detailButtonLabel?: string;
};

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function EditIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
      <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
    </svg>
  );
}

function ExternalLinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  );
}

export function ArtifactCardFooter({
  status,
  onAccept,
  onRevise,
  onOpenDetail,
  detailButtonLabel = "詳細を開く",
}: ArtifactCardFooterProps) {
  const [isReviseMode, setIsReviseMode] = useState(false);
  const [reviseInstruction, setReviseInstruction] = useState("");

  const handleReviseSubmit = () => {
    if (reviseInstruction.trim() && onRevise) {
      onRevise(reviseInstruction.trim());
      setReviseInstruction("");
      setIsReviseMode(false);
    }
  };

  const handleReviseCancel = () => {
    setReviseInstruction("");
    setIsReviseMode(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      handleReviseSubmit();
    } else if (e.key === "Escape") {
      handleReviseCancel();
    }
  };

  return (
    <div className="artifact-card-footer">
      {isReviseMode ? (
        <div className="artifact-card-footer__revise-form">
          <textarea
            className="artifact-card-footer__revise-input"
            placeholder="修正内容を入力してください..."
            value={reviseInstruction}
            onChange={(e) => setReviseInstruction(e.target.value)}
            onKeyDown={handleKeyDown}
            rows={2}
            autoFocus
          />
          <div className="artifact-card-footer__revise-actions">
            <button
              className="artifact-card-footer__btn artifact-card-footer__btn--secondary"
              onClick={handleReviseCancel}
            >
              キャンセル
            </button>
            <button
              className="artifact-card-footer__btn artifact-card-footer__btn--primary"
              onClick={handleReviseSubmit}
              disabled={!reviseInstruction.trim()}
            >
              送信
            </button>
          </div>
          <span className="artifact-card-footer__hint">Ctrl+Enter で送信</span>
        </div>
      ) : (
        <div className="artifact-card-footer__actions">
          {status === "draft" && onAccept && (
            <button
              className="artifact-card-footer__btn artifact-card-footer__btn--accept"
              onClick={onAccept}
            >
              <CheckIcon />
              <span>採用</span>
            </button>
          )}

          {onRevise && (
            <button
              className="artifact-card-footer__btn artifact-card-footer__btn--revise"
              onClick={() => setIsReviseMode(true)}
            >
              <EditIcon />
              <span>{status === "accepted" ? "再検討" : "修正依頼"}</span>
            </button>
          )}

          {onOpenDetail && (
            <button
              className="artifact-card-footer__btn artifact-card-footer__btn--detail"
              onClick={onOpenDetail}
            >
              <ExternalLinkIcon />
              <span>{detailButtonLabel}</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}
