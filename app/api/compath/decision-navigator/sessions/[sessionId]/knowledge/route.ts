import { NextRequest, NextResponse } from "next/server";
import { SessionStore } from "@/lib/compath/application/decisionNavigator";
import { SessionKnowledgeRepository } from "@/lib/compath/application/repositories";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const { sessionId } = await params;

    const session = await SessionStore.findById(sessionId);
    if (!session) {
      return NextResponse.json(
        { message: "セッションが見つかりません" },
        { status: 404 }
      );
    }

    let knowledge = SessionKnowledgeRepository.findBySessionId(sessionId);
    if (!knowledge) {
      const now = new Date().toISOString();
      knowledge = {
        sessionId,
        learnedInSession: [],
        appliedKnowledge: [],
        exportableSummary: {
          decisions: session.selectionHistory.map(
            (h: { nodeId: string; nodeLabel: string; rationale?: string }) => ({
              question: `${h.nodeLabel}を選択`,
              answer: h.nodeLabel,
              rationale: h.rationale || "理由未記録",
            })
          ),
          learnings: [],
          recommendations: [],
        },
        createdAt: now,
        updatedAt: now,
      };
      SessionKnowledgeRepository.save(knowledge);
    }

    return NextResponse.json(knowledge);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "ナレッジの取得に失敗しました。";
    return NextResponse.json({ message }, { status: 500 });
  }
}
