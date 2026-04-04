/**
 * スキルマップ ドメイン型定義
 *
 * Brain-room (1Shot) / Compath の利用を通じたスキル成長・ナレッジ獲得を
 * 判定・可視化するための型体系。
 *
 * 設計方針:
 *   層1: ナレッジカバレッジ（何を知っているか）
 *   層2: 思考品質（どう考えられるか）— 4軸
 *   層3: 意思決定の自立度（行動パターン変化）— v2
 */

// ============================================================
// スキル項目（ナレッジグラフ由来）
// ============================================================

/** スキル項目 — ブレインモデルのナレッジグラフから自動抽出 */
export type SkillItem = {
  id: string;
  /** スキル名（例: "材料選定", "金型制約の理解"） */
  name: string;
  /** 所属ドメイン / クラスタ（例: "生産技術", "品質管理"） */
  domain: string;
  /** 関連するナレッジグラフノードID群 */
  relatedNodeIds: string[];
};

// ============================================================
// 習熟レベル
// ============================================================

/**
 * 習熟レベル 4段階
 *
 * Lv.1 認知: トピックに触れたことがある（層1で判定）
 * Lv.2 理解: 論点を説明できる（層2-D 専門性レベルで判定）
 * Lv.3 応用: 自分で論点を提起できる（層2-C 自発性で判定）
 * Lv.4 統合: 他の観点と関連づけて判断できる（層2-A,B で判定）
 */
export type SkillLevel = 1 | 2 | 3 | 4;

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  1: "認知",
  2: "理解",
  3: "応用",
  4: "統合",
};

// ============================================================
// 思考品質スコア（層2: 4軸）
// ============================================================

/** QCDES各軸への言及 */
export type QCDESCoverage = {
  quality: boolean;
  cost: boolean;
  delivery: boolean;
  environment: boolean;
  safety: boolean;
};

/**
 * 思考品質スコア — セッション単位で算出
 *
 * A. 観点網羅度: QCDES各軸を自発的にどれだけカバーしたか
 * B. 構造的思考度: 比較構造・トレードオフの認識があるか
 * C. 自発性: AIが提示する前に自分で論点を出せたか
 * D. 専門性レベル: 使用語彙・仮説の具体度
 */
export type ThoughtQualityScore = {
  /** A. 観点網羅度 0-100 */
  viewpointCoverage: number;
  /** QCDES各軸の言及状況 */
  qcdesCoverage: QCDESCoverage;
  /** B. 構造的思考度 0-100 */
  structuralThinking: number;
  /** C. 自発性（先回り度） 0-100 */
  proactiveness: number;
  /** D. 専門性レベル 0-100 */
  expertiseLevel: number;
};

// ============================================================
// セッションアセスメント（1セッション分の評価結果）
// ============================================================

/** アセスメント対象のセッション種別 */
export type SessionSource =
  | "brain_room_1shot"
  | "brain_room_conference"
  | "compath_chat"
  | "compath_decision_navigator";

/** ユーザーが自発的に提起した論点 */
export type UserRaisedPoint = {
  /** 論点の内容 */
  content: string;
  /** 専門性レベル */
  expertiseLevel: "beginner" | "intermediate" | "expert";
  /** 関連するスキル項目ID */
  relatedSkillIds: string[];
};

/** セッション単位のスキルアセスメント結果 */
export type SkillAssessment = {
  id: string;
  /** ユーザー識別子 */
  userId: string;
  /** セッション種別 */
  sessionSource: SessionSource;
  /** セッションID（元のセッションへの参照） */
  sessionId: string;
  /** セッションのテーマ / 目的 */
  sessionPurpose: string;

  /** 思考品質スコア */
  thoughtQuality: ThoughtQualityScore;

  /** ユーザーが自発的に提起した論点 */
  userRaisedPoints: UserRaisedPoint[];

  /** 接触したスキル項目ID群（層1: カバレッジ） */
  touchedSkillIds: string[];

  /** スキル項目ごとの推定習熟レベル */
  skillLevels: Record<string, SkillLevel>;

  /** アセスメント日時 */
  assessedAt: string;
};

// ============================================================
// スキルプロファイル（ユーザー単位の集約）
// ============================================================

/** スキル項目ごとの習熟状態 */
export type SkillProficiency = {
  skillId: string;
  /** 現在の習熟レベル */
  currentLevel: SkillLevel;
  /** 層1: 接触回数 */
  touchCount: number;
  /** 層2: 直近のアセスメントでの各軸スコア */
  latestScores: ThoughtQualityScore | null;
  /** 最終アセスメント日時 */
  lastAssessedAt: string;
};

/** ユーザーのスキルプロファイル */
export type SkillProfile = {
  userId: string;
  /** スキル項目ごとの習熟状態 */
  proficiencies: Record<string, SkillProficiency>;
  /** 総アセスメント数 */
  totalAssessments: number;
  /** セッション種別ごとのアセスメント数 */
  assessmentsBySource: Record<SessionSource, number>;
  /** プロファイル作成日時 */
  createdAt: string;
  /** 最終更新日時 */
  updatedAt: string;
};

// ============================================================
// タイムライン（成長曲線用）
// ============================================================

/** タイムライン上の1データポイント */
export type TimelineEntry = {
  assessmentId: string;
  sessionSource: SessionSource;
  /** 思考品質の総合スコア（4軸の加重平均） */
  compositeScore: number;
  thoughtQuality: ThoughtQualityScore;
  assessedAt: string;
};

/** タイムラインレスポンス */
export type SkillTimeline = {
  userId: string;
  entries: TimelineEntry[];
};
