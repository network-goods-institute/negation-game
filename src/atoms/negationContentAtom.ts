import { atom } from "jotai";
import memoize from "memoize";

export const negationContentAtom = memoize((negatedPointId?: number) =>
  atom<string>("")
);
