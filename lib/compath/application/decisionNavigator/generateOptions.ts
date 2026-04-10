/**
 * 選択肢生成
 * - 選択後の次の選択肢を動的に生成
 * - LLM統合 + テンプレートフォールバック
 */

import { AnalysisHistoryRepository } from "../../infrastructure/repositories/AnalysisHistoryRepository";
import type { SimilarCase } from "../../domain/types";
import type {
  DecisionLevel,
  GeneratedOption,
  GenerateOptionsResponse,
  SelectionHistoryEntry,
  DecisionNavigatorSession,
  DecisionFlowNode,
  LLMGeneratedOption,
  DecisionMetadata,
  RiskStrategy,
  StructuredRecommendationRationale,
  RationaleItem,
  AlternativeComparison,
  GoalStatus,
  NextAction,
  LLMFinalization,
  PreconditionData,
} from "./types";
import {
  findMatchingTemplates,
  templateToOption,
  STRATEGY_TEMPLATES,
} from "./optionTemplates";
import {
  getQCDESQuestions,
  generateOverlookedWarningsForOption,
  type QCDESViewpoint,
} from "./followups";
import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { buildNextOptionsPromptSetWithThreeSets } from "./llm/nextOptionsPrompt";
import { parseNextOptionsResponse, buildRetryPrompt } from "./llm/llmParser";
import { getOrCreateContext } from "./contextBuilder";
import { env } from "../../config/env";
import { debugLog } from "../../infrastructure/logger";
import { LRUCache } from "../../infrastructure/cache/LRUCache";
// Phase 7: 分割モジュールからインポート
import { collectThreeSetData, type ThreeSetData } from "./generateOptions/threeSetCollector";

// ThreeSetData型を再エクスポート（後方互換性のため）
export type { ThreeSetData };

/** 初期候補の最大数（選択肢が多すぎると選びにくいため制限） */
const MAX_INITIAL_OPTIONS = 5;

/**
 * 初期選択肢を生成（セッション開始時）
 * @param purpose 目的
 * @param documentContext ドキュメントコンテキスト
 * @param preconditions 前提条件（Phase 5改改改: 追加）
 */
export async function generateInitialOptions(
  purpose: string,
  documentContext?: string,
  preconditions?: PreconditionData
): Promise<GenerateOptionsResponse> {
  // 過去の意思決定履歴から類似事例を検索
  const pastCases = await searchSimilarCasesFromHistory(purpose);

  // テンプレートから選択肢を取得
  const matchedTemplates = findMatchingTemplates(purpose, "strategy");

  // マッチするテンプレートがない場合、デフォルトの選択肢を返す
  if (matchedTemplates.length === 0) {
    return generateDefaultOptions(purpose, pastCases);
  }

  // テンプレートをオプションに変換
  const allOptions = matchedTemplates.map((t) => templateToOption(t, pastCases));

  // Phase 5改改改: 前提条件に基づいてスコアを調整
  const scoredOptions = applyPreconditionScoring(allOptions, preconditions);

  // 初期候補を最大5件に制限（選択しやすくするため）
  const limitedOptions = scoredOptions.slice(0, MAX_INITIAL_OPTIONS);

  // 推奨フラグを設定
  const optionsWithRecommendation = addRecommendation(limitedOptions);

  return {
    options: optionsWithRecommendation,
    warnings: documentContext
      ? undefined
      : ["ドキュメントが提供されていないため、テキスト入力のみで分析しています。"],
  };
}

/** 選択されたノードの情報（Phase 5改改改） */
export type SelectedNodeInfo = {
  label: string;
  riskStrategy?: RiskStrategy;
  rationale?: string;
};

/**
 * 次のレベルの選択肢を生成（選択後）
 * @param purpose 目的
 * @param selectedPath 選択パス
 * @param parentNodeId 親ノードID
 * @param currentLevel 現在のレベル
 * @param selectedNodeInfo 選択されたノードの詳細情報（Phase 5改改改: 追加）
 * @param preconditions 前提条件（Phase 5改改改: 追加）
 */
export async function generateNextOptions(
  purpose: string,
  selectedPath: SelectionHistoryEntry[],
  parentNodeId: string,
  currentLevel: DecisionLevel,
  selectedNodeInfo?: SelectedNodeInfo,
  preconditions?: PreconditionData
): Promise<GenerateOptionsResponse> {
  // 次のレベルを決定
  const nextLevel = getNextLevel(currentLevel);
  if (!nextLevel) {
    // これ以上の深さはない
    return {
      options: [],
      warnings: ["これ以上の選択肢はありません。"],
    };
  }

  // 選択パスからコンテキストを構築
  const context = selectedPath.map((s) => s.nodeLabel).join(" → ");
  const combinedPurpose = `${purpose} (選択: ${context})`;

  // Phase 6: 既に選択されたラベルを除外リストに追加（繰り返し防止）
  const excludeLabels = selectedPath.map((s) => s.nodeLabel);
  debugLog("generateNextOptions", "Excluding previously selected labels:", excludeLabels);

  // 過去事例を検索
  const pastCases = await searchSimilarCasesFromHistory(combinedPurpose);

  // 親ノードのテンプレートを探す
  const parentTemplate = [...STRATEGY_TEMPLATES].find(
    (t) => parentNodeId.includes(t.id) || t.label === selectedPath.at(-1)?.nodeLabel
  );

  // テンプレートから選択肢を取得（除外ラベルを渡す）
  const matchedTemplates = findMatchingTemplates(
    combinedPurpose,
    nextLevel,
    parentTemplate?.id,
    excludeLabels
  );

  if (matchedTemplates.length === 0) {
    return generateDefaultOptionsForLevel(combinedPurpose, nextLevel, pastCases);
  }

  const options = matchedTemplates.map((t) => templateToOption(t, pastCases));

  // Phase 5改改改: 前提条件と選択ノード情報に基づいてスコアリング
  const scoredByPreconditions = applyPreconditionScoring(options, preconditions);
  const scoredBySelection = applySelectionContextScoring(scoredByPreconditions, selectedNodeInfo);

  // 推奨フラグを設定
  const optionsWithRecommendation = addRecommendation(scoredBySelection);

  return { options: optionsWithRecommendation };
}

/** QCDES警告の型（Phase X: 見落とし観点の事前提示） */
export type QCDESWarning = {
  viewpoint: QCDESViewpoint;
  name: string;
  icon: string;
  warning: string;
  risk: string;
  checkItem: string;
};

