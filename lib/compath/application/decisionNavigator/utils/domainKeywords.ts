/**
 * ドメイン（領域）推定ユーティリティ
 *
 * テキストからビジネスドメインを推定するための共通ロジック
 */

// ============================================================
// ドメインキーワード定義
// ============================================================

/**
 * 各ドメインに関連するキーワード一覧
 *
 * ドメイン:
 * - technical: 技術・開発関連
 * - organizational: 組織・チーム関連
 * - strategic: 戦略・ビジネス関連
 * - safety: 安全・リスク関連
 * - cost: コスト・予算関連
 * - personal: 個人・キャリア関連
 */
export const DOMAIN_KEYWORDS: Record<string, string[]> = {
  technical: [
    "技術",
    "開発",
    "実装",
    "設計",
    "システム",
    "インフラ",
    "コード",
    "API",
    "アーキテクチャ",
    "データベース",
    "テスト",
    "デプロイ",
    "プログラム",
    "ソフトウェア",
  ],
  organizational: [
    "組織",
    "チーム",
    "プロジェクト",
    "体制",
    "運用",
    "管理",
    "プロセス",
    "ワークフロー",
    "コミュニケーション",
    "会議",
    "レビュー",
  ],
  strategic: [
    "戦略",
    "ビジネス",
    "市場",
    "競合",
    "投資",
    "方針",
    "計画",
    "目標",
    "KPI",
    "成長",
    "拡大",
  ],
  safety: [
    "安全",
    "リスク",
    "セキュリティ",
    "品質",
    "信頼性",
    "可用性",
    "障害",
    "インシデント",
    "脆弱性",
    "監査",
  ],
  cost: [
    "コスト",
    "費用",
    "予算",
    "効率",
    "削減",
    "ROI",
    "投資対効果",
    "リソース",
    "工数",
  ],
  personal: [
    "キャリア",
    "スキル",
    "学習",
    "成長",
    "トレーニング",
    "メンタリング",
    "評価",
  ],
};

// ============================================================
// ドメイン推定関数
// ============================================================

/**
 * テキストからドメイン（領域）を推定
 *
 * @param texts 分析対象のテキスト（複数可）
 * @returns 推定されたドメインの配列
 *
 * @example
 * ```typescript
 * inferDomains("システム開発においてAPI設計を見直した");
 * // => ["technical"]
 *
 * inferDomains("チーム体制を見直してコスト削減を実現");
 * // => ["organizational", "cost"]
 * ```
 */
export function inferDomains(...texts: string[]): string[] {
  const domains = new Set<string>();
  const combinedText = texts.join(" ").toLowerCase();

  for (const [domain, keywords] of Object.entries(DOMAIN_KEYWORDS)) {
    if (keywords.some((keyword) => combinedText.includes(keyword))) {
      domains.add(domain);
    }
  }

  // ドメインが特定できない場合は"general"
  if (domains.size === 0) {
    domains.add("general");
  }

  return Array.from(domains);
}

/**
 * 条件文字列配列からドメインを推定
 *
 * @param conditions 条件文字列の配列
 * @returns 推定されたドメインの配列
 */
export function inferDomainsFromConditions(conditions: string[]): string[] {
  return inferDomains(conditions.join(" "));
}

/**
 * コンテンツとラベルからドメインを推定
 *
 * @param content コンテンツテキスト
 * @param label ラベルテキスト
 * @returns 推定されたドメインの配列
 */
export function inferDomainsFromContent(
  content: string,
  label: string
): string[] {
  return inferDomains(content, label);
}

/**
 * ドメインが特定のカテゴリに属するかチェック
 *
 * @param domain チェック対象のドメイン
 * @returns 有効なドメインかどうか
 */
export function isValidDomain(domain: string): boolean {
  return domain === "general" || domain in DOMAIN_KEYWORDS;
}

/**
 * 全ての有効なドメイン名を取得
 *
 * @returns ドメイン名の配列
 */
export function getAllDomainNames(): string[] {
  return ["general", ...Object.keys(DOMAIN_KEYWORDS)];
}
