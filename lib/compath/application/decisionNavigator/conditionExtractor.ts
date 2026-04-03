/**
 * 条件抽出ロジック
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 *
 * ユーザー入力、文書、チャットコンテキストから条件を抽出する
 */

import { generateId, getTimestamp } from "./utils";
import type {
  ConditionOption,
  ConditionOptionType,
  ConditionCategory,
  ConditionSource,
  CandidateValue,
  ChatContextHandover,
  InitialLayout,
  ThreeColumnLayout,
} from "./thinkingBox/types";
import { calculateInitialGoalDistance } from "./thinkingBox/distanceCalculator";

// ============================================================
// 条件抽出のためのキーワードパターン
// ============================================================

/** カテゴリ判定用キーワード */
const CATEGORY_KEYWORDS: Record<ConditionCategory, RegExp[]> = {
  legal: [
    /法規|法律|規制|基準|条例|許可|認可|届出|消防法|労安法|危険物/i,
  ],
  safety: [
    /安全|危険|リスク|事故|防止|対策|保護|警報|非常/i,
  ],
  cost: [
    /コスト|費用|予算|金額|価格|見積|経費|投資|ROI/i,
  ],
  time: [
    /期間|納期|スケジュール|時間|日程|期限|工期|工程/i,
  ],
  resource: [
    /人員|リソース|設備|機材|材料|調達|手配|確保/i,
  ],
  stakeholder: [
    /関係者|顧客|取引先|上司|承認|報告|説明|合意/i,
  ],
  technical: [
    /技術|仕様|性能|品質|設計|構造|方式|手法/i,
  ],
  environmental: [
    /環境|騒音|振動|廃棄|排出|エネルギー|省エネ/i,
  ],
  quality: [
    /品質|精度|信頼性|耐久性|検査|試験|評価/i,
  ],
  other: [],
};

/** 暗黙条件のパターン */
const IMPLICIT_CONDITION_PATTERNS: { pattern: RegExp; category: ConditionCategory; label: string }[] = [
  { pattern: /既存.*(?:設備|システム|環境)/i, category: "technical", label: "既存設備との整合性" },
  { pattern: /(?:現状|現在).*(?:維持|継続)/i, category: "other", label: "現状維持の要求" },
  { pattern: /(?:予算|コスト).*(?:制約|上限|範囲)/i, category: "cost", label: "予算制約あり" },
  { pattern: /(?:納期|期限).*(?:厳しい|短い|タイト)/i, category: "time", label: "納期制約あり" },
  { pattern: /(?:安全|リスク).*(?:優先|重視|確保)/i, category: "safety", label: "安全性優先" },
  { pattern: /(?:法規|規制).*(?:遵守|準拠|対応)/i, category: "legal", label: "法規制約あり" },
];

/** 未認識条件のパターン（ユーザーが気づきにくい条件） */
const UNRECOGNIZED_CONDITION_TEMPLATES: { category: ConditionCategory; conditions: string[] }[] = [
  {
    category: "legal",
    conditions: [
      "消防法の規定を確認しましたか？",
      "労安法の基準を満たしていますか？",
      "地域の条例を確認しましたか？",
    ],
  },
  {
    category: "safety",
    conditions: [
      "緊急時の避難経路は確保されていますか？",
      "作業員の安全対策は十分ですか？",
      "保守点検時のアクセス性は考慮されていますか？",
    ],
  },
  {
    category: "stakeholder",
    conditions: [
      "関連部署への事前確認は済んでいますか？",
      "顧客への影響は検討しましたか？",
      "承認プロセスを確認しましたか？",
    ],
  },
];

// ============================================================
// 条件抽出メイン関数
// ============================================================

/**
 * 目的テキストから条件を抽出
 *
 * @param purpose 目的テキスト
 * @param currentSituation 現状説明（オプション）
 * @param documentContext 文書から抽出したコンテキスト（オプション）
 * @returns 抽出された条件リスト
 */
export function extractConditionsFromPurpose(
  purpose: string,
  currentSituation?: string,
  documentContext?: string
): ConditionOption[] {
  const conditions: ConditionOption[] = [];
  const now = getTimestamp();
  const combinedText = `${purpose} ${currentSituation ?? ""} ${documentContext ?? ""}`;

  // 1. 暗黙条件の抽出
  for (const { pattern, category, label } of IMPLICIT_CONDITION_PATTERNS) {
    if (pattern.test(combinedText)) {
      conditions.push(createCondition({
        type: "implicit_condition",
        label,
        description: `入力から推測された条件: ${label}`,
        category,
        source: "user_context",
        confidence: 70,
        createdAt: now,
      }));
    }
  }

  // 2. カテゴリベースの条件抽出
  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const pattern of patterns) {
      const match = combinedText.match(pattern);
      if (match) {
        const existingCondition = conditions.find(
          (c) => c.category === category && c.type === "implicit_condition"
        );
        if (!existingCondition) {
          conditions.push(createCondition({
            type: "implicit_condition",
            label: `${getCategoryLabel(category as ConditionCategory)}に関する条件`,
            description: `キーワード「${match[0]}」から検出`,
            category: category as ConditionCategory,
            source: "user_context",
            confidence: 60,
            createdAt: now,
          }));
        }
      }
    }
  }

  // 3. 未認識条件の追加（ユーザーが見落としがちな条件）
  const coveredCategories = new Set(conditions.map((c) => c.category));
  for (const template of UNRECOGNIZED_CONDITION_TEMPLATES) {
    if (!coveredCategories.has(template.category)) {
      // カテゴリがカバーされていない場合、最初の条件を追加
      conditions.push(createCondition({
        type: "unrecognized_condition",
        label: template.conditions[0].replace(/[？?]/g, ""),
        description: template.conditions[0],
        category: template.category,
        source: "llm_inference",
        confidence: 50,
        createdAt: now,
      }));
    }
  }

  return conditions;
}

