import { atom } from "jotai";

export const recentlyCreatedNegationIdAtom = atom<{
  negationId: number | null;
  parentPointId: number | null;
  timestamp: number;
}>({
  negationId: null,
  parentPointId: null,
  timestamp: 0,
});
