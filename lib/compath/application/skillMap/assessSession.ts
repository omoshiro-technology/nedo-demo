/**
 * セッション思考品質アセスメント
 *
 * チャット履歴をLLMで分析し、4軸の思考品質スコアを算出する。
 *
 * 層2 の 4軸:
 *   A. 観点網羅度（QCDES）
 *   B. 構造的思考度（比較・トレードオフ認識）
 *   C. 自発性（AIに先回りして論点提起）
 *   D. 専門性レベル（語彙・仮説の具体度）
 */

import { generateChatCompletion } from "../../infrastructure/llm/anthropicClient";
import { parseJsonFromLLMResponse } from "../../infrastructure/llm/jsonExtractor";
import type {
  SkillAssessment,
  SessionSource,
  ThoughtQualityScore,
  QCDESCoverage,
  UserRaisedPoint,
  SkillLevel,
} from "../../domain/skillMap/types";

// ============================================================
// 入力型
// ============================================================

/** アセスメント対象のチャット履歴 */
export type AssessSessionInput = {
  userId: string;
  sessionId: string;
  sessionSource: SessionSource;
  sessionPurpose: string;
  /** ユーザー発言とAI発言の履歴 */
  messages: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
  /** 利用可能なスキル項目（マッチング用） */
  availableSkills: Array<{ id: string; name: string; domain: string }>;
};

// ============================================================
// LLMプロンプト
// ============================================================

const SYSTEM_PROMPT = `あなたは製造業における技能伝承の専門家です。
ユーザーとAIの対話ログを分析し、ユーザーの思考品質を評価してください。

## 評価軸（各 0-100 で採点）

### A. 観点網羅度 (viewpointCoverage)
ユーザーが自発的に言及した観点の幅を評価する。
以下のQCDES各軸への言及有無も判定する:
- Quality（品質）: 品質基準、検査、公差、Cpk、トレーサビリティ等
- Cost（コスト）: 費用、予算、コスト最適化、材料コスト等
- Delivery（納期）: リードタイム、スケジュール、生産量、納期等
- Environment（環境）: 環境負荷、廃棄物、省エネ、環境規制等
- Safety（安全）: 労働安全、設備安全、リスク、法令遵守等

### B. 構造的思考度 (structuralThinking)
- 0-25: 単発の質問や感想のみ
- 26-50: 複数の論点を列挙するが関連づけはしない
- 51-75: 比較構造（A案 vs B案）やトレードオフを認識
- 76-100: 複数のトレードオフを俯瞰し、判断基準を明示して統合的に思考

### C. 自発性 (proactiveness)
ユーザーがAIの提示前に自ら論点を出している度合い。
AIが先に出した論点をなぞるだけなら低い。ユーザーが独自の観点を出していれば高い。

### D. 専門性レベル (expertiseLevel)
- 0-25: 一般用語のみ（「品質が心配」）
- 26-50: 業界用語を使用（「公差」「後工程」）
- 51-75: 具体的な条件設定（「板厚1.2mmでこの曲げR」）
- 76-100: 熟練者特有の仮説や暗黙知を言語化

## 出力JSON形式

以下の形式で出力してください。他のテキストは含めないでください。

\`\`\`json
{
  "viewpointCoverage": <number 0-100>,
  "qcdesCoverage": {
    "quality": <boolean>,
    "cost": <boolean>,
    "delivery": <boolean>,
    "environment": <boolean>,
    "safety": <boolean>
  },
  "structuralThinking": <number 0-100>,
  "proactiveness": <number 0-100>,
  "expertiseLevel": <number 0-100>,
  "userRaisedPoints": [
    {
      "content": "<論点の要約>",
      "expertiseLevel": "beginner" | "intermediate" | "expert",
      "relatedSkillNames": ["<関連スキル名>"]
    }
  ],
  "touchedSkillNames": ["<対話で触れられたスキル名>"]
}
\`\`\``;

// ============================================================
// アセスメント実行
// ============================================================

/** LLMレスポンスの型 */
type LLMAssessmentResult = {
  viewpointCoverage: number;
  qcdesCoverage: QCDESCoverage;
  structuralThinking: number;
  proactiveness: number;
  expertiseLevel: number;
  userRaisedPoints: Array<{
    content: string;
    expertiseLevel: "beginner" | "intermediate" | "expert";
    relatedSkillNames: string[];
  }>;
  touchedSkillNames: string[];
};

