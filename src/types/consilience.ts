export type ConsilienceDiffType = "addition" | "modification" | "removal";

export interface ConsilienceDiff {
  type: ConsilienceDiffType;
  originalText?: string;
  newText?: string;
  explanation: string;
}

export interface ConsilienceAIResponse {
  proposal: string;
  summary: string;
  reasoning: string;
  diffs: Array<{
    type: "Addition" | "Modification" | "Removal";
    originalText?: string;
    newText?: string;
    explanation: string;
  }>;
}
