"use client"
import { useState, useMemo, useCallback } from "react";
import type { DecisionTimelineResult, DecisionItem, DecisionStatus, FeedforwardAction } from "../../types";
import {
  getStatusColor,
  getStatusLabel,
  getImportanceLabel,
  getCategoryLabel,
} from "../../utils/labelUtils";

type DecisionResultViewProps = {
  result: DecisionTimelineResult;
  /** 原文ハイライト要求時のコールバック */
  onHighlightRequest?: (sourceText: string) => void;
  /** AIアシスト要求時のコールバック（チャット入力を補完） */
  onAskAI?: (decision: DecisionItem) => void;
  /** フィードフォワード生成要求時のコールバック */
  onGenerateFeedforward?: () => void;
  /** フィードフォワード生成中フラグ */
  feedforwardLoading?: boolean;
  /** フィードフォワード生成済みフラグ（trueの場合、ボタンを非表示） */
  feedforwardGenerated?: boolean;
};

// missingInfoからリスク表現に変換
function getRiskDescription(missingInfo: string): string {
  const riskMap: Record<string, string> = {
    "条件の詳細が不明確": "→ 認識のズレが生じ、手戻りが発生する可能性",
    "確定時期が不明": "→ スケジュールが遅延し、他の作業に影響する可能性",
    "確実性が低い": "→ 前提が覆り、計画の見直しが必要になる可能性",
    "回答待ちの質問がある": "→ 判断が遅れ、プロジェクト全体が停滞する可能性",
    "保留解除の条件が不明": "→ いつまでも保留のまま放置される可能性",
    "再検討時期が不明": "→ 機会を逃し、再検討されないまま終わる可能性",
    "確定に必要な情報が不足しています": "→ 不確定なまま進行し、後で問題が発覚する可能性",
  };
  return riskMap[missingInfo] || `→ ${missingInfo}`;
}

type DecisionCardProps = {
  decision: DecisionItem;
  isSelected?: boolean;
  onSelect?: () => void;
  onCopy?: () => void;
  onAskAI?: () => void;
};

// フィードフォワードアクションの優先度ラベル
function getPriorityLabel(priority: FeedforwardAction["priority"]): string {
  switch (priority) {
    case "high": return "高";
    case "medium": return "中";
    case "low": return "低";
    default: return "中";
  }
}

// フィードフォワードアクションの優先度クラス
function getPriorityClass(priority: FeedforwardAction["priority"]): string {
  switch (priority) {
    case "high": return "decision-card__ff-action--high";
    case "medium": return "decision-card__ff-action--medium";
    case "low": return "decision-card__ff-action--low";
    default: return "decision-card__ff-action--medium";
  }
}

