/**
 * 意思決定ナビゲーターのセッション管理フック
 *
 * セッション作成・初期化・条件管理・Phase 5の状態を一元管理する。
 * 以前 DecisionNavigatorPanel.tsx に散在していた3箇所のセッション作成ロジック
 * (startSessionDirectly, handlePreconditionConfirm, handlePreconditionClose) を
 * 単一の createAndInitializeSession() に統合。
 */

import { useState, useCallback, useEffect, useRef } from "react";
import type {
  DecisionNavigatorSession,
  InitialLayout,
  ThinkingBox,
  GoalCompassState,
  ClarificationQuestion,
  PreconditionClarificationAnswer,
  SimulationCondition,
  PastCaseReference,
} from "../../../types/decisionNavigator";
import type { ExtractedPrecondition } from "../../decisionNavigator/PreconditionModal";
import type { KnowledgeTransferConditions } from "../../../types/chat";
import * as api from "../../../api/decisionNavigator";
import { useDemoScenario } from "../../../data/DemoScenarioContext";
import { extractPreconditionsFromChat } from "../utils/preconditionExtractor";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

type UseDecisionNavigatorSessionParams = {
  initialPurpose?: string;
  initialSituation?: string;
  chatHistory?: ChatMessage[];
  usePhase5UI: boolean;
  skipPreconditionModal: boolean;
  preCollectedConditions?: KnowledgeTransferConditions;
};

