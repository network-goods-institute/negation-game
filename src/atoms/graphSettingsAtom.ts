import { atom } from "jotai";

export type CollapseHint = { x: number; y: number } | null;
// Atom carrying the last cursor position for showing collapse undo hint overlay
export const collapseHintAtom = atom<CollapseHint>(null);
