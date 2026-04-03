"use client"
import type { AxisProposal } from "../types";

type AxisTabsProps = {
  axes: AxisProposal[];
  selectedAxisId: string;
  onSelect: (axisId: string) => void;
};

export default function AxisTabs({ axes, selectedAxisId, onSelect }: AxisTabsProps) {
  return (
    <div className="axis-tabs">
      <div className="axis-tabs__header">
        <div>
          <h3>構造化の軸提案</h3>
          <p className="axis-tabs__hint">表示切替のみ。編集は専門家向け。</p>
        </div>
        <button className="ghost-button" type="button" disabled>
          編集モード (準備中)
        </button>
      </div>
      <div className="axis-tabs__list">
        {axes.map((axis) => (
          <button
            key={axis.id}
            type="button"
            className={`axis-tab ${selectedAxisId === axis.id ? "is-active" : ""}`}
            onClick={() => onSelect(axis.id)}
          >
            <div className="axis-tab__title">{axis.label}</div>
            <div className="axis-tab__meta">
              <span>スコア {axis.score}</span>
              <span>{axis.rationale}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
