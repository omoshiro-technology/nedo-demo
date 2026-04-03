import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { ExecutionResultRepository } from "@/lib/compath/application/repositories";
import type {
  Retrospective,
  Learning,
  ExecutionResult,
} from "@/lib/compath/domain/decisionNavigator/expertThinking/executionResult";

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

export async function PATCH(
  request: NextRequest,
  {
    params,
  }: { params: Promise<{ sessionId: string; resultId: string }> }
) {
  try {
    const { sessionId, resultId } = await params;
    const body = await request.json();

    const existingResult = ExecutionResultRepository.findById(
      sessionId,
      resultId
    );
    if (!existingResult) {
      return NextResponse.json(
        { message: "実行結果が見つかりません" },
        { status: 404 }
      );
    }

    const now = new Date().toISOString();
    const updates: Partial<ExecutionResult> = {
      ...(body.status && { status: body.status }),
      ...(body.outcome && { outcome: body.outcome }),
      ...(body.retrospective && {
        retrospective: { ...body.retrospective, recordedAt: now },
      }),
      updatedAt: now,
    };

    if (body.retrospective) {
      updates.learnings = extractLearningsFromRetrospective(
        body.retrospective,
        resultId
      );
    }

    const updated = ExecutionResultRepository.update(
      sessionId,
      resultId,
      updates
    );
    if (!updated) {
      return NextResponse.json(
        { message: "更新に失敗しました" },
        { status: 500 }
      );
    }

    return NextResponse.json(updated);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "実行結果の更新に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
