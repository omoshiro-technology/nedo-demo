"use client"
/**
 * 判断事例カード
 *
 * 類似の過去判断事例を表示するコンパクトなリスト行
 * Phase 10: 冗長な詳細を削除し、各行に「この例を参考」ボタン配置
 */

import type { DecisionCaseSearchItem } from "../../api/decisionCase";

type DecisionCaseRowProps = {
  /** 検索結果の事例 */
  caseItem: DecisionCaseSearchItem;
  /** この事例を参考にするボタンのコールバック */
  onSelectCase?: (caseItem: DecisionCaseSearchItem) => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
  /** 表示順（1, 2, 3...） */
  rank?: number;
};

/**
 * コンパクトなリスト行形式の事例表示
 * タイトル + メタ情報 + 類似度 + ボタン
 */
export function DecisionCaseRow({
  caseItem,
  onSelectCase,
  isDisabled = false,
  rank,
}: DecisionCaseRowProps) {
  return (
    <div className={`decision-case-row${isDisabled ? " decision-case-row--disabled" : ""}`}>
      <div className="decision-case-row__info">
        {rank && <span className="decision-case-row__rank">#{rank}</span>}
        <span className="decision-case-row__title">{caseItem.title}</span>
        <div className="decision-case-row__meta">
          {caseItem.metadata.plantName && (
            <span className="decision-case-row__meta-item">
              {caseItem.metadata.plantName}
            </span>
          )}
          {caseItem.metadata.year && (
            <span className="decision-case-row__meta-item">
              {caseItem.metadata.year}年
            </span>
          )}
          <span className="decision-case-row__similarity">
            {Math.round(caseItem.similarity * 100)}%
          </span>
        </div>
      </div>
      <button
        type="button"
        className="decision-case-row__btn"
        onClick={() => onSelectCase?.(caseItem)}
        disabled={isDisabled || !onSelectCase}
      >
        この例を参考
      </button>
    </div>
  );
}

// 後方互換性のため旧コンポーネントも残す（使用箇所がある場合）
type DecisionCaseCardProps = {
  /** 検索結果の事例 */
  caseItem: DecisionCaseSearchItem;
  /** この事例を参考にするボタンのコールバック */
  onSelectCase?: (caseItem: DecisionCaseSearchItem) => void;
  /** 折りたたみ状態 */
  isCollapsed?: boolean;
  /** 折りたたみトグル */
  onToggleCollapse?: () => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
};

export function DecisionCaseCard({
  caseItem,
  onSelectCase,
  isDisabled = false,
}: DecisionCaseCardProps) {
  // Phase 10: コンパクトな行形式に変更
  return (
    <DecisionCaseRow
      caseItem={caseItem}
      onSelectCase={onSelectCase}
      isDisabled={isDisabled}
    />
  );
}

/**
 * 複数の判断事例を表示するリスト
 * Phase 10: 上位5件をコンパクトなリスト形式で表示
 */
type DecisionCaseListProps = {
  /** 検索結果リスト */
  results: DecisionCaseSearchItem[];
  /** 事例選択コールバック */
  onSelectCase?: (caseItem: DecisionCaseSearchItem) => void;
  /** 表示件数（デフォルト5件） */
  maxShowCount?: number;
  /** 過去事例を使わずに進むコールバック */
  onSkipCases?: () => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
};

export function DecisionCaseList({
  results,
  onSelectCase,
  maxShowCount = 5,
  onSkipCases,
  isDisabled = false,
}: DecisionCaseListProps) {
  // 類似度順にソート済みと仮定、上位N件を表示
  const visibleResults = results.slice(0, maxShowCount);
  const totalCount = results.length;

  return (
    <div className={`decision-case-list${isDisabled ? " decision-case-list--disabled" : ""}`}>
      <div className="decision-case-list__header">
        <span className="decision-case-list__title">
          類似度の高い過去事例（{Math.min(totalCount, maxShowCount)}件）
        </span>
      </div>

      <div className="decision-case-list__rows">
        {visibleResults.map((item, index) => (
          <DecisionCaseRow
            key={item.id}
            caseItem={item}
            onSelectCase={onSelectCase}
            isDisabled={isDisabled}
            rank={index + 1}
          />
        ))}
      </div>

      {!isDisabled && onSkipCases && (
        <div className="decision-case-list__footer">
          <button
            type="button"
            className="decision-case-list__skip-btn"
            onClick={onSkipCases}
          >
            過去事例を参照せずに進む
          </button>
        </div>
      )}
    </div>
  );
}
