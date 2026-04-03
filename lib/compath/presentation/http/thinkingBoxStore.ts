/**
 * 思考ボックス用の一時ストア
 * 複数のAPIルートから共有される
 */
import type {
  InitialLayout,
  ThinkingBox,
} from "@/lib/compath/application/decisionNavigator/thinkingBox/types";
import type { initializeGoalCompass } from "@/lib/compath/application/decisionNavigator/thinkingBox";

export const thinkingBoxStore = new Map<
  string,
  {
    initialLayout: InitialLayout;
    currentThinkingBox: ThinkingBox;
    compassState: ReturnType<typeof initializeGoalCompass>;
  }
>();
