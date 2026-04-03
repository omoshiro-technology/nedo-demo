"use client"
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import type {
  ChatMessage,
  DecisionNavigatorSuggestion,
  SampleDataConfirmation,
  DecisionNavigatorResume,
  NextStepSuggestion,
  DecisionCaseSearchResult,
} from "../../types/chat";
import type { Artifact } from "../../types/artifact";
import type { ActionLogEntry } from "../../types/agent";
import AnalysisResultView from "./AnalysisResultView";
import DecisionResultView from "./DecisionResultView";
import LearnFromPastView from "./LearnFromPastView";
import { DecisionNavigatorSuggestionCard } from "./DecisionNavigatorSuggestionCard";
import { SampleDataConfirmationCard } from "./SampleDataConfirmationCard";
import { DecisionNavigatorResumeCard } from "./DecisionNavigatorResumeCard";
import { ArtifactCard } from "../artifact";
import { AIQuestionCard, extractQuestionFromResponse } from "./AIQuestionCard";
import { ChoiceButtonsCard, extractChoicesFromResponse, removeChoicesFromContent, type Choice } from "./ChoiceButtonsCard";
import { ErrorCard } from "./ErrorCard";
import { CopyReadyOutputCard } from "./CopyReadyOutputCard";
import NextStepSuggestionCard from "./NextStepSuggestionCard";
import { DecisionCaseList } from "./DecisionCaseCard";
import { DecisionTrendCard } from "./DecisionTrendCard";
import { DecisionRecordComplete } from "./DecisionRecordCard";
import { KnowledgeTransferQuestionCard } from "./KnowledgeTransferQuestionCard";
import { GlobalFeedforwardPanel } from "./GlobalFeedforwardPanel";
import { ProposalInputCard, ProposalResultCard } from "../proposal";
import { SimilarCaseInputCard, SimilarCaseResultCard } from "../similarCase";
import { useChatMessageCallbacks } from "./ChatMessageCallbacksContext";
import {
  preprocessMarkdownBold,
  isErrorMessage,
  extractErrorContent,
  formatTime,
} from "./chatHelpers";

type ChatMessagesProps = {
  messages: ChatMessage[];
  /** 処理中フラグ */
  isProcessing?: boolean;
  /** 処理中のステータステキスト（ローディングドットの下に表示） */
  processingStatus?: string;
  /** 実行ログ（最後のassistantメッセージに表示） */
  actionLogs?: ActionLogEntry[];
  /** フィードフォワード生成中フラグ */
  feedforwardLoading?: boolean;
  /** フィードフォワード生成済みフラグ */
  feedforwardGenerated?: boolean;
  /** 類似事例検索中フラグ */
  similarCaseLoading?: boolean;
};

type MessageContentProps = {
  message: ChatMessage;
  onDismissSuggestion?: () => void;
  isDismissed?: boolean;
  isQuestionDismissed?: boolean;
  onDismissQuestion?: () => void;
  isErrorDismissed?: boolean;
  onDismissError?: () => void;
  onSelectChoice?: (choice: Choice) => void;
  onSelectOtherChoice?: (customInput: string) => void;
  isChoicesDismissed?: boolean;
  isOutputDismissed?: boolean;
  onDismissOutput?: () => void;
  isNextStepDismissed?: boolean;
  onDismissNextStep?: () => void;
  isDecisionCaseInteracted?: boolean;
  onDecisionCaseInteraction?: () => void;
  isTrendCardInteracted?: boolean;
  onTrendCardInteraction?: () => void;
  isKTConditionsInteracted?: boolean;
  onKTConditionsInteraction?: () => void;
  feedforwardLoading?: boolean;
  feedforwardGenerated?: boolean;
  similarCaseLoading?: boolean;
};

