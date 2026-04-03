/**
 * サンプルデータ関連のハンドラー
 * ChatPage.tsxから分離した handleSampleData / handleConfirmSampleData
 */

import { useCallback } from "react";
import type { ActionLogEntry } from "../../../types/agent";
import type { AgentType, AttachedData, SampleDataConfirmation } from "../../../types/chat";
import type { AnalysisResult } from "../../../types";
import { createActionLogger } from "../chatHelpers";
import { analyzeDocument } from "../../../api/analyze";
import { analyzeDecisions } from "../../../api/decisionAnalysis";
import { saveHistory } from "../../../api/history";
import { importDecisions } from "../../../api/learnFromPast";
import { SAMPLE_TROUBLE_REPORT_COMPLETE } from "../../../data/sampleKnowledgeData";
import { SAMPLE_MEETING_MINUTES } from "../../../data/sampleDecisionData";
import { useDemoScenario } from "../../../data/DemoScenarioContext";

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

type UseSampleDataHandlersProps = {
  selectedAgent: AgentType | null;
  onAddMessage: (
    content: string,
    role: "user" | "assistant",
    attachedData?: AttachedData,
    uploadedFiles?: string[],
    actionLogs?: ActionLogEntry[]
  ) => void;
  onHistoryRefresh?: () => void;
  setIsProcessing: (value: boolean) => void;
  setDocumentPanel: (panel: { content: string; fileName?: string; highlightText?: string } | null) => void;
  agentActions: AgentStateActions;
};

