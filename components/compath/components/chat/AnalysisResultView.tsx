"use client"
import { useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import AxisTabs from "../AxisTabs";
import GraphView from "../GraphView";
import MissingList from "../MissingList";
import type { AnalysisResult } from "../../types";
import { extractKnowledge } from "../../utils/knowledgeExtractor";

type AnalysisResultViewProps = {
  result: AnalysisResult;
  fileName: string;
};

function formatSummaryMarkdown(summary: string): string {
  const trimmed = summary.trim();
  if (!trimmed) return "";

  if (trimmed.includes("\n") || /^[-*]/m.test(trimmed)) {
    return trimmed;
  }

  const sentences = trimmed
    .split(/(?<=[。！？])/u)
    .map((part) => part.trim())
    .filter(Boolean);

  if (sentences.length <= 1) {
    return trimmed;
  }

  return sentences.map((line) => `- ${line}`).join("\n");
}

export default function AnalysisResultView({ result, fileName }: AnalysisResultViewProps) {
  const [selectedAxisId, setSelectedAxisId] = useState<string>(result.axes[0]?.id ?? "");
  const [isExpanded, setIsExpanded] = useState(true);

  const selectedGraph = result.graphs.find((graph) => graph.axisId === selectedAxisId);
  const formattedSummary = formatSummaryMarkdown(result.summary);

  const derived = useMemo(() => {
    return extractKnowledge(selectedGraph, result.summary, result.fullText);
  }, [selectedGraph, result.summary, result.fullText]);

  return (
    <div className="analysis-result-view">
      <div className="analysis-result-view__header">
        <div className="analysis-result-view__title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span>{fileName}</span>
        </div>
        <button
          type="button"
          className="analysis-result-view__toggle"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          {isExpanded ? "閉じる" : "詳細を表示"}
        </button>
      </div>

      <div className="analysis-result-view__summary">
        <div className="analysis-result-view__meta">
          <span>{result.documentType}</span>
          <span>{result.meta.pageCount}ページ</span>
          <span>{result.meta.textLength}文字</span>
        </div>
        <div className="markdown markdown--compact">
          <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
            {formattedSummary}
          </ReactMarkdown>
        </div>
      </div>

      {isExpanded && (
        <div className="analysis-result-view__detail">
          {result.warnings.length > 0 && (
            <div className="analysis-result-view__warnings">
              {result.warnings.map((warning, idx) => (
                <span key={`${warning}-${idx}`} className="analysis-result-view__warning">
                  {warning}
                </span>
              ))}
            </div>
          )}

          <AxisTabs
            axes={result.axes}
            selectedAxisId={selectedAxisId}
            onSelect={setSelectedAxisId}
          />

          {selectedGraph && (
            <div className="analysis-result-view__graph">
              <GraphView
                graph={selectedGraph}
                summary={result.summary}
                feedforward={derived.feedforward}
                feedback={derived.feedback}
              />
              <MissingList nodes={selectedGraph.nodes} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
