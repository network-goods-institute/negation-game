import { atom } from "jotai";

export const visitedPointsAtom = atom<Set<number>>(new Set<number>());