/** QCDES問いかけの型 */
export type QCDESQuestion = {
  viewpoint: QCDESViewpoint;
  name: string;
  icon: string;
  question: string;
  isOftenOverlooked: boolean;
  overlookedRisk?: string;
};

/** LLM生成結果の型 */
type LLMOptionsResult = {
  options: LLMGeneratedOption[];
  recommendation?: { id: string; reason: string };
  shouldTerminate: boolean;
  terminationReason?: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
  // Goal-Aware Decision 追加フィールド
  goalStatus?: GoalStatus;
  nextAction?: NextAction;
  openGaps?: string[];
  finalization?: LLMFinalization;
  // Phase X: QCDES観点の問いかけ（製造業特化）
  qcdesQuestions?: QCDESQuestion[];
  qcdesWarnings?: QCDESWarning[];
};

// ============================================================
// キャッシュ（Phase 1: 高速化）
// ============================================================

/** LLM生成結果のキャッシュ（TTL: 10分、最大50エントリ） */
const optionsCache = new LRUCache<string, LLMOptionsResult>(50, 10 * 60 * 1000);

/** 進行中のプリフェッチPromise（重複防止） */
const prefetchInProgress = new Map<string, Promise<void>>();

/**
 * キャッシュキーを生成
 * @param sessionId セッションID
 * @param nodeId ノードID
 * @param selectionPath 選択パス（順序付き）
 */
function buildCacheKey(sessionId: string, nodeId: string, selectionPath: string[]): string {
  return `${sessionId}:${nodeId}:${selectionPath.join(",")}`;
}

/**
 * LLMを使用して次の選択肢を動的生成
 * Phase 1: キャッシュ対応
 * Phase 2: 小モデル先行（gpt-4o-mini）で高速レスポンス
 * @param session セッション
 * @param selectedNode 選択されたノード
 */
export async function generateNextOptionsWithLLM(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): Promise<LLMOptionsResult> {
  // キャッシュキーを生成
  const selectionPath = session.selectionHistory.map(s => s.nodeId);
  const cacheKey = buildCacheKey(session.id, selectedNode.id, selectionPath);

  // Phase 1: キャッシュヒットチェック
  const cached = optionsCache.get(cacheKey);
  if (cached) {
    debugLog("generateNextOptionsWithLLM", `Cache HIT for ${cacheKey}`);
    return cached;
  }

  debugLog("generateNextOptionsWithLLM", `Cache MISS for ${cacheKey}, calling LLM...`);

  // LLM生成を実行
  const result = await generateNextOptionsWithLLMInternal(session, selectedNode);

  // キャッシュに保存
  optionsCache.set(cacheKey, result);

  return result;
}

/**
 * キャッシュの統計情報を取得
 */
export function getOptionsCacheStats(): { size: number } {
  return { size: optionsCache.size };
}

/**
 * キャッシュを手動でセット（prefetchモジュールから使用）
 */
export function setOptionsCache(
  sessionId: string,
  nodeId: string,
  selectionPath: string[],
  result: LLMOptionsResult
): void {
  const cacheKey = buildCacheKey(sessionId, nodeId, selectionPath);
  optionsCache.set(cacheKey, result);
  debugLog("generateNextOptionsWithLLM", `Cache SET for ${cacheKey}`);
}

/**
 * プリフェッチ: 次の選択肢を事前生成してキャッシュに保存
 * @param session セッション
 * @param nodeIds プリフェッチ対象のノードIDリスト
 */
export async function prefetchNextOptions(
  session: DecisionNavigatorSession,
  nodeIds: string[]
): Promise<void> {
  // LLM APIキーがない場合はスキップ
  if (!env.anthropicApiKey) {
    return;
  }

  for (const nodeId of nodeIds) {
    const node = session.nodes.find(n => n.id === nodeId);
    if (!node) continue;

    // キャッシュキーを生成
    const selectionPath = session.selectionHistory.map(s => s.nodeId);
    const cacheKey = buildCacheKey(session.id, nodeId, selectionPath);

    // 既にキャッシュにある場合はスキップ
    if (optionsCache.has(cacheKey)) {
      debugLog("prefetch", `Already cached: ${cacheKey}`);
      continue;
    }

    // 既にプリフェッチ中の場合はスキップ
    if (prefetchInProgress.has(cacheKey)) {
      debugLog("prefetch", `Already in progress: ${cacheKey}`);
      continue;
    }

    // バックグラウンドでプリフェッチ
    debugLog("prefetch", `Starting prefetch for: ${cacheKey}`);
    const prefetchPromise = (async () => {
      try {
        const result = await generateNextOptionsWithLLMInternal(session, node);
        optionsCache.set(cacheKey, result);
        debugLog("prefetch", `Completed: ${cacheKey}`);
      } catch (error) {
        console.error(`[prefetch] Failed: ${cacheKey}`, error);
      } finally {
        prefetchInProgress.delete(cacheKey);
      }
    })();

    prefetchInProgress.set(cacheKey, prefetchPromise);
  }
}

/**
 * LLM生成の内部実装（キャッシュなし）
 * Phase 5改: 条件・事例・推論の3セットを使用
 */
