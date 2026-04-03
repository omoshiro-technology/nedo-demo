/**
 * 認証・認可ドメイン
 *
 * OpenID Connect (OIDC) 準拠の認証・認可インターフェース
 */

// 型定義
export type {
  AuthenticatedUser,
  UserRole,
  AuthContext,
  AuthMethod,
  OIDCConfiguration,
  JsonWebKeySet,
  JsonWebKey,
  AuthMode,
  TenantExtraction,
  AuthConfig,
  ResourceType,
  ResourceAction,
} from "./types";

export { DEFAULT_AUTH_CONFIG } from "./types";

// 認証サービスインターフェース
export type {
  IAuthenticationService,
  AuthenticationResult,
  AuthenticationError,
  AuthErrorCode,
  AuthenticationServiceFactory,
} from "./IAuthenticationService";

// 認可サービスインターフェース
export type {
  IAuthorizationService,
  AuthorizationResult,
  AuthorizationDenialReason,
  AuthorizationErrorCode,
} from "./IAuthorizationService";

export {
  DEFAULT_ROLE_PERMISSIONS,
  allowed,
  denied,
  insufficientRole,
  tenantMismatch,
} from "./IAuthorizationService";
