import type { AxisLevel } from "../../domain/types";

type ChatMessage = { role: "user" | "assistant"; content: string };

type ChatContext = {
  axisLabel: string;
  summary?: string;
  nodes: Array<{ label: string; levelLabel: string; status?: string; isPlaceholder?: boolean }>;
  edges: Array<{ sourceLabel: string; targetLabel: string }>;
  levels?: AxisLevel[];
};

export function buildChatPrompt(messages: ChatMessage[], context?: ChatContext): string {
  const recent = messages.slice(-6);
  const user = recent.filter((m) => m.role === "user");
  const assistant = recent.filter((m) => m.role === "assistant");

  const lastUser = user[user.length - 1]?.content ?? "";
  const historyText = recent
    .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
    .join("\n");

  const nodesByLevel =
    context?.nodes?.reduce<Record<string, string[]>>((acc, node) => {
      if (!acc[node.levelLabel]) acc[node.levelLabel] = [];
      const mark = node.isPlaceholder ? "（補完候補）" : node.status === "missing" ? "（欠損）" : "";
      acc[node.levelLabel]?.push(`${node.label}${mark}`);
      return acc;
    }, {}) ?? {};

  const levelsOrder =
    context?.levels?.map((l) => l.label) ??
    Object.keys(nodesByLevel);

  const edgesText =
    context?.edges
      ?.map((e) => `- ${e.sourceLabel} -> ${e.targetLabel}`)
      .join("\n") ?? "";

  const nodesText = levelsOrder
    .map((lvl) => {
      const list = nodesByLevel[lvl];
      if (!list || list.length === 0) return null;
      return `${lvl}: ${list.slice(0, 8).join(" / ")}`;
    })
    .filter(Boolean)
    .join("\n");

  const summaryText = context?.summary ? `要約: ${context.summary}\n` : "";

  // コンテキストがあるかどうかで指示を分岐
  const hasContext = context?.axisLabel && context.axisLabel.trim() !== "";

  // 構造化ノード向け指示（コンテキストあり）
  const structuredInstructions = [
    "あなたは構造化ノードと要約の両方を補助する対話アシスタントです。次を守ってください:",
    "- まずユーザーの質問に直接答える（はい/いいえの形式を強制しない）。1〜2文で端的に。",
    "- 質問が「要約/概要/何が書かれているか」に関する場合: コンテキスト要約をMarkdownで短く返す。要約が無ければ「要約未提供」と明記して簡易観察のみ返す。",
    "- 質問がノードの追加/欠損/原因・対策・事例の補完に関する場合: 事実ベースの候補を最大3件だけ箇条書きで示す。",
    "- 推測が必要な場合は別段落を「(推測)」と明示し、最大2件の箇条書きを示す。",
    "- 箇条書き形式: `- レベル: ラベル — 簡潔な理由`（例: `- 原因: 情報共有チャネルの分散 — 改訂が伝わらない`）。",
    "- レベル名は既存レベルに合わせる（例: 不具合/原因/対策/事例）。同じレベル名を連続で重ねない。",
    "- 追加候補が無いときは「追加候補なし」と明記する。",
  ];

  // 一般対話向け指示（コンテキストなし）
  const generalInstructions = [
    "次のガイドラインに従って回答してください:",
    "",
    "## 対話の進め方（質問は最小限に）",
    "- **初回のみ**状況確認の質問をしてよい（1つだけ）",
    "- **2回目以降は質問せず、提案・アドバイスに集中する**",
    "- 「他にご質問は？」「確認したいことがあります」は付けない",
    "",
    "## 重要: 提案・解決を優先",
    "- 得られた情報から**判断して具体的な提案**をする",
    "- 「〜という方法があります」「〜をお勧めします」と具体的に",
    "- 質問で終わらせず、必ず何らかの提案で締める",
    "",
    "## 例: 良い対話の流れ",
    "- User: 「納期と品質で迷っています」",
    "  → AI: 「どの程度の遅れを想定されていますか？」（初回のみ質問OK）",
    "- User: 「1週間程度です」",
    "  → AI: 「1週間の遅れなら、以下の選択肢があります：①機能を絞って納期を守る ②品質を優先し納期を調整する。一般的には、クリティカルな機能のみに絞る①がリスクが低いです。」（提案で完結）",
    "",
    "## 回答の質",
    "- 具体的で実行可能なアドバイスを心がける",
    "- 推測の場合は「一般的には」と明示する",
    "- 専門用語を使う場合は簡単な説明を添える",
  ];

  const instructions = hasContext ? structuredInstructions : generalInstructions;

  if (hasContext) {
    // コンテキストありの場合: 既存のフォーマット
    return [
      `軸: ${context?.axisLabel ?? "不明"}`,
      summaryText,
      nodesText ? `ノード一覧:\n${nodesText}` : "ノード一覧: なし",
      edgesText ? `エッジ:\n${edgesText}` : "エッジ: なし",
      "",
      "会話履歴:",
      historyText,
      "",
      ...instructions,
      "",
      `ユーザーの最新入力: ${lastUser}`,
    ]
      .filter(Boolean)
      .join("\n");
  } else {
    // コンテキストなしの場合: シンプルなフォーマット
    return [
      "会話履歴:",
      historyText,
      "",
      ...instructions,
      "",
      `ユーザーの最新入力: ${lastUser}`,
    ]
      .filter(Boolean)
      .join("\n");
  }
}
