/**
 * チャットメッセージ送信ハンドラー
 * ChatPage.tsxの handleSendMessage から分離した各処理ブランチ
 */

import { useCallback } from "react";
import type { ActionLogEntry } from "../../../types/agent";
import type { AgentType, ChatMessage, AttachedData } from "../../../types/chat";
import type { AnalysisResult } from "../../../types";
import { createActionLogger, createProgressUpdater, buildMessageContent } from "../chatHelpers";
import { analyzeDocument } from "../../../api/analyze";
import { analyzeDecisions } from "../../../api/decisionAnalysis";
import { saveHistory } from "../../../api/history";
import { sendChatMessage, type ChatMessage as ApiChatMessage } from "../../../api/chat";
import { extractFilePreview } from "../../../api/agentDetector";
import { detectTemplateIntent, suggestTemplates, generateOutput } from "../../../api/outputTemplate";

type AgentStateActions = {
  startPlanning: (goal: string, mode: string) => void;
  startExecuting: () => void;
  finishExecution: () => void;
  artifactUpdated: (id: string, type: string) => void;
  addAction: (actionType: ActionLogEntry["actionType"], target: string, message: string, result: string, errorDetail?: string) => void;
  initializePlanSteps: (steps: Array<{ label: string }>) => void;
  advancePlanStep: (detail?: string) => void;
  setRouteResult: (result: unknown) => void;
};

type UseChatMessageHandlersProps = {
  selectedAgent: AgentType | null;
  messages: ChatMessage[];
  onAddMessage: (
    content: string,
    role: "user" | "assistant",
    attachedData?: AttachedData,
    uploadedFiles?: string[],
    actionLogs?: ActionLogEntry[]
  ) => void;
  onHistoryRefresh?: () => void;
  setIsProcessing: (value: boolean) => void;
  setProcessingStatusText: (value: string | undefined) => void;
  setDocumentPanel: (panel: { content: string; fileName?: string; highlightText?: string } | null) => void;
  documentPanel: { content: string; fileName?: string; highlightText?: string } | null;
  agentActions: AgentStateActions;
  ktStep: string;
  handleKnowledgeTransferAnswer: (message: string) => Promise<boolean>;
  lastUserMessageRef: React.MutableRefObject<{ message: string; files?: File[] } | null>;
};

/**
 * 議事録分析フロー（unified_analysisエージェントでファイルアップロード時）
 */
function useMinutesAnalysisHandler({
  selectedAgent,
  onAddMessage,
  setIsProcessing,
  setProcessingStatusText,
  setDocumentPanel,
  agentActions,
}: Pick<
  UseChatMessageHandlersProps,
  "selectedAgent" | "onAddMessage" | "setIsProcessing" | "setProcessingStatusText" | "setDocumentPanel" | "agentActions"
>) {
  return useCallback(
    async (file: File) => {
      const [localActionLogs, addLocalAction] = createActionLogger();

      setProcessingStatusText("議事録を読み込み中...");
      setIsProcessing(true);

      // ファイルからテキストを抽出してドキュメントパネルに表示
      const filePreview = await extractFilePreview(file, 10000);
      if (filePreview && !filePreview.startsWith("[ファイル:")) {
        setDocumentPanel({
          content: filePreview,
          fileName: file.name,
        });
      }

      // 計画ステップを初期化
      agentActions.startPlanning(`${file.name}を分析`, selectedAgent || "unified_analysis");
      agentActions.initializePlanSteps([
        { label: "議事録読込" },
        { label: "意思決定抽出" },
      ]);
      agentActions.addAction("parse", "文書読込", `「${file.name}」を読み込み中...`, "ok");
      addLocalAction("parse", "文書読込", `「${file.name}」を読み込み中...`);
      agentActions.startExecuting();

      const fileWithMeta = {
        file,
        modifiedAt: new Date().toISOString(),
      };
      const result = await analyzeDecisions([fileWithMeta]);

      // 抽出されたテキストをドキュメントパネルに表示
      if (result.extractedTexts && result.extractedTexts.length > 0) {
        setDocumentPanel({
          content: result.extractedTexts[0].text,
          fileName: file.name,
        });
      }

      // ステップ完了
      agentActions.advancePlanStep(`${result.decisions.length}件抽出`);
      agentActions.finishExecution();
      agentActions.addAction("extract", "意思決定抽出", `${result.decisions.length}件の決定事項を抽出`, "ok");
      addLocalAction("extract", "意思決定抽出", `${result.decisions.length}件の決定事項を抽出`);
      agentActions.artifactUpdated(`decision-${Date.now()}`, "DECISION_LOG");

      const attachedData: AttachedData = {
        type: "decision_result",
        data: result,
      };

      console.log("[ChatPage] localActionLogs before onAddMessage:", localActionLogs);
      onAddMessage(
        `「${file.name}」から${result.decisions.length}件の決定事項を抽出しました。`,
        "assistant",
        attachedData,
        undefined,
        localActionLogs
      );
      console.log("[ChatPage] onAddMessage called with actionLogs");

      setIsProcessing(false);
      setProcessingStatusText(undefined);
    },
    [selectedAgent, onAddMessage, setIsProcessing, setProcessingStatusText, setDocumentPanel, agentActions]
  );
}