async function generateNextOptionsWithLLMInternal(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): Promise<LLMOptionsResult> {
  // DecisionContextを取得
  const context = getOrCreateContext(session);

  // LLM APIキーがない場合はテンプレートフォールバック
  if (!env.anthropicApiKey) {
    return generateNextOptionsWithTemplate(session, selectedNode);
  }

  try {
    // ============================================================
    // Phase 5改: 3セット情報を収集
    // ============================================================
    const threeSetData = await collectThreeSetData(session, selectedNode);

    debugLog("generateNextOptionsWithLLM", "Three-set data collected:", {
      conditions: threeSetData.conditions.length,
      pastCases: threeSetData.pastCases.length,
      inferredPriorities: threeSetData.inferredPriorities.length,
    });

    // 3セット情報を含むプロンプトを生成
    const { systemPrompt, userPrompt } = buildNextOptionsPromptSetWithThreeSets(
      context,
      session,
      selectedNode,
      threeSetData
    );

    const startTime = Date.now();
    debugLog("generateNextOptionsWithLLM", "Using fast model:", env.anthropicModelFast);

    // Phase 2: 小モデル（gpt-4o-mini）で高速生成（1-3秒目標）
    let response = await generateChatCompletion({
      systemPrompt,
      userContent: userPrompt,
      maxTokens: 2048, // 小モデルはトークン数を抑える
      temperature: 0.7,
      model: env.anthropicModelFast, // gpt-4o-mini
    });

    const elapsed = Date.now() - startTime;
    debugLog("generateNextOptionsWithLLM", `Fast model response in ${elapsed}ms, length:`, response?.length ?? 0);

    // JSONパース
    let parseResult = parseNextOptionsResponse(response);

    // パース失敗時は1回リトライ（同じ小モデルで）
    if (!parseResult.success) {
      console.warn("[generateNextOptionsWithLLM] First parse failed, retrying:", parseResult.error);
      const retryPrompt = buildRetryPrompt(userPrompt, parseResult.error);
      response = await generateChatCompletion({
        systemPrompt,
        userContent: retryPrompt,
        maxTokens: 2048,
        temperature: 0.5,
        model: env.anthropicModelFast,
      });
      parseResult = parseNextOptionsResponse(response);

      if (!parseResult.success) {
        // フォールバック
        console.error("[generateNextOptionsWithLLM] Parse failed after retry, falling back");
        return generateNextOptionsWithTemplate(session, selectedNode);
      }
    }

    const llmResponse = parseResult.data;

    debugLog("generateNextOptionsWithLLM", "Parse success! Options:", llmResponse.options.map(o => o.label));
    debugLog("generateNextOptionsWithLLM", "Goal status:", llmResponse.goalStatus, "Next action:", llmResponse.nextAction);

    // 決定値収束アーキテクチャ: 分析結果をログ出力
    if (llmResponse.analysis) {
      debugLog("generateNextOptionsWithLLM", "Analysis:", JSON.stringify(llmResponse.analysis, null, 2));
    }

    // 方向性重視アーキテクチャ: 選択肢の型をバリデーション
    const optionTypeCounts = {
      direction: 0,
      priority: 0,
      constraint: 0,
      info_request: 0,
      candidate_value: 0,
      undefined: 0,
    };
    for (const opt of llmResponse.options) {
      const type = opt.optionType ?? "undefined";
      optionTypeCounts[type as keyof typeof optionTypeCounts]++;
    }
    debugLog("generateNextOptionsWithLLM", "Option types:", optionTypeCounts);

    // 警告: 全ての選択肢がoptionTypeを持たない場合
    if (optionTypeCounts.undefined === llmResponse.options.length && llmResponse.options.length > 0) {
      console.warn("[generateNextOptionsWithLLM] Warning: All options lack optionType - may be using old format");
    }

    // ============================================================
    // Goal-Aware Decision: 終了ゲート
    // ============================================================
    // goalStatusがachieved、またはnextActionがpropose_options以外の場合は終了
    const shouldTerminateByGoal =
      llmResponse.goalStatus === "achieved" ||
      (llmResponse.nextAction && llmResponse.nextAction !== "propose_options");

    if (shouldTerminateByGoal) {
      debugLog("generateNextOptionsWithLLM", "Goal achieved or non-options action, terminating flow");
      const terminationReason =
        llmResponse.finalization?.summary ??
        (llmResponse.goalStatus === "achieved"
          ? "目的が達成されました。これ以上の選択肢は不要です。"
          : "意思決定が確定しました。");

      return {
        options: [], // 選択肢を出さない
        recommendation: undefined,
        shouldTerminate: true,
        terminationReason,
        needsClarification: false,
        clarificationQuestions: undefined,
        // Goal-Aware Decision 追加情報
        goalStatus: llmResponse.goalStatus,
        nextAction: llmResponse.nextAction,
        finalization: llmResponse.finalization,
      };
    }

    // ============================================================
    // 通常フロー: 選択肢を生成
    // ============================================================
    // Phase 7: 現在の深さを計算して終了選択肢を追加
    const currentDepth = selectedNode.depth ?? 0;
    const optionsWithTermination = addTerminationOption(llmResponse.options, currentDepth + 1);

    // ============================================================
    // Phase X: QCDES観点の問いかけを生成（製造業特化）
    // ============================================================
    // 目的からコンテキストを抽出してQCDES問いを取得
    const qcdesQuestions = getQCDESQuestions(
      session.purpose,
      true,  // 見落としやすい問いのみ
      3      // 最大3件
    );
    debugLog("generateNextOptionsWithLLM", "QCDES questions:", qcdesQuestions.length);

    // 各選択肢に対して見落とし警告を生成
    const allWarnings: QCDESWarning[] = [];
    for (const opt of optionsWithTermination) {
      const warnings = generateOverlookedWarningsForOption(opt.label, opt.description);
      allWarnings.push(...warnings);
    }
    // 重複を除去（同じ警告が複数の選択肢で出る可能性があるため）
    const uniqueWarnings = allWarnings.filter((w, index, self) =>
      index === self.findIndex(t => t.warning === w.warning)
    );
    debugLog("generateNextOptionsWithLLM", "QCDES warnings:", uniqueWarnings.length);

    return {
      options: optionsWithTermination,
      recommendation: llmResponse.recommendation,
      shouldTerminate: llmResponse.termination.shouldTerminate,
      terminationReason: llmResponse.termination.reason,
      needsClarification: llmResponse.consistency.status === "needs-info",
      clarificationQuestions: llmResponse.consistency.clarificationQuestions,
      // Goal-Aware Decision 追加情報
      goalStatus: llmResponse.goalStatus,
      nextAction: llmResponse.nextAction,
      openGaps: llmResponse.openGaps,
      // Phase X: QCDES観点の問いかけ
      qcdesQuestions,
      qcdesWarnings: uniqueWarnings,
    };
  } catch (error) {
    console.error("[generateNextOptionsWithLLM] Error:", error);
    return generateNextOptionsWithTemplate(session, selectedNode);
  }
}

/**
 * テンプレートベースの次の選択肢生成（フォールバック）
 */
