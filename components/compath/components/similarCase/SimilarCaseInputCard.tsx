"use client"
/**
 * 類似事例検索の入力カード
 * Phase 28+: 過去の類似事例を参照
 */

import { useState, useCallback } from "react";
import type {
  SimilarCaseSearchCondition,
  Industry,
  EquipmentType,
  SearchScope,
  KpiPriority,
} from "../../types/similarCase";
import { EQUIPMENT_TYPE_LABELS, SEARCH_SCOPE_LABELS } from "../../types/similarCase";
import { INDUSTRY_LABELS, KPI_PRIORITY_LABELS } from "../../types/proposal";

type SimilarCaseInputCardProps = {
  onSubmit: (condition: SimilarCaseSearchCondition) => void;
  isLoading?: boolean;
};

export function SimilarCaseInputCard({ onSubmit, isLoading }: SimilarCaseInputCardProps) {
  const [customerName, setCustomerName] = useState("");
  const [industry, setIndustry] = useState<Industry>("power");
  const [equipmentType, setEquipmentType] = useState<EquipmentType>("condemi");
  const [searchScope, setSearchScope] = useState<SearchScope>("all");
  const [kpiPriority, setKpiPriority] = useState<KpiPriority | "">("");
  const [freeText, setFreeText] = useState("");

  const handleSubmit = useCallback(() => {
    const condition: SimilarCaseSearchCondition = {
      industry,
      equipmentType,
      searchScope,
    };

    if (customerName.trim()) {
      condition.customerName = customerName.trim();
    }
    if (kpiPriority) {
      condition.kpiPriority = kpiPriority;
    }
    if (freeText.trim()) {
      condition.freeText = freeText.trim();
    }

    onSubmit(condition);
  }, [customerName, industry, equipmentType, searchScope, kpiPriority, freeText, onSubmit]);

  return (
    <div className="similar-case-input-card">
      <div className="similar-case-input-card__header">
        <span className="similar-case-input-card__icon">🔍</span>
        <h4 className="similar-case-input-card__title">類似事例を検索</h4>
      </div>

      <div className="similar-case-input-card__body">
        <p className="similar-case-input-card__description">
          過去の類似案件を検索します。同じ顧客の他拠点や、同業種・同設備の事例を参考にできます。
        </p>

        {/* 顧客名（オプション） */}
        <div className="similar-case-input-card__field">
          <label className="similar-case-input-card__label">
            顧客名（任意）
            <span className="similar-case-input-card__hint">同じ顧客の他拠点を検索する場合</span>
          </label>
          <input
            type="text"
            className="similar-case-input-card__input"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            placeholder="例: A電力"
          />
        </div>

        {/* 業種 */}
        <div className="similar-case-input-card__field">
          <label className="similar-case-input-card__label">業種</label>
          <select
            className="similar-case-input-card__select"
            value={industry}
            onChange={(e) => setIndustry(e.target.value as Industry)}
          >
            {Object.entries(INDUSTRY_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 設備タイプ */}
        <div className="similar-case-input-card__field">
          <label className="similar-case-input-card__label">設備タイプ</label>
          <select
            className="similar-case-input-card__select"
            value={equipmentType}
            onChange={(e) => setEquipmentType(e.target.value as EquipmentType)}
          >
            {Object.entries(EQUIPMENT_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* 検索範囲 */}
        <div className="similar-case-input-card__field">
          <label className="similar-case-input-card__label">検索範囲</label>
          <div className="similar-case-input-card__radio-group">
            {Object.entries(SEARCH_SCOPE_LABELS).map(([value, { label, description }]) => (
              <label key={value} className="similar-case-input-card__radio-item">
                <input
                  type="radio"
                  name="searchScope"
                  value={value}
                  checked={searchScope === value}
                  onChange={(e) => setSearchScope(e.target.value as SearchScope)}
                />
                <span className="similar-case-input-card__radio-label">{label}</span>
                <span className="similar-case-input-card__radio-description">{description}</span>
              </label>
            ))}
          </div>
        </div>

        {/* KPI優先度（オプション） */}
        <div className="similar-case-input-card__field">
          <label className="similar-case-input-card__label">
            KPI優先度でフィルタ（任意）
          </label>
          <select
            className="similar-case-input-card__select"
            value={kpiPriority}
            onChange={(e) => setKpiPriority(e.target.value as KpiPriority | "")}
          >
            <option value="">指定なし</option>
            {Object.entries(KPI_PRIORITY_LABELS).map(([value, { label }]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        {/* フリーワード */}
        <div className="similar-case-input-card__field">
          <label className="similar-case-input-card__label">
            フリーワード（任意）
          </label>
          <input
            type="text"
            className="similar-case-input-card__input"
            value={freeText}
            onChange={(e) => setFreeText(e.target.value)}
            placeholder="例: 起動頻度 安定運転"
          />
        </div>
      </div>

      <div className="similar-case-input-card__footer">
        <button
          type="button"
          className="similar-case-input-card__submit-btn"
          onClick={handleSubmit}
          disabled={isLoading}
        >
          {isLoading ? "検索中..." : "類似事例を検索"}
        </button>
      </div>
    </div>
  );
}
