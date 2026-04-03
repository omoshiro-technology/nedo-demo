/**
 * 提案書生成APIクライアント
 * Phase 28: 営業向け提案書作成支援
 */

import type {
  GenerateProposalRequest,
  GenerateProposalResponse,
} from "../types/proposal";

const API_BASE = "/api/compath";

/**
 * 提案書を生成
 * サーバー側で90秒タイムアウトが設定されているため、クライアント側タイムアウトは不要
 */
export async function generateProposal(
  request: GenerateProposalRequest
): Promise<GenerateProposalResponse> {
  const response = await fetch(`${API_BASE}/proposal/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(request),
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "提案書の生成に失敗しました");
  }

  return response.json();
}
