"use client"
import { createContext, useContext, useMemo } from "react";
import type { ReactNode } from "react";
import type {
  DecisionNavigatorSuggestion,
  SampleDataConfirmation,
  DecisionNavigatorResume,
  GeneratedOutputData,
  NextStepSuggestion,
  DecisionCaseSearchResult,
  KnowledgeTransferConditions,
} from "../../types/chat";
import type { Artifact } from "../../types/artifact";
import type { DecisionItem } from "../../types";
import type { Choice } from "./ChoiceButtonsCard";
import type { CustomerContext, EvaluationPoints } from "../../types/proposal";
import type { SimilarCaseSearchCondition, SimilarCase } from "../../types/similarCase";

/**
 * ChatMessages and its child components share these callback props.
 * By placing them in Context we eliminate prop drilling through
 * ChatMessages -> MessageContent -> individual card components.
 */
export type ChatMessageCallbacks = {
  onLaunchDecisionNavigator?: (suggestion: DecisionNavigatorSuggestion) => void;
  onConfirmSampleData?: (confirmation: SampleDataConfirmation) => void;
  onHighlightRequest?: (sourceText: string) => void;
  onAcceptArtifact?: (artifact: Artifact) => void;
  onReviseArtifact?: (artifact: Artifact, instruction: string) => void;
  onOpenArtifactDetail?: (artifact: Artifact) => void;
  onResumeDecisionNavigator?: (resume: DecisionNavigatorResume) => void;
  onAskAIForDecision?: (decision: DecisionItem) => void;
  onAnswerAIQuestion?: (question: string) => void;
  onRetryError?: () => void;
  onSelectChoice?: (choice: Choice) => void;
  onSelectOtherChoice?: (customInput: string) => void;
  onCopyOutput?: () => void;
  onEditOutput?: (data: GeneratedOutputData) => void;
  onSendEmailOutput?: (data: GeneratedOutputData) => void;
  onAcceptNextStep?: (suggestion: NextStepSuggestion) => void;
  onSkipNextStep?: () => void;
  // Knowledge transfer demo
  onSelectDecisionCase?: (caseItem: DecisionCaseSearchResult) => void;
  onLaunchDecisionNavigatorFromTrend?: () => void;
  onRetryTrend?: () => void;
  onSkipDecisionCases?: () => void;
  onSubmitKTConditions?: (conditions: KnowledgeTransferConditions) => void;
  onGenerateFeedforward?: () => void;
  // Proposal
  onSubmitProposalStep1?: (customerContext: CustomerContext) => void;
  onSubmitProposalStep2?: (evaluationPoints: EvaluationPoints) => void;
  onRegenerateProposal?: () => void;
  // Similar case search
  onSearchSimilarCase?: (condition: SimilarCaseSearchCondition) => void;
  onUseSimilarCaseForProposal?: (caseData: SimilarCase) => void;
  onSelectSimilarCase?: () => void;
  onSelectNewProposal?: () => void;
};

const ChatMessageCallbacksContext = createContext<ChatMessageCallbacks>({});

type ProviderProps = {
  callbacks: ChatMessageCallbacks;
  children: ReactNode;
};

export function ChatMessageCallbacksProvider({ callbacks, children }: ProviderProps) {
  // Memoize to avoid unnecessary re-renders when parent re-renders
  // but callbacks haven't actually changed
  const value = useMemo(() => callbacks, [callbacks]);
  return (
    <ChatMessageCallbacksContext.Provider value={value}>
      {children}
    </ChatMessageCallbacksContext.Provider>
  );
}

export function useChatMessageCallbacks(): ChatMessageCallbacks {
  return useContext(ChatMessageCallbacksContext);
}
