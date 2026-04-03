"use client"
import { useState, useCallback, useRef } from "react";
import { type AgentType, type DemoAction } from "../../types/chat";
import { useDemoScenario } from "../../data/DemoScenarioContext";
import { detectAgent } from "../../utils/agentDetector";
import { AGENT_SELECTOR } from "../../constants/philosophy";

type AgentSelectorProps = {
  onSelectAgent: (agentType: AgentType) => void;
  onSubmit: (message: string, files?: File[], agentType?: AgentType) => void;
};

function DemoIcon({ icon, size = 16 }: { icon: DemoAction["icon"]; size?: number }) {
  switch (icon) {
    case "document":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    case "search":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
      );
    case "compass":
      return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      );
    default:
      return null;
  }
}

export default function AgentSelector({ onSelectAgent, onSubmit }: AgentSelectorProps) {
  const { scenario, scenarios, scenarioId, setScenarioId } = useDemoScenario();
  const [input, setInput] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSubmit = useCallback(() => {
    if (!input.trim() && files.length === 0) return;

    const detectedAgent = detectAgent(input, files.length > 0 ? files : undefined);
    onSubmit(input, files.length > 0 ? files : undefined, detectedAgent);
    setInput("");
    setFiles([]);
  }, [input, files, onSubmit]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      // Ctrl+Enter または Cmd+Enter で送信
      if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
        e.preventDefault();
        handleSubmit();
      }
    },
    [handleSubmit]
  );

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles(Array.from(e.target.files));
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files) {
      setFiles(Array.from(e.dataTransfer.files));
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const removeFile = useCallback((index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  return (
    <div className="agent-selector">
      <h1 className="agent-selector__title">{AGENT_SELECTOR.TITLE}</h1>
      <p className="agent-selector__subtitle">
        {AGENT_SELECTOR.SUBTITLE}
      </p>

      <div
        className={`agent-selector__input-area ${isDragging ? "agent-selector__input-area--dragging" : ""}`}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        <textarea
          className="agent-selector__textarea"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={AGENT_SELECTOR.PLACEHOLDER}
          rows={3}
        />

        {files.length > 0 && (
          <div className="agent-selector__files">
            {files.map((file, index) => (
              <div key={index} className="agent-selector__file">
                <span className="agent-selector__file-name">{file.name}</span>
                <button
                  type="button"
                  className="agent-selector__file-remove"
                  onClick={() => removeFile(index)}
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="agent-selector__input-actions">
          <button
            type="button"
            className="agent-selector__attach-btn"
            onClick={() => fileInputRef.current?.click()}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
            ファイル添付
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,.docx,.doc,.txt"
            onChange={handleFileChange}
            multiple
            hidden
          />
          <button
            type="button"
            className="agent-selector__submit-btn"
            onClick={handleSubmit}
            disabled={!input.trim() && files.length === 0}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            送信
          </button>
        </div>
      </div>

      <div className="agent-selector__quick-actions">
        <div className="agent-selector__demo-header">
          <p className="agent-selector__quick-label">{AGENT_SELECTOR.DEMO_SECTION_LABEL}</p>
          {scenarios.length > 1 && (
            <select
              className="agent-selector__scenario-select"
              value={scenarioId}
              onChange={(e) => setScenarioId(e.target.value)}
            >
              {scenarios.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          )}
        </div>
        <div className="agent-selector__quick-grid">
          {scenario.demoActions.map((action) => (
            <button
              key={action.id}
              type="button"
              className="agent-selector__quick-btn"
              onClick={() => setInput(action.prompt)}
            >
              <span className="agent-selector__quick-icon">
                <DemoIcon icon={action.icon} size={16} />
              </span>
              {action.label}
            </button>
          ))}
        </div>
      </div>

    </div>
  );
}
