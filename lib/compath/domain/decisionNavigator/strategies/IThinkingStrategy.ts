/**
 * 思考戦略インターフェース
 *
 * 5つの思考戦略（Forward, Backcast, Constraint, Risk, Analogy）を
 * 共通インターフェースで扱うための型定義
 *
 * Domain層: 外部依存なし。Application層が具体的な実装を提供する。
 */

// ============================================================
// 思考戦略ID
// ============================================================

/** 利用可能な思考戦略 */
export type ThinkingStrategyId =
  | "forward"     // フォワード: 現状→方針→手法→行動
  | "backcast"    // バックキャスト: ゴールから逆算
  | "constraint"  // 制約ファースト: 制約を先に洗い出し
  | "risk"        // リスクファースト: リスク起点で逆算
  | "analogy";    // アナロジー: 類似事例のパターン転用

// ============================================================
// 多次元ゴール距離
// ============================================================

/** ゴール距離の4次元 */
export type GoalDistanceDimensions = {
  /** 問題の明確さ (0-100, 100=完全に明確) */
  clarityScore: number;
  /** リスク対応率 (0-100, 100=全リスク対応済み) */
  riskCoverage: number;
  /** 制約充足率 (0-100, 100=全制約充足) */
  constraintSatisfaction: number;
  /** 行動への準備度 (0-100, 100=即行動可能) */
  actionReadiness: number;
};

/** 戦略ベースのゴール距離 */
export type StrategyGoalDistance = {
  /** 総合距離 (0-100, 0=ゴール到達) */
  overall: number;
  /** 4次元の個別スコア */
  dimensions: GoalDistanceDimensions;
  /** 戦略固有の追加指標 */
  strategySpecific?: Record<string, number>;
};

// ============================================================
// 戦略で使う最小限のコンテキスト型（Domain層）
// ============================================================

/** 意思決定コンテキスト（Domain向け最小インターフェース） */
export type StrategyDecisionContext = {
  purpose: string;
  currentSituation?: string;
  documentSummary?: string;
  constraints: string[];
  assumptions: string[];
  commitments: string[];
  selectedPath: string[];
};

/** セッション情報（Domain向け最小インターフェース） */
export type StrategySessionContext = {
  id: string;
  purpose: string;
  nodes: { id: string; type: string; status: string; level?: string; parentId?: string }[];
  selectionHistory: { nodeId: string; nodeLabel: string; level: string }[];
  goalState?: { isAchieved: boolean };
  decisionContext?: StrategyDecisionContext;
};

// ============================================================
// 思考戦略インターフェース
// ============================================================

/** プロンプトセット */
export type PromptSet = {
  systemPrompt: string;
  userPrompt: string;
};

/**
 * 思考戦略インターフェース
 *
 * 各戦略はこのインターフェースを実装し、
 * 戦略固有のプロンプト生成・ゴール距離計算・探索プロンプト生成を提供する
 */
export interface IThinkingStrategy {
  /** 戦略ID */
  readonly id: ThinkingStrategyId;
  /** 日本語表示名 */
  readonly name: string;
  /** 説明 */
  readonly description: string;

  /**
   * 推奨パス生成用のLLMプロンプトセットを生成
   */
  buildPromptSet(context: StrategyDecisionContext): PromptSet;

  /**
   * セッションの現在状態からゴール距離を計算
   */
  calculateGoalDistance(session: StrategySessionContext): StrategyGoalDistance;

  /**
   * 次の問いを生成するためのLLMプロンプトを構築
   */
  buildExplorePrompt(
    session: StrategySessionContext,
    selectedNodeId: string
  ): PromptSet;
}
