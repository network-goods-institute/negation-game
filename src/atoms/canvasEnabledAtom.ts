import { hoveredPointIdAtom } from "@/atoms/hoveredPointIdAtom";
import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export const canvasEnabledAtom = atom(
  (get) => get(primitiveCanvasEnabledAtom),
  (_get, set, newValue: boolean) => {
    set(hoveredPointIdAtom, undefined);
    set(primitiveCanvasEnabledAtom, newValue);
  }
);

const primitiveCanvasEnabledAtom = atomWithStorage("canvasEnabled", false);
