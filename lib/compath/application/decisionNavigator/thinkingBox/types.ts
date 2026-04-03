/**
 * 思考ボックス関連の型定義
 * Phase 5: 条件ベース絞り込みアーキテクチャ
 */

// ============================================================
// 条件の型
// ============================================================

/** 条件選択肢の型（結論ではなく条件） */
export type ConditionOptionType =
  | "implicit_condition"      // 暗黙条件: ユーザーが知っているが示していない
  | "unrecognized_condition"  // 未認識条件: ユーザーが気づいていない
  | "knowhow"                 // ノウハウ: 経験則・ベストプラクティス
  | "information_gap";        // 情報ギャップ: 不足している情報

/** 条件のカテゴリ */
export type ConditionCategory =
  | "legal"        // 法規・規制
  | "safety"       // 安全性
  | "cost"         // コスト
  | "time"         // 時間・納期
  | "resource"     // リソース
  | "stakeholder"  // 関係者
  | "technical"    // 技術的
  | "environmental" // 環境
  | "quality"      // 品質
  | "other";       // その他

/** 条件のソース */
export type ConditionSource =
  | "user_context"   // ユーザー入力から抽出
  | "past_case"      // 過去事例から抽出
  | "llm_inference"  // LLM推論から抽出
  | "document"       // 文書から抽出
  | "chat_context";  // チャットコンテキストから抽出

/** 条件選択肢 */
export type ConditionOption = {
  id: string;
  type: ConditionOptionType;
  label: string;              // 表示ラベル（例: 「法規制約あり」）
  description: string;        // 詳細説明
  category: ConditionCategory;
  implications: string[];     // この条件を選ぶと何が絞られるか
  narrowsOptions: string[];   // 絞り込まれる候補値のID
  source: ConditionSource;
  confidence?: number;        // 条件の確信度（0-100）
  isSelected?: boolean;       // 選択済みかどうか
  createdAt: string;
};

// ============================================================
// 候補値の型
// ============================================================

/** 候補値（最終的な決定値） */
export type CandidateValue = {
  id: string;
  value: string;                    // 例: "1.5m", "100万円"
  rationale: string;                // この値の根拠
  satisfiedConditions: string[];    // 満たす条件のID
  unsatisfiedConditions: string[];  // 満たさない条件のID
  score: number;                    // 総合スコア（0-100）
  isEliminated: boolean;            // 枝刈りされたか
  eliminationReason?: string;       // 枝刈り理由
  source: ConditionSource;          // 値のソース
  createdAt: string;
};

// ============================================================
// 三列レイアウトの型
// ============================================================

/** 左列: 今回の特殊事情 */
export type SpecialCircumstancesColumn = {
  type: "special_circumstances";
  title: string;                    // "今回の特殊事情"
  items: ConditionOption[];
  source: "user_input" | "document" | "chat_context";
};

/** 過去事例から抽出した条件 */
export type PastCaseCondition = {
  condition: ConditionOption;
  caseReference: {
    id: string;
    fileName: string;
    similarity: number;             // 類似度（0-100）
    adoptedConclusion: string;      // その事例で採用された結論
    context?: string;               // 事例の文脈
  };
};

/** 中央列: 過去事例 */
export type PastCasesColumn = {
  type: "past_cases";
  title: string;                    // "類似の過去事例"
  items: PastCaseCondition[];
  searchQuery: string;              // 検索クエリ
  totalMatches: number;             // 総マッチ数
};

/** 右列: LLM推奨 */
export type LLMRecommendationColumn = {
  type: "llm_recommendation";
  title: string;                    // "AIの推奨条件"
  items: ConditionOption[];
  rationale: string;                // 推奨理由
};

/** 三列構造 */
export type ThreeColumnLayout = {
  specialCircumstances: SpecialCircumstancesColumn;
  pastCases: PastCasesColumn;
  llmRecommendations: LLMRecommendationColumn;
};

/** 初期レイアウト */
export type InitialLayout = {
  columns: ThreeColumnLayout;
  goalDefinition: {
    type: string;
    target: string;
  };
  initialDistance: number;          // ゴールへの初期距離（0-100）
  initialCandidates: CandidateValue[];  // 初期候補値
};

// ============================================================
// 思考ボックスの型
// ============================================================

/** 思考ボックス（再帰的に適用される汎用パターン） */
export type ThinkingBox = {
  id: string;
  depth: number;                    // 現在の深さ（0から開始）

  // 入力（累積状態）
  parentConditions: ConditionOption[];   // これまでに選択された条件
  remainingCandidates: CandidateValue[]; // 残っている候補値

  // 三列構造（常に同じパターン）
  columns: {
    contextual: ConditionOption[];    // 文脈から抽出した条件
    experiential: ConditionOption[];  // 過去事例から抽出した条件
    inferred: ConditionOption[];      // LLMが推論した条件
  };

  // ゴール情報
  goalDistance: number;             // ゴールへの距離（0-100、0が完了）
  canPrune: boolean;                // 枝刈り可能か

  // 終了条件
  isTerminal: boolean;              // 終了条件を満たすか
  terminationReason?: string;       // 終了理由

  // メタデータ
  createdAt: string;
  updatedAt: string;
};

