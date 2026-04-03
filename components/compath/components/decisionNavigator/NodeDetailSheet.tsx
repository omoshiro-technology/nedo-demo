"use client"
/**
 * ノード詳細サイドシート
 * - モーダルではなく、右サイドにスライドインする形式
 * - ノードの詳細情報を表示
 * - 選択理由のプリセットチップ
 * - 熟達者思考の判断プロパティ表示（Phase X）
 */

import { useState, useCallback } from "react";
import type {
  DecisionFlowNode,
  RiskStrategy,
  RiskCategory,
} from "../../types/decisionNavigator";
import { DecisionPropertyPanel } from "./expertThinking/DecisionPropertyPanel";
import { NODE_DETAIL_SHEET, RISK_LABELS } from "../../constants/philosophy";

type NodeDetailSheetProps = {
  node: DecisionFlowNode | null;
  isOpen: boolean;
  onClose: () => void;
  onSelect: (nodeId: string, rationale?: string) => void;
  isSelectable: boolean; // available ノードの場合のみ選択可能
};

/** リスク戦略のラベルと説明（定数ファイルから参照） */
const RISK_STRATEGY_INFO: Record<RiskStrategy, { label: string; description: string }> = RISK_LABELS.strategies;

/** リスク種別のラベル（定数ファイルから参照） */
const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = RISK_LABELS.categories;

/**
 * デフォルトプリセット（バックエンドからプリセットが来ない場合のフォールバック）
 * 通常はバックエンドから動的生成されたプリセットを使用する
 */
const DEFAULT_RATIONALE_PRESETS = [
  { id: "quality", label: "品質確保", category: "qcdes" as const, priority: 80 },
  { id: "cost", label: "コスト最適", category: "qcdes" as const, priority: 70 },
  { id: "delivery", label: "納期遵守", category: "qcdes" as const, priority: 75 },
  { id: "safety", label: "安全確保", category: "qcdes" as const, priority: 90 },
];

/** 確度を星表示に変換 */
function renderConfidenceStars(confidence: number): string {
  const filledCount = Math.ceil(confidence / 20);
  const filled = Math.min(filledCount, 5);
  const empty = 5 - filled;
  return "★".repeat(filled) + "☆".repeat(empty);
}