async function generateNextOptionsWithTemplate(
  session: DecisionNavigatorSession,
  selectedNode: DecisionFlowNode
): Promise<{
  options: LLMGeneratedOption[];
  recommendation?: { id: string; reason: string };
  shouldTerminate: boolean;
  terminationReason?: string;
  needsClarification: boolean;
  clarificationQuestions?: string[];
  // Phase X: QCDES対応
  qcdesQuestions?: QCDESQuestion[];
  qcdesWarnings?: QCDESWarning[];
}> {
  // Phase 7: 現在の深さとメタデータを考慮して次のレベルを判定
  const currentDepth = selectedNode.depth ?? 0;
  const nextLevel = determineNextLevel(selectedNode.level, currentDepth, selectedNode.metadata);

  if (!nextLevel) {
    return {
      options: [],
      shouldTerminate: true,
      terminationReason: "これ以上の選択肢はありません",
      needsClarification: false,
    };
  }

  const templateResponse = await generateNextOptions(
    session.purpose,
    session.selectionHistory,
    selectedNode.id,
    selectedNode.level
  );

  // GeneratedOption を LLMGeneratedOption に変換
  const options: LLMGeneratedOption[] = templateResponse.options.map((opt, index) => ({
    id: `opt-${index + 1}`,
    label: opt.label,
    description: opt.description,
    riskStrategy: opt.riskStrategy ?? "accept",
    risk: {
      probability: opt.riskLevel === "high" ? 4 : opt.riskLevel === "medium" ? 3 : 2,
      impact: opt.riskLevel === "high" ? 4 : opt.riskLevel === "medium" ? 3 : 2,
      score: opt.riskLevel === "high" ? 64 : opt.riskLevel === "medium" ? 36 : 16,
      level: opt.riskLevel,
    },
    irreversibilityScore: opt.riskLevel === "high" ? 60 : opt.riskLevel === "medium" ? 40 : 20,
  }));

  // Phase 7: 終了選択肢を追加
  const optionsWithTermination = addTerminationOption(options, currentDepth + 1);

  // 推奨を見つける
  const recommendedOpt = templateResponse.options.find((opt) => opt.isRecommended);
  const recommendedIndex = recommendedOpt
    ? templateResponse.options.indexOf(recommendedOpt)
    : 0;

  // Phase X: QCDES観点の問いかけを生成（テンプレートフォールバックでも提供）
  const qcdesQuestions = getQCDESQuestions(
    session.purpose,
    true,  // 見落としやすい問いのみ
    3      // 最大3件
  );

  // 各選択肢に対して見落とし警告を生成
  const allWarnings: QCDESWarning[] = [];
  for (const opt of optionsWithTermination) {
    const warnings = generateOverlookedWarningsForOption(opt.label, opt.description);
    allWarnings.push(...warnings);
  }
  const uniqueWarnings = allWarnings.filter((w, index, self) =>
    index === self.findIndex(t => t.warning === w.warning)
  );

  return {
    options: optionsWithTermination,
    recommendation: optionsWithTermination.length > 0
      ? {
          id: optionsWithTermination[recommendedIndex]?.id ?? optionsWithTermination[0].id,
          reason: recommendedOpt?.recommendationReason ?? "総合評価が高い選択肢です",
        }
      : undefined,
    shouldTerminate: optionsWithTermination.length === 0,
    needsClarification: false,
    // Phase X: QCDES観点の問いかけ
    qcdesQuestions,
    qcdesWarnings: uniqueWarnings,
  };
}

/**
 * デフォルトの選択肢を生成（マッチするテンプレートがない場合）
 *
 * 注: 汎用的なテンプレートは意味がないため、空の選択肢を返すように変更。
 * 具体的なコンテキストがない場合は、無理に選択肢を生成しない。
 */
function generateDefaultOptions(
  _purpose: string,
  _pastCases: SimilarCase[]
): GenerateOptionsResponse {
  // テンプレートフォールバックを無効化
  // 意味のない汎用選択肢（「現状を分析する」「関係者と協議する」等）は表示しない
  debugLog("generateDefaultOptions", "No matching templates - returning empty options (fallback disabled)");

  return {
    options: [],
    warnings: [
      "入力内容に適切な選択肢が見つかりませんでした。目的をより具体的に記載するか、チャットで詳細をお伝えください。",
    ],
  };
}

/**
 * レベル別のデフォルト選択肢を生成
 *
 * 注: 汎用的なテンプレートは意味がないため、空の選択肢を返すように変更。
 * 具体的なコンテキストがない場合は、無理に選択肢を生成しない。
 */
function generateDefaultOptionsForLevel(
  _purpose: string,
  level: DecisionLevel,
  _pastCases: SimilarCase[]
): GenerateOptionsResponse {
  // テンプレートフォールバックを無効化
  // 意味のない汎用選択肢（「詳細を調査する」「専門家に相談する」等）は表示しない
  debugLog("generateDefaultOptionsForLevel", `No matching templates for level '${level}' - returning empty options (fallback disabled)`);

  return {
    options: [],
    warnings: [
      `${level}レベルの適切な選択肢が見つかりませんでした。チャットでより詳しい状況をお伝えください。`,
    ],
  };
}

/** 最大深さ制限（無限ループ防止） */
const MAX_DEPTH = 10;

/**
 * 次のレベルを動的に判定（Phase 7: 3層制限撤廃）
 * @param currentLevel 現在のレベル
 * @param currentDepth 現在の深さ（0から開始）
 * @param metadata 意思決定メタデータ（オプション）
 * @returns 次のレベル、または終了推奨時はnull
 */
function determineNextLevel(
  currentLevel: DecisionLevel,
  currentDepth: number,
  metadata?: DecisionMetadata
): DecisionLevel | null {
  // 無限ループ防止: 最大深さ10
  if (currentDepth >= MAX_DEPTH) {
    debugLog("determineNextLevel", `MAX_DEPTH (${MAX_DEPTH}) reached, terminating`);
    return null;
  }

  // メタデータベースの終了判定
  if (metadata) {
    // 具体度90以上 かつ 可逆度20以下 → 終了を推奨
    if (metadata.granularityScore >= 90 && metadata.reversibilityScore <= 20) {
      debugLog("determineNextLevel", "High granularity + low reversibility, suggesting termination");
      return null;
    }
  }

  // 従来の3層 + 拡張レベル + Backcastingレベル
  const levelProgression: Record<DecisionLevel, DecisionLevel> = {
    "strategy": "tactic",
    "tactic": "action",
    "action": "sub-action",      // action以降も継続可能
    "sub-action": "followup",
    "followup": "followup",      // followupはループ可能
    "criteria": "strategy",      // 判断軸の次は選択肢（strategy相当）
    "outcome": "outcome",        // outcomeは終端
  };

  return levelProgression[currentLevel] ?? null;
}

