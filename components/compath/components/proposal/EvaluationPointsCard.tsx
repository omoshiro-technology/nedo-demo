"use client"
/**
 * 判断論点確認カード (Step 2)
 * Phase 28: 営業向け提案書作成支援
 */

import type {
  EvaluationPoints,
  EvaluationPoint,
  Importance,
  CurrentStatus,
} from "../../types/proposal";
import { IMPORTANCE_LABELS, CURRENT_STATUS_LABELS } from "../../types/proposal";

type Props = {
  value: Partial<EvaluationPoints>;
  onChange: (value: Partial<EvaluationPoints>) => void;
};

type PointKey = keyof EvaluationPoints;

const EVALUATION_POINT_CONFIG: {
  key: PointKey;
  title: string;
  description: string;
}[] = [
  {
    key: "bufferCapacity",
    title: "技術の可視化レベル",
    description: "ベテランの暗黙知が形式知化・ドキュメント化されているか",
  },
  {
    key: "switchingImpact",
    title: "知財ポートフォリオの充実度",
    description: "競合に対する特許による参入障壁・差別化は十分か",
  },
  {
    key: "contingencyOptions",
    title: "AI活用による判断支援の実現度",
    description: "AI技術を技術伝承・判断支援に活用できているか",
  },
];

const IMPORTANCES: Importance[] = ["high", "medium", "low"];
const CURRENT_STATUSES: CurrentStatus[] = [
  "insufficient",
  "concerning",
  "limited",
  "adequate",
  "unknown",
];

const DEFAULT_POINT: EvaluationPoint = {
  importance: "high",
  currentStatus: "unknown",
};

export function EvaluationPointsCard({ value, onChange }: Props) {
  const handlePointChange = (
    key: PointKey,
    field: keyof EvaluationPoint,
    fieldValue: string
  ) => {
    const currentPoint = value[key] || DEFAULT_POINT;
    const newPoint = { ...currentPoint, [field]: fieldValue };
    onChange({ ...value, [key]: newPoint });
  };

  const getPointValue = (key: PointKey): EvaluationPoint => {
    return value[key] || DEFAULT_POINT;
  };

  return (
    <div className="evaluation-points-card">
      <div className="evaluation-points-card__intro">
        以下の観点について、現在の状況を確認させてください。
        これらの情報をもとに、最適な提案を作成いたします。
      </div>

      {EVALUATION_POINT_CONFIG.map((config, index) => {
        const point = getPointValue(config.key);
        return (
          <div key={config.key} className="evaluation-points-card__point">
            <div className="evaluation-points-card__point-header">
              <span className="evaluation-points-card__point-number">
                {index + 1}
              </span>
              <span className="evaluation-points-card__point-title">
                {config.title}
              </span>
            </div>

            <div className="evaluation-points-card__point-controls">
              <div className="evaluation-points-card__control">
                <label className="evaluation-points-card__control-label">
                  重要度
                </label>
                <select
                  className="evaluation-points-card__control-select"
                  value={point.importance}
                  onChange={(e) =>
                    handlePointChange(config.key, "importance", e.target.value)
                  }
                >
                  {IMPORTANCES.map((imp) => (
                    <option key={imp} value={imp}>
                      {IMPORTANCE_LABELS[imp]}
                    </option>
                  ))}
                </select>
              </div>

              <div className="evaluation-points-card__control">
                <label className="evaluation-points-card__control-label">
                  現状
                </label>
                <select
                  className="evaluation-points-card__control-select"
                  value={point.currentStatus}
                  onChange={(e) =>
                    handlePointChange(config.key, "currentStatus", e.target.value)
                  }
                >
                  {CURRENT_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {CURRENT_STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <input
              type="text"
              className="evaluation-points-card__note-input"
              placeholder="補足（任意）"
              value={point.note || ""}
              onChange={(e) =>
                handlePointChange(config.key, "note", e.target.value)
              }
            />
          </div>
        );
      })}
    </div>
  );
}
