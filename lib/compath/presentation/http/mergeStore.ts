/**
 * マージ候補のインメモリストア
 * 複数のAPIルートから共有される
 */
import type { MergeCandidate } from "@/lib/compath/domain/types";

export const mergeCandidatesStore = new Map<string, MergeCandidate>();
