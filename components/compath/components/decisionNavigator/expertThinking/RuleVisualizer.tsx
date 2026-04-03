"use client"
/**
 * RuleVisualizer
 *
 * IF/THEN/ELSEルールを視覚的に表示するコンポーネント
 */

import type { DecisionRule } from "../../../types/decisionNavigator";

type RuleVisualizerProps = {
  rule: DecisionRule;
};

/** ルールタイプのラベル */
const RULE_TYPE_LABELS: Record<string, string> = {
  if_then: "IF → THEN",
  if_else: "IF → THEN / ELSE",
  switch: "SWITCH",
  threshold: "閾値判定",
};

/** 演算子のラベル */
const OPERATOR_LABELS: Record<string, string> = {
  ">": "より大きい",
  ">=": "以上",
  "<": "より小さい",
  "<=": "以下",
  "==": "等しい",
  "!=": "等しくない",
};

export function RuleVisualizer({ rule }: RuleVisualizerProps) {
  return (
    <div className="rule-viz">
      {/* ルールタイプバッジ */}
      <div className="rule-viz__type-badge">
        {RULE_TYPE_LABELS[rule.type] || rule.type}
      </div>

      {/* IF/THEN型 */}
      {(rule.type === "if_then" || rule.type === "if_else") && (
        <div className="rule-viz__flow">
          {/* IF */}
          <div className="rule-viz__block rule-viz__block--if">
            <span className="rule-viz__keyword">IF</span>
            <p className="rule-viz__content">{rule.condition}</p>
          </div>

          {/* 矢印 */}
          <div className="rule-viz__arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>

          {/* THEN */}
          <div className="rule-viz__block rule-viz__block--then">
            <span className="rule-viz__keyword">THEN</span>
            <p className="rule-viz__content">{rule.thenAction}</p>
          </div>

          {/* ELSE（if_else型の場合） */}
          {rule.type === "if_else" && rule.elseAction && (
            <>
              <div className="rule-viz__else-divider">
                <span>ELSE</span>
              </div>
              <div className="rule-viz__block rule-viz__block--else">
                <span className="rule-viz__keyword">ELSE</span>
                <p className="rule-viz__content">{rule.elseAction}</p>
              </div>
            </>
          )}
        </div>
      )}

      {/* SWITCH型 */}
      {rule.type === "switch" && rule.cases && (
        <div className="rule-viz__switch">
          <div className="rule-viz__switch-condition">
            <span className="rule-viz__keyword">SWITCH</span>
            <p className="rule-viz__content">{rule.condition}</p>
          </div>
          <div className="rule-viz__cases">
            {rule.cases.map((caseItem, index) => (
              <div key={index} className="rule-viz__case">
                <div className="rule-viz__case-condition">
                  <span className="rule-viz__keyword">CASE</span>
                  <p>{caseItem.condition}</p>
                </div>
                <div className="rule-viz__case-arrow">→</div>
                <div className="rule-viz__case-action">
                  <p>{caseItem.action}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 閾値型 */}
      {rule.type === "threshold" && rule.threshold && (
        <div className="rule-viz__threshold">
          <div className="rule-viz__threshold-condition">
            <span className="rule-viz__keyword">IF</span>
            <div className="rule-viz__threshold-value">
              <span className="rule-viz__threshold-number">
                {rule.threshold.value}
              </span>
              <span className="rule-viz__threshold-unit">
                {rule.threshold.unit}
              </span>
              <span className="rule-viz__threshold-operator">
                {OPERATOR_LABELS[rule.threshold.operator] || rule.threshold.operator}
              </span>
            </div>
          </div>

          <div className="rule-viz__arrow">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7" />
            </svg>
          </div>

          <div className="rule-viz__block rule-viz__block--then">
            <span className="rule-viz__keyword">THEN</span>
            <p className="rule-viz__content">{rule.thenAction}</p>
          </div>

          {rule.elseAction && (
            <>
              <div className="rule-viz__else-divider">
                <span>ELSE</span>
              </div>
              <div className="rule-viz__block rule-viz__block--else">
                <span className="rule-viz__keyword">ELSE</span>
                <p className="rule-viz__content">{rule.elseAction}</p>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
