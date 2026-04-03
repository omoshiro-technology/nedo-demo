"use client"
/**
 * 顧客背景入力カード (Step 1)
 * Phase 28: 営業向け提案書作成支援
 */

import type {
  CustomerContext,
  Industry,
  CurrentIssue,
  KpiPriority,
} from "../../types/proposal";
import {
  INDUSTRY_LABELS,
  CURRENT_ISSUE_LABELS,
  KPI_PRIORITY_LABELS,
} from "../../types/proposal";

type Props = {
  value: Partial<CustomerContext>;
  onChange: (value: Partial<CustomerContext>) => void;
};

const INDUSTRIES: Industry[] = [
  "electronics",
  "manufacturing",
  "power",
  "chemical",
  "pharmaceutical",
  "food",
  "other",
];

const CURRENT_ISSUES: CurrentIssue[] = [
  "skill_transfer",
  "ip_strategy",
  "tech_differentiation",
  "ai_integration",
  "load_variation",
  "future_expansion",
  "unexpected_trouble",
  "availability_priority",
  "cost_pressure",
  "aging_equipment",
];

const KPI_PRIORITIES: KpiPriority[] = ["innovation", "availability", "cost", "flexibility"];

export function CustomerContextCard({ value, onChange }: Props) {
  const handleNameChange = (name: string) => {
    onChange({ ...value, name });
  };

  const handleIndustryChange = (industry: Industry) => {
    onChange({ ...value, industry });
  };

  const handleIssueToggle = (issue: CurrentIssue) => {
    const currentIssues = value.currentIssues || [];
    const newIssues = currentIssues.includes(issue)
      ? currentIssues.filter((i) => i !== issue)
      : [...currentIssues, issue];
    onChange({ ...value, currentIssues: newIssues });
  };

  const handleKpiChange = (kpiPriority: KpiPriority) => {
    onChange({ ...value, kpiPriority });
  };

  const handleAdditionalContextChange = (additionalContext: string) => {
    onChange({ ...value, additionalContext });
  };

  return (
    <div className="customer-context-card">
      {/* 顧客名 */}
      <div className="customer-context-card__section">
        <label className="customer-context-card__label">顧客名 / 案件名</label>
        <input
          type="text"
          className="customer-context-card__input"
          placeholder="例: ABC製薬株式会社 様"
          value={value.name || ""}
          onChange={(e) => handleNameChange(e.target.value)}
        />
      </div>

      {/* 業種 */}
      <div className="customer-context-card__section">
        <label className="customer-context-card__label">業種</label>
        <select
          className="customer-context-card__select"
          value={value.industry || ""}
          onChange={(e) => handleIndustryChange(e.target.value as Industry)}
        >
          <option value="">選択してください</option>
          {INDUSTRIES.map((industry) => (
            <option key={industry} value={industry}>
              {INDUSTRY_LABELS[industry]}
            </option>
          ))}
        </select>
      </div>

      {/* 現状の課題 */}
      <div className="customer-context-card__section">
        <label className="customer-context-card__label">
          現状の課題（複数選択可）
        </label>
        <div className="customer-context-card__checkbox-group">
          {CURRENT_ISSUES.map((issue) => {
            const isSelected = value.currentIssues?.includes(issue) || false;
            return (
              <label
                key={issue}
                className={`customer-context-card__checkbox-item ${
                  isSelected ? "customer-context-card__checkbox-item--selected" : ""
                }`}
              >
                <input
                  type="checkbox"
                  className="customer-context-card__checkbox"
                  checked={isSelected}
                  onChange={() => handleIssueToggle(issue)}
                />
                <div className="customer-context-card__checkbox-content">
                  <span className="customer-context-card__checkbox-label">
                    {CURRENT_ISSUE_LABELS[issue].label}
                  </span>
                  <span className="customer-context-card__checkbox-desc">
                    {CURRENT_ISSUE_LABELS[issue].description}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 最重要KPI */}
      <div className="customer-context-card__section">
        <label className="customer-context-card__label">最重要KPI</label>
        <div className="customer-context-card__radio-group">
          {KPI_PRIORITIES.map((kpi) => {
            const isSelected = value.kpiPriority === kpi;
            return (
              <label
                key={kpi}
                className={`customer-context-card__radio-item ${
                  isSelected ? "customer-context-card__radio-item--selected" : ""
                }`}
              >
                <input
                  type="radio"
                  className="customer-context-card__radio"
                  name="kpiPriority"
                  checked={isSelected}
                  onChange={() => handleKpiChange(kpi)}
                />
                <div className="customer-context-card__radio-content">
                  <span className="customer-context-card__radio-label">
                    {KPI_PRIORITY_LABELS[kpi].label}
                  </span>
                  <span className="customer-context-card__radio-desc">
                    {KPI_PRIORITY_LABELS[kpi].description}
                  </span>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* 補足事項 */}
      <div className="customer-context-card__section">
        <label className="customer-context-card__label">補足事項（任意）</label>
        <textarea
          className="customer-context-card__textarea"
          placeholder="その他、提案に反映したい情報があれば入力してください"
          value={value.additionalContext || ""}
          onChange={(e) => handleAdditionalContextChange(e.target.value)}
        />
      </div>
    </div>
  );
}
