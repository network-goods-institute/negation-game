import { atomWithStorage } from "jotai/utils";

// Atom to track whether the points feed panel is enabled (visible)
export const feedEnabledAtom = atomWithStorage<boolean>("feedEnabled", true);
