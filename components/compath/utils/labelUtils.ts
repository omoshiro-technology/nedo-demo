/**
 * 共通ラベルユーティリティ
 *
 * ステータス、重要度、カテゴリなどのラベル変換関数
 */

import type { DecisionStatus } from "../types";

/**
 * DecisionStatusを日本語ラベルに変換
 */
export function getStatusLabel(status: DecisionStatus): string {
  switch (status) {
    case "confirmed":
      return "確定";
    case "gray":
      return "要確認";
    case "proposed":
      return "未確定";
    default:
      return status;
  }
}

/**
 * DecisionStatusをCSSカラー変数に変換
 */
export function getStatusColor(status: DecisionStatus): string {
  switch (status) {
    case "confirmed":
      return "var(--accent)";
    case "gray":
      return "var(--accent-2)";
    case "proposed":
      return "var(--muted)";
    default:
      return "var(--muted)";
  }
}

/**
 * 重要度レベルを日本語ラベルに変換
 */
export function getImportanceLabel(level: string): string {
  switch (level) {
    case "critical":
      return "最重要";
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
    default:
      return level;
  }
}

/**
 * カテゴリを日本語ラベルに変換
 */
export function getCategoryLabel(category: string): string {
  switch (category) {
    case "budget":
      return "予算";
    case "schedule":
      return "スケジュール";
    case "spec":
      return "仕様";
    case "quality":
      return "品質";
    case "safety":
      return "安全";
    case "contract":
      return "契約";
    case "organization":
      return "組織";
    default:
      return category;
  }
}

/**
 * 優先度を日本語ラベルに変換
 */
export function getPriorityLabel(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

/**
 * 優先度をCSSカラー変数に変換
 */
export function getPriorityColor(priority: "high" | "medium" | "low"): string {
  switch (priority) {
    case "high":
      return "var(--accent-2)";
    case "medium":
      return "var(--accent)";
    case "low":
      return "var(--muted)";
  }
}

/**
 * リスク重大度を日本語ラベルに変換
 */
export function getRiskSeverityLabel(severity: "high" | "medium" | "low"): string {
  switch (severity) {
    case "high":
      return "高";
    case "medium":
      return "中";
    case "low":
      return "低";
  }
}

/**
 * リスク重大度をCSSカラー変数に変換
 */
export function getRiskSeverityColor(severity: "high" | "medium" | "low"): string {
  switch (severity) {
    case "high":
      return "var(--accent-2)";
    case "medium":
      return "var(--accent)";
    case "low":
      return "var(--muted)";
  }
}
