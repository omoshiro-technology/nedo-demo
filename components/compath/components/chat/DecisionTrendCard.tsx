"use client"
/**
 * 判断傾向カード
 *
 * 過去の熟達者の判断傾向を表示し、意思決定ナビへ誘導
 * デモストーリーの「過去の熟達者の判断構造に照らすと」を実現
 */

import type { DecisionTrend, RelatedKnowledgeRef } from "../../api/decisionCase";

type DecisionTrendCardProps = {
  /** 判断傾向 */
  trend: DecisionTrend;
  /** 関連知見 */
  relatedKnowledge?: RelatedKnowledgeRef[];
  /** 意思決定ナビを開くコールバック */
  onLaunchDecisionNavigator?: () => void;
  /** やり直すコールバック */
  onRetry?: () => void;
  /** 無効化状態（操作済み） */
  isDisabled?: boolean;
};

export function DecisionTrendCard({
  trend,
  relatedKnowledge,
  onLaunchDecisionNavigator,
  onRetry,
  isDisabled = false,
}: DecisionTrendCardProps) {
  return (
    <div className={`decision-trend-card${isDisabled ? " decision-trend-card--disabled" : ""}`}>
      <div className="decision-trend-card__header">
        <span className="decision-trend-card__icon">📊</span>
        <span className="decision-trend-card__title">過去の判断傾向</span>
      </div>

      <div className="decision-trend-card__content">
        <div className="decision-trend-card__trend-text">
          似た条件のとき、先輩たちは
          <br />
          <strong>【{trend.mostChosen}】</strong>を
          <br />
          選ぶことが多かったようです。
        </div>

        {trend.note && (
          <div className="decision-trend-card__note">
            📝 {trend.note}
          </div>
        )}
      </div>

      {relatedKnowledge && relatedKnowledge.length > 0 && (
        <div className="decision-trend-card__related">
          <div className="decision-trend-card__related-header">
            ⚠️ 追加検討事項
          </div>
          <div className="decision-trend-card__related-text">
            以下の知見も参考にしてください：
          </div>
          <ul className="decision-trend-card__related-list">
            {relatedKnowledge.map((ref) => (
              <li key={ref.id} className="decision-trend-card__related-item">
                📖 {ref.label || ref.id}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="decision-trend-card__disclaimer">
        <span className="decision-trend-card__disclaimer-icon">💡</span>
        <span className="decision-trend-card__disclaimer-text">
          これはあくまで参考情報です。
          <br />
          今の状況に合わせて判断してください。
        </span>
      </div>

      <div className="decision-trend-card__actions">
        {isDisabled ? (
          <div className="decision-trend-card__status">
            ↓ 前提条件を確認中です。チャットで回答してください。
          </div>
        ) : (
          <>
            <button
              type="button"
              className="decision-trend-card__btn decision-trend-card__btn--primary"
              onClick={onLaunchDecisionNavigator}
              disabled={!onLaunchDecisionNavigator}
            >
              意思決定ナビで判断を整理する
            </button>
            {onRetry && (
              <button
                type="button"
                className="decision-trend-card__btn decision-trend-card__btn--secondary"
                onClick={onRetry}
              >
                条件を変えて再検討
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