/**
 * 次のレベルを取得（後方互換性のためのラッパー）
 * @deprecated Phase 7でdetermineNextLevelを推奨
 */
function getNextLevel(currentLevel: DecisionLevel): DecisionLevel | null {
  return determineNextLevel(currentLevel, 0);
}

/**
 * 終了選択肢を自動追加（現在は無効化）
 *
 * 理由: 「この決定で進める」という汎用的な終了選択肢は意味がないため削除。
 * ユーザーが自然にフローを終了できるよう、明示的な終了選択肢は不要。
 *
 * @param options 生成された選択肢
 * @param _currentDepth 現在の深さ（未使用）
 * @returns 入力された選択肢をそのまま返す
 */
function addTerminationOption(
  options: LLMGeneratedOption[],
  _currentDepth: number
): LLMGeneratedOption[] {
  // 終了選択肢の自動追加を無効化
  // 意味のない「この決定で進める」ノードを表示しないようにする
  return options;
}

/**
 * 分析履歴から類似事例を検索
 */
async function searchSimilarCasesFromHistory(
  query: string
): Promise<SimilarCase[]> {
  // 履歴サマリーを取得
  const summaries = AnalysisHistoryRepository.findAll();
  if (summaries.length === 0) return [];

  // クエリをキーワードに分割
  const keywords = query
    .split(/[\s、。・]+/)
    .filter((k) => k.length > 1)
    .slice(0, 10);

  if (keywords.length === 0) return [];

  // キーワードマッチングで類似事例を検索
  const results: SimilarCase[] = [];
  for (const summary of summaries.slice(0, 10)) {
    // 最新10件を対象
    // 完全な履歴を取得
    const fullHistory = AnalysisHistoryRepository.findById(summary.id);
    if (!fullHistory) continue;

    const historyText = fullHistory.result.summary || "";
    let matchCount = 0;
    for (const keyword of keywords) {
      if (historyText.includes(keyword) || summary.fileName.includes(keyword)) {
        matchCount++;
      }
    }

    if (matchCount > 0) {
      results.push({
        id: summary.id,
        content: historyText.slice(0, 100) || summary.fileName,
        similarity: Math.min(100, matchCount * 20),
        patternType: "decision",
        status: "confirmed",
        sourceFileName: summary.fileName,
        decisionDate: summary.analyzedAt,
        adoptedConclusion: undefined,
        perspectives: [],
      });
    }
  }

  return results
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, 5);
}

// ============================================================
// Phase 5改改改: 前提条件に基づくスコアリング
// ============================================================

/** 前提条件カテゴリとリスクカテゴリのマッピング */
const PRECONDITION_RISK_CATEGORY_MAP: Record<string, string[]> = {
  safety: ["safety"],
  legal: ["legal", "compliance"],
  cost: ["cost"],
  time: ["delivery", "time"],
  quality: ["quality"],
  technical: ["technical"],
};

/**
 * 前提条件に基づいて選択肢をスコアリング・ソート
 * @param options 選択肢リスト
 * @param preconditions 前提条件
 * @returns スコアリング後の選択肢リスト（高スコア順）
 */
function applyPreconditionScoring(
  options: GeneratedOption[],
  preconditions?: PreconditionData
): GeneratedOption[] {
  if (!preconditions || preconditions.conditions.length === 0) {
    return options;
  }

  // 選択されている前提条件のカテゴリを収集
  const activePreconditionCategories = new Set(
    preconditions.conditions
      .filter(c => c.isSelected || (c.detail && c.detail.trim().length > 0))
      .map(c => c.category)
  );

  // 各選択肢にスコアを付与
  const scored = options.map(option => {
    let preconditionScore = 0;

    // オプションのriskCategoriesが前提条件カテゴリと一致するかチェック
    for (const precondCategory of activePreconditionCategories) {
      const mappedRiskCategories = PRECONDITION_RISK_CATEGORY_MAP[precondCategory] ?? [precondCategory];

      // オプションがこのカテゴリのリスクに対応しているか
      const hasRelevantRisk = option.riskCategories?.some(rc =>
        mappedRiskCategories.includes(rc)
      );

      if (hasRelevantRisk) {
        // リスク戦略に応じてスコアを付与
        // 前提条件に関連するリスクを「回避」「軽減」するオプションを優先
        if (option.riskStrategy === "avoid") {
          preconditionScore += 30;
        } else if (option.riskStrategy === "mitigate") {
          preconditionScore += 20;
        } else if (option.riskStrategy === "transfer") {
          preconditionScore += 10;
        }
        // acceptの場合は加点なし
      }
    }

    // コスト制約がある場合、コスト関連の選択肢を優先
    const hasCostConstraint = activePreconditionCategories.has("cost");
    if (hasCostConstraint) {
      const label = option.label.toLowerCase();
      if (label.includes("コスト") || label.includes("削減") || label.includes("効率")) {
        preconditionScore += 15;
      }
      // 高リスク（コストがかかりそう）な選択肢はペナルティ
      if (option.riskLevel === "high") {
        preconditionScore -= 10;
      }
    }

    // 時間制約がある場合、迅速な選択肢を優先
    const hasTimeConstraint = activePreconditionCategories.has("time");
    if (hasTimeConstraint) {
      const label = option.label.toLowerCase();
      if (label.includes("迅速") || label.includes("短期") || label.includes("即座")) {
        preconditionScore += 15;
      }
    }

    // 安全制約がある場合、安全関連の選択肢を最優先
    const hasSafetyConstraint = activePreconditionCategories.has("safety");
    if (hasSafetyConstraint) {
      const label = option.label.toLowerCase();
      if (label.includes("安全") || label.includes("リスク回避")) {
        preconditionScore += 25;
      }
      // 高リスクな選択肢は大きくペナルティ
      if (option.riskLevel === "high") {
        preconditionScore -= 20;
      }
    }

    return { option, preconditionScore };
  });

  // スコア順でソート（高い順）
  scored.sort((a, b) => b.preconditionScore - a.preconditionScore);

  return scored.map(s => s.option);
}

/**
 * 選択されたノードのコンテキストに基づいて選択肢をスコアリング
 * @param options 選択肢リスト
 * @param selectedNodeInfo 選択されたノード情報
 * @returns スコアリング後の選択肢リスト
 */