// ============================================================
// ゴール距離コンパスの型
// ============================================================

/** ゴール距離の構成要素 */
export type GoalDistanceComponent = {
  count: number;
  weight: number;
  contribution: number;             // この要素のスコア貢献
};

/** 優先順位の曖昧さレベル */
export type PriorityAmbiguityLevel = "high" | "medium" | "low";

/** ゴール距離の計算結果 */
export type GoalDistanceCalculation = {
  // 基本スコア（0-100、0が最も近い = 完了）
  baseScore: number;

  // 構成要素
  components: {
    unresolvedConditions: GoalDistanceComponent;
    remainingCandidates: GoalDistanceComponent;
    informationGaps: GoalDistanceComponent;
    priorityAmbiguity: {
      level: PriorityAmbiguityLevel;
      weight: number;
      contribution: number;
    };
  };

  // 距離の表示（ユーザー向け）
  display: {
    percentage: number;             // 0-100%（100%が完了）
    remainingSteps: number;         // 推定残りステップ数
    nextMilestone: string;          // 次のマイルストーン
  };
};

// ============================================================
// 枝刈りの型
// ============================================================

/** 枝刈り判定結果 */
export type PruningDecision = {
  shouldPrune: boolean;
  reason?: string;

  // 判定基準
  criteria: {
    // 候補値が全ての必須条件を満たせない
    violatesMandatoryCondition: boolean;
    violatedConditionIds?: string[];

    // 他の候補より明らかに劣る
    dominatedByOther: {
      isDominated: boolean;
      dominatingCandidateId?: string;
    };

    // コスト・時間制約を超過
    exceedsConstraints: {
      exceeds: boolean;
      constraintType?: string;
      constraintValue?: string;
    };
  };
};

// ============================================================
// 条件選択の結果
// ============================================================

/** 条件選択結果 */
export type ConditionSelectionResult = {
  selectedCondition: ConditionOption;
  updatedConditions: ConditionOption[];       // 累積された条件リスト
  remainingCandidates: CandidateValue[];      // 絞り込まれた候補値
  eliminatedCandidates: CandidateValue[];     // 枝刈りされた候補値
  nextThinkingBox: ThinkingBox;               // 次の思考ボックス
  goalDistance: GoalDistanceCalculation;      // 更新されたゴール距離
  isGoalAchieved: boolean;                    // ゴール達成したか
  achievedValue?: string;                     // 達成した場合の決定値
};

// ============================================================
// チャットコンテキスト引き継ぎの型
// ============================================================

/** チャットで収集した情報 */
export type CollectedInformation = {
  explicitConditions: ConditionOption[];      // ユーザーが明示した条件
  impliedConditions: ConditionOption[];       // 推測される条件
  mentionedCases: string[];                   // 言及された過去事例
  priorities: {
    factor: string;
    importance: "high" | "medium" | "low";
  }[];
  rejectedOptions: {
    option: string;
    reason: string;
  }[];
};

/** チャットからのコンテキスト引き継ぎ */
export type ChatContextHandover = {
  purpose: string;
  currentSituation?: string;
  collectedInformation: CollectedInformation;
  conversationSummary: string;
};

// ============================================================
// API型
// ============================================================

/** 思考ボックス生成リクエスト */
export type GenerateThinkingBoxRequest = {
  sessionId: string;
  parentThinkingBoxId?: string;
  selectedConditionId: string;
};

/** 思考ボックス生成レスポンス */
export type GenerateThinkingBoxResponse = {
  thinkingBox: ThinkingBox;
  goalDistance: GoalDistanceCalculation;
  isGoalAchieved: boolean;
  achievedValue?: string;
};

/** 条件選択リクエスト */
export type SelectConditionRequest = {
  sessionId: string;
  thinkingBoxId: string;
  conditionId: string;
};

/** 条件選択レスポンス */
export type SelectConditionResponse = {
  result: ConditionSelectionResult;
  updatedSession: {
    id: string;
    thinkingBoxes: ThinkingBox[];
    currentThinkingBoxId: string;
    goalDistance: number;
  };
};

/** セッション作成リクエスト（V3: 条件ベース対応） */
export type CreateSessionRequestV3 = {
  purpose: string;
  currentSituation?: string;
  documentBase64?: string;
  fileName?: string;
  supportMode?: "process" | "thinking";
  chatContextHandover?: ChatContextHandover;
};

/** セッション作成レスポンス（V3: 条件ベース対応） */
export type CreateSessionResponseV3 = {
  sessionId: string;
  initialLayout: InitialLayout;
  firstThinkingBox: ThinkingBox;
  goalDistance: GoalDistanceCalculation;
};