function MessageContent({
  message,
  onDismissSuggestion,
  isDismissed,
  isQuestionDismissed,
  onDismissQuestion,
  isErrorDismissed,
  onDismissError,
  onSelectChoice,
  onSelectOtherChoice,
  isChoicesDismissed,
  isOutputDismissed,
  onDismissOutput,
  isNextStepDismissed,
  onDismissNextStep,
  isDecisionCaseInteracted,
  onDecisionCaseInteraction,
  isTrendCardInteracted,
  onTrendCardInteraction,
  isKTConditionsInteracted,
  onKTConditionsInteraction,
  feedforwardLoading,
  feedforwardGenerated,
  similarCaseLoading,
}: MessageContentProps) {
  const {
    onLaunchDecisionNavigator,
    onConfirmSampleData,
    onHighlightRequest,
    onAcceptArtifact,
    onReviseArtifact,
    onOpenArtifactDetail,
    onResumeDecisionNavigator,
    onAskAIForDecision,
    onAnswerAIQuestion,
    onRetryError,
    onCopyOutput,
    onEditOutput,
    onSendEmailOutput,
    onAcceptNextStep,
    onSkipNextStep,
    onSelectDecisionCase,
    onLaunchDecisionNavigatorFromTrend,
    onRetryTrend,
    onSkipDecisionCases,
    onSubmitKTConditions,
    onGenerateFeedforward,
    onSubmitProposalStep1,
    onSubmitProposalStep2,
    onRegenerateProposal,
    onSearchSimilarCase,
    onUseSimilarCaseForProposal,
    onSelectSimilarCase,
    onSelectNewProposal,
  } = useChatMessageCallbacks();
  // エラーメッセージかどうかを判定
  const errorContent = message.role === "assistant" && isErrorMessage(message.content)
    ? extractErrorContent(message.content)
    : null;

  // アシスタントメッセージの場合、質問を抽出（エラーでない場合のみ）
  const { mainContent, question } = message.role === "assistant" && message.content && !errorContent
    ? extractQuestionFromResponse(message.content)
    : { mainContent: errorContent ? null : message.content, question: null };

  // アシスタントメッセージから選択肢を抽出
  // attachedDataがある場合は専用UIがあるため、選択肢ボタンは表示しない
  const hasSpecializedUI = message.attachedData != null;
  const choices = message.role === "assistant" && mainContent && !errorContent && !hasSpecializedUI
    ? extractChoicesFromResponse(mainContent)
    : [];

  // 選択肢がボタン表示される場合、本文から選択肢テキストを除去
  const displayContent = choices.length >= 2 && mainContent
    ? removeChoicesFromContent(mainContent)
    : mainContent;

  return (
    <div className="chat-message__content">
      {/* Uploaded files indicator */}
      {message.uploadedFiles && message.uploadedFiles.length > 0 && (
        <div className="chat-message__files">
          {message.uploadedFiles.map((fileName, i) => (
            <span key={`${fileName}-${i}`} className="chat-message__file">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              {fileName}
            </span>
          ))}
        </div>
      )}

      {/* エラーカード（エラーメッセージの場合） */}
      {errorContent && (
        <ErrorCard
          message={errorContent}
          onRetry={onRetryError}
          onDismiss={onDismissError}
          isDismissed={isErrorDismissed}
        />
      )}

      {/* Text content with Markdown rendering (質問部分・選択肢を除いた本文、エラーでない場合のみ) */}
      {displayContent && !errorContent && (
        <div className="chat-message__text">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {preprocessMarkdownBold(displayContent)}
          </ReactMarkdown>
        </div>
      )}

      {/* AI質問カード（質問が抽出された場合のみ表示） */}
      {question && onAnswerAIQuestion && (
        <AIQuestionCard
          question={question}
          onAnswer={onAnswerAIQuestion}
          onSkip={onDismissQuestion || (() => {})}
          isDismissed={isQuestionDismissed}
        />
      )}

      {/* 選択肢ボタンカード（選択肢が2つ以上ある場合に表示） */}
      {choices.length >= 2 && onSelectChoice && !isChoicesDismissed && (
        <ChoiceButtonsCard
          choices={choices}
          onSelect={onSelectChoice}
          onSelectOther={onSelectOtherChoice}
          isDismissed={isChoicesDismissed}
        />
      )}

      {/* Embedded analysis result */}
      {message.attachedData?.type === "analysis_result" && (
        <div className="chat-message__embedded">
          <AnalysisResultView
            result={message.attachedData.data}
            fileName={message.attachedData.fileName}
          />
        </div>
      )}

      {/* Embedded decision result */}
      {message.attachedData?.type === "decision_result" && (
        <div className="chat-message__embedded">
          <DecisionResultView
            result={message.attachedData.data}
            onHighlightRequest={onHighlightRequest}
            onAskAI={onAskAIForDecision}
            onGenerateFeedforward={onGenerateFeedforward}
            feedforwardLoading={feedforwardLoading}
            feedforwardGenerated={feedforwardGenerated}
          />
        </div>
      )}

      {/* Global feedforward (as chat message) */}
      {message.attachedData?.type === "global_feedforward" && (
        <div className="chat-message__embedded">
          <GlobalFeedforwardPanel
            globalFeedforward={message.attachedData.data}
            onHighlightDecision={(_decisionId, decisionContent) => {
              // 決定内容をドキュメントパネルでハイライト表示
              if (onHighlightRequest) {
                onHighlightRequest(decisionContent);
              }
            }}
          />
        </div>
      )}

      {/* Embedded learn from past result */}
      {message.attachedData?.type === "learn_result" && (
        <div className="chat-message__embedded">
          <LearnFromPastView result={message.attachedData.data} />
        </div>
      )}

      {/* Decision Navigator suggestion card */}
      {message.attachedData?.type === "decision_navigator_suggestion" &&
        !isDismissed &&
        onLaunchDecisionNavigator && (
          <div className="chat-message__embedded">
            <DecisionNavigatorSuggestionCard
              suggestion={message.attachedData.data}
              onLaunch={() => onLaunchDecisionNavigator(message.attachedData!.data as DecisionNavigatorSuggestion)}
              onDismiss={onDismissSuggestion || (() => {})}
            />
          </div>
        )}

      {/* Sample data confirmation card */}
      {message.attachedData?.type === "sample_data_confirmation" &&
        !isDismissed &&
        onConfirmSampleData && (
          <div className="chat-message__embedded">
            <SampleDataConfirmationCard
              confirmation={message.attachedData.data}
              onConfirm={() => onConfirmSampleData(message.attachedData!.data as SampleDataConfirmation)}
              onDismiss={onDismissSuggestion || (() => {})}
            />
          </div>
        )}

      {/* Artifact card */}
      {message.attachedData?.type === "artifact" && (
        <div className="chat-message__embedded">
          <ArtifactCard
            artifact={message.attachedData.data}
            onAccept={onAcceptArtifact ? () => onAcceptArtifact(message.attachedData!.data as Artifact) : undefined}
            onRevise={onReviseArtifact ? (instruction) => onReviseArtifact(message.attachedData!.data as Artifact, instruction) : undefined}
            onOpenDetail={onOpenArtifactDetail ? () => onOpenArtifactDetail(message.attachedData!.data as Artifact) : undefined}
          />
        </div>
      )}

      {/* Decision Navigator resume card */}
      {message.attachedData?.type === "decision_navigator_resume" &&
        !isDismissed &&
        onResumeDecisionNavigator && (
          <div className="chat-message__embedded">
            <DecisionNavigatorResumeCard
              resume={message.attachedData.data}
              onStartNew={() => onResumeDecisionNavigator(message.attachedData!.data as DecisionNavigatorResume)}
              onDismiss={onDismissSuggestion || (() => {})}
            />
          </div>
        )}

      {/* Copy-ready output card */}
      {message.attachedData?.type === "copy_ready_output" &&
        !isOutputDismissed && (
          <div className="chat-message__embedded">
            <CopyReadyOutputCard
              data={message.attachedData.data}
              onCopy={onCopyOutput}
              onEdit={onEditOutput}
              onSendEmail={onSendEmailOutput}
              onDismiss={onDismissOutput}
            />
          </div>
        )}

      {/* Phase 12: Next step suggestion card */}
      {message.attachedData?.type === "next_step_suggestion" &&
        !isNextStepDismissed &&
        onAcceptNextStep && (
          <div className="chat-message__embedded">
            <NextStepSuggestionCard
              suggestion={message.attachedData.data}
              onAccept={() => onAcceptNextStep(message.attachedData!.data as NextStepSuggestion)}
              onSkip={() => {
                onDismissNextStep?.();
                onSkipNextStep?.();
              }}
            />
          </div>
        )}

      {/* 技術伝承デモ: 判断事例検索結果カード */}
      {message.attachedData?.type === "decision_case_search" && (
        <div className="chat-message__embedded">
          <DecisionCaseList
            results={message.attachedData.data.results}
            onSelectCase={isDecisionCaseInteracted ? undefined : (onSelectDecisionCase ? (caseItem) => {
              onDecisionCaseInteraction?.();
              onSelectDecisionCase(caseItem as DecisionCaseSearchResult);
            } : undefined)}
            onSkipCases={isDecisionCaseInteracted ? undefined : (onSkipDecisionCases ? () => {
              onDecisionCaseInteraction?.();
              onSkipDecisionCases();
            } : undefined)}
            isDisabled={isDecisionCaseInteracted}
          />
        </div>
      )}

      {/* 技術伝承デモ: 判断傾向カード */}
      {message.attachedData?.type === "decision_case_trend" && (
        <div className="chat-message__embedded">
          <DecisionTrendCard
            trend={message.attachedData.data.trend}
            relatedKnowledge={message.attachedData.data.relatedKnowledge}
            onLaunchDecisionNavigator={isTrendCardInteracted ? undefined : (onLaunchDecisionNavigatorFromTrend ? () => {
              onTrendCardInteraction?.();
              onLaunchDecisionNavigatorFromTrend();
            } : undefined)}
            onRetry={isTrendCardInteracted ? undefined : (onRetryTrend ? () => {
              onTrendCardInteraction?.();
              onRetryTrend();
            } : undefined)}
            isDisabled={isTrendCardInteracted}
          />
        </div>
      )}

      {/* 技術伝承デモ: 判断記録完了カード */}
      {message.attachedData?.type === "decision_case_record" && (
        <div className="chat-message__embedded">
          <DecisionRecordComplete
            recordedId={message.attachedData.data.recordedId}
            recordedTitle={message.attachedData.data.recordedTitle}
          />
        </div>
      )}

      {/* 技術伝承デモ: 条件収集カード */}
      {message.attachedData?.type === "knowledge_transfer_questions" && onSubmitKTConditions && (
        <div className="chat-message__embedded">
          <KnowledgeTransferQuestionCard
            onSubmit={(conditions) => {
              onKTConditionsInteraction?.();
              onSubmitKTConditions(conditions);
            }}
            disabled={isKTConditionsInteracted}
          />
        </div>
      )}

      {/* 提案書入力カード */}
      {message.attachedData?.type === "proposal_input" && (
        <div className="chat-message__embedded">
          <ProposalInputCard
            data={message.attachedData.data}
            onSubmitStep1={onSubmitProposalStep1 || (() => {})}
            onSubmitStep2={onSubmitProposalStep2 || (() => {})}
            onSelectSimilarCase={onSelectSimilarCase}
            onSelectNewProposal={onSelectNewProposal}
          />
        </div>
      )}

      {/* 提案書結果カード */}
      {message.attachedData?.type === "proposal_result" && (
        <div className="chat-message__embedded">
          <ProposalResultCard
            data={message.attachedData.data}
            onRegenerate={onRegenerateProposal || (() => {})}
          />
        </div>
      )}

      {/* 提案書エラーカード */}
      {message.attachedData?.type === "proposal_error" && (
        <div className="chat-message__embedded">
          <ErrorCard
            message={message.attachedData.data.message}
            onRetry={onRegenerateProposal}
          />
        </div>
      )}

      {/* 類似事例検索入力カード */}
      {message.attachedData?.type === "similar_case_input" && onSearchSimilarCase && (
        <div className="chat-message__embedded">
          <SimilarCaseInputCard
            onSubmit={onSearchSimilarCase}
            isLoading={similarCaseLoading}
          />
        </div>
      )}

      {/* 類似事例検索結果カード */}
      {message.attachedData?.type === "similar_case_result" && (
        <div className="chat-message__embedded">
          <SimilarCaseResultCard
            result={message.attachedData.data}
            onUseCaseForProposal={onUseSimilarCaseForProposal}
          />
        </div>
      )}

    </div>
  );
}

