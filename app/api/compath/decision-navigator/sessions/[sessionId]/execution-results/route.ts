import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";
import {
  KnowledgeRepository,
  ExecutionResultRepository,
  SessionKnowledgeRepository,
} from "@/lib/compath/application/repositories";
import { promoteLearningToHeuristic } from "@/lib/compath/application/decisionNavigator/learningExtractor";
import type {
  ExecutionStatus,
  ExecutionOutcome,
  Retrospective,
  Learning,
  ExecutionResult,
} from "@/lib/compath/domain/decisionNavigator/expertThinking/executionResult";

export const maxDuration = 60;

// ヘルパー: 振り返りから学びを抽出
function extractLearningsFromRetrospective(
  retrospective: Omit<Retrospective, "recordedAt">,
  sourceId: string
): Learning[] {
  const learnings: Learning[] = [];
  const now = new Date().toISOString();

  for (const item of retrospective.whatWentWell || []) {
    learnings.push({
      id: randomUUID(),
      category: "success_pattern",
      content: item,
      applicableConditions: [],
      confidence: 70,
      confirmationCount: 1,
      futureImpact: {
        shouldConsider: true,
        suggestedWeight: 60,
        context: "同様の状況で参考にすべき",
      },
      sourceExecutionResultId: sourceId,
      createdAt: now,
    });
  }

  for (const item of retrospective.whatCouldBeBetter || []) {
    learnings.push({
      id: randomUUID(),
      category: "failure_pattern",
      content: item,
      applicableConditions: [],
      confidence: 70,
      confirmationCount: 1,
      futureImpact: {
        shouldConsider: true,
        suggestedWeight: 70,
        context: "同様の状況で注意すべき",
      },
      sourceExecutionResultId: sourceId,
      createdAt: now,
    });
  }

  for (const item of retrospective.suggestions || []) {
    learnings.push({
      id: randomUUID(),
      category: "heuristic",
      content: item,
      applicableConditions: [],
      confidence: 60,
      confirmationCount: 1,
      futureImpact: {
        shouldConsider: true,
        suggestedWeight: 50,
        context: "今後の判断で検討すべき",
      },
      sourceExecutionResultId: sourceId,
      createdAt: now,
    });
  }

  return learnings;
}

// ヘルパー: セッションナレッジを更新
function updateSessionKnowledge(
  sessionId: string,
  result: ExecutionResult
): void {
  let knowledge = SessionKnowledgeRepository.findBySessionId(sessionId);
  if (!knowledge) {
    const session = SessionStore.findById(sessionId);
    if (!session) return;
    knowledge = createInitialSessionKnowledge(sessionId, session);
  }

  const now = new Date().toISOString();

  const typeMapping: Record<
    string,
    "insight" | "heuristic" | "pattern" | "warning"
  > = {
    success_pattern: "pattern",
    failure_pattern: "pattern",
    insight: "insight",
    heuristic: "heuristic",
    warning: "warning",
  };

  for (const learning of result.learnings) {
    knowledge.learnedInSession.push({
      type: typeMapping[learning.category] || "insight",
      content: learning.content,
      appliedTo: result.relatedNodeId ? [result.relatedNodeId] : [],
      learnedAt: now,
    });
  }

  if (result.retrospective) {
    knowledge.exportableSummary.learnings.push(
      ...result.learnings.map((l) => l.content)
    );
    knowledge.exportableSummary.recommendations.push(
      ...(result.retrospective.suggestions || [])
    );
  }

  knowledge.updatedAt = now;
  SessionKnowledgeRepository.save(knowledge);
}

function createInitialSessionKnowledge(
  sessionId: string,
  session: {
    purpose: string;
    selectionHistory: Array<{
      nodeId: string;
      nodeLabel: string;
      rationale?: string;
    }>;
  }
) {
  const now = new Date().toISOString();
  return {
    sessionId,
    learnedInSession: [] as Array<{
      type: "insight" | "heuristic" | "pattern" | "warning";
      content: string;
      appliedTo: string[];
      learnedAt: string;
    }>,
    appliedKnowledge: [] as Array<unknown>,
    exportableSummary: {
      decisions: session.selectionHistory.map((h) => ({
        question: `${h.nodeLabel}を選択`,
        answer: h.nodeLabel,
        rationale: h.rationale || "理由未記録",
      })),
      learnings: [] as string[],
      recommendations: [] as string[],
    },
    createdAt: now,
    updatedAt: now,
  };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = SessionStore.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    const results = ExecutionResultRepository.findBySessionId(sessionId);
    return NextResponse.json({ results });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "実行結果の取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;
    const body = await request.json();

    const session = SessionStore.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    if (!body.title || !body.status) {
      return NextResponse.json(
        { message: "title と status は必須です" },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const result: ExecutionResult = {
      id: randomUUID(),
      sessionId,
      executionPlanItemId: body.executionPlanItemId,
      relatedNodeId: body.relatedNodeId,
      title: body.title,
      description: body.description,
      status: body.status,
      startedAt:
        body.status === "in_progress" || body.status === "completed"
          ? now
          : undefined,
      completedAt:
        body.status === "completed" || body.status === "failed"
          ? now
          : undefined,
      outcome: body.outcome,
      retrospective: body.retrospective
        ? { ...body.retrospective, recordedAt: now }
        : undefined,
      learnings: [],
      createdAt: now,
      updatedAt: now,
    };

    if (body.retrospective) {
      result.learnings = extractLearningsFromRetrospective(
        body.retrospective,
        result.id
      );

      for (const learning of result.learnings) {
        KnowledgeRepository.saveLearning(learning);
        try {
          await promoteLearningToHeuristic(learning, 3);
        } catch (promoteErr) {
          console.warn(
            "[expertThinking] Learning promotion failed:",
            promoteErr
          );
        }
      }
    }

    ExecutionResultRepository.save(sessionId, result);
    updateSessionKnowledge(sessionId, result);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "実行結果の記録に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