function DecisionCard({ decision, isSelected, onSelect, onCopy, onAskAI }: DecisionCardProps) {
  const [checkedSteps, setCheckedSteps] = useState<Record<number, boolean>>({});
  const [checkedFfActions, setCheckedFfActions] = useState<Record<string, boolean>>({});
  const [isExpanded, setIsExpanded] = useState(false);
  const [isFeedforwardExpanded, setIsFeedforwardExpanded] = useState(false);
  const [copyTooltip, setCopyTooltip] = useState<string | null>(null);

  const hasGuidance = decision.guidance && decision.guidance.requiredActions.length > 0;
  const totalSteps = decision.guidance?.requiredActions.length ?? 0;
  const checkedCount = Object.values(checkedSteps).filter(Boolean).length;
  const isResolved = hasGuidance && totalSteps > 0 && checkedCount === totalSteps;

  const handleStepCheck = (idx: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newCheckedSteps = { ...checkedSteps, [idx]: !checkedSteps[idx] };
    setCheckedSteps(newCheckedSteps);

    // 全てチェックされたら自動的に折りたたむ
    const newCheckedCount = Object.values(newCheckedSteps).filter(Boolean).length;
    if (newCheckedCount === totalSteps) {
      setIsExpanded(false);
    }
  };

  const handleCardClick = (e: React.MouseEvent) => {
    console.log("[DecisionCard] Card clicked:", {
      decisionId: decision.id,
      target: (e.target as HTMLElement).className,
    });
    onSelect?.();
  };

  const handleToggleExpand = (e: React.MouseEvent) => {
    e.stopPropagation();
    const wasExpanded = isExpanded;
    setIsExpanded(prev => !prev);
    // 展開時（閉じる→開く）にカード選択イベントを発火して右パネルをスクロール
    if (!wasExpanded) {
      onSelect?.();
    }
  };

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    onCopy?.();
    setCopyTooltip("コピーしました");
    setTimeout(() => setCopyTooltip(null), 2000);
  };

  const handleAskAI = (e: React.MouseEvent) => {
    e.stopPropagation();
    onAskAI?.();
  };

  const handleFfActionCheck = (actionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCheckedFfActions(prev => ({ ...prev, [actionId]: !prev[actionId] }));
  };

  const handleToggleFeedforward = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsFeedforwardExpanded(prev => !prev);
  };

  // フィードフォワードアクションがあるか
  const hasFeedforward = decision.feedforwardActions && decision.feedforwardActions.length > 0;
  const hasVeteranVoice = decision.veteranVoices && decision.veteranVoices.length > 0;
  const ffActionCount = decision.feedforwardActions?.length ?? 0;
  const checkedFfCount = Object.values(checkedFfActions).filter(Boolean).length;

  return (
    <div
      className={`decision-card decision-card--clickable ${isSelected ? "decision-card--highlighted" : ""} ${isResolved ? "decision-card--resolved" : ""}`}
      onClick={handleCardClick}
      title="クリックで右パネルに原文をハイライト表示"
    >
      {/* ヘッダー: コンテンツ + アクション + 詳細ボタン */}
      <div className="decision-card__header">
        <p className="decision-card__content">{decision.content}</p>

        {/* アクションアイコン */}
        <div className="decision-card__actions">
          <button
            type="button"
            className="decision-card__action-btn decision-card__action-btn--copy"
            onClick={handleCopy}
            title="ToDoリストにコピー"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copyTooltip && <span className="decision-card__copy-tooltip">{copyTooltip}</span>}
          </button>
          {decision.status !== "confirmed" && (
            <button
              type="button"
              className="decision-card__action-btn decision-card__action-btn--ai"
              onClick={handleAskAI}
              title="AIに解決方法を相談"
            >
              <span className="decision-card__action-emoji">🤖</span>
            </button>
          )}
        </div>

        {hasGuidance && (
          <button
            type="button"
            className="decision-card__expand-btn"
            onClick={handleToggleExpand}
          >
            {isExpanded ? "閉じる" : isResolved ? "詳細" : "解決する"}
          </button>
        )}
        {isResolved && (
          <span className="decision-card__resolved-badge">✓ 解決済み</span>
        )}
      </div>

      {/* メタ情報 + カテゴリ */}
      <div className="decision-card__meta">
        <span
          className="decision-card__status"
          style={{ backgroundColor: getStatusColor(decision.status) }}
        >
          {getStatusLabel(decision.status)}
        </span>
        <span className="decision-card__date">{decision.decisionDate}</span>
        {decision.importance && (
          <span className="decision-card__importance-badge">
            重要度: {getImportanceLabel(decision.importance.level)}
          </span>
        )}
        {decision.importance && decision.importance.categories.length > 0 && (
          <span className="decision-card__categories">
            関連: {decision.importance.categories.map(getCategoryLabel).join(", ")}
          </span>
        )}
      </div>

      {/* 未確定の理由（ambiguityFlagsがある場合のみ） */}
      {decision.ambiguityFlags && decision.ambiguityFlags.length > 0 && (
        <div className="decision-card__section">
          <div className="decision-card__section-header">未確定の理由</div>
          <ul className="decision-card__reason-list">
            {decision.ambiguityFlags.map((flag, idx) => (
              <li key={idx}>{flag}</li>
            ))}
          </ul>
        </div>
      )}

      {/* 確定するために（展開時のみ表示） */}
      {isExpanded && hasGuidance && (
        <div className="decision-card__section decision-card__section--steps">
          <div className="decision-card__section-header">確定するために</div>
          <div className="decision-card__steps">
            {decision.guidance!.requiredActions.map((action, idx) => (
              <div
                key={idx}
                className={`decision-card__step-row ${checkedSteps[idx] ? "is-checked" : ""}`}
                onClick={(e) => handleStepCheck(idx, e)}
              >
                <div className="decision-card__step-checkbox">
                  <input
                    type="checkbox"
                    checked={checkedSteps[idx] || false}
                    readOnly
                  />
                  <span className="decision-card__step-number">{idx + 1}.</span>
                  <span className="decision-card__step-action">{action}</span>
                </div>
                {decision.guidance?.missingInfo?.[idx] && (
                  <div className="decision-card__step-risk">
                    {getRiskDescription(decision.guidance.missingInfo[idx])}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* フィードフォワード（次にやること）- confirmed/grayステータスで表示 */}
      {hasFeedforward && (decision.status === "confirmed" || decision.status === "gray") && (
        <div className="decision-card__feedforward">
          <button
            type="button"
            className="decision-card__feedforward-header"
            onClick={handleToggleFeedforward}
          >
            <span className="decision-card__feedforward-icon">🔮</span>
            <span className="decision-card__feedforward-title">
              この決定の次にやること
            </span>
            <span className="decision-card__feedforward-badge">
              {checkedFfCount}/{ffActionCount}
            </span>
            <span className={`decision-card__feedforward-toggle ${isFeedforwardExpanded ? "is-expanded" : ""}`}>
              ▼
            </span>
          </button>

          {isFeedforwardExpanded && (
            <div className="decision-card__feedforward-content">
              <ul className="decision-card__ff-actions">
                {decision.feedforwardActions!.map((action) => (
                  <li
                    key={action.id}
                    className={`decision-card__ff-action ${getPriorityClass(action.priority)} ${checkedFfActions[action.id] ? "is-checked" : ""}`}
                    onClick={(e) => handleFfActionCheck(action.id, e)}
                  >
                    <input
                      type="checkbox"
                      checked={checkedFfActions[action.id] || false}
                      readOnly
                      className="decision-card__ff-checkbox"
                    />
                    <div className="decision-card__ff-action-content">
                      <span className="decision-card__ff-action-text">{action.action}</span>
                      {action.deadline && (
                        <span className="decision-card__ff-deadline">期限: {action.deadline}</span>
                      )}
                      {action.rationale && (
                        <span className="decision-card__ff-rationale">{action.rationale}</span>
                      )}
                    </div>
                    <span className={`decision-card__ff-priority decision-card__ff-priority--${action.priority}`}>
                      {getPriorityLabel(action.priority)}
                    </span>
                  </li>
                ))}
              </ul>

              {/* ベテランの声 */}
              {hasVeteranVoice && (
                <div className="decision-card__veteran-voice">
                  <div className="decision-card__veteran-voice-header">
                    <span className="decision-card__veteran-voice-icon">💬</span>
                    ベテランの声
                  </div>
                  {decision.veteranVoices!.map((voice, idx) => (
                    <div key={idx} className="decision-card__veteran-quote-block">
                      <blockquote className="decision-card__veteran-quote">
                        「{voice.quote}」
                      </blockquote>
                      <cite className="decision-card__veteran-cite">
                        ─ {voice.quoteSource.speakerRole}
                        （{voice.quoteSource.date} {voice.quoteSource.meetingName}）
                      </cite>
                      {voice.veteranInsight && (
                        <p className="decision-card__veteran-insight">
                          {voice.veteranInsight}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/** 1回に表示する件数 */
const ITEMS_PER_PAGE = 10;

export default function DecisionResultView({
  result,
  onHighlightRequest,
  onAskAI,
  onGenerateFeedforward,
  feedforwardLoading: externalFeedforwardLoading,
  feedforwardGenerated,
}: DecisionResultViewProps) {
  const [statusFilter, setStatusFilter] = useState<DecisionStatus | "all">("all");
  const [sortByPriority, setSortByPriority] = useState(true);
  const [selectedDecisionId, setSelectedDecisionId] = useState<string | null>(null);
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);

  // ToDoリスト用にコピー内容を生成
  const generateCopyContent = useCallback((decision: DecisionItem): string => {
    const lines: string[] = [];

    // 決定内容
    lines.push(`□ ${decision.content}`);

    // 未確定の場合、必要なアクションを追加
    if (decision.status !== "confirmed" && decision.guidance?.requiredActions) {
      decision.guidance.requiredActions.forEach((action, idx) => {
        lines.push(`  ${idx + 1}. ${action}`);
      });
    }

    return lines.join("\n");
  }, []);

  const handleCopyDecision = useCallback((decision: DecisionItem) => {
    const content = generateCopyContent(decision);
    navigator.clipboard.writeText(content).catch(console.error);
  }, [generateCopyContent]);

  const handleAskAIForDecision = useCallback((decision: DecisionItem) => {
    onAskAI?.(decision);
  }, [onAskAI]);

  const handleSelectDecision = (decision: DecisionItem) => {
    setSelectedDecisionId(decision.id);
    // sourceText（原文抜粋）を優先的に使用、なければcontentを使用
    const textToHighlight = decision.sourceText || decision.content;
    console.log("[DecisionResultView] Selected decision:", {
      id: decision.id,
      content: decision.content.slice(0, 50),
      sourceText: decision.sourceText?.slice(0, 50),
      textToHighlight: textToHighlight?.slice(0, 50),
    });
    if (onHighlightRequest && textToHighlight) {
      onHighlightRequest(textToHighlight);
    }
  };

  // フィルター変更時に表示件数をリセット
  const handleFilterChange = (newFilter: DecisionStatus | "all") => {
    setStatusFilter(newFilter);
    setDisplayCount(ITEMS_PER_PAGE);
  };

  // フィルタリングとソート
  const filteredDecisions = useMemo(() => {
    let decisions = statusFilter === "all"
      ? result.decisions
      : result.decisions.filter((d) => d.status === statusFilter);

    if (sortByPriority) {
      // ステータス優先度: gray/proposed（要決定）を上に、confirmed（決定済み）を下に
      const statusPriority: Record<string, number> = {
        gray: 0,      // 最優先（曖昧で決定が必要）
        proposed: 1,  // 次に優先（提案段階で決定が必要）
        confirmed: 2, // 最後（既に決定済み）
      };
      decisions = [...decisions].sort((a, b) => {
        // まずステータスで比較
        const statusA = statusPriority[a.status] ?? 1;
        const statusB = statusPriority[b.status] ?? 1;
        if (statusA !== statusB) {
          return statusA - statusB;
        }
        // 同じステータス内ではprioritiyScoreで降順ソート
        const scoreA = a.priorityScore?.score ?? 0;
        const scoreB = b.priorityScore?.score ?? 0;
        return scoreB - scoreA;
      });
    }

    return decisions;
  }, [result.decisions, statusFilter, sortByPriority]);

  const confirmedCount = result.decisions.filter((d) => d.status === "confirmed").length;
  const grayCount = result.decisions.filter((d) => d.status === "gray").length;
  const proposedCount = result.decisions.filter((d) => d.status === "proposed").length;
  const hasDecisions = result.decisions.length > 0;

  // データがない場合のシンプル表示
  if (!hasDecisions) {
    return (
      <div className="decision-result-view decision-result-view--empty">
        <div className="decision-result-view__empty-message">
          意思決定パターンが見つかりませんでした
        </div>
      </div>
    );
  }

  return (
    <div className="decision-result-view">
      <div className="decision-result-view__header">
        <div className="decision-result-view__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span>意思決定タイムライン分析結果</span>
        </div>
      </div>

      <div className="decision-result-view__summary">
        <div className="decision-result-view__stats">
          <span className="decision-result-view__stat">
            <strong>{result.decisions.length}</strong> 件の意思決定
          </span>
          <span className="decision-result-view__stat decision-result-view__stat--confirmed">
            確定: {confirmedCount}
          </span>
          <span className="decision-result-view__stat decision-result-view__stat--gray">
            要確認: {grayCount}
          </span>
          <span className="decision-result-view__stat decision-result-view__stat--proposed">
            未確定: {proposedCount}
          </span>
        </div>
      </div>

      <div className="decision-result-view__detail">
        {result.warnings.length > 0 && (
          <div className="decision-result-view__warnings">
            {result.warnings.map((warning, idx) => (
              <span key={`${warning}-${idx}`} className="decision-result-view__warning">
                {warning}
              </span>
            ))}
          </div>
        )}

        <div className="decision-result-view__filter">
          <button
            type="button"
            className={`decision-result-view__filter-btn ${statusFilter === "all" ? "is-active" : ""}`}
            onClick={() => handleFilterChange("all")}
          >
            すべて
          </button>
          <button
            type="button"
            className={`decision-result-view__filter-btn ${statusFilter === "confirmed" ? "is-active" : ""}`}
            onClick={() => handleFilterChange("confirmed")}
          >
            確定
          </button>
          <button
            type="button"
            className={`decision-result-view__filter-btn ${statusFilter === "gray" ? "is-active" : ""}`}
            onClick={() => handleFilterChange("gray")}
          >
            要確認
          </button>
          <button
            type="button"
            className={`decision-result-view__filter-btn ${statusFilter === "proposed" ? "is-active" : ""}`}
            onClick={() => handleFilterChange("proposed")}
          >
            未確定
          </button>
          <span className="decision-result-view__filter-divider">|</span>
          <button
            type="button"
            className={`decision-result-view__filter-btn decision-result-view__sort-btn ${sortByPriority ? "is-active" : ""}`}
            onClick={() => setSortByPriority(!sortByPriority)}
            title={sortByPriority ? "優先度順（ON）" : "優先度順（OFF）"}
          >
            優先度順 {sortByPriority ? "↓" : ""}
          </button>
        </div>

        <div className="decision-result-view__list">
          {filteredDecisions.slice(0, displayCount).map((decision) => (
            <DecisionCard
              key={decision.id}
              decision={decision}
              isSelected={selectedDecisionId === decision.id}
              onSelect={() => handleSelectDecision(decision)}
              onCopy={() => handleCopyDecision(decision)}
              onAskAI={() => handleAskAIForDecision(decision)}
            />
          ))}
          {filteredDecisions.length > displayCount && (
            <button
              type="button"
              className="decision-result-view__show-more"
              onClick={() => setDisplayCount(filteredDecisions.length)}
            >
              他 {filteredDecisions.length - displayCount} 件を表示
            </button>
          )}
        </div>

        {/* フィードフォワード生成ボタン - チャットメッセージとして追加（生成済み or ローディング中なら非表示） */}
        {result.decisions.length > 0 && onGenerateFeedforward && !feedforwardGenerated && !externalFeedforwardLoading && (
          <div className="decision-result-view__feedforward-section">
            <button
              type="button"
              className="decision-result-view__feedforward-btn"
              onClick={onGenerateFeedforward}
            >
              🎯 次にやることをまとめる
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
