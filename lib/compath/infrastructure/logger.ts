import { env } from "../config/env";

export function debugLog(context: string, ...args: unknown[]): void {
  if (env.debugLlmLog) {
    console.log(`[${context}]`, ...args);
  }
}