function applySelectionContextScoring(
  options: GeneratedOption[],
  selectedNodeInfo?: SelectedNodeInfo
): GeneratedOption[] {
  if (!selectedNodeInfo) {
    return options;
  }

  const scored = options.map(option => {
    let selectionScore = 0;

    // 選択されたノードのリスク戦略に基づくスコアリング
    if (selectedNodeInfo.riskStrategy) {
      const parentStrategy = selectedNodeInfo.riskStrategy;
      const optionStrategy = option.riskStrategy ?? "accept";

      // 親の戦略と一貫性のある選択肢を優先
      if (parentStrategy === "avoid") {
        // 親がリスク回避なら、同様に回避・軽減する選択肢を優先
        if (optionStrategy === "avoid") selectionScore += 20;
        else if (optionStrategy === "mitigate") selectionScore += 15;
        else if (optionStrategy === "accept") selectionScore -= 10; // 受容はペナルティ
      } else if (parentStrategy === "mitigate") {
        // 親がリスク軽減なら、軽減・回避を優先
        if (optionStrategy === "mitigate") selectionScore += 15;
        else if (optionStrategy === "avoid") selectionScore += 10;
      } else if (parentStrategy === "accept") {
        // 親がリスク受容なら、コスト効率を重視
        if (option.riskLevel === "low") selectionScore += 10;
      }
    }

    // 選択理由（rationale）に含まれるキーワードに基づくスコアリング
    if (selectedNodeInfo.rationale) {
      const rationale = selectedNodeInfo.rationale.toLowerCase();
      const optionLabel = option.label.toLowerCase();

      // 選択理由と選択肢ラベルの関連性をチェック
      const keywords = rationale.split(/[\s、。・]+/).filter(k => k.length > 1);
      for (const keyword of keywords) {
        if (optionLabel.includes(keyword)) {
          selectionScore += 5;
        }
        if (option.description.toLowerCase().includes(keyword)) {
          selectionScore += 3;
        }
      }

      // 特定のキーワードに基づく優先付け
      if (rationale.includes("コスト") || rationale.includes("予算")) {
        if (optionLabel.includes("コスト") || optionLabel.includes("効率")) {
          selectionScore += 10;
        }
      }
      if (rationale.includes("安全") || rationale.includes("リスク")) {
        if (optionLabel.includes("安全") || optionLabel.includes("確実")) {
          selectionScore += 10;
        }
      }
      if (rationale.includes("迅速") || rationale.includes("早")) {
        if (optionLabel.includes("迅速") || optionLabel.includes("即")) {
          selectionScore += 10;
        }
      }
    }

    return { option, selectionScore };
  });

  // スコア順でソート
  scored.sort((a, b) => b.selectionScore - a.selectionScore);

  return scored.map(s => s.option);
}

/**
 * 選択肢に推奨フラグを設定
 * スコアリングロジック: confidence + リスク低減 + 過去事例あり + リスク戦略
 */
function addRecommendation(options: GeneratedOption[]): GeneratedOption[] {
  if (options.length === 0) return options;

  // 各選択肢のスコアを計算
  const scoredOptions = options.map((option) => {
    let score = 0;

    // 確度が高いほどスコアアップ (0-100 → 0-40ポイント)
    score += (option.confidence / 100) * 40;

    // リスクが低いほどスコアアップ (high=0, medium=15, low=30)
    const riskScore: Record<typeof option.riskLevel, number> = {
      high: 0,
      medium: 15,
      low: 30,
    };
    score += riskScore[option.riskLevel];

    // 過去事例があればスコアアップ (最大30ポイント)
    const pastCaseScore = Math.min(option.relatedPastCases.length * 10, 30);
    score += pastCaseScore;

    // リスク戦略によるスコア調整（PMBOKベース: Phase 5）
    const strategyScore: Record<RiskStrategy, number> = {
      avoid: 20,     // 回避を最優先
      mitigate: 15,  // 軽減も良い
      transfer: 5,   // 移転は次点
      accept: -25,   // 受容はペナルティ（最終手段）
    };
    score += strategyScore[option.riskStrategy ?? "accept"] ?? 0;

    return { option, score };
  });

  // 最高スコアの選択肢を推奨に設定
  scoredOptions.sort((a, b) => b.score - a.score);
  const topScore = scoredOptions[0].score;
  const topOption = scoredOptions[0].option;

  return scoredOptions.map(({ option, score }, index) => {
    // 最高スコアの選択肢を推奨（同点の場合は最初の1つのみ）
    const isRecommended = index === 0 && score === topScore;

    if (isRecommended) {
      // 推奨理由を生成
      const reasons: string[] = [];
      if (option.confidence >= 75) reasons.push("確度が高い");
      if (option.riskLevel === "low") reasons.push("リスクが低い");
      if (option.relatedPastCases.length > 0) reasons.push("過去事例あり");

      // Phase 10.5: 他選択肢との比較を生成
      const comparisons = generateComparisons(option, scoredOptions, topScore);

      // Phase 10.5: 決め手サマリーを生成
      const decisionPoints = generateDecisionPoints(option, comparisons);

      // Phase 10: 構造化された推奨根拠を生成（Phase 10.5で拡張）
      const structuredRationale = generateTemplateRationale(option, decisionPoints, comparisons);

      return {
        ...option,
        isRecommended: true,
        recommendationReason:
          reasons.length > 0 ? reasons.join("・") : "総合評価が高い",
        structuredRationale,
      };
    }

    // Phase 15: 非推奨オプションにも簡易版structuredRationaleを生成（決め手・比較なし）
    const structuredRationale = generateTemplateRationale(option, undefined, undefined);
    return {
      ...option,
      structuredRationale,
    };
  });
}

// ============================================================
// Phase 10.5: 他選択肢との比較生成
// ============================================================

