/**
 * Fastify 認証プラグインインターフェース
 *
 * Fastify のライフサイクルフックを使用した認証・認可の統合
 */

import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import type { AuthContext, AuthConfig } from "../../domain/auth/types";
import type { IAuthenticationService } from "../../domain/auth/IAuthenticationService";
import type { IAuthorizationService } from "../../domain/auth/IAuthorizationService";

// ============================================================
// Fastify 型拡張
// ============================================================

declare module "fastify" {
  interface FastifyRequest {
    /**
     * 認証コンテキスト
     * 認証成功時に設定される
     */
    auth?: AuthContext;
  }

  interface FastifyInstance {
    /**
     * 認証が必要なルートに適用するデコレータ
     */
    authenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;

    /**
     * オプショナル認証（認証があれば使用、なくても通過）
     */
    optionalAuthenticate: (
      request: FastifyRequest,
      reply: FastifyReply
    ) => Promise<void>;
  }
}

// ============================================================
// 認証プラグインインターフェース
// ============================================================

/**
 * Fastify 認証プラグインインターフェース
 */
export interface IAuthPlugin {
  /**
   * Fastify にプラグインを登録
   *
   * @param fastify Fastify インスタンス
   *
   * @example
   * const authPlugin = new OIDCAuthPlugin(config);
   * await authPlugin.register(fastify);
   *
   * // ルートで使用
   * fastify.get('/api/protected', {
   *   preHandler: fastify.authenticate
   * }, handler);
   */
  register(fastify: FastifyInstance): Promise<void>;

  /**
   * 認証ミドルウェア（preHandler フック）
   *
   * Authorization ヘッダーから Bearer トークンを抽出し、
   * 検証して request.auth に認証コンテキストを設定
   *
   * 失敗時は 401 Unauthorized を返す
   */
  authenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void>;

  /**
   * オプショナル認証ミドルウェア
   *
   * トークンがある場合は検証して request.auth を設定
   * トークンがない場合でもリクエストを通過させる
   */
  optionalAuthenticate(
    request: FastifyRequest,
    reply: FastifyReply
  ): Promise<void>;

  /**
   * ロール要求ミドルウェアを作成
   *
   * @param requiredRole 必要なロール
   * @returns preHandler フック
   *
   * @example
   * fastify.delete('/api/admin-only', {
   *   preHandler: [fastify.authenticate, authPlugin.requireRole('admin')]
   * }, handler);
   */
  requireRole(
    requiredRole: string
  ): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;

  /**
   * スコープ要求ミドルウェアを作成
   *
   * @param requiredScope 必要なスコープ
   * @returns preHandler フック
   */
  requireScope(
    requiredScope: string
  ): (request: FastifyRequest, reply: FastifyReply) => Promise<void>;
}

// ============================================================
// プラグイン設定
// ============================================================

/**
 * 認証プラグイン設定
 */
export type AuthPluginConfig = AuthConfig & {
  /**
   * 認証サービス
   */
  authenticationService: IAuthenticationService;

  /**
   * 認可サービス（オプション）
   */
  authorizationService?: IAuthorizationService;

  /**
   * 認証エラー時のカスタムハンドラ
   */
  onAuthError?: (
    error: AuthPluginError,
    request: FastifyRequest,
    reply: FastifyReply
  ) => Promise<void>;

  /**
   * 認証成功時のフック
   */
  onAuthSuccess?: (
    auth: AuthContext,
    request: FastifyRequest
  ) => Promise<void>;

  /**
   * 認証をスキップするパス（正規表現）
   */
  skipPaths?: RegExp[];
};

/**
 * 認証プラグインエラー
 */
export type AuthPluginError = {
  code: string;
  message: string;
  statusCode: number;
  details?: Record<string, unknown>;
};

// ============================================================
// ヘルパー関数
// ============================================================

/**
 * Authorization ヘッダーから Bearer トークンを抽出
 *
 * @param authHeader Authorization ヘッダー値
 * @returns トークン、または null
 */
export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;

  const parts = authHeader.split(" ");
  if (parts.length !== 2 || parts[0].toLowerCase() !== "bearer") {
    return null;
  }

  return parts[1];
}

/**
 * 認証エラーレスポンスを作成
 */
export function createAuthErrorResponse(
  code: string,
  message: string,
  statusCode: number = 401
): AuthPluginError {
  return {
    code,
    message,
    statusCode,
  };
}

/**
 * 401 Unauthorized レスポンス
 */
export const UNAUTHORIZED: AuthPluginError = {
  code: "UNAUTHORIZED",
  message: "認証が必要です",
  statusCode: 401,
};

/**
 * 403 Forbidden レスポンス
 */
export const FORBIDDEN: AuthPluginError = {
  code: "FORBIDDEN",
  message: "このリソースにアクセスする権限がありません",
  statusCode: 403,
};

/**
 * トークン期限切れレスポンス
 */
export const TOKEN_EXPIRED: AuthPluginError = {
  code: "TOKEN_EXPIRED",
  message: "トークンの有効期限が切れています",
  statusCode: 401,
};
