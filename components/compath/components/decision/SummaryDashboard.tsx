"use client"
import type { DecisionItem } from "../../types";

type SummaryDashboardProps = {
  decisions: DecisionItem[];
  onSelectDecision: (decision: DecisionItem) => void;
};

type StatusCounts = {
  confirmed: number;
  gray: number;
  proposed: number;
};

type ImportanceCounts = {
  critical: number;
  high: number;
  medium: number;
  low: number;
};

const STATUS_COLORS = {
  confirmed: "#10b981",
  gray: "#64748b",
  proposed: "#3b82f6",
};

const STATUS_LABELS = {
  confirmed: "確定",
  gray: "要確認",
  proposed: "未確定",
};

const IMPORTANCE_COLORS = {
  critical: "#ef4444",
  high: "#f97316",
  medium: "#eab308",
  low: "#94a3b8",
};

const PRIORITY_LABELS = {
  critical: "即対応",
  high: "要確認",
  medium: "様子見",
  low: "記録済",
};

const ACTION_LABELS = {
  critical_gray: { icon: "🔴", label: "即対応・未確定" },
  high_gray: { icon: "🟠", label: "要確認・未確定" },
  high_risk: { icon: "⚡", label: "高遅延リスク" },
  gray: { icon: "⚠️", label: "グレー判定" },
  proposed: { icon: "💬", label: "提案段階" },
};

function calculatePriority(d: DecisionItem): number {
  const isGrayOrProposed = d.status === "gray" || d.status === "proposed";
  const isCritical = d.importance?.level === "critical";
  const isHigh = d.importance?.level === "high";
  const isHighRisk = d.risks?.delayRisk === "high";

  if (isCritical && isGrayOrProposed) return 100;
  if (isHigh && isGrayOrProposed) return 80;
  if (isHighRisk) return 60;
  if (d.status === "gray") return 40;
  if (d.status === "proposed") return 20;
  return 0;
}

function extractActionItems(decisions: DecisionItem[]): DecisionItem[] {
  return decisions
    .map((d) => ({
      decision: d,
      priority: calculatePriority(d),
    }))
    .filter((item) => item.priority > 0)
    .sort((a, b) => b.priority - a.priority)
    .slice(0, 5)
    .map((item) => item.decision);
}

function getActionType(d: DecisionItem): keyof typeof ACTION_LABELS {
  const isGrayOrProposed = d.status === "gray" || d.status === "proposed";
  if (d.importance?.level === "critical" && isGrayOrProposed) return "critical_gray";
  if (d.importance?.level === "high" && isGrayOrProposed) return "high_gray";
  if (d.risks?.delayRisk === "high") return "high_risk";
  if (d.status === "gray") return "gray";
  return "proposed";
}

type DonutSegment = {
  key: string;
  label: string;
  value: number;
  color: string;
};