/**
 * Knowledge extraction フロー
 */
function useKnowledgeExtractionHandler({
  selectedAgent,
  onAddMessage,
  onHistoryRefresh,
  setIsProcessing,
  setProcessingStatusText,
  agentActions,
}: Pick<
  UseChatMessageHandlersProps,
  "selectedAgent" | "onAddMessage" | "onHistoryRefresh" | "setIsProcessing" | "setProcessingStatusText" | "agentActions"
>) {
  return useCallback(
    async (file: File) => {
      const [localActionLogs, addLocalAction] = createActionLogger();

      setProcessingStatusText("文書を読み込み中...");
      setIsProcessing(true);

      // エージェント状態: 実行開始
      agentActions.startPlanning(`${file.name}を分析`, selectedAgent || "knowledge_extraction");
      agentActions.addAction("parse", "文書読込", `「${file.name}」を読み込み中...`, "ok");
      addLocalAction("parse", "文書読込", `「${file.name}」を読み込み中...`);
      agentActions.startExecuting();
      setProcessingStatusText("構造を解析中...");
      agentActions.addAction("extract", "構造解析", "文書の構造を解析しています...", "ok");
      addLocalAction("extract", "構造解析", "文書の構造を解析しています...");

      const result: AnalysisResult = await analyzeDocument(file);
      agentActions.addAction("extract", "構造抽出", `${result.graphs.length}個のグラフを抽出`, "ok");
      addLocalAction("extract", "構造抽出", `${result.graphs.length}個のグラフを抽出`);

      // Save to history
      try {
        await saveHistory({ fileName: file.name, result });
        agentActions.addAction("save", "履歴", "分析結果を保存", "ok");
        addLocalAction("save", "履歴", "分析結果を保存");
        onHistoryRefresh?.();
      } catch {
        agentActions.addAction("save", "履歴", "履歴保存をスキップ", "warn");
        addLocalAction("save", "履歴", "履歴保存をスキップ", "warn");
      }

      const attachedData: AttachedData = {
        type: "analysis_result",
        data: result,
        fileName: file.name,
      };

      // エージェント状態: 成果物更新完了
      agentActions.artifactUpdated(`analysis-${Date.now()}`, "FTA");

      onAddMessage(
        `「${file.name}」の分析が完了しました。${result.documentType}として認識され、${result.meta.pageCount}ページ、${result.meta.textLength}文字を解析しました。`,
        "assistant",
        attachedData,
        undefined,
        localActionLogs
      );
    },
    [selectedAgent, onAddMessage, onHistoryRefresh, setIsProcessing, setProcessingStatusText, agentActions]
  );
}

