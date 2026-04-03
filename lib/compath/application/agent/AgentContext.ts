/**
 * エージェント実行コンテキスト
 *
 * エージェントの状態と実行履歴を管理する
 */

import type {
  AgentContext as AgentContextType,
  AgentState,
  Tool,
  ToolExecutionRecord,
  ConversationMessage,
  FileInfo,
  AgentPlan,
} from "../../domain/agent/types";

/**
 * AgentContextの実装クラス
 *
 * 状態機械の各状態間でコンテキストを共有し、
 * 実行履歴やツール結果を蓄積する
 */
export class AgentContext implements AgentContextType {
  sessionId: string;
  userInput: string;
  uploadedFiles: FileInfo[];
  conversationHistory: ConversationMessage[];
  availableTools: Tool[];
  toolResults: ToolExecutionRecord[];
  currentState: AgentState;
  maxIterations: number;
  currentIteration: number;

  /** 現在の計画（PLANフェーズで設定） */
  private _currentPlan?: AgentPlan;

  /** 最終応答（COMPLETEフェーズで設定） */
  private _finalResponse?: string;

  /** エラー情報（ERRORフェーズで設定） */
  private _errorInfo?: { message: string; recoverable: boolean };

  constructor(options: {
    sessionId: string;
    userInput: string;
    uploadedFiles?: FileInfo[];
    conversationHistory?: ConversationMessage[];
    availableTools: Tool[];
    maxIterations?: number;
  }) {
    this.sessionId = options.sessionId;
    this.userInput = options.userInput;
    this.uploadedFiles = options.uploadedFiles || [];
    this.conversationHistory = options.conversationHistory || [];
    this.availableTools = options.availableTools;
    this.toolResults = [];
    this.currentState = "IDLE";
    this.maxIterations = options.maxIterations || 10;
    this.currentIteration = 0;
  }

  /**
   * 状態を遷移させる
   */
  transitionTo(newState: AgentState): void {
    console.log(
      `[AgentContext] State transition: ${this.currentState} → ${newState}`
    );
    this.currentState = newState;
  }

  /**
   * イテレーションをインクリメント
   */
  incrementIteration(): void {
    this.currentIteration++;
    console.log(
      `[AgentContext] Iteration: ${this.currentIteration}/${this.maxIterations}`
    );
  }

  /**
   * 最大イテレーションに達したかチェック
   */
  hasReachedMaxIterations(): boolean {
    return this.currentIteration >= this.maxIterations;
  }

  /**
   * ツール実行結果を記録
   */
  recordToolExecution(record: ToolExecutionRecord): void {
    this.toolResults.push(record);
    console.log(
      `[AgentContext] Tool executed: ${record.toolName} (${record.result.success ? "success" : "failed"})`
    );
  }

  /**
   * 会話履歴にメッセージを追加
   */
  addMessage(role: "user" | "assistant" | "system", content: string): void {
    this.conversationHistory.push({
      role,
      content,
      timestamp: Date.now(),
    });
  }

  /**
   * 計画を設定
   */
  setPlan(plan: AgentPlan): void {
    this._currentPlan = plan;
    console.log(
      `[AgentContext] Plan set: ${plan.steps.length} steps, confidence: ${plan.confidence}`
    );
  }

  /**
   * 現在の計画を取得
   */
  getPlan(): AgentPlan | undefined {
    return this._currentPlan;
  }

  /**
   * 最終応答を設定
   */
  setFinalResponse(response: string): void {
    this._finalResponse = response;
  }

  /**
   * 最終応答を取得
   */
  getFinalResponse(): string | undefined {
    return this._finalResponse;
  }

  /**
   * エラー情報を設定
   */
  setError(message: string, recoverable: boolean = false): void {
    this._errorInfo = { message, recoverable };
    this.transitionTo("ERROR");
  }

  /**
   * エラー情報を取得
   */
  getError(): { message: string; recoverable: boolean } | undefined {
    return this._errorInfo;
  }

  /**
   * コンテキストの要約を取得（LLMに渡す用）
   */
  getSummary(): string {
    const parts: string[] = [];

    // ユーザー入力
    parts.push(`## ユーザーリクエスト\n${this.userInput}`);

    // アップロードファイル
    if (this.uploadedFiles.length > 0) {
      const fileList = this.uploadedFiles
        .map((f) => `- ${f.name} (${f.type}, ${f.size} bytes)`)
        .join("\n");
      parts.push(`## アップロードファイル\n${fileList}`);
    }

    // 実行済みツール
    if (this.toolResults.length > 0) {
      const toolList = this.toolResults
        .map(
          (r) =>
            `- ${r.toolName}: ${r.result.success ? "成功" : "失敗"} (${r.result.executionTimeMs || 0}ms)`
        )
        .join("\n");
      parts.push(`## 実行済みツール\n${toolList}`);
    }

    // 現在の状態
    parts.push(
      `## 現在の状態\n- State: ${this.currentState}\n- Iteration: ${this.currentIteration}/${this.maxIterations}`
    );

    return parts.join("\n\n");
  }

  /**
   * 利用可能なツール名のリストを取得
   */
  getAvailableToolNames(): string[] {
    return this.availableTools.map((t) => t.name);
  }

  /**
   * ツールを名前で取得
   */
  getToolByName(name: string): Tool | undefined {
    return this.availableTools.find((t) => t.name === name);
  }
}
