"use client"
import { useMemo, useState, useEffect, useRef } from "react";
import type {
  DecisionItem,
  DecisionPatternType,
  DecisionFilter,
  DecisionStatus,
  ImportanceInfo,
  ImportanceCategory,
  ProjectPhase,
} from "../../types";
import DecisionCard from "./DecisionCard";
import DecisionFilterComponent from "./DecisionFilter";
import GuidancePanel from "./GuidancePanel";
import RiskIndicator from "./RiskIndicator";

type CollapsibleSectionProps = {
  title: string;
  defaultOpen?: boolean;
  badge?: string;
  children: React.ReactNode;
};

function CollapsibleSection({ title, defaultOpen = false, badge, children }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`collapsible-section ${isOpen ? "is-open" : ""}`}>
      <button
        type="button"
        className="collapsible-section__header"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="collapsible-section__title">
          {title}
          {badge && <span className="collapsible-section__badge">{badge}</span>}
        </span>
        <svg
          className="collapsible-section__icon"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polyline points={isOpen ? "18 15 12 9 6 15" : "6 9 12 15 18 9"} />
        </svg>
      </button>
      {isOpen && <div className="collapsible-section__content">{children}</div>}
    </div>
  );
}

/** 決定事項から「次にやること」を生成 */
function generateActionItems(decision: DecisionItem): string[] {
  const actions: string[] = [];

  // 確定済みの場合
  if (decision.status === "confirmed") {
    actions.push("この決定に基づいて作業を進める");
    if (decision.changeDetail) {
      actions.push("関係者へ変更内容を周知する");
    }
    return actions;
  }

  // グレー/提案の場合：ガイダンスから抽出
  if (decision.guidance?.requiredActions) {
    actions.push(...decision.guidance.requiredActions.slice(0, 3));
  }

  // 曖昧性フラグに基づく追加アクション
  if (decision.ambiguityFlags) {
    if (decision.ambiguityFlags.some(f => f.includes("条件"))) {
      actions.push("条件の明確化を行う");
    }
    if (decision.ambiguityFlags.some(f => f.includes("期限") || f.includes("日時"))) {
      actions.push("期限を確定させる");
    }
  }

  // フェーズ遅延がある場合
  if (decision.phaseInfo?.isDelayed) {
    actions.push("遅延の原因を確認し対策を検討する");
  }

  // 重要度が高い場合
  if (decision.importance && (decision.importance.level === "critical" || decision.importance.level === "high")) {
    if (!actions.some(a => a.includes("確認") || a.includes("承認"))) {
      actions.push("責任者の承認を得る");
    }
  }

  // デフォルトアクション
  if (actions.length === 0) {
    actions.push("内容を確認し、確定または保留を判断する");
  }

  return actions.slice(0, 4); // 最大4件
}

type TimelineViewProps = {
  decisions: DecisionItem[];
  timeRange: {
    earliest: string;
    latest: string;
  };
  /** 外部から選択されたdecisionのID */
  selectedDecisionId?: string | null;
  /** 外部からの選択時に呼ばれるコールバック */
  onSelectDecision?: (decision: DecisionItem) => void;
};

type GroupedDecisions = {
  date: string;
  label: string;
  items: DecisionItem[];
};

const PATTERN_LABELS: Record<DecisionPatternType, string> = {
  agreement: "合意",
  decision: "決定",
  change: "変更",
  adoption: "採用",
  cancellation: "中止",
  other: "その他",
};

const STATUS_LABELS: Record<DecisionStatus, string> = {
  confirmed: "確定",
  gray: "要確認",
  proposed: "未確定",
};

const PRIORITY_LEVEL_LABELS: Record<ImportanceInfo["level"], string> = {
  critical: "即対応",
  high: "要確認",
  medium: "様子見",
  low: "記録済",
};

const PRIORITY_DESCRIPTIONS: Record<ImportanceInfo["level"], string> = {
  critical: "今すぐアクションが必要",
  high: "早めの確認が推奨",
  medium: "必要に応じて対応",
  low: "対応不要（記録として保持）",
};

const IMPORTANCE_LEVEL_ICONS: Record<ImportanceInfo["level"], string> = {
  critical: "🔴",
  high: "🟠",
  medium: "🟡",
  low: "⚪",
};

const CATEGORY_LABELS: Record<ImportanceCategory, string> = {
  budget: "予算",
  schedule: "工期",
  spec: "仕様",
  quality: "品質",
  safety: "安全",
  contract: "契約",
  organization: "体制",
  other: "その他",
};

