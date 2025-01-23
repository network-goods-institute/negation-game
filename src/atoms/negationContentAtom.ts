import { atom } from "jotai";
import memoize from "memoize";

export const negationContentAtom = memoize((_negatedPointId?: number) =>
  atom<string>(""),
);