/**
 * テンプレート生成フロー
 */
function useTemplateGenerationHandler({
  selectedAgent,
  messages,
  onAddMessage,
  setIsProcessing,
  setProcessingStatusText,
  agentActions,
}: Pick<
  UseChatMessageHandlersProps,
  "selectedAgent" | "messages" | "onAddMessage" | "setIsProcessing" | "setProcessingStatusText" | "agentActions"
>) {
  return useCallback(
    async (message: string) => {
      setProcessingStatusText("出力テンプレートを検索中...");
      setIsProcessing(true);

      agentActions.startPlanning("出力を生成中", selectedAgent || "unified_analysis");
      agentActions.initializePlanSteps([
        { label: "テンプレートを検索" },
        { label: "出力を生成" },
      ]);

      try {
        const suggestions = await suggestTemplates(message);
        agentActions.advancePlanStep();
        setProcessingStatusText("出力を生成中...");

        if (suggestions.length > 0) {
          const bestSuggestion = suggestions[0];
          const chatHistory = messages.map((m) => ({
            role: m.role,
            content: m.content,
          }));

          const outputResult = await generateOutput(bestSuggestion.templateId, {
            userMessage: message,
            chatHistory,
            userProvidedValues: {},
          });

          agentActions.advancePlanStep();
          agentActions.finishExecution();
          agentActions.addAction("generate", "出力生成", `「${outputResult.templateName}」を生成しました`, "ok");
          agentActions.artifactUpdated(`output-${Date.now()}`, "COPY_READY");

          const attachedData: AttachedData = {
            type: "copy_ready_output",
            data: outputResult,
          };
          onAddMessage(
            `「${outputResult.templateName}」を生成しました。以下の内容をコピーしてご利用ください。`,
            "assistant",
            attachedData
          );
        } else {
          agentActions.advancePlanStep();
          agentActions.finishExecution();
          onAddMessage(
            "該当するテンプレートが見つかりませんでした。具体的にどのような出力が必要か教えてください。",
            "assistant"
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "出力生成に失敗しました。";
        agentActions.addAction("generate", "エラー", errorMessage, "fail", errorMessage);
        onAddMessage(`エラー: ${errorMessage}`, "assistant");
      } finally {
        setIsProcessing(false);
        setProcessingStatusText(undefined);
      }
    },
    [selectedAgent, messages, onAddMessage, setIsProcessing, setProcessingStatusText, agentActions]
  );
}

/**
 * 通常のLLM対話フロー
 */
function useNormalChatHandler({
  selectedAgent,
  messages,
  onAddMessage,
  setIsProcessing,
  setProcessingStatusText,
  documentPanel,
  agentActions,
}: Pick<
  UseChatMessageHandlersProps,
  "selectedAgent" | "messages" | "onAddMessage" | "setIsProcessing" | "setProcessingStatusText" | "documentPanel" | "agentActions"
>) {
  return useCallback(
    async (message: string) => {
      setProcessingStatusText("会話の意図を分析...");
      setIsProcessing(true);

      agentActions.startPlanning("会話を分析中", selectedAgent || "unified_analysis");
      agentActions.initializePlanSteps([
        { label: "会話の意図を分析" },
        { label: "回答を生成" },
      ]);

      // 会話履歴をAPI形式に変換
      const apiMessages: ApiChatMessage[] = [
        ...messages.map((m) => ({
          role: m.role,
          content: buildMessageContent(m),
        })),
        { role: "user" as const, content: message },
      ];

      // ドキュメントパネルに内容がある場合、コンテキストとして追加
      if (documentPanel?.content) {
        const docContext = `【参照ドキュメント: ${documentPanel.fileName || "アップロードファイル"}】\n${documentPanel.content.slice(0, 8000)}${documentPanel.content.length > 8000 ? "\n...(省略)" : ""}`;
        apiMessages.unshift({
          role: "assistant" as const,
          content: docContext,
        });
      }

      // API呼び出し中は推定進捗を表示
      const stopProgressUpdater = createProgressUpdater(
        setProcessingStatusText,
        [
          { name: "会話の意図を分析", estimatedSeconds: 2 },
          { name: "回答を生成", estimatedSeconds: 5 },
        ]
      );

      // 議事録分析結果が既にあるか確認
      const hasDecisionTimelineResult = messages.some(
        (m) => m.attachedData?.type === "decision_result"
      );

      let response;
      try {
        response = await sendChatMessage(apiMessages, true, hasDecisionTimelineResult);
      } finally {
        stopProgressUpdater();
      }

      agentActions.advancePlanStep();
      setProcessingStatusText("回答を生成中...");

      agentActions.advancePlanStep();
      agentActions.finishExecution();
      onAddMessage(response.reply, "assistant");
    },
    [selectedAgent, messages, onAddMessage, setIsProcessing, setProcessingStatusText, documentPanel, agentActions]
  );
}

/**
 * handleSendMessage の各ブランチを統合するフック
 */
export function useChatMessageHandlers(props: UseChatMessageHandlersProps) {
  const {
    selectedAgent,
    messages,
    onAddMessage,
    setIsProcessing,
    setProcessingStatusText,
    agentActions,
    ktStep,
    handleKnowledgeTransferAnswer,
    lastUserMessageRef,
  } = props;

  const handleMinutesAnalysis = useMinutesAnalysisHandler(props);
  const handleKnowledgeExtraction = useKnowledgeExtractionHandler(props);
  const handleTemplateGeneration = useTemplateGenerationHandler(props);
  const handleNormalChat = useNormalChatHandler(props);

  const handleSendMessage = useCallback(
    async (message: string, files?: File[]) => {
      if (!selectedAgent) return;

      // 技術伝承デモの条件収集フロー中の場合
      if (ktStep !== "idle" && ktStep !== "completed" && ktStep !== "showing_results") {
        onAddMessage(message, "user");
        const handled = await handleKnowledgeTransferAnswer(message);
        if (handled) return;
      }

      // 再試行用に最後のユーザーメッセージを保存
      lastUserMessageRef.current = { message, files };

      // Add user message
      const fileNames = files?.map((f) => f.name);
      onAddMessage(message || "ファイルを分析します", "user", undefined, fileNames);

      try {
        // ファイルがアップロードされた場合、ファイル名からエージェントを自動判定
        const shouldAnalyzeAsMinutes = files && files.length > 0 && (
          selectedAgent === "unified_analysis" ||
          (!selectedAgent && (
            files[0].name.match(/議事録|会議|ミーティング|meeting|minutes/i) ||
            message?.match(/議事録|会議|分析|抽出|決定事項/)
          ))
        );

        if (shouldAnalyzeAsMinutes && files && files.length > 0) {
          await handleMinutesAnalysis(files[0]);
        } else if (selectedAgent === "knowledge_extraction" && files && files.length > 0) {
          await handleKnowledgeExtraction(files[0]);
        } else if (message) {
          // テンプレート生成の意図を検出
          if (detectTemplateIntent(message)) {
            await handleTemplateGeneration(message);
            return;
          }
          // 通常のLLM対話
          await handleNormalChat(message);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "処理に失敗しました。";
        agentActions.addAction("validate", "エラー", errorMessage, "fail", errorMessage);
        onAddMessage(`エラー: ${errorMessage}`, "assistant");
      } finally {
        setIsProcessing(false);
        setProcessingStatusText(undefined);
      }
    },
    [
      selectedAgent, messages, onAddMessage, setIsProcessing, setProcessingStatusText,
      agentActions, ktStep, handleKnowledgeTransferAnswer, lastUserMessageRef,
      handleMinutesAnalysis, handleKnowledgeExtraction, handleTemplateGeneration, handleNormalChat,
    ]
  );

  return { handleSendMessage };
}