/**
 * チャットコンテキストから条件を抽出
 */
export function extractConditionsFromChatContext(
  handover: ChatContextHandover
): ConditionOption[] {
  const conditions: ConditionOption[] = [];
  const now = getTimestamp();

  // 明示的な条件をそのまま追加
  for (const condition of handover.collectedInformation.explicitConditions) {
    conditions.push({
      ...condition,
      source: "chat_context",
      createdAt: now,
    });
  }

  // 推測された条件を追加
  for (const condition of handover.collectedInformation.impliedConditions) {
    conditions.push({
      ...condition,
      source: "chat_context",
      confidence: (condition.confidence ?? 50) * 0.8, // 推測なので確信度を下げる
      createdAt: now,
    });
  }

  // 優先事項から条件を生成
  for (const priority of handover.collectedInformation.priorities) {
    const category = inferCategoryFromFactor(priority.factor);
    conditions.push(createCondition({
      type: "implicit_condition",
      label: `${priority.factor}を${priority.importance === "high" ? "最" : ""}優先`,
      description: `チャットで確認された優先事項`,
      category,
      source: "chat_context",
      confidence: priority.importance === "high" ? 90 : 70,
      createdAt: now,
    }));
  }

  return conditions;
}

// ============================================================
// 初期レイアウト生成
// ============================================================

/**
 * 初期レイアウトを生成
 *
 * @param purpose 目的テキスト
 * @param currentSituation 現状説明
 * @param documentContext 文書コンテキスト
 * @param chatContext チャットコンテキスト
 * @returns 初期レイアウト
 */
export async function generateInitialLayout(
  purpose: string,
  currentSituation?: string,
  documentContext?: string,
  chatContext?: ChatContextHandover
): Promise<InitialLayout> {
  const now = getTimestamp();

  // 1. 特殊事情（左列）を生成
  const specialCircumstances = extractConditionsFromPurpose(
    purpose,
    currentSituation,
    documentContext
  );

  // チャットコンテキストがある場合は追加
  if (chatContext) {
    const chatConditions = extractConditionsFromChatContext(chatContext);
    specialCircumstances.push(...chatConditions);
  }

  // 2. 過去事例（中央列）を生成（ダミー実装、将来的には検索機能と連携）
  const pastCasesColumn = {
    type: "past_cases" as const,
    title: "類似の過去事例",
    items: [], // TODO: 過去事例検索機能と連携
    searchQuery: purpose,
    totalMatches: 0,
  };

  // 3. LLM推奨（右列）を生成
  const llmRecommendations = generateLLMRecommendedConditions(
    purpose,
    specialCircumstances
  );

  // 4. 初期候補値を生成
  const initialCandidates = generateInitialCandidates(purpose);

  // 5. 三列レイアウトを構築
  const columns: ThreeColumnLayout = {
    specialCircumstances: {
      type: "special_circumstances",
      title: "今回の特殊事情",
      items: specialCircumstances,
      source: chatContext ? "chat_context" : "user_input",
    },
    pastCases: pastCasesColumn,
    llmRecommendations: {
      type: "llm_recommendation",
      title: "AIの推奨条件",
      items: llmRecommendations,
      rationale: "目的と状況から推測された重要な条件です",
    },
  };

  // 6. 初期ゴール距離を計算
  const initialDistance = calculateInitialGoalDistance(
    purpose,
    initialCandidates.length
  );

  return {
    columns,
    goalDefinition: inferGoalDefinition(purpose),
    initialDistance,
    initialCandidates,
  };
}

// ============================================================
// LLM推奨条件生成
// ============================================================

/**
 * LLM推奨条件を生成（ルールベースの簡易実装）
 */