export function NodeDetailSheet({
  node,
  isOpen,
  onClose,
  onSelect,
  isSelectable,
}: NodeDetailSheetProps) {
  const [selectedRationales, setSelectedRationales] = useState<string[]>([]);
  const [customRationale, setCustomRationale] = useState("");
  const [isPropertyExpanded, setIsPropertyExpanded] = useState(true);

  const handleRationaleToggle = useCallback((id: string) => {
    setSelectedRationales((prev) =>
      prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]
    );
  }, []);

  const handleSelect = useCallback(() => {
    if (!node) return;

    // バックエンドから動的生成されたプリセット、またはデフォルトを使用
    const presets = node.rationalePresets ?? DEFAULT_RATIONALE_PRESETS;

    // 選択理由を結合
    const rationaleLabels = selectedRationales
      .map((id) => presets.find((p) => p.id === id)?.label)
      .filter(Boolean);

    if (customRationale.trim()) {
      rationaleLabels.push(customRationale.trim());
    }

    const rationale = rationaleLabels.length > 0 ? rationaleLabels.join("・") : undefined;

    onSelect(node.id, rationale);

    // 状態をリセット
    setSelectedRationales([]);
    setCustomRationale("");
  }, [node, selectedRationales, customRationale, onSelect]);

  if (!node) return null;

  return (
    <div className={`dn-detail-sheet ${isOpen ? "dn-detail-sheet--open" : ""}`}>
      {/* ヘッダー */}
      <div className="dn-detail-sheet__header">
        <h3 className="dn-detail-sheet__title">{node.label}</h3>
        <button
          type="button"
          className="dn-detail-sheet__close"
          onClick={onClose}
          aria-label="閉じる"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 6L6 18M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* コンテンツ */}
      <div className="dn-detail-sheet__content">
        {/* 説明文 */}
        {node.description && (
          <div className="dn-detail-sheet__section">
            <h4 className="dn-detail-sheet__section-title">{NODE_DETAIL_SHEET.SECTION_TITLES.overview}</h4>
            <p className="dn-detail-sheet__description">{node.description}</p>
          </div>
        )}

        {/* リスク戦略 */}
        {node.riskStrategy && (
          <div className="dn-detail-sheet__section">
            <h4 className="dn-detail-sheet__section-title">{NODE_DETAIL_SHEET.SECTION_TITLES.riskStrategy}</h4>
            <div className={`dn-detail-sheet__strategy dn-detail-sheet__strategy--${node.riskStrategy}`}>
              <span className="dn-detail-sheet__strategy-label">
                {RISK_STRATEGY_INFO[node.riskStrategy].label}
              </span>
              <p className="dn-detail-sheet__strategy-description">
                {RISK_STRATEGY_INFO[node.riskStrategy].description}
              </p>
            </div>
          </div>
        )}

        {/* リスク種別 */}
        {node.riskCategories && node.riskCategories.length > 0 && (
          <div className="dn-detail-sheet__section">
            <h4 className="dn-detail-sheet__section-title">{NODE_DETAIL_SHEET.SECTION_TITLES.riskCategories}</h4>
            <div className="dn-detail-sheet__categories">
              {node.riskCategories.map((category) => (
                <span key={category} className="dn-detail-sheet__category-tag">
                  {RISK_CATEGORY_LABELS[category]}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* 評価情報 */}
        <div className="dn-detail-sheet__section">
          <h4 className="dn-detail-sheet__section-title">{NODE_DETAIL_SHEET.SECTION_TITLES.evaluation}</h4>
          <div className="dn-detail-sheet__metrics">
            {node.confidence !== undefined && (
              <div className="dn-detail-sheet__metric">
                <span className="dn-detail-sheet__metric-label">{NODE_DETAIL_SHEET.LABELS.confidence}</span>
                <span className="dn-detail-sheet__metric-value">
                  {renderConfidenceStars(node.confidence)} ({node.confidence}%)
                </span>
              </div>
            )}
            {node.riskLevel && (
              <div className="dn-detail-sheet__metric">
                <span className="dn-detail-sheet__metric-label">{NODE_DETAIL_SHEET.LABELS.riskLevel}</span>
                <span className={`dn-detail-sheet__metric-value dn-detail-sheet__metric-value--${node.riskLevel}`}>
                  {RISK_LABELS.levels[node.riskLevel]}
                </span>
              </div>
            )}
            {node.hasPastCase && (
              <div className="dn-detail-sheet__metric">
                <span className="dn-detail-sheet__metric-label">{NODE_DETAIL_SHEET.LABELS.pastCaseCount}</span>
                <span className="dn-detail-sheet__metric-value">
                  {node.pastCaseCount ?? 0}件
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Phase 17/18: ベテランの判断理由（rationale）- 相互依存の可視化 */}
        {node.rationale && (
          <div className="dn-detail-sheet__section dn-detail-sheet__section--rationale-insight">
            <h4 className="dn-detail-sheet__section-title dn-detail-sheet__section-title--insight">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 16v-4" />
                <path d="M12 8h.01" />
              </svg>
              ベテランの視点
            </h4>
            <div className="dn-detail-sheet__rationale-insight-content">
              <p className="dn-detail-sheet__rationale-insight-text">
                {node.rationale}
              </p>
              {/* 推奨/非推奨のインジケータ */}
              <div className={`dn-detail-sheet__recommendation-badge ${node.isRecommended ? "dn-detail-sheet__recommendation-badge--recommended" : "dn-detail-sheet__recommendation-badge--alternative"}`}>
                {node.isRecommended ? "推奨" : "代替案"}
              </div>
            </div>
          </div>
        )}

        {/* ベテランの声（過去事例にquoteがある場合） */}
        {node.pastCases && node.pastCases.some(pc => pc.quote) && (
          <div className="dn-detail-sheet__section dn-detail-sheet__section--veteran">
            <h4 className="dn-detail-sheet__section-title dn-detail-sheet__section-title--veteran">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
              前回のプロジェクトより
            </h4>
            {node.pastCases.filter(pc => pc.quote).slice(0, 2).map((pastCase) => (
              <div key={pastCase.id} className="dn-detail-sheet__veteran-voice">
                <blockquote className="dn-detail-sheet__veteran-quote">
                  "{pastCase.quote}"
                </blockquote>
                {pastCase.quoteSource && (
                  <cite className="dn-detail-sheet__veteran-source">
                    - {pastCase.quoteSource.date} {pastCase.quoteSource.meetingName}
                    {pastCase.quoteSource.speakerRole && ` (${pastCase.quoteSource.speakerRole})`}
                  </cite>
                )}
                {pastCase.veteranInsight && (
                  <div className="dn-detail-sheet__veteran-insight">
                    <span className="dn-detail-sheet__veteran-insight-icon">💡</span>
                    <span className="dn-detail-sheet__veteran-insight-label">ベテランの視点:</span>
                    <p>{pastCase.veteranInsight}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* 過去事例（quoteがない通常の過去事例） */}
        {node.pastCases && node.pastCases.filter(pc => !pc.quote).length > 0 && (
          <div className="dn-detail-sheet__section">
            <h4 className="dn-detail-sheet__section-title">{NODE_DETAIL_SHEET.SECTION_TITLES.pastCases}</h4>
            <ul className="dn-detail-sheet__past-cases">
              {node.pastCases.filter(pc => !pc.quote).slice(0, 3).map((pastCase) => (
                <li key={pastCase.id} className="dn-detail-sheet__past-case">
                  <span className="dn-detail-sheet__past-case-content">
                    {pastCase.content.slice(0, 80)}
                    {pastCase.content.length > 80 ? "..." : ""}
                  </span>
                  {pastCase.sourceFileName && (
                    <span className="dn-detail-sheet__past-case-source">
                      {pastCase.sourceFileName}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 熟達者思考: 判断プロパティ（Phase X） */}
        {node.decisionProperty && (
          <div className="dn-detail-sheet__section dn-detail-sheet__section--expert">
            <DecisionPropertyPanel
              property={node.decisionProperty}
              isExpanded={isPropertyExpanded}
              onToggleExpand={() => setIsPropertyExpanded(!isPropertyExpanded)}
            />
          </div>
        )}

        {/* 見落とし警告（あれば） */}
        {node.overlookedWarnings && node.overlookedWarnings.length > 0 && (
          <div className="dn-detail-sheet__section dn-detail-sheet__section--warnings">
            <h4 className="dn-detail-sheet__section-title dn-detail-sheet__section-title--warning">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2L1 21h22L12 2zm0 4l7.53 13H4.47L12 6zm-1 4v4h2v-4h-2zm0 6v2h2v-2h-2z" />
              </svg>
              見落とし注意 ({node.overlookedWarnings.length}件)
            </h4>
            <ul className="dn-detail-sheet__warnings">
              {node.overlookedWarnings.map((warning, index) => (
                <li key={index} className={`dn-detail-sheet__warning dn-detail-sheet__warning--${warning.severity}`}>
                  <div className="dn-detail-sheet__warning-viewpoint">
                    {warning.viewpoint}
                  </div>
                  <div className="dn-detail-sheet__warning-risk">
                    {warning.risk}
                  </div>
                  <div className="dn-detail-sheet__warning-suggestion">
                    {warning.suggestion}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* 選択理由（選択可能な場合のみ） */}
        {isSelectable && (
          <div className="dn-detail-sheet__section dn-detail-sheet__section--rationale">
            <h4 className="dn-detail-sheet__section-title">{NODE_DETAIL_SHEET.SECTION_TITLES.rationale}</h4>
            <p className="dn-detail-sheet__rationale-hint">
              {NODE_DETAIL_SHEET.RATIONALE_HINT}
            </p>

            {/* プリセットチップ（バックエンドから動的生成） */}
            <div className="dn-detail-sheet__rationale-presets">
              {(node.rationalePresets ?? DEFAULT_RATIONALE_PRESETS).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`dn-detail-sheet__rationale-chip ${
                    selectedRationales.includes(preset.id) ? "dn-detail-sheet__rationale-chip--selected" : ""
                  }`}
                  onClick={() => handleRationaleToggle(preset.id)}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            {/* カスタム入力 */}
            <input
              type="text"
              className="dn-detail-sheet__rationale-input"
              placeholder={NODE_DETAIL_SHEET.CUSTOM_RATIONALE_PLACEHOLDER}
              value={customRationale}
              onChange={(e) => setCustomRationale(e.target.value)}
            />
          </div>
        )}
      </div>

      {/* フッター（選択ボタン） */}
      {isSelectable && (
        <div className="dn-detail-sheet__footer">
          <button
            type="button"
            className="dn-detail-sheet__select-btn"
            onClick={handleSelect}
          >
            {NODE_DETAIL_SHEET.SELECT_BUTTON}
          </button>
        </div>
      )}
    </div>
  );
}
