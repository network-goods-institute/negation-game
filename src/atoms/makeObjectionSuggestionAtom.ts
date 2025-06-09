import { atom } from "jotai";

interface MakeObjectionSuggestion {
  targetId: number;
  contextId: number;
  text: string;
  context?: "chat" | "pointPage" | "rationalePage" | undefined;
  spaceId?: string;
}

export const makeObjectionSuggestionAtom = atom<MakeObjectionSuggestion | null>(
  null
);