export default function ChatMessages({
  messages,
  isProcessing = false,
  processingStatus,
  actionLogs,
  feedforwardLoading,
  feedforwardGenerated,
  similarCaseLoading,
}: ChatMessagesProps) {
  const {
    onSelectChoice,
    onSelectOtherChoice,
  } = useChatMessageCallbacks();
  const containerRef = useRef<HTMLDivElement>(null);
  const lastMessageRef = useRef<HTMLDivElement>(null);
  const loadingRef = useRef<HTMLDivElement>(null);
  const prevMessagesLength = useRef(messages.length);
  const prevIsProcessing = useRef(isProcessing);
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Set<string>>(
    new Set()
  );
  const [dismissedQuestions, setDismissedQuestions] = useState<Set<string>>(
    new Set()
  );
  const [dismissedErrors, setDismissedErrors] = useState<Set<string>>(
    new Set()
  );
  const [dismissedChoices, setDismissedChoices] = useState<Set<string>>(
    new Set()
  );
  const [dismissedOutputs, setDismissedOutputs] = useState<Set<string>>(
    new Set()
  );
  const [dismissedNextSteps, setDismissedNextSteps] = useState<Set<string>>(
    new Set()
  );
  // 技術伝承デモ: 操作済みカードの追跡
  const [interactedDecisionCases, setInteractedDecisionCases] = useState<Set<string>>(
    new Set()
  );
  const [interactedTrendCards, setInteractedTrendCards] = useState<Set<string>>(
    new Set()
  );
  const [interactedKTConditions, setInteractedKTConditions] = useState<Set<string>>(
    new Set()
  );
  const [actionLogsExpanded, setActionLogsExpanded] = useState<Record<string, boolean>>({});

  // メッセージ追加時のスクロール
  useEffect(() => {
    if (messages.length === 0) return;

    const lastMessage = messages[messages.length - 1];
    const isNewMessage = messages.length > prevMessagesLength.current;
    prevMessagesLength.current = messages.length;

    if (!isNewMessage) return;

    // AI回答時は回答の先頭へスクロール
    if (lastMessage.role === "assistant") {
      setTimeout(() => {
        lastMessageRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }, 100);
    }
  }, [messages]);

  // ローディング表示開始時にスクロール（ユーザーメッセージ送信後）
  useEffect(() => {
    if (isProcessing && !prevIsProcessing.current) {
      // ローディングが開始された → ローディング表示までスクロール
      setTimeout(() => {
        loadingRef.current?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
      }, 150);
    }
    prevIsProcessing.current = isProcessing;
  }, [isProcessing]);

  if (messages.length === 0 && !isProcessing) {
    return null;
  }

  const handleDismiss = (messageId: string) => {
    setDismissedSuggestions((prev) => new Set(prev).add(messageId));
  };

  const handleDismissQuestion = (messageId: string) => {
    setDismissedQuestions((prev) => new Set(prev).add(messageId));
  };

  const handleDismissError = (messageId: string) => {
    setDismissedErrors((prev) => new Set(prev).add(messageId));
  };

  const handleDismissChoices = (messageId: string) => {
    setDismissedChoices((prev) => new Set(prev).add(messageId));
  };

  const handleDismissOutput = (messageId: string) => {
    setDismissedOutputs((prev) => new Set(prev).add(messageId));
  };

  const handleDismissNextStep = (messageId: string) => {
    setDismissedNextSteps((prev) => new Set(prev).add(messageId));
  };

  // 選択肢選択時のハンドラー
  const handleSelectChoice = (messageId: string, choice: Choice) => {
    // 選択後はカードを非表示に
    handleDismissChoices(messageId);
    // コールバックを呼び出し
    onSelectChoice?.(choice);
  };

  // その他選択時のハンドラー
  const handleSelectOtherChoice = (messageId: string, customInput: string) => {
    // 選択後はカードを非表示に
    handleDismissChoices(messageId);
    // コールバックを呼び出し
    onSelectOtherChoice?.(customInput);
  };

  // 技術伝承デモ: 判断事例選択/スキップ時のハンドラー
  const handleDecisionCaseInteraction = (messageId: string) => {
    setInteractedDecisionCases((prev) => new Set(prev).add(messageId));
  };

  // 技術伝承デモ: 傾向カード操作時のハンドラー
  const handleTrendCardInteraction = (messageId: string) => {
    setInteractedTrendCards((prev) => new Set(prev).add(messageId));
  };

  return (
    <div className="chat-messages" ref={containerRef}>
      {messages.map((message, index) => (
        <div
          key={message.id}
          ref={index === messages.length - 1 ? lastMessageRef : undefined}
          className={`chat-message chat-message--${message.role}`}
        >
          <div className="chat-message__avatar">
            {message.role === "user" ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            ) : (
              <span>C</span>
            )}
          </div>
          <div className="chat-message__body">
            <MessageContent
              message={message}
              onDismissSuggestion={() => handleDismiss(message.id)}
              isDismissed={dismissedSuggestions.has(message.id)}
              isQuestionDismissed={dismissedQuestions.has(message.id)}
              onDismissQuestion={() => handleDismissQuestion(message.id)}
              isErrorDismissed={dismissedErrors.has(message.id)}
              onDismissError={() => handleDismissError(message.id)}
              onSelectChoice={(choice) => handleSelectChoice(message.id, choice)}
              onSelectOtherChoice={(input) => handleSelectOtherChoice(message.id, input)}
              isChoicesDismissed={dismissedChoices.has(message.id)}
              isOutputDismissed={dismissedOutputs.has(message.id)}
              onDismissOutput={() => handleDismissOutput(message.id)}
              isNextStepDismissed={dismissedNextSteps.has(message.id)}
              onDismissNextStep={() => handleDismissNextStep(message.id)}
              isDecisionCaseInteracted={interactedDecisionCases.has(message.id)}
              onDecisionCaseInteraction={() => handleDecisionCaseInteraction(message.id)}
              isTrendCardInteracted={interactedTrendCards.has(message.id)}
              onTrendCardInteraction={() => handleTrendCardInteraction(message.id)}
              isKTConditionsInteracted={interactedKTConditions.has(message.id)}
              onKTConditionsInteraction={() => setInteractedKTConditions((prev) => new Set(prev).add(message.id))}
              feedforwardLoading={feedforwardLoading}
              feedforwardGenerated={feedforwardGenerated}
              similarCaseLoading={similarCaseLoading}
            />
            <span className="chat-message__time">{formatTime(message.timestamp)}</span>
            {/* 実行ログ（メッセージに保存されたログを表示、最後のメッセージはリアルタイム更新） */}
            {message.role === "assistant" && (() => {
              // デバッグログ
              if (index === messages.length - 1) {
                console.log("[ChatMessages] Last message actionLogs:", message.actionLogs, "props actionLogs:", actionLogs);
              }
              // メッセージに保存されたログを使用、最後のメッセージはpropsのログも参照
              const logsToShow = message.actionLogs && message.actionLogs.length > 0
                ? message.actionLogs
                : (index === messages.length - 1 && actionLogs && actionLogs.length > 0 ? actionLogs : null);

              if (!logsToShow) return null;

              const isExpanded = actionLogsExpanded[message.id] ?? false;

              return (
                <div className="chat-message__action-logs">
                  <button
                    className="chat-message__action-logs-toggle"
                    onClick={() => setActionLogsExpanded(prev => ({
                      ...prev,
                      [message.id]: !isExpanded
                    }))}
                  >
                    <span className="chat-message__action-logs-icon">
                      {isExpanded ? "▼" : "▶"}
                    </span>
                    <span>実行ログ ({logsToShow.length}件)</span>
                  </button>
                  {isExpanded && (
                    <ul className="chat-message__action-logs-list">
                      {logsToShow.map((log) => (
                        <li key={log.id} className="chat-message__action-log-item">
                          <span className="chat-message__action-log-result">
                            {log.result === "ok" ? "✓" : log.result === "warn" ? "!" : "✗"}
                          </span>
                          <span className="chat-message__action-log-message">{log.message}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      ))}

      {/* ローディング表示 */}
      {isProcessing && (
        <div ref={loadingRef} className="chat-message chat-message--assistant chat-message--loading">
          <div className="chat-message__avatar">
            <span>C</span>
          </div>
          <div className="chat-message__body">
            <div className="chat-message__loading">
              <span className="chat-message__loading-dot" />
              <span className="chat-message__loading-dot" />
              <span className="chat-message__loading-dot" />
            </div>
            {processingStatus && (
              <div className="chat-message__processing-status">
                {processingStatus}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
