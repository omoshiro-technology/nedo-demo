"use client"
/**
 * FTACardBody - FTA分析結果の本文表示
 *
 * 表示内容:
 * - サマリー
 * - ノード数、深さ
 * - 未確定項目（missingリスト）
 * - 展開時: グラフ表示、詳細一覧
 */

import type { FTAContent, MissingItem } from "../../types/artifact";

type FTACardBodyProps = {
  content: FTAContent;
  summary: string;
  missing: MissingItem[];
  isExpanded: boolean;
};

function WarningIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function ChartIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="18" y1="20" x2="18" y2="10" />
      <line x1="12" y1="20" x2="12" y2="4" />
      <line x1="6" y1="20" x2="6" y2="14" />
    </svg>
  );
}

export function FTACardBody({
  content,
  summary,
  missing,
  isExpanded,
}: FTACardBodyProps) {
  const { top_event, metrics, nodes } = content;
  const highSeverityMissing = missing.filter((m) => m.severity === "high");

  return (
    <div className="artifact-card-body artifact-card-body--fta">
      {/* サマリーセクション（常時表示） */}
      <div className="artifact-card-body__summary">
        <p className="artifact-card-body__summary-text">{summary}</p>
      </div>

      {/* メトリクス */}
      <div className="artifact-card-body__metrics">
        <span className="artifact-card-body__metric">
          <ChartIcon />
          <span>ノード: {metrics.node_count}件</span>
        </span>
        <span className="artifact-card-body__metric">
          <span>深さ: {metrics.depth}階層</span>
        </span>
        {missing.length > 0 && (
          <span className="artifact-card-body__metric artifact-card-body__metric--warning">
            <WarningIcon />
            <span>未確定: {missing.length}件</span>
          </span>
        )}
      </div>

      {/* 未確定項目（重要度高のみ表示） */}
      {highSeverityMissing.length > 0 && (
        <div className="artifact-card-body__missing-preview">
          {highSeverityMissing.slice(0, 2).map((item) => (
            <div key={item.id} className="artifact-card-body__missing-item">
              <WarningIcon />
              <span>{item.question}</span>
            </div>
          ))}
          {highSeverityMissing.length > 2 && (
            <span className="artifact-card-body__missing-more">
              他 {highSeverityMissing.length - 2} 件
            </span>
          )}
        </div>
      )}

      {/* 展開時の詳細 */}
      {isExpanded && (
        <div className="artifact-card-body__detail">
          <div className="artifact-card-body__section">
            <h4 className="artifact-card-body__section-title">トップイベント</h4>
            <p className="artifact-card-body__section-content">{top_event}</p>
          </div>

          {/* ノード一覧（簡易表示） */}
          <div className="artifact-card-body__section">
            <h4 className="artifact-card-body__section-title">ノード一覧</h4>
            <div className="artifact-card-body__node-list">
              {nodes.slice(0, 10).map((node) => (
                <div
                  key={node.id}
                  className={`artifact-card-body__node artifact-card-body__node--${node.kind.toLowerCase()}`}
                >
                  <span className="artifact-card-body__node-kind">
                    {node.kind === "EVENT" ? "事象" : node.kind === "CAUSE" ? "原因" : "対策"}
                  </span>
                  <span className="artifact-card-body__node-label">{node.label}</span>
                </div>
              ))}
              {nodes.length > 10 && (
                <span className="artifact-card-body__node-more">
                  他 {nodes.length - 10} 件
                </span>
              )}
            </div>
          </div>

          {/* 未確定項目の詳細 */}
          {missing.length > 0 && (
            <div className="artifact-card-body__section">
              <h4 className="artifact-card-body__section-title">未確定項目</h4>
              <div className="artifact-card-body__missing-list">
                {missing.map((item) => (
                  <div
                    key={item.id}
                    className={`artifact-card-body__missing-detail artifact-card-body__missing-detail--${item.severity}`}
                  >
                    <span className="artifact-card-body__missing-field">{item.field}</span>
                    <span className="artifact-card-body__missing-question">{item.question}</span>
                    {item.suggested_inputs && item.suggested_inputs.length > 0 && (
                      <div className="artifact-card-body__missing-suggestions">
                        {item.suggested_inputs.map((suggestion, i) => (
                          <span key={i} className="artifact-card-body__missing-suggestion">
                            {suggestion}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