const PHASE_LABELS: Record<ProjectPhase, string> = {
  planning: "企画",
  basic_design: "基本設計",
  detailed_design: "詳細設計",
  procurement: "調達",
  construction: "施工",
  testing: "検査",
  handover: "引渡し",
  unknown: "不明",
};

const CHANGE_TYPE_LABELS: Record<string, string> = {
  specification: "仕様変更",
  schedule: "スケジュール変更",
  budget: "予算変更",
  scope: "スコープ変更",
  other: "その他の変更",
};

export default function TimelineView({
  decisions,
  timeRange,
  selectedDecisionId,
  onSelectDecision,
}: TimelineViewProps) {
  const [selectedDecision, setSelectedDecision] = useState<DecisionItem | null>(
    null
  );
  const [filter, setFilter] = useState<DecisionFilter>({});
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // 外部からのselectedDecisionIdが変更されたとき、対応するDecisionItemを選択
  useEffect(() => {
    if (selectedDecisionId) {
      const decision = decisions.find((d) => d.id === selectedDecisionId);
      if (decision) {
        setSelectedDecision(decision);
        // 対応するカードにスクロール
        const cardElement = cardRefs.current.get(selectedDecisionId);
        if (cardElement) {
          cardElement.scrollIntoView({ behavior: "smooth", block: "center" });
        }
      }
    }
  }, [selectedDecisionId, decisions]);

  const handleCardClick = (decision: DecisionItem) => {
    setSelectedDecision(decision);
    if (onSelectDecision) {
      onSelectDecision(decision);
    }
  };

  // ステータス別カウント
  const counts = useMemo(() => {
    const confirmed = decisions.filter((d) => d.status === "confirmed").length;
    const gray = decisions.filter((d) => d.status === "gray").length;
    const proposed = decisions.filter((d) => d.status === "proposed").length;
    return { confirmed, gray, proposed, total: decisions.length };
  }, [decisions]);

  // フィルタリング
  const filteredDecisions = useMemo(() => {
    return decisions.filter((decision) => {
      // ステータスフィルタ
      if (filter.status && filter.status.length > 0) {
        if (!filter.status.includes(decision.status)) {
          return false;
        }
      }
      // パターン種別フィルタ
      if (filter.patternTypes && filter.patternTypes.length > 0) {
        if (!filter.patternTypes.includes(decision.patternType)) {
          return false;
        }
      }
      // 最低スコアフィルタ
      if (filter.minQualityScore !== undefined) {
        if (decision.qualityScore < filter.minQualityScore) {
          return false;
        }
      }
      return true;
    });
  }, [decisions, filter]);

  // 日付ごとにグループ化
  const grouped = useMemo<GroupedDecisions[]>(() => {
    const map = new Map<string, DecisionItem[]>();

    for (const decision of filteredDecisions) {
      const dateKey = decision.decisionDate.split("T")[0]; // YYYY-MM-DD
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(decision);
    }

    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, items]) => ({
        date,
        label: formatDateLabel(date),
        items,
      }));
  }, [filteredDecisions]);

  return (
    <div className="decision-timeline">
      <div className="decision-timeline__header">
        <div className="decision-timeline__header-top">
          <h3>タイムライン</h3>
          <span className="muted">
            {formatDateLabel(timeRange.earliest)} 〜{" "}
            {formatDateLabel(timeRange.latest)}
          </span>
        </div>
        <DecisionFilterComponent
          filter={filter}
          onChange={setFilter}
          counts={counts}
          filteredCount={filteredDecisions.length}
        />
      </div>

      <div className="decision-timeline__content">
        <div className="decision-timeline__axis" />

        {grouped.map((group) => (
          <div key={group.date} className="decision-timeline__group">
            <div className="decision-timeline__date-marker">
              <div className="decision-timeline__date-dot" />
              <span className="decision-timeline__date-label">
                {group.label}
              </span>
              <span className="decision-timeline__date-count">
                {group.items.length}件
              </span>
            </div>

            <div className="decision-timeline__items">
              {group.items.map((item) => (
                <div
                  key={item.id}
                  ref={(el) => {
                    if (el) {
                      cardRefs.current.set(item.id, el);
                    } else {
                      cardRefs.current.delete(item.id);
                    }
                  }}
                >
                  <DecisionCard
                    decision={item}
                    isSelected={selectedDecision?.id === item.id}
                    onClick={() => handleCardClick(item)}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* 詳細パネル（選択時） */}
      {selectedDecision && (
        <div className="decision-detail-panel">
          <div className="decision-detail-panel__header">
            <h4>決定事項の詳細</h4>
            <button
              type="button"
              className="decision-detail-panel__close"
              onClick={() => setSelectedDecision(null)}
              aria-label="閉じる"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
          <div className="decision-detail-panel__content">
            {/* 常に表示: 基本情報 */}
            <div className="decision-detail-panel__primary">
              <div className="decision-detail-panel__status-bar">
                <span
                  className={`decision-detail-panel__status decision-detail-panel__status--${selectedDecision.status}`}
                >
                  {STATUS_LABELS[selectedDecision.status]}
                </span>
                <span
                  className={`decision-card__tag decision-card__tag--${selectedDecision.patternType}`}
                >
                  {PATTERN_LABELS[selectedDecision.patternType]}
                </span>
              </div>
              <p className="decision-detail-panel__main-content">{selectedDecision.content}</p>
            </div>

            {/* 次にやること（常に表示・最優先） */}
            <div className="decision-detail-panel__actions">
              <h5 className="decision-detail-panel__actions-title">次にやること</h5>
              <ul className="decision-detail-panel__actions-list">
                {generateActionItems(selectedDecision).map((action, i) => (
                  <li key={i}>{action}</li>
                ))}
              </ul>
            </div>

            {/* 曖昧性フラグ（グレー/提案時のみ） */}
            {selectedDecision.ambiguityFlags &&
              selectedDecision.ambiguityFlags.length > 0 && (
                <div className="decision-detail-panel__ambiguity">
                  <span className="decision-detail-panel__ambiguity-icon">⚠</span>
                  <span>注意: {selectedDecision.ambiguityFlags[0]}</span>
                  {selectedDecision.ambiguityFlags.length > 1 && (
                    <span className="muted"> 他{selectedDecision.ambiguityFlags.length - 1}件</span>
                  )}
                </div>
              )}

            {/* 折りたたみ: 出典情報 */}
            <CollapsibleSection title="出典情報">
              <div className="decision-detail-panel__item">
                <span className="label">出典</span>
                <p>{selectedDecision.sourceFileName}</p>
              </div>
              <div className="decision-detail-panel__item">
                <span className="label">日付</span>
                <p>{formatDateLabel(selectedDecision.decisionDate)}</p>
              </div>
              <div className="decision-detail-panel__item">
                <span className="label">文脈</span>
                <p className="context">
                  {highlightContent(selectedDecision.sourceText, selectedDecision.content)}
                </p>
              </div>
            </CollapsibleSection>

            {/* 折りたたみ: 対応優先度（重要度 + リスク統合） */}
            {(selectedDecision.importance || selectedDecision.risks) && (
              <CollapsibleSection
                title="対応優先度"
                badge={selectedDecision.importance?.level === "critical" ? "🔴" : selectedDecision.importance?.level === "high" ? "🟠" : undefined}
                defaultOpen={selectedDecision.importance?.level === "critical" || selectedDecision.importance?.level === "high"}
              >
                {/* 優先度 */}
                {selectedDecision.importance && (
                  <div className="impact-analysis__importance">
                    <div className="impact-analysis__level">
                      {IMPORTANCE_LEVEL_ICONS[selectedDecision.importance.level]}{" "}
                      {PRIORITY_LEVEL_LABELS[selectedDecision.importance.level]}
                    </div>
                    <div className="impact-analysis__description">
                      {PRIORITY_DESCRIPTIONS[selectedDecision.importance.level]}
                    </div>

                    {/* なぜ対応が必要か */}
                    {selectedDecision.importance.categories.length > 0 && (
                      <div className="impact-analysis__categories">
                        <span className="label">なぜ対応が必要か</span>
                        <div className="impact-analysis__reason-list">
                          <div className="impact-analysis__reason-item">
                            {selectedDecision.importance.categories.map(c => CATEGORY_LABELS[c]).join("・")}に関わる決定
                          </div>
                          {selectedDecision.risks?.delayRisk === "high" && (
                            <div className="impact-analysis__reason-item">
                              未確定状態が遅延を招く可能性
                            </div>
                          )}
                          {selectedDecision.risks?.affectedAreas && selectedDecision.risks.affectedAreas.length > 0 && (
                            <div className="impact-analysis__reason-item">
                              影響範囲: {selectedDecision.risks.affectedAreas.join("、")}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 判断遅延時の影響 */}
                {selectedDecision.risks && selectedDecision.risks.estimatedImpact && (
                  <div className="impact-analysis__risks">
                    <div className="impact-analysis__impact">
                      <span className="label">判断を遅らせた場合</span>
                      <p>{selectedDecision.risks.estimatedImpact}</p>
                    </div>

                    <div className="impact-analysis__delay-risk">
                      遅延リスク:
                      <span className={`impact-analysis__delay-badge impact-analysis__delay-badge--${selectedDecision.risks.delayRisk}`}>
                        {selectedDecision.risks.delayRisk === "high" ? "高" : selectedDecision.risks.delayRisk === "medium" ? "中" : "低"}
                      </span>
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* 折りたたみ: フェーズ・変更詳細（該当データがある場合のみ） */}
            {(selectedDecision.phaseInfo || selectedDecision.changeDetail) && (
              <CollapsibleSection
                title="プロジェクト情報"
                badge={selectedDecision.phaseInfo?.isDelayed ? "⏰" : undefined}
              >
                {/* フェーズ遅延情報 */}
                {selectedDecision.phaseInfo && (
                  <div className={`decision-detail-panel__phase ${selectedDecision.phaseInfo.isDelayed ? "decision-detail-panel__phase--delayed" : ""}`}>
                    <span className="label">プロジェクトフェーズ</span>
                    <div className="decision-detail-panel__phase-content">
                      <div className="decision-detail-panel__phase-current">
                        推定フェーズ: {PHASE_LABELS[selectedDecision.phaseInfo.estimatedPhase]}
                      </div>
                      {selectedDecision.phaseInfo.isDelayed && (
                        <div className="decision-detail-panel__phase-warning">
                          <span className="decision-detail-panel__phase-warning-icon">⏰</span>
                          フェーズ遅延の可能性
                          {selectedDecision.phaseInfo.delayReason && (
                            <span className="decision-detail-panel__phase-warning-reason">
                              : {selectedDecision.phaseInfo.delayReason}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 変更詳細 */}
                {selectedDecision.changeDetail && (
                  <div className="decision-detail-panel__change">
                    <span className="label">変更詳細</span>
                    <div className="decision-detail-panel__change-content">
                      <div className="decision-detail-panel__change-type">
                        <span className={`decision-detail-panel__change-type-badge decision-detail-panel__change-type-badge--${selectedDecision.changeDetail.impactLevel}`}>
                          {CHANGE_TYPE_LABELS[selectedDecision.changeDetail.changeType]}
                        </span>
                        <span className={`decision-detail-panel__change-impact decision-detail-panel__change-impact--${selectedDecision.changeDetail.impactLevel}`}>
                          影響度: {selectedDecision.changeDetail.impactLevel === "high" ? "高" : selectedDecision.changeDetail.impactLevel === "medium" ? "中" : "低"}
                        </span>
                      </div>
                      <div className="decision-detail-panel__change-diff">
                        {selectedDecision.changeDetail.before && (
                          <div className="decision-detail-panel__change-before">
                            <span className="change-label">変更前:</span> {selectedDecision.changeDetail.before}
                          </div>
                        )}
                        <div className="decision-detail-panel__change-after">
                          <span className="change-label">変更後:</span> {selectedDecision.changeDetail.after}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CollapsibleSection>
            )}

            {/* 折りたたみ: 判断支援（グレー/提案の場合のみ） */}
            {selectedDecision.status !== "confirmed" && (
              <CollapsibleSection title="判断支援" badge="💡" defaultOpen={true}>
                <GuidancePanel
                  guidance={selectedDecision.guidance}
                  similarDecisions={selectedDecision.similarDecisions}
                />
              </CollapsibleSection>
            )}

            {/* スコア情報（小さく表示） */}
            <div className="decision-detail-panel__footer-info">
              品質スコア: {selectedDecision.qualityScore}/100
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDateLabel(isoOrDate: string): string {
  const date = new Date(isoOrDate);
  return date.toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** 文脈テキスト内で決定内容をハイライト表示する */
function highlightContent(sourceText: string, content: string): React.ReactNode {
  if (!sourceText || !content) {
    return sourceText;
  }

  // 決定内容が文脈に含まれているか確認
  const index = sourceText.indexOf(content);
  if (index === -1) {
    // 完全一致がない場合、部分的なマッチを試みる
    // 決定内容の最初の20文字で検索
    const shortContent = content.slice(0, 20);
    const shortIndex = sourceText.indexOf(shortContent);
    if (shortIndex === -1) {
      return sourceText;
    }
    // 短い部分でマッチした場合
    const before = sourceText.slice(0, shortIndex);
    const match = sourceText.slice(shortIndex, shortIndex + content.length);
    const after = sourceText.slice(shortIndex + content.length);
    return (
      <>
        {before}
        <mark className="decision-highlight">{match}</mark>
        {after}
      </>
    );
  }

  // 完全一致の場合
  const before = sourceText.slice(0, index);
  const match = sourceText.slice(index, index + content.length);
  const after = sourceText.slice(index + content.length);

  return (
    <>
      {before}
      <mark className="decision-highlight">{match}</mark>
      {after}
    </>
  );
}
