"use client"
import type { DecisionFlowNode, DecisionLevel, RiskLevel } from "../../types/decisionNavigator";

type NodeDetailPanelProps = {
  node: DecisionFlowNode | null;
  isLoading: boolean;
};

const LEVEL_LABELS: Record<DecisionLevel, string> = {
  strategy: "大方針",
  tactic: "戦術",
  action: "アクション",
  "sub-action": "詳細アクション",
  followup: "フォローアップ",
};

const RISK_LABELS: Record<RiskLevel, { label: string; className: string }> = {
  high: { label: "高リスク", className: "dn-detail__risk--high" },
  medium: { label: "中リスク", className: "dn-detail__risk--medium" },
  low: { label: "低リスク", className: "dn-detail__risk--low" },
};

/** リスク戦略のラベル */
const RISK_STRATEGY_LABELS: Record<string, string> = {
  avoid: "リスク回避",
  mitigate: "リスク軽減",
  transfer: "リスク移転",
  accept: "リスク受容",
};

export function NodeDetailPanel({ node, isLoading }: NodeDetailPanelProps) {
  if (!node) {
    return (
      <div className="dn-detail dn-detail--empty">
        <div className="dn-detail__placeholder">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <p>選択肢をクリックで選択</p>
          <p className="dn-detail__hint">選択済みノードをクリックで戻る</p>
        </div>
      </div>
    );
  }

  // リスクがlowの場合は表示しない（リスクがない場合）
  const showRisk = node.riskLevel && node.riskLevel !== "low";
  const riskInfo = showRisk ? RISK_LABELS[node.riskLevel!] : null;

  // 推奨根拠の取得（structuredRationale または recommendationReason）
  const rationale = node.structuredRationale?.summary || node.recommendationReason;
  const riskStrategy = node.riskStrategy ? RISK_STRATEGY_LABELS[node.riskStrategy] : null;

  return (
    <div className="dn-detail">
      <div className="dn-detail__header">
        <span className="dn-detail__level-badge">{LEVEL_LABELS[node.level]}</span>
        <h3 className="dn-detail__title">{node.label}</h3>
      </div>

      {node.description && (
        <p className="dn-detail__description">{node.description}</p>
      )}

      {/* 選ぶべき理由・根拠 */}
      {rationale && (
        <div className="dn-detail__rationale">
          <h4 className="dn-detail__rationale-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
            選ぶべき理由
          </h4>
          <p className="dn-detail__rationale-content">{rationale}</p>
          {riskStrategy && (
            <span className="dn-detail__strategy-badge">{riskStrategy}</span>
          )}
        </div>
      )}

      <div className="dn-detail__metrics">
        {/* リスク（high/mediumの場合のみ表示） */}
        {riskInfo && (
          <div className="dn-detail__metric">
            <span className="dn-detail__metric-label">リスク</span>
            <span className={`dn-detail__risk ${riskInfo.className}`}>
              {riskInfo.label}
            </span>
          </div>
        )}
      </div>

      {/* リスク詳細（riskDetailがある場合） */}
      {showRisk && node.riskDetail && (
        <div className="dn-detail__risk-detail">
          <h4 className="dn-detail__section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            リスク詳細
          </h4>
          <div className="dn-detail__risk-detail-content">
            <p><strong>対象リスク:</strong> {node.riskDetail.targetRisk}</p>
            <p><strong>この選択の効果:</strong> {node.riskDetail.howThisHelps}</p>
            {node.riskDetail.residualRisk && (
              <p><strong>残存リスク:</strong> {node.riskDetail.residualRisk}</p>
            )}
          </div>
        </div>
      )}

      {/* 過去事例 */}
      {node.pastCases && node.pastCases.length > 0 && (
        <div className="dn-detail__section">
          <h4 className="dn-detail__section-title">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
            </svg>
            関連する過去事例 ({node.pastCases.length}件)
          </h4>
          <ul className="dn-detail__past-cases">
            {node.pastCases.slice(0, 3).map((pastCase) => (
              <li key={pastCase.id} className="dn-detail__past-case">
                <div className="dn-detail__past-case-content">
                  {pastCase.content}
                </div>
                <div className="dn-detail__past-case-meta">
                  <span>{pastCase.sourceFileName}</span>
                  <span>{pastCase.similarity}% 類似</span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* ローディング表示 */}
      {isLoading && (
        <div className="dn-detail__loading-overlay">
          <span className="dn-detail__spinner" />
          <span>処理中...</span>
        </div>
      )}

      {/* 現在の選択表示 */}
      {node.status === "selected" && (
        <div className="dn-detail__current-badge">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          現在地
        </div>
      )}
    </div>
  );
}
