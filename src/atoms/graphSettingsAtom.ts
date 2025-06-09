import { atom } from "jotai";

// Toggle to enable or disable dynamic node sizing (width/height/content scaling)
export const dynamicNodeSizingAtom = atom<boolean>(false);

export type CollapseHint = { x: number; y: number } | null;
// Atom carrying the last cursor position for showing collapse undo hint overlay
export const collapseHintAtom = atom<CollapseHint>(null);