function generateLLMRecommendedConditions(
  purpose: string,
  existingConditions: ConditionOption[]
): ConditionOption[] {
  const recommendations: ConditionOption[] = [];
  const now = getTimestamp();
  const coveredCategories = new Set(existingConditions.map((c) => c.category));

  // 距離・間隔に関する目的
  if (/距離|間隔|スペース|離隔/i.test(purpose)) {
    if (!coveredCategories.has("legal")) {
      recommendations.push(createCondition({
        type: "knowhow",
        label: "法規の最小距離を確認",
        description: "危険物取扱法等の法規で定められた最小距離を確認してください",
        category: "legal",
        source: "llm_inference",
        confidence: 85,
        createdAt: now,
      }));
    }
    if (!coveredCategories.has("safety")) {
      recommendations.push(createCondition({
        type: "knowhow",
        label: "保守点検時の作業スペース",
        description: "設備の点検・保守時に必要な作業スペースを考慮してください",
        category: "safety",
        source: "llm_inference",
        confidence: 80,
        createdAt: now,
      }));
    }
  }

  // 予算・コストに関する目的
  if (/予算|コスト|費用|金額/i.test(purpose)) {
    recommendations.push(createCondition({
      type: "knowhow",
      label: "ランニングコストも考慮",
      description: "初期費用だけでなく、運用・保守コストも含めて検討してください",
      category: "cost",
      source: "llm_inference",
      confidence: 75,
      createdAt: now,
    }));
  }

  // デフォルトの推奨（何も抽出できなかった場合）
  if (recommendations.length === 0) {
    recommendations.push(createCondition({
      type: "unrecognized_condition",
      label: "関係者への事前確認",
      description: "決定前に関係者の意見を確認することをお勧めします",
      category: "stakeholder",
      source: "llm_inference",
      confidence: 60,
      createdAt: now,
    }));
  }

  return recommendations;
}

// ============================================================
// 初期候補値生成
// ============================================================

/**
 * 目的から初期候補値を生成
 */
function generateInitialCandidates(purpose: string): CandidateValue[] {
  const now = getTimestamp();

  // 距離に関する目的
  if (/距離|間隔/i.test(purpose)) {
    return [
      createCandidate("0.8m", "法規最小基準", 40, now),
      createCandidate("1.0m", "一般的な推奨値", 60, now),
      createCandidate("1.5m", "余裕を持った設定", 70, now),
      createCandidate("2.0m", "保守性を重視", 50, now),
    ];
  }

  // 予算に関する目的
  if (/予算|コスト|費用/i.test(purpose)) {
    return [
      createCandidate("50万円", "最小構成", 40, now),
      createCandidate("100万円", "標準構成", 60, now),
      createCandidate("150万円", "推奨構成", 70, now),
      createCandidate("200万円", "フル構成", 50, now),
    ];
  }

  // デフォルトの候補
  return [
    createCandidate("オプションA", "標準的な選択", 60, now),
    createCandidate("オプションB", "代替案", 50, now),
    createCandidate("オプションC", "別の選択肢", 40, now),
  ];
}

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * 条件オプションを作成
 */
function createCondition(params: {
  type: ConditionOptionType;
  label: string;
  description: string;
  category: ConditionCategory;
  source: ConditionSource;
  confidence: number;
  createdAt: string;
}): ConditionOption {
  return {
    id: `cond-${generateId().slice(0, 8)}`,
    type: params.type,
    label: params.label,
    description: params.description,
    category: params.category,
    implications: [],
    narrowsOptions: [],
    source: params.source,
    confidence: params.confidence,
    isSelected: false,
    createdAt: params.createdAt,
  };
}

/**
 * 候補値を作成
 */
function createCandidate(
  value: string,
  rationale: string,
  score: number,
  createdAt: string
): CandidateValue {
  return {
    id: `cand-${generateId().slice(0, 8)}`,
    value,
    rationale,
    satisfiedConditions: [],
    unsatisfiedConditions: [],
    score,
    isEliminated: false,
    source: "llm_inference",
    createdAt,
  };
}

/**
 * カテゴリのラベルを取得
 */
function getCategoryLabel(category: ConditionCategory): string {
  const labels: Record<ConditionCategory, string> = {
    legal: "法規・規制",
    safety: "安全性",
    cost: "コスト",
    time: "時間・納期",
    resource: "リソース",
    stakeholder: "関係者",
    technical: "技術",
    environmental: "環境",
    quality: "品質",
    other: "その他",
  };
  return labels[category] ?? "その他";
}

/**
 * 要素名からカテゴリを推論
 */
function inferCategoryFromFactor(factor: string): ConditionCategory {
  for (const [category, patterns] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const pattern of patterns) {
      if (pattern.test(factor)) {
        return category as ConditionCategory;
      }
    }
  }
  return "other";
}

/**
 * 目的からゴール定義を推論
 */
function inferGoalDefinition(purpose: string): { type: string; target: string } {
  if (/距離|間隔|長さ|幅|高さ/i.test(purpose)) {
    return { type: "numeric_value", target: "distance" };
  }
  if (/予算|金額|費用|コスト/i.test(purpose)) {
    return { type: "numeric_value", target: "budget" };
  }
  if (/期間|納期|スケジュール/i.test(purpose)) {
    return { type: "numeric_value", target: "duration" };
  }
  if (/手順|方法|やり方|プロセス/i.test(purpose)) {
    return { type: "process_plan", target: "process" };
  }
  return { type: "unknown", target: "unknown" };
}
