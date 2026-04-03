/**
 * デモシナリオ型定義
 *
 * 各シナリオは、デモ画面で使用する全データセットを提供する。
 * シナリオを切り替えることで、異なる業種・ユースケースのデモが可能。
 */

import type { CustomerProfile, EvaluationPointRow } from "../../types/proposal";
import type { DemoAction } from "../../types/chat";
import type { KnowledgeTransferConditions } from "../../types/chat";
import type { PastCaseReference, SimulationCondition } from "../../types/decisionNavigator";
import type { SimilarCase } from "../../types/similarCase";

/** サンプルデータの説明情報 */
export type SampleDataDescription = {
  id: string;
  title: string;
  description: string;
  data: string;
};

/** 条件収集質問の選択肢 */
export type QuestionOption = {
  value: string;
  label: string;
  description: string;
};

/** 条件収集質問の定義 */
export type QuestionDefinition = {
  id: keyof KnowledgeTransferConditions;
  title: string;
  question: string;
  intent: string;
  options: QuestionOption[];
};

/** デモシナリオ定義 */
export type DemoScenario = {
  id: string;
  name: string;
  description: string;

  /** デモクイックアクション（ホーム画面のボタン） */
  demoActions: DemoAction[];

  /** 提案書用の顧客プロファイル */
  customerProfiles: CustomerProfile[];

  /** 判断論点のデフォルト行 */
  defaultEvaluationPointRows: EvaluationPointRow[];

  /** 意思決定ナビゲーター用の過去事例 */
  pastCases: PastCaseReference[];

  /** 条件収集質問（KnowledgeTransferQuestionCard用） */
  knowledgeTransferQuestions: QuestionDefinition[];

  /** 事前収集条件からシミュレーション条件を生成 */
  createConditions: (preCollected?: KnowledgeTransferConditions) => SimulationCondition[];

  /** 全利用可能条件を生成（詳細設定用） */
  createAllConditions: (preCollected?: KnowledgeTransferConditions) => SimulationCondition[];

  /** サンプル議事録データ（unified_analysis用） */
  sampleMeetingMinutesSet?: SampleDataDescription[];

  /** サンプル報告書データ（knowledge_extraction用） */
  sampleKnowledgeSet?: SampleDataDescription[];

  /** 類似事例データ（提案書フロー用） */
  similarCases?: SimilarCase[];
};
