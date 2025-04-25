import { atom } from "jotai";

interface MakePointSuggestion {
  text: string;
  context?:
    | "chat"
    | "space"
    | "pointPage"
    | "rationalePage"
    | "profilePage"
    | undefined;
  spaceId?: string;
}

export const makePointSuggestionAtom = atom<MakePointSuggestion | null>(null);