function DonutChart({
  title,
  segments,
  total,
  centerLabel,
}: {
  title: string;
  segments: DonutSegment[];
  total: number;
  centerLabel: string;
}) {
  const size = 120;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  // 0件のセグメントをフィルタリング
  const visibleSegments = segments.filter((s) => s.value > 0);

  if (visibleSegments.length === 0) {
    return (
      <div className="donut-chart">
        <div className="donut-chart__title">{title}</div>
        <div className="donut-chart__empty">データがありません</div>
      </div>
    );
  }

  // 各セグメントのオフセットを計算
  let accumulatedOffset = 0;
  const segmentsWithOffset = visibleSegments.map((segment) => {
    const percentage = segment.value / total;
    const dashLength = circumference * percentage;
    const dashOffset = circumference * (1 - accumulatedOffset) + circumference * 0.25;
    accumulatedOffset += percentage;
    return {
      ...segment,
      percentage,
      dashLength,
      dashOffset,
    };
  });

  return (
    <div className="donut-chart">
      <div className="donut-chart__title">{title}</div>
      <div className="donut-chart__content">
        <div className="donut-chart__svg-container">
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            {/* 背景の円 */}
            <circle
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke="#e5e7eb"
              strokeWidth={strokeWidth}
            />
            {/* セグメント */}
            {segmentsWithOffset.map((segment) => (
              <circle
                key={segment.key}
                cx={center}
                cy={center}
                r={radius}
                fill="none"
                stroke={segment.color}
                strokeWidth={strokeWidth}
                strokeDasharray={`${segment.dashLength} ${circumference - segment.dashLength}`}
                strokeDashoffset={segment.dashOffset}
                strokeLinecap="butt"
              />
            ))}
          </svg>
          <div className="donut-chart__center">
            <span className="donut-chart__center-value">{total}</span>
            <span className="donut-chart__center-label">{centerLabel}</span>
          </div>
        </div>
        <div className="donut-chart__legend">
          {segments.map((segment) => (
            <div key={segment.key} className="donut-chart__legend-item">
              <span
                className="donut-chart__legend-color"
                style={{ backgroundColor: segment.color }}
              />
              <span className="donut-chart__legend-label">{segment.label}</span>
              <span className="donut-chart__legend-value">
                {segment.value}件
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusChart({ counts, total }: { counts: StatusCounts; total: number }) {
  const segments: DonutSegment[] = [
    { key: "confirmed", label: STATUS_LABELS.confirmed, value: counts.confirmed, color: STATUS_COLORS.confirmed },
    { key: "gray", label: STATUS_LABELS.gray, value: counts.gray, color: STATUS_COLORS.gray },
    { key: "proposed", label: STATUS_LABELS.proposed, value: counts.proposed, color: STATUS_COLORS.proposed },
  ];

  return (
    <DonutChart
      title="ステータス別"
      segments={segments}
      total={total}
      centerLabel="件"
    />
  );
}

function PriorityChart({ counts, total }: { counts: ImportanceCounts; total: number }) {
  const segments: DonutSegment[] = [
    { key: "critical", label: PRIORITY_LABELS.critical, value: counts.critical, color: IMPORTANCE_COLORS.critical },
    { key: "high", label: PRIORITY_LABELS.high, value: counts.high, color: IMPORTANCE_COLORS.high },
    { key: "medium", label: PRIORITY_LABELS.medium, value: counts.medium, color: IMPORTANCE_COLORS.medium },
    { key: "low", label: PRIORITY_LABELS.low, value: counts.low, color: IMPORTANCE_COLORS.low },
  ];

  return (
    <DonutChart
      title="対応優先度"
      segments={segments}
      total={total}
      centerLabel="件"
    />
  );
}

function ActionListItem({
  item,
  onSelect,
}: {
  item: DecisionItem;
  onSelect: () => void;
}) {
  const actionType = getActionType(item);
  const { icon, label } = ACTION_LABELS[actionType];

  // アクション情報を決定
  let actionText = "";
  if (item.guidance?.requiredActions?.[0]) {
    actionText = `→ 確定に必要: ${item.guidance.requiredActions[0]}`;
  } else if (item.risks?.delayRisk === "high" && item.risks.affectedAreas.length > 0) {
    actionText = `→ 遅延リスク: 高 / 影響: ${item.risks.affectedAreas.slice(0, 2).join("、")}`;
  } else if (item.ambiguityFlags?.[0]) {
    actionText = `→ ${item.ambiguityFlags[0]}`;
  }

  return (
    <button type="button" className="action-list__item" onClick={onSelect}>
      <div className="action-list__item-header">
        <span className="action-list__item-badge">
          {icon} {label}
        </span>
      </div>
      <p className="action-list__item-content">「{item.content}」</p>
      {actionText && <div className="action-list__item-action">{actionText}</div>}
    </button>
  );
}

function ActionList({
  items,
  onSelect,
}: {
  items: DecisionItem[];
  onSelect: (decision: DecisionItem) => void;
}) {
  if (items.length === 0) return null;

  return (
    <div className="action-list">
      <h4 className="action-list__title">やるべきこと（{items.length}件）</h4>
      <div className="action-list__items">
        {items.map((item) => (
          <ActionListItem key={item.id} item={item} onSelect={() => onSelect(item)} />
        ))}
      </div>
    </div>
  );
}

export default function SummaryDashboard({
  decisions,
  onSelectDecision,
}: SummaryDashboardProps) {
  // ステータス別集計
  const statusCounts: StatusCounts = {
    confirmed: decisions.filter((d) => d.status === "confirmed").length,
    gray: decisions.filter((d) => d.status === "gray").length,
    proposed: decisions.filter((d) => d.status === "proposed").length,
  };

  // 重要度別集計
  const importanceCounts: ImportanceCounts = {
    critical: decisions.filter((d) => d.importance?.level === "critical").length,
    high: decisions.filter((d) => d.importance?.level === "high").length,
    medium: decisions.filter((d) => d.importance?.level === "medium").length,
    low: decisions.filter((d) => d.importance?.level === "low" || !d.importance).length,
  };

  // アクションが必要な決定を抽出
  const actionItems = extractActionItems(decisions);

  return (
    <div className="summary-dashboard">
      <h3 className="summary-dashboard__title">📊 サマリダッシュボード</h3>

      <div className="summary-dashboard__charts">
        <StatusChart counts={statusCounts} total={decisions.length} />
        <PriorityChart counts={importanceCounts} total={decisions.length} />
      </div>

      <ActionList items={actionItems} onSelect={onSelectDecision} />
    </div>
  );
}
