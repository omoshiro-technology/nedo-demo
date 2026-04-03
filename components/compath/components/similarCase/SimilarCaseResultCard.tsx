"use client"
/**
 * 類似事例検索の結果カード
 * Phase 28+: 過去の類似事例を参照
 */

import { useState, useCallback } from "react";
import type { SimilarCase, SimilarCaseSearchResult } from "../../types/similarCase";
import { EQUIPMENT_TYPE_LABELS } from "../../types/similarCase";
import { INDUSTRY_LABELS, KPI_PRIORITY_LABELS } from "../../types/proposal";

type SimilarCaseResultCardProps = {
  result: SimilarCaseSearchResult;
  onUseCaseForProposal?: (caseData: SimilarCase) => void;
};

/** 個別の事例カード */
function CaseCard({
  caseData,
  isExpanded,
  onToggle,
  onUseForProposal,
}: {
  caseData: SimilarCase;
  isExpanded: boolean;
  onToggle: () => void;
  onUseForProposal?: () => void;
}) {
  return (
    <div className={`similar-case-card ${isExpanded ? "similar-case-card--expanded" : ""}`}>
      <div className="similar-case-card__header" onClick={onToggle}>
        <div className="similar-case-card__title-row">
          <span className="similar-case-card__score">
            {caseData.similarityScore}%
          </span>
          <h5 className="similar-case-card__title">{caseData.title}</h5>
          <span className="similar-case-card__toggle">
            {isExpanded ? "▼" : "▶"}
          </span>
        </div>
        <div className="similar-case-card__meta">
          <span className="similar-case-card__tag">
            {INDUSTRY_LABELS[caseData.industry]}
          </span>
          <span className="similar-case-card__tag">
            {EQUIPMENT_TYPE_LABELS[caseData.equipmentType]}
          </span>
          <span className="similar-case-card__tag similar-case-card__tag--kpi">
            {KPI_PRIORITY_LABELS[caseData.kpiPriority].label}
          </span>
          <span className="similar-case-card__year">{caseData.metadata.year}年</span>
        </div>
        <p className="similar-case-card__summary">{caseData.summary}</p>
      </div>

      {isExpanded && (
        <div className="similar-case-card__body">
          {/* マッチ理由 */}
          <div className="similar-case-card__match-reasons">
            <span className="similar-case-card__match-label">マッチ理由:</span>
            {caseData.matchReasons.map((reason, i) => (
              <span key={i} className="similar-case-card__match-tag">
                {reason}
              </span>
            ))}
          </div>

          {/* 背景 */}
          <div className="similar-case-card__section">
            <h6 className="similar-case-card__section-title">背景・課題</h6>
            <p className="similar-case-card__section-content">{caseData.background}</p>
          </div>

          {/* 採用した解決策 */}
          <div className="similar-case-card__section">
            <h6 className="similar-case-card__section-title">
              採用した解決策: {caseData.adoptedSolution.name}
            </h6>
            <p className="similar-case-card__section-content">
              {caseData.adoptedSolution.description}
            </p>
          </div>

          {/* 検討した他の選択肢 */}
          {caseData.otherOptions && caseData.otherOptions.length > 0 && (
            <div className="similar-case-card__section">
              <h6 className="similar-case-card__section-title">検討した他の選択肢</h6>
              <div className="similar-case-card__other-options">
                {caseData.otherOptions.map((opt, i) => (
                  <div key={i} className="similar-case-card__other-option">
                    <span className="similar-case-card__option-name">{opt.name}</span>
                    <span className="similar-case-card__option-reason">
                      不採用理由: {opt.notAdoptedReason}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 成果・効果 */}
          <div className="similar-case-card__section">
            <h6 className="similar-case-card__section-title">成果・効果</h6>
            <ul className="similar-case-card__list">
              {caseData.outcomes.map((outcome, i) => (
                <li key={i}>{outcome}</li>
              ))}
            </ul>
          </div>

          {/* 教訓・学び */}
          <div className="similar-case-card__section similar-case-card__section--lessons">
            <h6 className="similar-case-card__section-title">💡 教訓・学び</h6>
            <ul className="similar-case-card__list similar-case-card__list--lessons">
              {caseData.lessons.map((lesson, i) => (
                <li key={i}>{lesson}</li>
              ))}
            </ul>
          </div>

          {/* メタ情報 */}
          <div className="similar-case-card__metadata">
            {caseData.metadata.region && (
              <span>地域: {caseData.metadata.region}</span>
            )}
            {caseData.metadata.scale && (
              <span>規模: {caseData.metadata.scale}</span>
            )}
            {caseData.metadata.projectDuration && (
              <span>期間: {caseData.metadata.projectDuration}</span>
            )}
          </div>

          {/* アクションボタン */}
          {onUseForProposal && (
            <div className="similar-case-card__actions">
              <button
                type="button"
                className="similar-case-card__action-btn"
                onClick={onUseForProposal}
              >
                この事例を参考に提案書を作成
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function SimilarCaseResultCard({
  result,
  onUseCaseForProposal,
}: SimilarCaseResultCardProps) {
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    // 最初の1件は展開状態
    new Set(result.cases.length > 0 ? [result.cases[0].id] : [])
  );

  const handleToggle = useCallback((id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  if (result.cases.length === 0) {
    return (
      <div className="similar-case-result-card similar-case-result-card--empty">
        <div className="similar-case-result-card__header">
          <span className="similar-case-result-card__icon">🔍</span>
          <h4 className="similar-case-result-card__title">類似事例検索結果</h4>
        </div>
        <div className="similar-case-result-card__empty">
          <p>条件に合う類似事例が見つかりませんでした。</p>
          <p>検索条件を変更してお試しください。</p>
        </div>
      </div>
    );
  }

  return (
    <div className="similar-case-result-card">
      <div className="similar-case-result-card__header">
        <span className="similar-case-result-card__icon">🔍</span>
        <h4 className="similar-case-result-card__title">
          類似事例検索結果
          <span className="similar-case-result-card__count">
            {result.totalCount}件
          </span>
        </h4>
      </div>

      <div className="similar-case-result-card__body">
        <p className="similar-case-result-card__hint">
          類似度の高い順に表示しています。詳細を見るには事例をクリックしてください。
        </p>

        <div className="similar-case-result-card__list">
          {result.cases.map((caseData) => (
            <CaseCard
              key={caseData.id}
              caseData={caseData}
              isExpanded={expandedIds.has(caseData.id)}
              onToggle={() => handleToggle(caseData.id)}
              onUseForProposal={
                onUseCaseForProposal
                  ? () => onUseCaseForProposal(caseData)
                  : undefined
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
