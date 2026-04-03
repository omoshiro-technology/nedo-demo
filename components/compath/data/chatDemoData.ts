/**
 * チャットデモ用データ
 *
 * types/chat.ts から分離したデモクイックアクション定義
 */

import type { DemoAction } from "../types/chat";

export const DEMO_ACTIONS: DemoAction[] = [
  {
    id: "demo-analysis",
    label: "議事録分析",
    description: "知財戦略会議の議事録分析",
    icon: "search",
    prompt: "【サンプル議事録データ】\n知財戦略会議の議事録を分析してください",
    sampleDataId: "meeting_minutes",
  },
  {
    id: "demo-knowledge",
    label: "文書構造解析",
    description: "報告書から知見を構造化",
    icon: "document",
    prompt: "【サンプル報告書データ】\n技術戦略報告書を構造解析してください",
    sampleDataId: "trouble_report",
  },
  {
    id: "demo-knowledge-transfer",
    label: "意思決定支援",
    description: "過去の知財判断を参照",
    icon: "search",
    prompt: "【技術伝承デモ】\n新規センシング×AI技術の特許出願方針を検討中。単独出願か大学との共同出願か、事業化は2年後予定。",
    sampleDataId: null,
  },
  {
    id: "demo-proposal",
    label: "提案書",
    description: "知財戦略提案書を作成",
    icon: "document",
    prompt: "センシング×AI技術の知財戦略提案書を作成したい。単独出願と共同出願の選択基準、海外展開時の出願戦略を考慮。",
    sampleDataId: null,
  },
];
