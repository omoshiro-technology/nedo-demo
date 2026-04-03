"use client"
/**
 * SampleDataButtons - サンプルデータ選択ボタン
 *
 * エージェントタイプに応じたサンプルデータ選択ボタンを表示
 */

import type { AgentType } from "../../types/chat";
import { useDemoScenario } from "../../data/DemoScenarioContext";

type SampleDataButtonsProps = {
  agentType: AgentType;
  isProcessing: boolean;
  onSampleSelect: (sampleText: string, sampleName: string) => void;
};

export function SampleDataButtons({ agentType, isProcessing, onSampleSelect }: SampleDataButtonsProps) {
  const { scenario } = useDemoScenario();

  if (agentType === "knowledge_extraction" && scenario.sampleKnowledgeSet) {
    return (
      <div className="sample-data-buttons">
        <span className="sample-data-buttons__label">サンプルデータ:</span>
        {scenario.sampleKnowledgeSet.map((item) => (
          <button
            key={item.id}
            type="button"
            className="sample-data-btn"
            onClick={() => onSampleSelect(item.data, item.title)}
            disabled={isProcessing}
            title={item.description}
          >
            {item.title}
          </button>
        ))}
      </div>
    );
  }

  if (agentType === "unified_analysis" && scenario.sampleMeetingMinutesSet) {
    return (
      <div className="sample-data-buttons">
        <span className="sample-data-buttons__label">サンプルデータ:</span>
        {scenario.sampleMeetingMinutesSet.map((item) => (
          <button
            key={item.id}
            type="button"
            className="sample-data-btn"
            onClick={() => onSampleSelect(item.data, item.title)}
            disabled={isProcessing}
            title={item.description}
          >
            {item.title}
          </button>
        ))}
      </div>
    );
  }

  return null;
}
