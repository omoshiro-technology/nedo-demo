"use client"
import { useState, useCallback, useEffect, useRef, useMemo } from "react";
import AgentSelector from "./AgentSelector";
import ChatMessages from "./ChatMessages";
import ChatInput from "./ChatInput";
import { DecisionNavigatorPanel } from "./DecisionNavigatorPanel";
import { DocumentViewerPanel } from "./DocumentViewerPanel";
import { SampleDataButtons } from "./SampleDataButtons";
import {
  getAgentWelcomeTitle,
  getAgentWelcomeDescription,
} from "./chatHelpers";
import {
  useProposalHandlers,
  useSimilarCaseHandlers,
  useKnowledgeTransferHandlers,
  useChatMessageHandlers,
  useSampleDataHandlers,
} from "./hooks";
import type { ActionLogEntry } from "../../types/agent";
import { useAgentState } from "../../hooks/useAgentState";
import type { AgentType, ChatMessage, AttachedData, DecisionNavigatorSuggestion, DecisionNavigatorResume } from "../../types/chat";
import type { AnalysisHistory, DecisionItem } from "../../types";
import type { Artifact } from "../../types/artifact";
import type { DecisionNavigatorCloseResult } from "../../types/decisionNavigator";
import { ChatMessageCallbacksProvider } from "./ChatMessageCallbacksContext";
import type { ChatMessageCallbacks } from "./ChatMessageCallbacksContext";
import { generateFeedforward } from "../../api/decisionAnalysis";
import { sendChatMessage } from "../../api/chat";
import { detectAgent } from "../../utils/agentDetector";
import { classifyDocumentAPI, extractFilePreview } from "../../api/agentDetector";
import type { ProposalInputData } from "../../types/chat";

type ChatPageProps = {
  selectedAgent: AgentType | null;
  messages: ChatMessage[];
  onSelectAgent: (agentType: AgentType) => void;
  onAddMessage: (
    content: string,
    role: "user" | "assistant",
    attachedData?: AttachedData,
    uploadedFiles?: string[],
    actionLogs?: ActionLogEntry[]
  ) => void;
  onStartSession: (agentType: AgentType) => void;
  onHistoryRefresh?: () => void;
  /** 履歴から読み込んだ分析結果（初期表示用） */
  loadedHistory?: AnalysisHistory | null;
};