/** スキル名からIDへのマッピング */
function resolveSkillIds(
  names: string[],
  available: Array<{ id: string; name: string }>
): string[] {
  const ids: string[] = [];
  for (const name of names) {
    const lower = name.toLowerCase();
    const match = available.find(
      (s) =>
        s.name.toLowerCase() === lower ||
        s.name.toLowerCase().includes(lower) ||
        lower.includes(s.name.toLowerCase())
    );
    if (match) ids.push(match.id);
  }
  return [...new Set(ids)];
}

/** 思考品質スコアからスキルレベルを推定 */
function inferSkillLevel(
  tq: ThoughtQualityScore,
  pointExpertise: "beginner" | "intermediate" | "expert" | undefined
): SkillLevel {
  // 自発性 + 構造的思考 で統合レベルを判定
  if (tq.proactiveness >= 60 && tq.structuralThinking >= 60) return 4;
  // 自発性が高い = 応用レベル
  if (tq.proactiveness >= 40) return 3;
  // 専門性がある程度 = 理解レベル
  if (tq.expertiseLevel >= 30 || pointExpertise === "intermediate" || pointExpertise === "expert")
    return 2;
  // デフォルト: 認知
  return 1;
}

/**
 * セッションの思考品質をLLMで評価し、SkillAssessment を返す
 */
export async function assessSession(
  input: AssessSessionInput
): Promise<SkillAssessment> {
  // ユーザー発言のみ抽出（短いセッションはそのまま全文）
  const userMessages = input.messages.filter((m) => m.role === "user");
  if (userMessages.length === 0) {
    throw new Error("評価対象のユーザー発言がありません。");
  }

  // 対話ログを構築（最新20ターンに絞る）
  const recentMessages = input.messages.slice(-40); // user+assistant で最大20ターン
  const dialogueLog = recentMessages
    .map((m) => `[${m.role === "user" ? "ユーザー" : "AI"}]: ${m.content}`)
    .join("\n\n");

  const skillList = input.availableSkills
    .map((s) => `- ${s.name} (${s.domain})`)
    .join("\n");

  const userContent = `## セッション情報
目的: ${input.sessionPurpose}
種別: ${input.sessionSource}

## 利用可能なスキル項目
${skillList || "（未定義）"}

## 対話ログ
${dialogueLog}`;

  const raw = await generateChatCompletion({
    systemPrompt: SYSTEM_PROMPT,
    userContent,
    maxTokens: 2048,
    temperature: 0.1,
    timeout: 90000,
  });

  const result = parseJsonFromLLMResponse<LLMAssessmentResult>(raw);

  // スキル名 → ID 解決
  const touchedSkillIds = resolveSkillIds(
    result.touchedSkillNames,
    input.availableSkills
  );

  const thoughtQuality: ThoughtQualityScore = {
    viewpointCoverage: clamp(result.viewpointCoverage),
    qcdesCoverage: result.qcdesCoverage,
    structuralThinking: clamp(result.structuralThinking),
    proactiveness: clamp(result.proactiveness),
    expertiseLevel: clamp(result.expertiseLevel),
  };

  const userRaisedPoints: UserRaisedPoint[] = (
    result.userRaisedPoints ?? []
  ).map((p) => ({
    content: p.content,
    expertiseLevel: p.expertiseLevel,
    relatedSkillIds: resolveSkillIds(
      p.relatedSkillNames,
      input.availableSkills
    ),
  }));

  // スキルごとの習熟レベルを推定
  const skillLevels: Record<string, SkillLevel> = {};
  for (const skillId of touchedSkillIds) {
    const relatedPoint = userRaisedPoints.find((p) =>
      p.relatedSkillIds.includes(skillId)
    );
    skillLevels[skillId] = inferSkillLevel(
      thoughtQuality,
      relatedPoint?.expertiseLevel
    );
  }

  const assessment: SkillAssessment = {
    id: `sa-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    userId: input.userId,
    sessionSource: input.sessionSource,
    sessionId: input.sessionId,
    sessionPurpose: input.sessionPurpose,
    thoughtQuality,
    userRaisedPoints,
    touchedSkillIds,
    skillLevels,
    assessedAt: new Date().toISOString(),
  };

  return assessment;
}

function clamp(v: number, min = 0, max = 100): number {
  return Math.max(min, Math.min(max, Math.round(v)));
}
