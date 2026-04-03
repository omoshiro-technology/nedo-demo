"use client"
/**
 * ThinkingBoxView - 思考ボックスビューコンポーネント
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * 再帰的な思考ボックスを表示。
 * 条件選択後に次の思考ボックスが生成される。
 */

import type {
  ThinkingBox,
  ConditionOption,
  CandidateValue,
  GoalCompassState,
  GoalDistanceCalculation,
} from "../../types/decisionNavigator";
import { ConditionCard } from "./ConditionCard";
import { GoalCompass } from "./GoalCompass";

type ThinkingBoxViewProps = {
  thinkingBox: ThinkingBox;
  compassState: GoalCompassState;
  goalDistance?: GoalDistanceCalculation;
  onSelectCondition: (condition: ConditionOption) => void;
  isLoading?: boolean;
};

export function ThinkingBoxView({
  thinkingBox,
  compassState,
  goalDistance,
  onSelectCondition,
  isLoading = false,
}: ThinkingBoxViewProps) {
  const { columns, parentConditions, remainingCandidates, depth, isTerminal, terminationReason } = thinkingBox;

  // 終端状態
  if (isTerminal) {
    return (
      <div className="thinking-box thinking-box--terminal">
        <div className="thinking-box__terminal">
          <div className="thinking-box__terminal-icon">🎯</div>
          <h3 className="thinking-box__terminal-title">決定完了</h3>
          <p className="thinking-box__terminal-reason">{terminationReason}</p>
          {remainingCandidates.length === 1 && (
            <div className="thinking-box__terminal-value">
              <span className="thinking-box__terminal-value-label">決定値:</span>
              <span className="thinking-box__terminal-value-text">
                {remainingCandidates[0].value}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 全ての列の条件を統合
  const allConditions = [
    ...columns.contextual,
    ...columns.experiential,
    ...columns.inferred,
  ];

  const hasConditions = allConditions.length > 0;

  return (
    <div className={`thinking-box thinking-box--depth-${depth}`}>
      {/* ヘッダー */}
      <div className="thinking-box__header">
        <div className="thinking-box__header-left">
          <span className="thinking-box__depth-badge">深さ {depth}</span>
          <span className="thinking-box__candidates-count">
            残り候補: {remainingCandidates.filter(c => !c.isEliminated).length}件
          </span>
        </div>
        <GoalCompass
          compassState={compassState}
          goalDistance={goalDistance}
          remainingCandidates={remainingCandidates}
        />
      </div>

      {/* 選択済み条件の履歴 */}
      {parentConditions.length > 0 && (
        <div className="thinking-box__history">
          <h4 className="thinking-box__history-title">選択済みの条件</h4>
          <div className="thinking-box__history-list">
            {parentConditions.map((condition) => (
              <div key={condition.id} className="thinking-box__history-item">
                <span className="thinking-box__history-check">✓</span>
                <span className="thinking-box__history-label">{condition.label}</span>
                <span className="thinking-box__history-category">{condition.category}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 三列構造 */}
      {hasConditions ? (
        <div className="thinking-box__columns">
          {/* 文脈から抽出した条件 */}
          {columns.contextual.length > 0 && (
            <div className="thinking-box__column thinking-box__column--contextual">
              <h4 className="thinking-box__column-title">
                <span className="thinking-box__column-icon">📋</span>
                文脈から
              </h4>
              <div className="thinking-box__column-cards">
                {columns.contextual.map((condition) => (
                  <ConditionCard
                    key={condition.id}
                    condition={condition}
                    onSelect={onSelectCondition}
                    isDisabled={isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* 過去事例から抽出した条件 */}
          {columns.experiential.length > 0 && (
            <div className="thinking-box__column thinking-box__column--experiential">
              <h4 className="thinking-box__column-title">
                <span className="thinking-box__column-icon">📚</span>
                過去事例から
              </h4>
              <div className="thinking-box__column-cards">
                {columns.experiential.map((condition) => (
                  <ConditionCard
                    key={condition.id}
                    condition={condition}
                    onSelect={onSelectCondition}
                    isDisabled={isLoading}
                  />
                ))}
              </div>
            </div>
          )}

          {/* LLMが推論した条件 */}
          {columns.inferred.length > 0 && (
            <div className="thinking-box__column thinking-box__column--inferred">
              <h4 className="thinking-box__column-title">
                <span className="thinking-box__column-icon">🤖</span>
                AI推論
              </h4>
              <div className="thinking-box__column-cards">
                {columns.inferred.map((condition) => (
                  <ConditionCard
                    key={condition.id}
                    condition={condition}
                    onSelect={onSelectCondition}
                    isDisabled={isLoading}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="thinking-box__empty">
          <p>追加の条件がありません。候補値から選択してください。</p>
        </div>
      )}

      {/* 候補値一覧（詳細表示） */}
      <div className="thinking-box__candidates">
        <h4 className="thinking-box__candidates-title">候補値</h4>
        <div className="thinking-box__candidates-grid">
          {remainingCandidates
            .filter((c) => !c.isEliminated)
            .sort((a, b) => b.score - a.score)
            .map((candidate, idx) => (
              <CandidateCard
                key={candidate.id}
                candidate={candidate}
                rank={idx + 1}
                isTop={idx === 0}
              />
            ))}
        </div>

        {/* 枝刈りされた候補 */}
        {remainingCandidates.filter((c) => c.isEliminated).length > 0 && (
          <details className="thinking-box__eliminated">
            <summary>
              枝刈りされた候補 ({remainingCandidates.filter((c) => c.isEliminated).length})
            </summary>
            <div className="thinking-box__eliminated-list">
              {remainingCandidates
                .filter((c) => c.isEliminated)
                .map((candidate) => (
                  <div key={candidate.id} className="thinking-box__eliminated-item">
                    <span className="thinking-box__eliminated-value">{candidate.value}</span>
                    <span className="thinking-box__eliminated-reason">
                      {candidate.eliminationReason}
                    </span>
                  </div>
                ))}
            </div>
          </details>
        )}
      </div>

      {/* ローディングオーバーレイ */}
      {isLoading && (
        <div className="thinking-box__loading">
          <div className="thinking-box__loading-spinner" />
          <p>条件を処理中...</p>
        </div>
      )}
    </div>
  );
}

/**
 * 候補値カード
 */
type CandidateCardProps = {
  candidate: CandidateValue;
  rank: number;
  isTop?: boolean;
};

function CandidateCard({ candidate, rank, isTop = false }: CandidateCardProps) {
  return (
    <div className={`candidate-card ${isTop ? "candidate-card--top" : ""}`}>
      <div className="candidate-card__header">
        <span className="candidate-card__rank">#{rank}</span>
        <span className="candidate-card__value">{candidate.value}</span>
        <span className="candidate-card__score">{candidate.score}点</span>
      </div>
      <p className="candidate-card__rationale">{candidate.rationale}</p>

      {/* 満たす条件 */}
      {candidate.satisfiedConditions.length > 0 && (
        <div className="candidate-card__conditions candidate-card__conditions--satisfied">
          <span className="candidate-card__conditions-label">✓ 満たす条件:</span>
          <div className="candidate-card__conditions-tags">
            {candidate.satisfiedConditions.map((condId, idx) => (
              <span key={idx} className="candidate-card__condition-tag">
                {condId}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* 満たさない条件 */}
      {candidate.unsatisfiedConditions.length > 0 && (
        <div className="candidate-card__conditions candidate-card__conditions--unsatisfied">
          <span className="candidate-card__conditions-label">✗ 満たさない条件:</span>
          <div className="candidate-card__conditions-tags">
            {candidate.unsatisfiedConditions.map((condId, idx) => (
              <span key={idx} className="candidate-card__condition-tag">
                {condId}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
