import { atom } from "jotai";

interface MakeNegationSuggestion {
  targetId: number;
  text: string;
  context?: "chat" | "pointPage" | "rationalePage" | undefined;
  spaceId?: string;
}

export const makeNegationSuggestionAtom = atom<MakeNegationSuggestion | null>(
  null
);
