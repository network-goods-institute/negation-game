import { atom } from "jotai";

export type VoteGlowVariant = "hatched";

export const voteGlowVariantAtom = atom<VoteGlowVariant>("hatched");