/** リスク戦略間の比較ロジック */
const STRATEGY_COMPARISON_MAP: Record<RiskStrategy, Record<RiskStrategy, { axis: string; difference: string }>> = {
  avoid: {
    avoid: { axis: "", difference: "" },
    mitigate: { axis: "リスク対応", difference: "リスクを根本排除せず軽減にとどまる" },
    transfer: { axis: "リスク対応", difference: "リスクを外部に移転するが根本解決ではない" },
    accept: { axis: "リスク対応", difference: "リスクをそのまま受け入れる選択" },
  },
  mitigate: {
    avoid: { axis: "コスト", difference: "リスク回避に追加コストがかかる" },
    mitigate: { axis: "", difference: "" },
    transfer: { axis: "コントロール", difference: "外部依存により制御が難しくなる" },
    accept: { axis: "リスク", difference: "リスク軽減措置がなく影響を受けやすい" },
  },
  transfer: {
    avoid: { axis: "コスト", difference: "リスク回避に追加コストがかかる" },
    mitigate: { axis: "責任", difference: "リスク対応を自社で行う必要がある" },
    transfer: { axis: "", difference: "" },
    accept: { axis: "リスク", difference: "リスク移転もせず受け入れる選択" },
  },
  accept: {
    avoid: { axis: "コスト", difference: "リスク回避には追加コストが必要" },
    mitigate: { axis: "対応コスト", difference: "軽減措置には追加の対応が必要" },
    transfer: { axis: "依存性", difference: "外部依存により調整コストが発生" },
    accept: { axis: "", difference: "" },
  },
};

/**
 * 他選択肢との比較を生成（Phase 10.5）
 * @param recommendedOption 推奨選択肢
 * @param allScoredOptions 全選択肢（スコア付き）
 * @param topScore 推奨選択肢のスコア
 * @returns 比較情報（最大2件）
 */
function generateComparisons(
  recommendedOption: GeneratedOption,
  allScoredOptions: { option: GeneratedOption; score: number }[],
  topScore: number
): AlternativeComparison[] {
  const comparisons: AlternativeComparison[] = [];

  // 比較対象を選定: スコア差15%以内、riskStrategyが異なるものを優先
  const candidates = allScoredOptions
    .filter(({ option, score }) => {
      // 推奨自身は除外
      if (option.label === recommendedOption.label) return false;
      // スコア差が15%以内
      const scoreDiff = ((topScore - score) / topScore) * 100;
      return scoreDiff <= 15;
    })
    .sort((a, b) => {
      // riskStrategyが異なるものを優先
      const aStrategyDiff = a.option.riskStrategy !== recommendedOption.riskStrategy ? 1 : 0;
      const bStrategyDiff = b.option.riskStrategy !== recommendedOption.riskStrategy ? 1 : 0;
      if (bStrategyDiff !== aStrategyDiff) return bStrategyDiff - aStrategyDiff;
      // スコアが近いものを優先
      return b.score - a.score;
    })
    .slice(0, 2); // 最大2件

  for (const { option: altOption } of candidates) {
    const recStrategy = recommendedOption.riskStrategy ?? "accept";
    const altStrategy = altOption.riskStrategy ?? "accept";

    // 比較ポイントを取得
    const comparisonInfo = STRATEGY_COMPARISON_MAP[recStrategy]?.[altStrategy];

    if (comparisonInfo && comparisonInfo.difference) {
      comparisons.push({
        alternativeId: altOption.label, // IDがない場合はlabelを使用
        alternativeLabel: altOption.label,
        differencePoint: comparisonInfo.difference,
        advantageAxis: comparisonInfo.axis,
      });
    } else {
      // riskStrategyが同じ場合は他の観点で比較
      let axis = "";
      let difference = "";

      if (recommendedOption.riskLevel !== altOption.riskLevel) {
        axis = "リスク";
        difference = altOption.riskLevel === "high"
          ? "高リスクを伴う"
          : altOption.riskLevel === "medium"
            ? "中程度のリスクがある"
            : "低リスクだが効果も限定的";
      } else if (recommendedOption.confidence > altOption.confidence) {
        axis = "確度";
        difference = `確度が${recommendedOption.confidence - altOption.confidence}%低い`;
      } else if (recommendedOption.relatedPastCases.length > altOption.relatedPastCases.length) {
        axis = "事例";
        difference = "参考となる過去事例が少ない";
      } else {
        axis = "総合評価";
        difference = "総合スコアが若干低い";
      }

      comparisons.push({
        alternativeId: altOption.label,
        alternativeLabel: altOption.label,
        differencePoint: difference,
        advantageAxis: axis,
      });
    }
  }

  return comparisons;
}

/**
 * 決め手サマリーを生成（Phase 10.5）
 * @param option 推奨選択肢
 * @param comparisons 比較情報
 * @returns 決め手ポイント（最大3点）
 */
function generateDecisionPoints(
  option: GeneratedOption,
  comparisons: AlternativeComparison[]
): string[] {
  const points: string[] = [];

  // リスク戦略に基づく決め手
  const strategyPoints: Record<RiskStrategy, string> = {
    avoid: "リスクを根本から排除できる",
    mitigate: "リスクを現実的なコストで軽減できる",
    transfer: "専門家に任せることで確実性が高まる",
    accept: "追加コストなしで対応可能",
  };
  const strategy = option.riskStrategy ?? "accept";
  points.push(strategyPoints[strategy]);

  // 確度に基づく決め手
  if (option.confidence >= 80) {
    points.push("実現可能性が高い");
  } else if (option.confidence >= 70) {
    points.push("十分な実現可能性がある");
  }

  // リスクレベルに基づく決め手
  if (option.riskLevel === "low") {
    points.push("リスクが最小限に抑えられる");
  } else if (option.riskLevel === "medium") {
    points.push("リスクとリターンのバランスが取れている");
  }

  // 過去事例に基づく決め手
  if (option.relatedPastCases.length > 0) {
    points.push("類似の成功事例がある");
  }

  // 比較から優位性を抽出
  const uniqueAxes = [...new Set(comparisons.map(c => c.advantageAxis))];
  if (uniqueAxes.length > 0 && points.length < 3) {
    points.push(`${uniqueAxes[0]}面で優れている`);
  }

  return points.slice(0, 3);
}

// ============================================================
// Phase 10: 構造化された推奨根拠の生成
// ============================================================