export default function ChatPage({
  selectedAgent,
  messages,
  onSelectAgent,
  onAddMessage,
  onStartSession,
  onHistoryRefresh,
  loadedHistory,
}: ChatPageProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStatusText, setProcessingStatusText] = useState<string | undefined>(undefined);

  // エージェント状態管理（エージェント感強化）
  const {
    agentState,
    startPlanning,
    startExecuting,
    finishExecution,
    artifactUpdated,
    addAction,
    reset: resetAgentState,
    initializePlanSteps,
    advancePlanStep,
    setRouteResult,
  } = useAgentState();

  // 意思決定ナビゲーターの状態
  const [dnSidePanel, setDnSidePanel] = useState<{
    isOpen: boolean;
    initialData?: { purpose: string; currentSituation: string };
    skipPreconditionModal?: boolean;
    skipPastCasePanel?: boolean;
    presetSession?: any;
  } | null>(null);

  // ドキュメントビューアーパネルの状態
  const [documentPanel, setDocumentPanel] = useState<{
    content: string;
    fileName?: string;
    highlightText?: string;
  } | null>(null);

  // スプリッターのドラッグ状態（ドキュメントパネル幅を%で管理、初期値40% = 6:4）
  const [documentPanelWidth, setDocumentPanelWidth] = useState(40);
  const isDraggingRef = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // ホーム画面から送信された保留メッセージ（selectedAgent確立後に処理）
  const pendingMessageRef = useRef<{ message: string; files?: File[] } | null>(null);

  // AIアシスト用の入力欄プリフィルテキスト
  const [chatInputPrefill, setChatInputPrefill] = useState<string | undefined>(undefined);

  // フィードフォワード生成中フラグ
  const [feedforwardLoading, setFeedforwardLoading] = useState(false);

  // 最後のユーザーメッセージを保持（再試行用）
  const lastUserMessageRef = useRef<{ message: string; files?: File[] } | null>(null);

  // エージェント状態アクションをまとめたオブジェクト（子フックに渡す）
  const agentActions = useMemo(() => ({
    startPlanning,
    startExecuting,
    finishExecution,
    artifactUpdated,
    addAction,
    initializePlanSteps,
    advancePlanStep,
    setRouteResult,
  }), [startPlanning, startExecuting, finishExecution, artifactUpdated, addAction, initializePlanSteps, advancePlanStep, setRouteResult]);

  // カスタムフックを使用
  const {
    proposalCustomerContext,
    setProposalCustomerContext,
    handleSubmitProposalStep1,
    handleSubmitProposalStep2,
    handleRegenerateProposal,
    handleSelectNewProposal,
  } = useProposalHandlers({
    onAddMessage,
    messages,
    setIsProcessing,
    setProcessingStatusText,
  });

  const {
    similarCaseLoading,
    handleSearchSimilarCase,
    handleUseSimilarCaseForProposal,
    handleSelectSimilarCase,
  } = useSimilarCaseHandlers({
    onAddMessage,
    setProcessingStatusText,
  });

  const {
    ktStep,
    setKtStep,
    ktConditions,
    setKtConditions,
    ktPurpose,
    setKtPurpose,
    handleSelectDecisionCase,
    handleLaunchDecisionNavigatorFromTrend,
    handleRetryTrend,
    handleSkipDecisionCases,
    handleSubmitKTConditions,
    handleKnowledgeTransferAnswer,
  } = useKnowledgeTransferHandlers({
    onAddMessage,
    setDnSidePanel,
    setChatInputPrefill,
  });

  // メッセージ送信ハンドラー（分離したフック）
  const { handleSendMessage } = useChatMessageHandlers({
    selectedAgent,
    messages,
    onAddMessage,
    onHistoryRefresh,
    setIsProcessing,
    setProcessingStatusText,
    setDocumentPanel,
    documentPanel,
    agentActions,
    ktStep,
    handleKnowledgeTransferAnswer,
    lastUserMessageRef,
  });

  // サンプルデータハンドラー（分離したフック）
  const { handleSampleData, handleConfirmSampleData } = useSampleDataHandlers({
    selectedAgent,
    onAddMessage,
    onHistoryRefresh,
    setIsProcessing,
    setDocumentPanel,
    agentActions,
  });

  // スプリッターのドラッグ処理
  const handleSplitterMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDraggingRef.current = true;
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDraggingRef.current || !containerRef.current) return;

      const containerRect = containerRef.current.getBoundingClientRect();
      const containerWidth = containerRect.width;
      const mouseX = e.clientX - containerRect.left;

      // ドキュメントパネルは右側なので、残りの幅を計算
      const newDocumentWidth = ((containerWidth - mouseX) / containerWidth) * 100;

      // 20%〜60%の範囲に制限
      const clampedWidth = Math.max(20, Math.min(60, newDocumentWidth));
      setDocumentPanelWidth(clampedWidth);
    };

    const handleMouseUp = () => {
      if (isDraggingRef.current) {
        isDraggingRef.current = false;
        document.body.style.cursor = "";
        document.body.style.userSelect = "";
      }
    };

    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);

    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, []);

  // セッション（messages）が変わった時にパネルをリセット
  // 新しいチャットセッションを選択した場合、パネルは閉じる
  useEffect(() => {
    setDnSidePanel(null);
    setDocumentPanel(null);
  }, [messages.length === 0 ? 'empty' : messages[0]?.id]);

  // 意思決定ナビゲーター起動ハンドラー
  const handleLaunchDecisionNavigator = useCallback((suggestion: DecisionNavigatorSuggestion) => {
    setDnSidePanel({
      isOpen: true,
      initialData: {
        purpose: suggestion.purpose,
        currentSituation: suggestion.currentSituation,
      },
    });
  }, []);

  // 意思決定ナビパネルを閉じる（終了結果に応じてチャットにメッセージを追加）
  const handleCloseDnPanel = useCallback((result: DecisionNavigatorCloseResult) => {
    setDnSidePanel(null);

    // キャンセルの場合は何もしない
    if (result.reason === "cancelled") {
      return;
    }

    // 完了の場合: 決定内容をチャットに表示
    if (result.reason === "completed" && result.finalDecision) {
      const { value, rationale, satisfiedConditions } = result.finalDecision;
      let message = `意思決定ナビで「${result.purpose}」を完了しました。\n\n`;
      message += `**決定内容:** ${value}\n`;
      if (rationale) {
        message += `**理由:** ${rationale}\n`;
      }
      if (satisfiedConditions && satisfiedConditions.length > 0) {
        message += `**満たした条件:** ${satisfiedConditions.join(", ")}\n`;
      }
      message += `\nこの決定について質問があればお聞きください。例えば「この決定を議事録に追記して」「他の選択肢との比較を教えて」などと続けられます。`;

      onAddMessage(message, "assistant");
      return;
    }

    // 途中終了の場合: 再開カードを表示
    if (result.reason === "in_progress") {
      const hasDecision = result.progress && result.progress.selectedNodes > 0;
      const attachedData: AttachedData = {
        type: "decision_navigator_resume",
        data: {
          purpose: result.purpose || "",
          isDecided: false,
          lastSelection: result.progress?.lastSelectedNode,
          sessionId: result.sessionId,
        },
      };

      onAddMessage(
        hasDecision
          ? `意思決定ナビを中断しました。最後の選択: ${result.progress?.lastSelectedNode || "なし"}`
          : "意思決定ナビを中断しました。",
        "assistant",
        attachedData
      );
      return;
    }
  }, [onAddMessage]);

  // 意思決定ナビを再開するハンドラー（同じテーマで再開）
  const handleResumeDecisionNavigator = useCallback((resume: DecisionNavigatorResume) => {
    // 同じテーマで再開（現時点では最初からやり直し、将来的にはセッション復元）
    setDnSidePanel({
      isOpen: true,
      initialData: {
        purpose: resume.purpose,
        currentSituation: "",
      },
    });
  }, []);

  // ドキュメントパネルを閉じるハンドラー
  const handleCloseDocumentPanel = useCallback(() => {
    setDocumentPanel(null);
  }, []);

  // 成果物採用ハンドラー
  const handleAcceptArtifact = useCallback(
    (artifact: Artifact) => {
      // 採用メッセージを会話に追加
      const artifactTypeLabel =
        artifact.type === "FTA"
          ? "FTA分析結果"
          : artifact.type === "MINUTES"
            ? "議事録分析結果"
            : "意思決定ログ";
      onAddMessage(
        `${artifactTypeLabel}を採用しました。この内容を基に追加の質問があればお聞きください。`,
        "assistant"
      );
    },
    [onAddMessage]
  );

  // 成果物修正依頼ハンドラー
  const handleReviseArtifact = useCallback(
    async (artifact: Artifact, instruction: string) => {
      // ユーザーの修正依頼を会話に追加
      onAddMessage(`修正依頼: ${instruction}`, "user");

      // エージェント状態を修正中に
      startPlanning("修正中", selectedAgent || "unified_analysis");
      addAction("generate", "修正", instruction, "ok");
      startExecuting();

      // 注: 実際のLLM再生成は将来の実装で追加
      // 現時点ではフィードバックメッセージのみ
      onAddMessage(
        `修正依頼を受け付けました: 「${instruction}」\n\n※現在の実装では自動修正はサポートされていません。手動で内容を確認してください。`,
        "assistant"
      );

      // エージェント状態をリセット
      resetAgentState();
    },
    [onAddMessage, selectedAgent, startPlanning, addAction, startExecuting, resetAgentState]
  );

  const handleAgentSelect = useCallback(
    (agentType: AgentType) => {
      onSelectAgent(agentType);
      onStartSession(agentType);
    },
    [onSelectAgent, onStartSession]
  );

  // エラー再試行ハンドラー
  const handleRetryError = useCallback(() => {
    if (lastUserMessageRef.current) {
      const { message, files } = lastUserMessageRef.current;
      if (message || (files && files.length > 0)) {
        setChatInputPrefill(message || "ファイルを再分析します");
      }
    }
  }, []);

  // 意思決定項目のAIアシスト要求ハンドラー
  const handleAskAIForDecision = useCallback(
    (decision: DecisionItem) => {
      const statusLabel = decision.status === "gray" ? "グレー（未確定）" : "提案段階";

      const ambiguityText = decision.ambiguityFlags && decision.ambiguityFlags.length > 0
        ? `\n\n【未確定の理由】\n${decision.ambiguityFlags.map(f => `・${f}`).join("\n")}`
        : "";

      const guidanceText = decision.guidance?.requiredActions && decision.guidance.requiredActions.length > 0
        ? `\n\n【確定に必要なアクション】\n${decision.guidance.requiredActions.map((a, i) => `${i + 1}. ${a}`).join("\n")}`
        : "";

      const message = `以下の「${statusLabel}」の意思決定項目を確定させるための具体的なアクションや進め方を教えてください。

【決定内容】
${decision.content}${ambiguityText}${guidanceText}`;

      handleSendMessage(message, []);
    },
    [handleSendMessage]
  );

  // フィードフォワード生成ハンドラー
  const handleGenerateFeedforward = useCallback(async () => {
    const decisionMessage = [...messages].reverse().find(
      (m) => m.attachedData?.type === "decision_result"
    );
    if (!decisionMessage || decisionMessage.attachedData?.type !== "decision_result") {
      return;
    }

    const result = decisionMessage.attachedData.data;
    if (!result.decisions || result.decisions.length === 0) {
      return;
    }

    onAddMessage("次にやることをまとめて", "user");

    setFeedforwardLoading(true);
    setIsProcessing(true);

    try {
      const context = result.extractedTexts
        ?.map((t) => t.text)
        .join("\n\n---\n\n") || "";

      const feedforward = await generateFeedforward(result.decisions, context);

      onAddMessage(
        "決定事項から「次にやること」をまとめました。",
        "assistant",
        { type: "global_feedforward", data: feedforward }
      );
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "フィードフォワード生成に失敗しました。";
      onAddMessage(`エラー: ${errorMessage}`, "assistant");
    } finally {
      setFeedforwardLoading(false);
      setIsProcessing(false);
    }
  }, [messages, onAddMessage]);

  // フィードフォワードが既に生成されているかどうか
  const feedforwardGenerated = useMemo(() => {
    return messages.some((m) => m.attachedData?.type === "global_feedforward");
  }, [messages]);

  // ChatMessages callback context (memoized to avoid unnecessary re-renders)
  // NOTE: Must be placed before any conditional returns to respect Rules of Hooks
  const chatMessageCallbacks = useMemo<ChatMessageCallbacks>(() => ({
    onLaunchDecisionNavigator: handleLaunchDecisionNavigator,
    onConfirmSampleData: handleConfirmSampleData,
    onHighlightRequest: (sourceText: string) => {
      if (documentPanel) {
        setDocumentPanel({
          ...documentPanel,
          highlightText: sourceText,
        });
      } else {
        const decisionResultMsg = messages.find(
          (m) => m.attachedData?.type === "decision_result"
        );
        if (decisionResultMsg?.attachedData?.type === "decision_result") {
          const result = decisionResultMsg.attachedData.data;
          if (result.extractedTexts && result.extractedTexts.length > 0) {
            setDocumentPanel({
              content: result.extractedTexts[0].text,
              fileName: result.extractedTexts[0].fileName,
              highlightText: sourceText,
            });
          }
        }
      }
    },
    onAcceptArtifact: handleAcceptArtifact,
    onReviseArtifact: handleReviseArtifact,
    onResumeDecisionNavigator: handleResumeDecisionNavigator,
    onAskAIForDecision: handleAskAIForDecision,
    onAnswerAIQuestion: (question: string) => {
      setChatInputPrefill(`${question}\n\n→ `);
    },
    onRetryError: handleRetryError,
    onSelectChoice: (choice) => {
      handleSendMessage(`${choice.number} ${choice.label}`, []);
    },
    onSelectOtherChoice: (customInput: string) => {
      handleSendMessage(customInput, []);
    },
    onSelectDecisionCase: handleSelectDecisionCase,
    onLaunchDecisionNavigatorFromTrend: handleLaunchDecisionNavigatorFromTrend,
    onRetryTrend: handleRetryTrend,
    onSkipDecisionCases: handleSkipDecisionCases,
    onSubmitKTConditions: handleSubmitKTConditions,
    onGenerateFeedforward: handleGenerateFeedforward,
    onSubmitProposalStep1: handleSubmitProposalStep1,
    onSubmitProposalStep2: handleSubmitProposalStep2,
    onRegenerateProposal: handleRegenerateProposal,
    onSearchSimilarCase: handleSearchSimilarCase,
    onUseSimilarCaseForProposal: handleUseSimilarCaseForProposal,
    onSelectSimilarCase: handleSelectSimilarCase,
    onSelectNewProposal: handleSelectNewProposal,
  }), [
    handleLaunchDecisionNavigator,
    handleConfirmSampleData,
    documentPanel,
    messages,
    handleAcceptArtifact,
    handleReviseArtifact,
    handleResumeDecisionNavigator,
    handleAskAIForDecision,
    handleRetryError,
    handleSendMessage,
    handleSelectDecisionCase,
    handleLaunchDecisionNavigatorFromTrend,
    handleRetryTrend,
    handleSkipDecisionCases,
    handleSubmitKTConditions,
    handleGenerateFeedforward,
    handleSubmitProposalStep1,
    handleSubmitProposalStep2,
    handleRegenerateProposal,
    handleSearchSimilarCase,
    handleUseSimilarCaseForProposal,
    handleSelectSimilarCase,
    handleSelectNewProposal,
  ]);

  // Show loaded history as initial message
  const displayMessages = loadedHistory
    ? [
        {
          id: "loaded-history",
          role: "assistant" as const,
          content: `「${loadedHistory.fileName}」の分析結果を表示しています。`,
          timestamp: new Date(loadedHistory.analyzedAt).getTime(),
          attachedData: {
            type: "analysis_result" as const,
            data: loadedHistory.result,
            fileName: loadedHistory.fileName,
          },
        },
        ...messages,
      ]
    : messages;

  // Handle submit from AgentSelector (auto-detected agent)
  // セッション開始後、useEffectでhandleSendMessageを呼び出す
  const handleAgentSubmit = useCallback(
    async (message: string, files?: File[], agentType?: AgentType) => {
      let detectedType: AgentType;

      if (agentType) {
        detectedType = agentType;
      } else if (files && files.length > 0) {
        try {
          setIsProcessing(true);
          setProcessingStatusText("ドキュメントを分析中...");

          const file = files[0];
          const preview = await extractFilePreview(file);
          const classificationResult = await classifyDocumentAPI(
            preview,
            file.name,
            message
          );

          detectedType = classificationResult.suggestedAgent;
        } catch (error) {
          console.warn("[AgentDetector] LLM classification failed, falling back to keyword-based detection:", error);
          detectedType = detectAgent(message, files);
        } finally {
          setIsProcessing(false);
          setProcessingStatusText(undefined);
        }
      } else {
        detectedType = detectAgent(message, files);
      }

      onSelectAgent(detectedType);
      onStartSession(detectedType);

      pendingMessageRef.current = { message, files };
    },
    [onSelectAgent, onStartSession]
  );

  // selectedAgentが確立されたら保留メッセージを処理
  useEffect(() => {
    if (selectedAgent && pendingMessageRef.current) {
      const { message, files } = pendingMessageRef.current;
      pendingMessageRef.current = null;

      // サンプルデータの検出
      const isSampleMeetingMinutes = message.includes("【サンプル議事録データ】");
      const isSampleTroubleReport = message.includes("【サンプル報告書データ】");
      // 技術伝承デモの検出
      const isKnowledgeTransferDemo = message.includes("【技術伝承デモ】");
      // 提案書デモの検出
      const isProposalDemo = message.includes("提案を作成したい") || message.includes("提案書を作成");

      if (isProposalDemo) {
        onAddMessage(message, "user");

        const inputData: ProposalInputData = {
          step: 0,
        };
        onAddMessage(
          "提案書を作成します。まず過去の類似を探しますか？それとも新規作成しますか？",
          "assistant",
          { type: "proposal_input", data: inputData }
        );
      } else if (isKnowledgeTransferDemo) {
        onAddMessage(message, "user");

        const extractedPurpose = message
          .replace("【技術伝承デモ】", "")
          .split("。")[0]
          .trim();
        setKtPurpose(extractedPurpose || "特許出願方針に影響する条件の整理");

        (async () => {
          setIsProcessing(true);
          setProcessingStatusText("質問を理解しています...");

          try {
            const response = await sendChatMessage(
              [
                ...messages.map((m) => ({
                  role: m.role as "user" | "assistant",
                  content: m.content,
                })),
                { role: "user" as const, content: extractedPurpose },
              ],
              false,
              false
            );

            const attachedData: AttachedData = {
              type: "knowledge_transfer_questions",
              data: null,
            };
            onAddMessage(response.reply, "assistant", attachedData);

            setKtStep("asking_frequency");
            setKtConditions({});
          } catch (error) {
            console.error("LLM応答生成エラー:", error);
            const conditionMatch = extractedPurpose.match(/(.+)を決める(?:ため)?(?:に)?(?:は)?.*?(?:条件|要素|因子)(?:が)?(?:影響|関係|必要)/);
            const goalPurpose = conditionMatch
              ? `${conditionMatch[1].trim()}の判断条件を整理する`
              : extractedPurpose || "特許出願方針に影響する条件の整理";

            const attachedData: AttachedData = {
              type: "knowledge_transfer_questions",
              data: null,
            };
            onAddMessage(
              `承知しました。${goalPurpose}ため、いくつか確認させてください。`,
              "assistant",
              attachedData
            );

            setKtStep("asking_frequency");
            setKtConditions({});
          } finally {
            setIsProcessing(false);
            setProcessingStatusText(undefined);
          }
        })();
      } else if (isSampleMeetingMinutes || isSampleTroubleReport) {
        const fileNames = files?.map((f) => f.name);
        onAddMessage(message || "ファイルを分析します", "user", undefined, fileNames);

        if (isSampleMeetingMinutes) {
          const attachedData: AttachedData = {
            type: "sample_data_confirmation",
            data: {
              sampleDataId: "meeting_minutes",
              label: "サンプル議事録",
              description: "設備更新プロジェクトの議事録データを分析し、意思決定を抽出します。",
            },
          };
          onAddMessage(
            "サンプル議事録データを使用して分析を行います。",
            "assistant",
            attachedData
          );
        } else {
          const attachedData: AttachedData = {
            type: "sample_data_confirmation",
            data: {
              sampleDataId: "trouble_report",
              label: "サンプル報告書",
              description: "過去トラ報告書を構造解析し、知見を可視化します。",
            },
          };
          onAddMessage(
            "サンプル報告書データを使用して分析を行います。",
            "assistant",
            attachedData
          );
        }
      } else {
        handleSendMessage(message, files);
      }
    }
  }, [selectedAgent, handleSendMessage, onAddMessage]);

  // DN用チャット履歴（条件分岐前に計算）
  const chatHistoryForDN = messages
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  return (
    <>
      {!selectedAgent ? (
        // ホーム画面: エージェント選択 + シナリオ切替
        <div className="chat-page chat-page--home">
          <AgentSelector
            onSelectAgent={handleAgentSelect}
            onSubmit={handleAgentSubmit}
          />
          <div style={{ display: "flex", justifyContent: "center", marginTop: "16px" }}>
            <button
              onClick={async () => {
                try {
                  const res = await fetch("/preset-conferences/nedo-demo-decision-session.json");
                  if (!res.ok) return;
                  const presetData = await res.json();
                  setDnSidePanel({
                    isOpen: true,
                    initialData: { purpose: presetData.purpose, currentSituation: "" },
                    skipPreconditionModal: true,
                    skipPastCasePanel: true,
                    presetSession: presetData,
                  });
                } catch (e) {
                  console.error("Failed to load preset:", e);
                }
              }}
              style={{
                padding: "8px 20px",
                borderRadius: "8px",
                border: "1px solid #1f7a6d",
                backgroundColor: "#e8f1f0",
                color: "#1f7a6d",
                fontSize: "14px",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              📋 NEDOデモ（意思決定キャンバス）
            </button>
          </div>
        </div>
      ) : dnSidePanel?.isOpen ? (
        // 意思決定ナビゲーター全画面
        <DecisionNavigatorPanel
          initialPurpose={dnSidePanel.initialData?.purpose}
          initialSituation={dnSidePanel.initialData?.currentSituation}
          chatHistory={chatHistoryForDN}
          onClose={handleCloseDnPanel}
          skipPreconditionModal={dnSidePanel.skipPreconditionModal}
          skipPastCasePanel={dnSidePanel.skipPastCasePanel}
          preCollectedConditions={ktConditions}
          presetSession={dnSidePanel.presetSession}
        />
      ) : (
        // 通常のチャット画面
        <div className={`chat-page${documentPanel ? " chat-page--with-document" : ""}`}>
          <div className="chat-page__body" ref={containerRef}>
            <div
              className="chat-page__main"
              style={documentPanel ? { width: `${100 - documentPanelWidth}%` } : undefined}
            >
              <div className="chat-page__messages">
                {displayMessages.length === 0 ? (
                  <div className="chat-page__welcome">
                    <h2>{getAgentWelcomeTitle(selectedAgent)}</h2>
                    <p className="muted">{getAgentWelcomeDescription(selectedAgent)}</p>
                    <SampleDataButtons
                      agentType={selectedAgent}
                      isProcessing={isProcessing}
                      onSampleSelect={handleSampleData}
                    />
                  </div>
                ) : (
                  <ChatMessageCallbacksProvider callbacks={chatMessageCallbacks}>
                    <ChatMessages
                      messages={displayMessages}
                      isProcessing={isProcessing}
                      processingStatus={processingStatusText}
                      actionLogs={agentState.actions.length > 0 ? agentState.actions : undefined}
                      feedforwardLoading={feedforwardLoading}
                      feedforwardGenerated={feedforwardGenerated}
                      similarCaseLoading={similarCaseLoading}
                    />
                  </ChatMessageCallbacksProvider>
                )}
              </div>

              <div className="chat-page__input">
                <ChatInput
                  agentType={selectedAgent}
                  isProcessing={isProcessing}
                  onSendMessage={handleSendMessage}
                  prefillText={chatInputPrefill}
                  onPrefillCleared={() => setChatInputPrefill(undefined)}
                />
              </div>
            </div>
            {documentPanel && (
              <>
                <div
                  className="chat-page__splitter"
                  onMouseDown={handleSplitterMouseDown}
                />
                <div
                  className="chat-page__document-area"
                  style={{ width: `${documentPanelWidth}%` }}
                >
                  <DocumentViewerPanel
                    content={documentPanel.content}
                    fileName={documentPanel.fileName}
                    highlightText={documentPanel.highlightText}
                    onClose={handleCloseDocumentPanel}
                  />
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
