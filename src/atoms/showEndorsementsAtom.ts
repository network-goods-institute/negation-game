import { atomWithStorage } from "jotai/utils";

// Atom to toggle showing detailed endorsements on points
export const showEndorsementsAtom = atomWithStorage<boolean>(
  "showEndorsements",
  false
);
