/**
 * 思考戦略の初期化・登録
 *
 * アプリケーション起動時にこのモジュールをimportすることで
 * 全戦略がレジストリに登録される
 */

import { registerStrategy } from "../../../domain/decisionNavigator/strategies/strategyRegistry";
import { forwardStrategy } from "./forwardStrategy";
import { backcastStrategy } from "./backcastStrategy";
import { riskStrategy } from "./riskStrategy";
import { constraintStrategy } from "./constraintStrategy";
import { analogyStrategy } from "./analogyStrategy";

// 起動時に全戦略を登録
registerStrategy(forwardStrategy);
registerStrategy(backcastStrategy);
registerStrategy(riskStrategy);
registerStrategy(constraintStrategy);
registerStrategy(analogyStrategy);

export { forwardStrategy, backcastStrategy, riskStrategy, constraintStrategy, analogyStrategy };
