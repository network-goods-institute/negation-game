import { atom } from "jotai";

/**
 * Stores the desired initial tab for the SpacePageClient.
 * This is set *before* navigating to the space page and read *once*
 * by SpacePageClient on initialization, then reset to null.
 */
export const initialSpaceTabAtom = atom<"points" | "rationales" | null>(null);
