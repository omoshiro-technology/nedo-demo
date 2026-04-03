/**
 * 認証・認可インフラストラクチャ
 *
 * 認証サービス実装とFastifyプラグイン
 */

// Fastify プラグインインターフェース
export type {
  IAuthPlugin,
  AuthPluginConfig,
  AuthPluginError,
} from "./IAuthPlugin";

export {
  extractBearerToken,
  createAuthErrorResponse,
  UNAUTHORIZED,
  FORBIDDEN,
  TOKEN_EXPIRED,
} from "./IAuthPlugin";

// モック認証サービス
export {
  MockAuthenticationService,
  DEFAULT_MOCK_USER,
  MOCK_USERS,
} from "./MockAuthenticationService";

export type { MockAuthenticationOptions } from "./MockAuthenticationService";

// OIDC 認証サービス（スタブ）
export {
  OIDCAuthenticationService,
  createOIDCAuthenticationService,
} from "./OIDCAuthenticationService";

export type { OIDCAuthenticationConfig } from "./OIDCAuthenticationService";
