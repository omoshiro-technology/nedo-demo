"use client"
/**
 * PastCasePanel - 過去の類似判断パネル
 * Phase 9: 過去の類似判断の表示・詳細参照
 *
 * 上半分のエリアに配置され、過去の類似判断の一覧と
 * 選択した判断の詳細（判断理由）を表示する
 */

import { useState } from "react";
import type { PastCaseReference } from "../../types/decisionNavigator";

type PastCasePanelProps = {
  cases: PastCaseReference[];
  onSelectCase?: (caseId: string) => void;
  isLoading?: boolean;
  /** 表示する最大件数（デフォルト: 3） */
  maxDisplayCount?: number;
};

export function PastCasePanel({
  cases,
  onSelectCase,
  isLoading = false,
  maxDisplayCount = 3,
}: PastCasePanelProps) {
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null);

  const selectedCase = cases.find((c) => c.id === selectedCaseId);

  // 表示件数を制限（スクロールで全件見られる）
  const displayCases = cases;

  const handleCaseClick = (caseId: string) => {
    setSelectedCaseId(caseId);
    onSelectCase?.(caseId);
  };

  if (isLoading) {
    return (
      <div className="past-case-panel past-case-panel--loading">
        <div className="past-case-panel__spinner" />
        <span>過去の類似判断を検索中...</span>
      </div>
    );
  }

  return (
    <div className="past-case-panel past-case-panel--horizontal">
      {/* 左: 過去事例一覧 */}
      <div className="past-case-panel__list">
        <div className="past-case-panel__list-header">
          <span className="past-case-panel__icon">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
              <polyline points="14 2 14 8 20 8" />
              <line x1="16" y1="13" x2="8" y2="13" />
              <line x1="16" y1="17" x2="8" y2="17" />
              <polyline points="10 9 9 9 8 9" />
            </svg>
          </span>
          <span className="past-case-panel__title">過去の類似判断</span>
          <span className="past-case-panel__count">{cases.length}件</span>
        </div>
        <div className="past-case-panel__items past-case-panel__items--scrollable">
          {cases.length === 0 ? (
            <div className="past-case-panel__empty">
              <p>類似する過去の判断が見つかりませんでした</p>
            </div>
          ) : (
            displayCases.map((caseItem) => (
              <button
                key={caseItem.id}
                type="button"
                className={`past-case-panel__item ${selectedCaseId === caseItem.id ? "past-case-panel__item--selected" : ""}`}
                onClick={() => handleCaseClick(caseItem.id)}
              >
                <div className="past-case-panel__item-row">
                  <span className="past-case-panel__case-number">{caseItem.caseNumber}</span>
                  <span className="past-case-panel__summary">{caseItem.summary}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      {/* 右: 選択した事例の詳細 */}
      <div className="past-case-panel__detail">
        {selectedCase ? (
          <PastCaseDetail caseData={selectedCase} />
        ) : (
          <div className="past-case-panel__detail-placeholder">
            <p>左の一覧から判断を選択すると、詳細が表示されます</p>
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * 過去の類似判断詳細表示
 * Phase 26: 構造化カード形式に変更
 * - フロー形式を廃止し、全情報を一覧表示
 * - クリック不要で判断軸・選択・理由を確認可能
 * - 最終結果への導線を明確化
 */
type PastCaseDetailProps = {
  caseData: PastCaseReference;
};

function PastCaseDetail({ caseData }: PastCaseDetailProps) {
  return (
    <div className="past-case-detail past-case-detail--structured">
      {/* ヘッダー: 工番と目的 */}
      <div className="past-case-detail__header-card">
        <div className="past-case-detail__header-top">
          <span className="past-case-detail__case-badge">{caseData.caseNumber}</span>
        </div>
        <p className="past-case-detail__purpose-text">{caseData.purpose}</p>
      </div>

      {/* 最終結果（目立つ表示） */}
      <div className="past-case-detail__result-card">
        <div className="past-case-detail__result-label">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <span>最終結果</span>
        </div>
        <p className="past-case-detail__result-value">{caseData.outcome}</p>
      </div>

      {/* 判断プロセス（全展開） */}
      <div className="past-case-detail__decisions">
        <div className="past-case-detail__decisions-header">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>この結果に至った判断プロセス</span>
        </div>
        <div className="past-case-detail__decisions-list">
          {caseData.decisions.map((decision, index) => (
            <div key={decision.criteriaId} className="past-case-detail__decision-item">
              {/* ステップ番号 */}
              <div className="past-case-detail__step-indicator">
                <span className="past-case-detail__step-number">{index + 1}</span>
                {index < caseData.decisions.length - 1 && (
                  <div className="past-case-detail__step-line" />
                )}
              </div>
              {/* 判断内容 */}
              <div className="past-case-detail__decision-content">
                <div className="past-case-detail__criteria-label">{decision.criteriaLabel}</div>
                <div className="past-case-detail__selected-value">{decision.selectedOption}</div>
                {decision.rationale && (
                  <div className="past-case-detail__rationale-inline">
                    <span className="past-case-detail__rationale-icon">💡</span>
                    <span>{decision.rationale}</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

