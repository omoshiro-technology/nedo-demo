/**
 * 思考戦略レジストリ
 *
 * 全ての思考戦略を登録・取得するための中央レジストリ
 * Application層で各戦略を登録し、他のモジュールが取得して使用する
 */

import type {
  IThinkingStrategy,
  ThinkingStrategyId,
} from "./IThinkingStrategy";

// ============================================================
// レジストリ
// ============================================================

const strategies = new Map<ThinkingStrategyId, IThinkingStrategy>();

/**
 * 戦略を登録
 */
export function registerStrategy(strategy: IThinkingStrategy): void {
  strategies.set(strategy.id, strategy);
}

/**
 * IDで戦略を取得
 * @throws 未登録の戦略IDの場合
 */
export function getStrategy(id: ThinkingStrategyId): IThinkingStrategy {
  const strategy = strategies.get(id);
  if (!strategy) {
    throw new Error(`Thinking strategy "${id}" is not registered`);
  }
  return strategy;
}

/**
 * IDで戦略を取得（存在しない場合 undefined）
 */
export function getStrategyOrUndefined(id: ThinkingStrategyId): IThinkingStrategy | undefined {
  return strategies.get(id);
}

/**
 * 登録済みの全戦略を取得
 */
export function getAllStrategies(): IThinkingStrategy[] {
  return Array.from(strategies.values());
}

/**
 * 戦略メタ情報のリストを取得（API応答用）
 */
export function getStrategyMetas(): { id: ThinkingStrategyId; name: string; description: string }[] {
  return getAllStrategies().map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
  }));
}
