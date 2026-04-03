/**
 * OIDC 認証サービス（スタブ）
 *
 * OpenID Connect 準拠の認証サービス
 * 本番化フェーズで実装予定
 *
 * 対応予定 IdP:
 * - Microsoft Entra ID (旧 Azure AD)
 * - Okta
 * - Auth0
 * - Keycloak
 * - その他 OIDC 準拠 IdP
 */

import type { IAuthenticationService } from "../../domain/auth/IAuthenticationService";
import type {
  AuthenticatedUser,
  OIDCConfiguration,
  JsonWebKeySet,
  AuthConfig,
} from "../../domain/auth/types";

// ============================================================
// OIDC 認証サービス設定
// ============================================================

/**
 * OIDC 認証サービス設定
 */
export type OIDCAuthenticationConfig = {
  /** OIDC 発行者URL */
  issuer: string;

  /** クライアントID */
  clientId: string;

  /** 許可するオーディエンス */
  audience: string;

  /** JWKS キャッシュTTL (秒) */
  jwksCacheTtl: number;

  /** テナントIDクレーム名 */
  tenantClaimName: string;

  /** ロールクレーム名 */
  roleClaimName: string;

  /** 許可する発行者リスト（マルチテナント対応） */
  allowedIssuers?: string[];
};

// ============================================================
// OIDC 認証サービス（スタブ実装）
// ============================================================

/**
 * OIDC 認証サービス
 *
 * TODO: 本番化時に以下を実装
 * - JWT 検証（jose / jsonwebtoken ライブラリ使用）
 * - JWKS 取得・キャッシング
 * - OIDC Discovery エンドポイント呼び出し
 * - トークンリフレッシュ
 */
export class OIDCAuthenticationService implements IAuthenticationService {
  private readonly config: OIDCAuthenticationConfig;

  constructor(config: OIDCAuthenticationConfig) {
    this.config = config;
  }

  /**
   * トークンを検証
   *
   * TODO: 本番化時の実装
   * 1. JWT ヘッダーから kid を取得
   * 2. JWKS から対応する公開鍵を取得
   * 3. 署名を検証
   * 4. クレームを検証（iss, aud, exp, iat, nbf）
   * 5. ユーザー情報を抽出
   */
  async validateToken(token: string): Promise<AuthenticatedUser | null> {
    throw new Error(
      "OIDCAuthenticationService.validateToken is not implemented. " +
      "Use MockAuthenticationService for development, or implement this method for production."
    );
  }

  /**
   * トークンをリフレッシュ
   *
   * TODO: 本番化時の実装
   * 1. トークンエンドポイントに refresh_token を送信
   * 2. 新しいアクセストークンを取得
   */
  async refreshToken(refreshToken: string): Promise<string | null> {
    throw new Error(
      "OIDCAuthenticationService.refreshToken is not implemented. " +
      "Use MockAuthenticationService for development, or implement this method for production."
    );
  }

  /**
   * OIDC Discovery 設定を取得
   *
   * TODO: 本番化時の実装
   * 1. {issuer}/.well-known/openid-configuration を取得
   * 2. レスポンスをキャッシュ
   */
  async discoverConfiguration(issuer: string): Promise<OIDCConfiguration> {
    throw new Error(
      "OIDCAuthenticationService.discoverConfiguration is not implemented. " +
      "Use MockAuthenticationService for development, or implement this method for production."
    );
  }

  /**
   * JWKS を取得
   *
   * TODO: 本番化時の実装
   * 1. jwks_uri からキーセットを取得
   * 2. TTL に基づいてキャッシュ
   */
  async getJwks(jwksUri: string): Promise<JsonWebKeySet> {
    throw new Error(
      "OIDCAuthenticationService.getJwks is not implemented. " +
      "Use MockAuthenticationService for development, or implement this method for production."
    );
  }

  /**
   * トークンの有効期限を確認
   *
   * TODO: 本番化時の実装
   * 1. JWT をデコード（検証なし）
   * 2. exp クレームを確認
   */
  isTokenExpired(token: string): boolean {
    // スタブ: 常に false を返す
    return false;
  }

  /**
   * トークンをデコード（検証なし）
   *
   * TODO: 本番化時の実装
   * 1. JWT の Base64 部分をデコード
   * 2. ペイロードを返す
   */
  decodeToken(token: string): Record<string, unknown> | null {
    // スタブ: null を返す
    return null;
  }
}

// ============================================================
// ファクトリ関数
// ============================================================

/**
 * AuthConfig から OIDCAuthenticationService を作成
 */
export function createOIDCAuthenticationService(
  config: AuthConfig
): OIDCAuthenticationService {
  if (!config.issuer || !config.clientId) {
    throw new Error(
      "OIDC configuration is incomplete. " +
      "Required: issuer, clientId"
    );
  }

  return new OIDCAuthenticationService({
    issuer: config.issuer,
    clientId: config.clientId,
    audience: config.audience ?? config.clientId,
    jwksCacheTtl: config.jwksCacheTtl,
    tenantClaimName: config.tenantClaimName,
    roleClaimName: config.roleClaimName,
  });
}

// ============================================================
// 実装メモ（本番化時の参考）
// ============================================================

/**
 * 本番化時の推奨ライブラリ:
 *
 * 1. jose (推奨)
 *    - JWT 検証、JWKS 取得、JWE 暗号化
 *    - https://github.com/panva/jose
 *
 * 2. openid-client
 *    - OIDC クライアント実装
 *    - Discovery、トークン取得、リフレッシュ
 *    - https://github.com/panva/node-openid-client
 *
 * 3. @azure/msal-node (Entra ID 専用)
 *    - Microsoft 公式ライブラリ
 *    - https://github.com/AzureAD/microsoft-authentication-library-for-js
 *
 * 実装例（jose を使用）:
 *
 * import * as jose from 'jose';
 *
 * async validateToken(token: string): Promise<AuthenticatedUser | null> {
 *   const JWKS = jose.createRemoteJWKSet(new URL(this.jwksUri));
 *
 *   try {
 *     const { payload } = await jose.jwtVerify(token, JWKS, {
 *       issuer: this.config.issuer,
 *       audience: this.config.audience,
 *     });
 *
 *     return this.extractUser(payload);
 *   } catch (error) {
 *     console.error('Token validation failed:', error);
 *     return null;
 *   }
 * }
 */