export function useDecisionNavigatorSession({
  initialPurpose,
  initialSituation,
  chatHistory,
  usePhase5UI,
  skipPreconditionModal,
  preCollectedConditions,
}: UseDecisionNavigatorSessionParams) {
  const { scenario } = useDemoScenario();
  // === 共通状態 ===
  const [session, setSession] = useState<DecisionNavigatorSession | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // セッション初期化が進行中かどうかを追跡（React Strict Modeでの二重実行を防止）
  const isSessionInitializingRef = useRef(false);

  // === Phase 5 状態 ===
  const [initialLayout, setInitialLayout] = useState<InitialLayout | null>(null);
  const [thinkingBox, setThinkingBox] = useState<ThinkingBox | null>(null);
  const [goalCompass, setGoalCompass] = useState<GoalCompassState | null>(null);
  const [isPhase5Active, setIsPhase5Active] = useState(usePhase5UI);
  const [isTerminal, setIsTerminal] = useState(false);
  const [finalDecision, setFinalDecision] = useState<{
    value: string;
    rationale: string;
    satisfiedConditions: string[];
  } | null>(null);

  // === Phase 5改改: 前提条件モーダルの状態 ===
  const [isPreconditionModalOpen, setIsPreconditionModalOpen] = useState(false);
  const [extractedPreconditions, setExtractedPreconditions] = useState<ExtractedPrecondition[]>([]);
  const [confirmedPreconditions, setConfirmedPreconditions] = useState<ExtractedPrecondition[]>([]);
  const [additionalPreconditionContext, setAdditionalPreconditionContext] = useState("");

  // === Phase 5改改改: 確認質問の状態 ===
  const [clarificationQuestions, setClarificationQuestions] = useState<ClarificationQuestion[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // === Phase 9: シミュレーション条件・過去事例の状態 ===
  const [simulationConditions, setSimulationConditions] = useState<SimulationCondition[]>([]);
  const [allAvailableConditions, setAllAvailableConditions] = useState<SimulationCondition[]>([]);
  const [pastCases, setPastCases] = useState<PastCaseReference[]>([]);
  const [isConditionsLoading, setIsConditionsLoading] = useState(false);

  // === Phase 9: ダミーの条件と過去事例データを設定 + 自動再生成 ===
  const initializeDummyConditionsAndCases = useCallback(async (newSession: DecisionNavigatorSession) => {
    // アクティブな条件（チャットで選択されたもの）
    const conditions = scenario.createConditions(preCollectedConditions);
    setSimulationConditions(conditions);

    // 全ての利用可能な条件（詳細設定で追加・削除可能）
    const allConditions = scenario.createAllConditions(preCollectedConditions);
    setAllAvailableConditions(allConditions);
    setPastCases(scenario.pastCases);

    // 条件を反映したセッション再生成（条件パネルの条件をLLMに渡す）
    try {
      console.log("[Phase 9] Auto-regenerating session with conditions:", conditions.map(c => `${c.label}: ${c.value}`).join(", "));
      const regeneratedSession = await api.regenerateSession(newSession.id, conditions);
      setSession(regeneratedSession);
      console.log("[Phase 9] Session auto-regenerated successfully");
    } catch (err) {
      console.error("[Phase 9] Session auto-regeneration failed:", err);
      // 失敗しても元のセッションは維持
    }
  }, [preCollectedConditions, scenario]);

  // === 統合セッション作成関数 ===
  // 以前3箇所に散在していたセッション作成ロジックを統合
  const createAndInitializeSession = useCallback(async (
    purpose: string,
    situation?: string,
    preconditionData?: {
      conditions: Array<{
        id: string;
        label: string;
        category: string;
        detail?: string;
        isSelected: boolean;
      }>;
      additionalContext?: string;
    },
    skipClarification?: boolean,
  ) => {
    setIsLoading(true);
    setError(null);

    try {
      // 1. セッション作成
      const newSession = await api.createSession(
        purpose,
        undefined,
        situation,
        preconditionData,
        skipClarification,
      );
      setSession(newSession);

      // 2. ダミーの条件と過去事例データを設定 + 自動再生成
      await initializeDummyConditionsAndCases(newSession);

      // 3. Phase 5が有効な場合、思考ボックスを初期化
      if (usePhase5UI) {
        try {
          const phase5Response = await api.initThinkingBox(
            newSession.id,
            purpose,
            situation
          );
          setInitialLayout(phase5Response.initialLayout);
          setThinkingBox(phase5Response.thinkingBox);
          setGoalCompass(phase5Response.goalCompass);
          setIsPhase5Active(true);
        } catch (phase5Error) {
          console.warn("Phase 5 API failed, falling back to legacy UI:", phase5Error);
          setIsPhase5Active(false);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "エラーが発生しました");
      throw err; // 呼び出し元でエラー処理できるように再throw
    } finally {
      setIsLoading(false);
    }
  }, [usePhase5UI, initializeDummyConditionsAndCases]);

  // === Phase 6: 前提条件モーダルを表示してからセッション開始 ===
  useEffect(() => {
    // React Strict Modeでの二重実行を防止
    if (isSessionInitializingRef.current) return;
    if (!initialPurpose || session || isLoading || isPreconditionModalOpen) return;

    // skipPreconditionModalが有効な場合は直接セッション開始
    if (skipPreconditionModal) {
      const startSessionDirectly = async () => {
        isSessionInitializingRef.current = true;
        try {
          await createAndInitializeSession(
            initialPurpose,
            initialSituation,
            undefined,    // preconditions
            true          // skipClarification - 技術伝承デモ等で動的フロー生成を強制
          );
        } catch {
          // エラー時はフラグをリセット（再試行を許可）
          isSessionInitializingRef.current = false;
        }
      };
      startSessionDirectly();
      return;
    }

    // 前提条件を抽出してモーダルを表示
    const showPreconditionModal = async () => {
      isSessionInitializingRef.current = true;

      // Phase 6: チャット履歴から前提条件を自動抽出
      const conditions = extractPreconditionsFromChat(initialPurpose, chatHistory);
      setExtractedPreconditions(conditions);
      setIsPreconditionModalOpen(true);

      // Phase 6: チャット履歴のテキストを生成（確認質問APIに渡す）
      const chatContext = chatHistory
        ?.filter((m) => m.role === "user")
        .map((m) => m.content)
        .join("\n") ?? initialSituation;

      // Phase 5改改改: 確認質問を非同期で取得（チャット履歴を渡して重複排除）
      setIsLoadingQuestions(true);
      try {
        const response = await api.generateClarificationQuestions(
          initialPurpose,
          chatContext
        );
        setClarificationQuestions(response.questions);
      } catch (err) {
        console.warn("確認質問の取得に失敗:", err);
        setClarificationQuestions([]);
      } finally {
        setIsLoadingQuestions(false);
      }
    };

    showPreconditionModal();
  }, [initialPurpose, initialSituation, chatHistory, session, isLoading, isPreconditionModalOpen, skipPreconditionModal, createAndInitializeSession]);

  // === Phase 5改改: 前提条件確定後にセッション開始 ===
  const handlePreconditionConfirm = useCallback(
    async (
      preconditions: ExtractedPrecondition[],
      additionalContext: string,
      clarificationAnswers?: PreconditionClarificationAnswer[]
    ) => {
      setIsPreconditionModalOpen(false);
      setConfirmedPreconditions(preconditions);
      setAdditionalPreconditionContext(additionalContext);
      setClarificationQuestions([]); // モーダルを閉じたらクリア

      // 確認質問の回答から追加コンテキストを生成
      let enrichedContext = additionalContext;
      if (clarificationAnswers && clarificationAnswers.length > 0) {
        const answersText = clarificationAnswers
          .filter(a => a.answer !== "skip")
          .map(a => {
            const question = clarificationQuestions.find(q => q.id === a.questionId);
            const answerText = a.answer === "yes" ? "はい" : "いいえ";
            const detail = a.detail ? ` (${a.detail})` : "";
            return `Q: ${question?.question ?? "?"} → ${answerText}${detail}`;
          })
          .join("\n");
        if (answersText) {
          enrichedContext = enrichedContext
            ? `${enrichedContext}\n\n【確認事項】\n${answersText}`
            : `【確認事項】\n${answersText}`;
        }
      }

      // 前提条件をセッション作成に渡す
      const preconditionData = {
        conditions: preconditions.filter(p => p.isSelected || p.detail?.trim()).map(p => ({
          id: p.id,
          label: p.label,
          category: p.category,
          detail: p.detail,
          isSelected: p.isSelected,
        })),
        additionalContext: enrichedContext,
      };

      try {
        await createAndInitializeSession(
          initialPurpose || "",
          initialSituation,
          preconditionData,
        );
      } catch {
        // エラーは createAndInitializeSession 内で setError済み
      }
    },
    [initialPurpose, initialSituation, clarificationQuestions, createAndInitializeSession]
  );

  // === Phase 5改改: 前提条件モーダルをキャンセル（前提条件なしで開始） ===
  const handlePreconditionClose = useCallback(async () => {
    setIsPreconditionModalOpen(false);

    try {
      await createAndInitializeSession(
        initialPurpose || "",
        initialSituation,
      );
    } catch {
      // エラーは createAndInitializeSession 内で setError済み
    }
  }, [initialPurpose, initialSituation, createAndInitializeSession]);

  // === 従来UI: セッション開始（手動用） ===
  const handleStartSession = useCallback(
    async (purpose: string, currentSituation?: string) => {
      try {
        await createAndInitializeSession(purpose, currentSituation);
      } catch {
        // エラーは createAndInitializeSession 内で setError済み
      }
    },
    [createAndInitializeSession]
  );

  // === Phase 9: 条件変更ハンドラ ===
  const handleConditionChange = useCallback(
    async (conditionId: string, newValue: string) => {
      if (!session) return;

      // 条件を更新（ローカル状態）
      const updatedConditions = simulationConditions.map((c) =>
        c.id === conditionId ? { ...c, value: newValue } : c
      );
      setSimulationConditions(updatedConditions);

      // APIを呼び出してセッションを再生成
      setIsLoading(true);
      setError(null);

      try {
        console.log(`[Phase 9] Condition changed: ${conditionId} -> ${newValue}, regenerating session...`);
        const regeneratedSession = await api.regenerateSession(session.id, updatedConditions);
        setSession(regeneratedSession);
        console.log("[Phase 9] Session regenerated successfully");
      } catch (err) {
        console.error("[Phase 9] Session regeneration failed:", err);
        setError(err instanceof Error ? err.message : "条件変更による再生成に失敗しました");
      } finally {
        setIsLoading(false);
      }
    },
    [session, simulationConditions]
  );

  // === Phase 9: 詳細設定変更ハンドラ（条件の追加・削除） ===
  const handleDetailedSettingsChange = useCallback(
    async (updatedConditions: SimulationCondition[]) => {
      if (!session) return;

      // ローカル状態を更新
      setSimulationConditions(updatedConditions);

      // APIを呼び出してセッションを再生成
      setIsLoading(true);
      setError(null);

      try {
        console.log(`[Phase 9] Detailed settings changed, ${updatedConditions.length} conditions, regenerating session...`);
        const regeneratedSession = await api.regenerateSession(session.id, updatedConditions);
        setSession(regeneratedSession);
        console.log("[Phase 9] Session regenerated successfully");
      } catch (err) {
        console.error("[Phase 9] Session regeneration failed:", err);
        setError(err instanceof Error ? err.message : "詳細設定変更による再生成に失敗しました");
      } finally {
        setIsLoading(false);
      }
    },
    [session]
  );

  return {
    // Session state
    session,
    setSession,
    isLoading,
    setIsLoading,
    error,
    setError,

    // Phase 5 state
    initialLayout,
    thinkingBox,
    setThinkingBox,
    goalCompass,
    setGoalCompass,
    isPhase5Active,
    setIsPhase5Active,
    isTerminal,
    setIsTerminal,
    finalDecision,
    setFinalDecision,

    // Precondition state
    isPreconditionModalOpen,
    setIsPreconditionModalOpen,
    extractedPreconditions,
    confirmedPreconditions,
    additionalPreconditionContext,
    clarificationQuestions,
    isLoadingQuestions,

    // Simulation conditions / past cases
    simulationConditions,
    allAvailableConditions,
    pastCases,
    isConditionsLoading,

    // Handlers
    handlePreconditionConfirm,
    handlePreconditionClose,
    handleStartSession,
    handleConditionChange,
    handleDetailedSettingsChange,
  };
}
