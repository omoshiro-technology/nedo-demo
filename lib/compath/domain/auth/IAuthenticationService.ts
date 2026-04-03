/**
 * 認証サービスインターフェース
 *
 * OpenID Connect (OIDC) 準拠の認証サービス抽象化
 *
 * 実装例:
 * - OIDCAuthenticationService: EntraID, Okta, Auth0等
 * - MockAuthenticationService: 開発・テスト用
 */

import type {
  AuthenticatedUser,
  OIDCConfiguration,
  JsonWebKeySet,
  AuthConfig,
} from "./types";

// ============================================================
// 認証サービスインターフェース
// ============================================================

/**
 * 認証サービスインターフェース
 */
export interface IAuthenticationService {
  /**
   * トークンを検証し、ユーザー情報を取得
   *
   * @param token Bearer トークン（JWT）
   * @returns 認証済みユーザー情報、または null（無効な場合）
   *
   * @example
   * const user = await authService.validateToken("eyJhbGciOiJSUzI1NiI...");
   * if (user) {
   *   console.log(`認証成功: ${user.email}`);
   * }
   */
  validateToken(token: string): Promise<AuthenticatedUser | null>;

  /**
   * トークンをリフレッシュ
   *
   * @param refreshToken リフレッシュトークン
   * @returns 新しいアクセストークン、または null（失敗時）
   */
  refreshToken(refreshToken: string): Promise<string | null>;

  /**
   * OIDC Discovery エンドポイントから設定を取得
   *
   * @param issuer IdP の issuer URL
   * @returns OIDC 設定
   *
   * @example
   * const config = await authService.discoverConfiguration(
   *   "https://login.microsoftonline.com/{tenant-id}/v2.0"
   * );
   */
  discoverConfiguration(issuer: string): Promise<OIDCConfiguration>;

  /**
   * JWKS（公開鍵セット）を取得
   *
   * @param jwksUri JWKS エンドポイント URL
   * @returns JSON Web Key Set
   */
  getJwks(jwksUri: string): Promise<JsonWebKeySet>;

  /**
   * トークンの有効期限を確認
   *
   * @param token JWT トークン
   * @returns 有効期限切れかどうか
   */
  isTokenExpired(token: string): boolean;

  /**
   * トークンからユーザー情報を抽出（検証なし）
   *
   * @param token JWT トークン
   * @returns デコードされたペイロード、または null
   */
  decodeToken(token: string): Record<string, unknown> | null;
}

// ============================================================
// 認証結果
// ============================================================

/** 認証結果 */
export type AuthenticationResult =
  | { success: true; user: AuthenticatedUser }
  | { success: false; error: AuthenticationError };

/** 認証エラー */
export type AuthenticationError = {
  code: AuthErrorCode;
  message: string;
  details?: Record<string, unknown>;
};

/** 認証エラーコード */
export type AuthErrorCode =
  | "TOKEN_MISSING"           // トークンなし
  | "TOKEN_INVALID"           // トークン形式不正
  | "TOKEN_EXPIRED"           // トークン期限切れ
  | "TOKEN_NOT_YET_VALID"     // トークン開始時刻前
  | "SIGNATURE_INVALID"       // 署名検証失敗
  | "ISSUER_MISMATCH"         // 発行者不一致
  | "AUDIENCE_MISMATCH"       // オーディエンス不一致
  | "JWKS_FETCH_FAILED"       // JWKS 取得失敗
  | "DISCOVERY_FAILED"        // Discovery 取得失敗
  | "USER_EXTRACTION_FAILED"  // ユーザー情報抽出失敗
  | "TENANT_EXTRACTION_FAILED" // テナントID抽出失敗
  | "UNKNOWN_ERROR";          // 不明なエラー

// ============================================================
// ファクトリ関数
// ============================================================

/**
 * 認証サービスのファクトリ関数型
 *
 * @param config 認証設定
 * @returns 認証サービスインスタンス
 */
export type AuthenticationServiceFactory = (
  config: AuthConfig
) => IAuthenticationService;