export function useSampleDataHandlers({
  selectedAgent,
  onAddMessage,
  onHistoryRefresh,
  setIsProcessing,
  setDocumentPanel,
  agentActions,
}: UseSampleDataHandlersProps) {
  const { scenario } = useDemoScenario();

  const handleSampleData = useCallback(
    async (sampleText: string, sampleName: string) => {
      if (!selectedAgent) return;

      onAddMessage(`サンプルデータ「${sampleName}」を分析します`, "user");
      setIsProcessing(true);

      const [localActionLogs, addLocalAction] = createActionLogger();

      try {
        const blob = new Blob([sampleText], { type: "text/plain" });
        const file = new File([blob], `${sampleName}.txt`, { type: "text/plain" });

        if (selectedAgent === "knowledge_extraction") {
          addLocalAction("parse", "文書読込", `「${sampleName}」を読み込み中...`);
          const result: AnalysisResult = await analyzeDocument(file);
          addLocalAction("extract", "構造抽出", `${result.graphs.length}個のグラフを抽出`);

          try {
            await saveHistory({ fileName: sampleName, result });
            addLocalAction("save", "履歴", "分析結果を保存");
            onHistoryRefresh?.();
          } catch {
            // Ignore
          }

          const attachedData: AttachedData = {
            type: "analysis_result",
            data: result,
            fileName: sampleName,
          };

          onAddMessage(
            `「${sampleName}」の分析が完了しました。${result.documentType}として認識され、${result.meta.pageCount}ページ、${result.meta.textLength}文字を解析しました。`,
            "assistant",
            attachedData,
            undefined,
            localActionLogs
          );
        } else if (selectedAgent === "unified_analysis") {
          // エージェント状態: 実行開始
          agentActions.startPlanning(`${sampleName}を分析`, selectedAgent);
          agentActions.initializePlanSteps([
            { label: "文書形式を判定" },
            { label: "意思決定パターンを抽出" },
            { label: "タイムラインを構築" },
            { label: "重要度を評価" },
          ]);

          agentActions.addAction("parse", "文書読込", `「${sampleName}」を読み込み中...`, "ok");
          addLocalAction("parse", "文書読込", `「${sampleName}」を読み込み中...`);
          agentActions.startExecuting();

          // ステップ1完了: 文書形式判定
          agentActions.advancePlanStep("議事録");
          agentActions.setRouteResult({
            type: "MINUTES",
            confidence: 0.95,
            reasons: [
              "日付と出席者の記載パターンを検出",
              "議題・決定事項の構造を確認",
            ],
          });

          // サンプルテキストをドキュメントパネルに表示
          setDocumentPanel({
            content: sampleText,
            fileName: `${sampleName}.txt`,
          });

          agentActions.addAction("extract", "議事録解析", "議事録から意思決定を抽出しています...", "ok");
          addLocalAction("extract", "議事録解析", "議事録から意思決定を抽出しています...");

          // APIを呼んで意思決定を抽出
          const fileWithMeta = {
            file,
            modifiedAt: new Date().toISOString(),
          };
          const result = await analyzeDecisions([fileWithMeta]);

          // ステップ2完了: 意思決定抽出
          agentActions.advancePlanStep(`${result.decisions.length}件抽出`);
          agentActions.addAction("link", "意思決定抽出", `${result.decisions.length}件の意思決定を抽出`, "ok");
          addLocalAction("link", "意思決定抽出", `${result.decisions.length}件の意思決定を抽出`);

          // ステップ3完了: タイムライン構築
          agentActions.advancePlanStep();

          // Import decisions to learn-from-past history
          try {
            await importDecisions(result.decisions);
            agentActions.addAction("save", "履歴", "意思決定をインポート", "ok");
            addLocalAction("save", "履歴", "意思決定をインポート");
          } catch {
            // Ignore import errors
          }

          // ステップ4完了: 重要度評価
          agentActions.advancePlanStep();

          const attachedData: AttachedData = {
            type: "decision_result",
            data: result,
          };

          const confirmedCount = result.decisions.filter((d) => d.status === "confirmed").length;
          const grayCount = result.decisions.filter((d) => d.status === "gray").length;

          // エージェント状態: 成果物更新完了
          agentActions.artifactUpdated(`decision-${Date.now()}`, "MINUTES");

          onAddMessage(
            `サンプルデータから${result.decisions.length}件の意思決定を抽出しました。確定: ${confirmedCount}件、要確認: ${grayCount}件`,
            "assistant",
            attachedData,
            undefined,
            localActionLogs
          );
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : "処理に失敗しました。";
        onAddMessage(`エラー: ${errorMessage}`, "assistant", undefined, undefined, localActionLogs);
      } finally {
        setIsProcessing(false);
      }
    },
    [selectedAgent, onAddMessage, onHistoryRefresh, setIsProcessing, setDocumentPanel, agentActions]
  );

  const handleConfirmSampleData = useCallback(
    async (confirmation: SampleDataConfirmation) => {
      const [localActionLogs, addLocalAction] = createActionLogger();

      if (confirmation.sampleDataId === "trouble_report") {
        // シナリオのサンプル報告書を使用（フォールバック: 既存データ）
        const knowledgeData = scenario.sampleKnowledgeSet?.[0]?.data ?? SAMPLE_TROUBLE_REPORT_COMPLETE;
        const knowledgeTitle = scenario.sampleKnowledgeSet?.[0]?.title ?? "設備異音の調査メモ";

        setIsProcessing(true);
        addLocalAction("parse", "文書読込", `「${confirmation.label}」を読み込み中...`);
        try {
          const blob = new Blob([knowledgeData], { type: "text/plain" });
          const file = new File([blob], "sample_trouble_report.txt", { type: "text/plain" });

          const result: AnalysisResult = await analyzeDocument(file);
          addLocalAction("extract", "構造抽出", `${result.graphs.length}個のグラフを抽出`);

          // ドキュメントパネルにサンプルデータを表示
          setDocumentPanel({
            content: knowledgeData,
            fileName: knowledgeTitle,
          });

          const attachedData: AttachedData = {
            type: "analysis_result",
            data: result,
            fileName: knowledgeTitle,
          };

          onAddMessage(
            `「${confirmation.label}」の分析が完了しました。${result.documentType}として認識され、${result.meta.pageCount}ページ、${result.meta.textLength}文字を解析しました。`,
            "assistant",
            attachedData,
            undefined,
            localActionLogs
          );
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "分析に失敗しました。";
          onAddMessage(`エラー: ${errorMessage}`, "assistant", undefined, undefined, localActionLogs);
        } finally {
          setIsProcessing(false);
        }
      } else if (confirmation.sampleDataId === "meeting_minutes") {
        // シナリオのサンプル議事録を使用（フォールバック: 既存データ）
        const meetingData = scenario.sampleMeetingMinutesSet?.[0]?.data ?? SAMPLE_MEETING_MINUTES;
        const meetingTitle = scenario.sampleMeetingMinutesSet?.[0]?.title ?? "サンプル議事録データ";

        setIsProcessing(true);
        addLocalAction("parse", "文書読込", "サンプル議事録を読み込み中...");

        // 右パネルにサンプルデータを表示
        setDocumentPanel({
          content: meetingData,
          fileName: meetingTitle,
        });

        try {
          const file = new File([meetingData], "sample_meeting_minutes.txt", { type: "text/plain" });
          const fileWithMeta = { file, modifiedAt: new Date().toISOString() };
          const result = await analyzeDecisions([fileWithMeta]);
          addLocalAction("extract", "意思決定抽出", `${result.decisions.length}件の決定事項を抽出`);

          try {
            await importDecisions(result.decisions);
            addLocalAction("save", "履歴", "意思決定をインポート");
          } catch {
            // Ignore import errors
          }

          const attachedData: AttachedData = {
            type: "decision_result",
            data: result,
          };

          const confirmedCount = result.decisions.filter((d) => d.status === "confirmed").length;
          const grayCount = result.decisions.filter((d) => d.status === "gray").length;
          const proposedCount = result.decisions.filter((d) => d.status === "proposed").length;

          onAddMessage(
            `サンプルデータから${result.decisions.length}件の意思決定を抽出しました。確定: ${confirmedCount}件、要確認: ${grayCount}件、未確定: ${proposedCount}件`,
            "assistant",
            attachedData,
            undefined,
            localActionLogs
          );
        } catch (err) {
          const errorMessage = err instanceof Error ? err.message : "分析に失敗しました。";
          onAddMessage(`エラー: ${errorMessage}`, "assistant", undefined, undefined, localActionLogs);
        } finally {
          setIsProcessing(false);
        }
      }
    },
    [onAddMessage, setIsProcessing, setDocumentPanel, scenario]
  );

  return {
    handleSampleData,
    handleConfirmSampleData,
  };
}
