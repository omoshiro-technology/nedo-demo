"use client"
/**
 * ThreeColumnLayout - 三列レイアウトコンポーネント
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * 初期画面の三列構造を表示:
 * - 左列: 今回の特殊事情（ユーザー入力から抽出）
 * - 中央列: 過去事例（類似案件を自動検索）
 * - 右列: LLM推奨（条件から候補を推論）
 */

import type {
  InitialLayout,
  ConditionOption,
  PastCaseCondition,
} from "../../types/decisionNavigator";
import { ConditionCard } from "./ConditionCard";

type ThreeColumnLayoutProps = {
  layout: InitialLayout;
  onSelectCondition: (condition: ConditionOption) => void;
  isLoading?: boolean;
};

export function ThreeColumnLayout({ layout, onSelectCondition, isLoading = false }: ThreeColumnLayoutProps) {
  const { columns } = layout;

  return (
    <div className="three-column-layout">
      {/* 左列: 今回の特殊事情 */}
      <div className="three-column-layout__column three-column-layout__column--special">
        <div className="three-column-layout__header">
          <span className="three-column-layout__header-icon">📋</span>
          <h3 className="three-column-layout__title">{columns.specialCircumstances.title}</h3>
          <span className="three-column-layout__source">
            {columns.specialCircumstances.source === "user_input" && "入力から抽出"}
            {columns.specialCircumstances.source === "document" && "文書から抽出"}
            {columns.specialCircumstances.source === "chat_context" && "会話から抽出"}
          </span>
        </div>
        <div className="three-column-layout__cards">
          {columns.specialCircumstances.items.length > 0 ? (
            columns.specialCircumstances.items.map((condition) => (
              <ConditionCard
                key={condition.id}
                condition={condition}
                onSelect={onSelectCondition}
                isDisabled={isLoading}
              />
            ))
          ) : (
            <div className="three-column-layout__empty">
              <p>特殊事情は検出されませんでした</p>
            </div>
          )}
        </div>
      </div>

      {/* 中央列: 過去事例 */}
      <div className="three-column-layout__column three-column-layout__column--past">
        <div className="three-column-layout__header">
          <span className="three-column-layout__header-icon">📚</span>
          <h3 className="three-column-layout__title">{columns.pastCases.title}</h3>
          <span className="three-column-layout__count">
            {columns.pastCases.totalMatches}件
          </span>
        </div>
        <div className="three-column-layout__cards">
          {columns.pastCases.items.length > 0 ? (
            columns.pastCases.items.map((pastCase) => (
              <PastCaseCard
                key={pastCase.caseId}
                pastCase={pastCase}
                onSelect={onSelectCondition}
                isDisabled={isLoading}
              />
            ))
          ) : (
            <div className="three-column-layout__empty">
              <p>類似の過去事例は見つかりませんでした</p>
            </div>
          )}
        </div>
      </div>

      {/* 右列: LLM推奨 */}
      <div className="three-column-layout__column three-column-layout__column--llm">
        <div className="three-column-layout__header">
          <span className="three-column-layout__header-icon">🤖</span>
          <h3 className="three-column-layout__title">{columns.llmRecommendations.title}</h3>
        </div>
        {columns.llmRecommendations.rationale && (
          <div className="three-column-layout__rationale">
            <p>{columns.llmRecommendations.rationale}</p>
          </div>
        )}
        <div className="three-column-layout__cards">
          {columns.llmRecommendations.items.length > 0 ? (
            columns.llmRecommendations.items.map((condition) => (
              <ConditionCard
                key={condition.id}
                condition={condition}
                onSelect={onSelectCondition}
                isDisabled={isLoading}
              />
            ))
          ) : (
            <div className="three-column-layout__empty">
              <p>推奨条件を生成中...</p>
            </div>
          )}
        </div>
      </div>

      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className="three-column-layout__loading">
          <div className="three-column-layout__loading-spinner" />
          <p>条件を処理中...</p>
        </div>
      )}
    </div>
  );
}

/**
 * 過去事例カード
 */
type PastCaseCardProps = {
  pastCase: PastCaseCondition;
  onSelect: (condition: ConditionOption) => void;
  isDisabled?: boolean;
};

function PastCaseCard({ pastCase, onSelect, isDisabled = false }: PastCaseCardProps) {
  const handleClick = () => {
    if (!isDisabled && !pastCase.condition.isSelected) {
      onSelect(pastCase.condition);
    }
  };

  return (
    <div
      className={`past-case-card ${pastCase.condition.isSelected ? "past-case-card--selected" : ""} ${isDisabled ? "past-case-card--disabled" : ""}`}
      onClick={handleClick}
      role="button"
      tabIndex={isDisabled ? -1 : 0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
    >
      {/* 事例サマリー */}
      <div className="past-case-card__summary">
        <span className="past-case-card__icon">📁</span>
        <p>{pastCase.caseSummary}</p>
      </div>

      {/* 結果値（あれば） */}
      {pastCase.outcomeValue && (
        <div className="past-case-card__outcome">
          <span className="past-case-card__outcome-label">採用値:</span>
          <span className="past-case-card__outcome-value">{pastCase.outcomeValue}</span>
        </div>
      )}

      {/* 条件カード */}
      <div className="past-case-card__condition">
        <ConditionCard
          condition={pastCase.condition}
          onSelect={onSelect}
          isDisabled={isDisabled}
        />
      </div>

      {/* 選択済みインジケーター */}
      {pastCase.condition.isSelected && (
        <div className="past-case-card__selected-indicator">
          <span>✓</span> 選択済み
        </div>
      )}
    </div>
  );
}