/** リスク戦略ごとの根拠テンプレート */
const STRATEGY_RATIONALE_TEMPLATES: Record<RiskStrategy, RationaleItem> = {
  avoid: {
    type: "pmbok_risk",
    title: "リスク回避戦略",
    content: "この選択肢はリスクを根本から排除します。リスクの影響が許容できない場合に最適なアプローチです。",
    confidence: 80,
  },
  mitigate: {
    type: "pmbok_risk",
    title: "リスク軽減戦略",
    content: "この選択肢はリスクの発生確率または影響度を下げます。コストとリスク削減のバランスを取った現実的なアプローチです。",
    confidence: 75,
  },
  transfer: {
    type: "pmbok_risk",
    title: "リスク移転戦略",
    content: "この選択肢はリスク対応を外部に委ねます。専門性が必要な場合や、社内リソースが限られている場合に有効です。",
    confidence: 70,
  },
  accept: {
    type: "pmbok_risk",
    title: "リスク受容戦略",
    content: "この選択肢はリスクをそのまま受け入れます。影響が小さい場合や、対策コストがリスク影響を上回る場合に選択されます。",
    confidence: 60,
  },
};

/**
 * テンプレートベースの構造化された推奨根拠を生成（Phase 10.5で拡張）
 * @param option 推奨選択肢
 * @param decisionPoints 決め手サマリー（Phase 10.5）
 * @param comparisons 他選択肢との比較（Phase 10.5）
 */
function generateTemplateRationale(
  option: GeneratedOption,
  decisionPoints?: string[],
  comparisons?: AlternativeComparison[]
): StructuredRecommendationRationale {
  const strategy = option.riskStrategy ?? "accept";
  const primary = { ...STRATEGY_RATIONALE_TEMPLATES[strategy] };

  // 過去事例がある場合は副次的根拠として追加
  const secondary: RationaleItem[] = [];
  if (option.relatedPastCases.length > 0) {
    const pastCase = option.relatedPastCases[0];
    secondary.push({
      type: "past_case",
      title: "過去事例の参照",
      content: `類似の意思決定が「${pastCase.sourceFileName}」で行われており、類似度${pastCase.similarity}%の事例を参考にしています。`,
      confidence: pastCase.similarity,
    });
  }

  // Phase 13: QCDES観点の根拠を追加（「確度75%」の無意味な表現を廃止）
  if (option.qcdesImpact) {
    const impacts = option.qcdesImpact;
    const positiveAspects: string[] = [];
    const negativeAspects: string[] = [];

    // QCDES各項目の影響を集計
    if (impacts.quality?.impact === "positive") positiveAspects.push(`品質：${impacts.quality.description}`);
    if (impacts.cost?.impact === "positive") positiveAspects.push(`コスト：${impacts.cost.description}`);
    if (impacts.delivery?.impact === "positive") positiveAspects.push(`納期：${impacts.delivery.description}`);
    if (impacts.safety?.impact === "positive") positiveAspects.push(`安全：${impacts.safety.description}`);

    if (impacts.quality?.impact === "negative") negativeAspects.push(`品質：${impacts.quality.description}`);
    if (impacts.cost?.impact === "negative") negativeAspects.push(`コスト：${impacts.cost.description}`);
    if (impacts.delivery?.impact === "negative") negativeAspects.push(`納期：${impacts.delivery.description}`);

    // 良い影響がある場合に根拠として追加
    if (positiveAspects.length > 0) {
      const content = positiveAspects.join("、") +
        (negativeAspects.length > 0 ? `（注意点：${negativeAspects.join("、")}）` : "");
      secondary.push({
        type: "business_value",
        title: "QCDES観点",
        content,
        confidence: 80,
      });
    }
  }

  // Phase 13: 顧客観点の根拠を追加
  if (option.customerImpact) {
    const impacts = option.customerImpact;
    const descriptions: string[] = [];

    if (impacts.relationship?.impact === "positive") {
      descriptions.push(impacts.relationship.description);
    }
    if (impacts.satisfaction?.impact === "positive") {
      descriptions.push(impacts.satisfaction.description);
    }
    if (impacts.value?.impact === "positive") {
      descriptions.push(impacts.value.description);
    }
    // 注意点も含める
    if (impacts.relationship?.impact === "negative") {
      descriptions.push(`注意：${impacts.relationship.description}`);
    }

    if (descriptions.length > 0) {
      secondary.push({
        type: "context_fit",
        title: "顧客観点",
        content: descriptions.join("。"),
        confidence: 75,
      });
    }
  }

  // トレードオフ情報を生成
  const tradeoffs: { factor: string; impact: "positive" | "negative" | "neutral"; description: string }[] = [];

  if (option.riskLevel === "high") {
    tradeoffs.push({
      factor: "リスク",
      impact: "negative",
      description: "高リスクを伴う選択ですが、リターンも大きい可能性があります",
    });
  } else if (option.riskLevel === "low") {
    tradeoffs.push({
      factor: "リスク",
      impact: "positive",
      description: "低リスクで安定した選択です",
    });
  }

  if (strategy === "avoid") {
    tradeoffs.push({
      factor: "コスト",
      impact: "negative",
      description: "リスク回避のため、追加のコストや時間が必要になる場合があります",
    });
  }

  // サマリーを生成（Phase 13: 「高い確度」を廃止し、QCDES観点を追加）
  const summaryParts: string[] = [primary.title];
  if (option.riskLevel === "low") summaryParts.push("低リスク");
  if (option.relatedPastCases.length > 0) summaryParts.push("過去事例あり");
  // QCDES観点のサマリー
  if (option.qcdesImpact) {
    const positiveQcdes: string[] = [];
    if (option.qcdesImpact.quality?.impact === "positive") positiveQcdes.push("品質◎");
    if (option.qcdesImpact.cost?.impact === "positive") positiveQcdes.push("コスト◎");
    if (option.qcdesImpact.delivery?.impact === "positive") positiveQcdes.push("納期◎");
    if (positiveQcdes.length > 0) summaryParts.push(positiveQcdes.join(""));
  }
  // 顧客観点のサマリー
  if (option.customerImpact?.relationship?.impact === "positive") {
    summaryParts.push("顧客信頼◎");
  }

  return {
    summary: summaryParts.join(" / "),
    primary,
    secondary: secondary.length > 0 ? secondary : undefined,
    tradeoffs: tradeoffs.length > 0 ? tradeoffs : undefined,
    // Phase 10.5: 決め手サマリーと比較情報を追加
    decisionPoints: decisionPoints && decisionPoints.length > 0 ? decisionPoints : undefined,
    comparisons: comparisons && comparisons.length > 0 ? comparisons : undefined,
    // Phase 13: QCDES・顧客影響を追加
    qcdesImpact: option.qcdesImpact,
    customerImpact: option.customerImpact,
  };
}

// collectThreeSetData関数を再エクスポート（後方互換性のため）
export { collectThreeSetData };
