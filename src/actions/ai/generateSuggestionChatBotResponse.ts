"use server";

import { google } from "@ai-sdk/google";
import { streamText, type Message } from "ai";
import { withRetry } from "@/lib/utils/withRetry";
import { getUserId } from "@/actions/users/getUserId";

import type { ChatMessage, ChatSettings, DiscourseMessage } from "@/types/chat";
import type { PointInSpace } from "@/actions/points/fetchAllSpacePoints";

const sanitizeText = (text: string): string => {
  if (!text) return "";
  return text
    .replace(/fuck/gi, "f***")
    .replace(/shit/gi, "s***")
    .replace(/ass\b/gi, "a**")
    .replace(/bitch/gi, "b****")
    .replace(/cunt/gi, "c***")
    .replace(/dick/gi, "d***")
    .replace(/twat/gi, "t***")
    .replace(/kill/gi, "k***")
    .replace(/murder/gi, "m*****")
    .replace(/\b(test+|aaa+|ddd+|www+|lorem|ipsum)\b/gi, "[placeholder]");
};

function buildGenerateSystemPrompt(): string {
  return `You are an AI assistant specialized in brainstorming for the Negation Game platform. Your primary goal is to help users formulate potential points and negations **that align with their likely viewpoint**, as inferred from their context (owned points, endorsed points, and recent discussions). You should suggest arguments the user might want to make themselves.

RULES & CAPABILITIES:
1.  **Focus:** Strictly brainstorming points and negations **that the user might agree with or want to propose**, based on the provided CONTEXT. Avoid suggesting arguments clearly counter to the user's inferred stance unless specifically asked for counterarguments. DO NOT write summaries, essays, or lengthy explanations unless directly asked to elaborate on a *specific suggestion*.
2.  **Suggesting New Points:** Use \`[Suggest Point]>\` on **its own line**, followed by the suggested point text (max 160 chars) on the next line(s). These should be points the user might propose to support their views.
    *   Example:
        [Suggest Point]>
        Consider the long-term maintenance aspect.
3.  **Suggesting Negations:** Use \`[Suggest Negation For:ID]>\` on a **new line immediately after referencing Point ID** (must be an EXISTING Point ID from CONTEXT). Follow with negation text (max 160 chars). These should be potential counterarguments the user might raise against an existing point, consistent with their overall context. Target ONLY points (numeric IDs). Do NOT suggest negations for Discourse Posts. Do NOT invent Point IDs.
    *   Example (after referencing Point 123, where the user context suggests disagreement):
        ...your point about initial cost [Point:123].
        - [Suggest Negation For:123]> This overlooks the potential for vendor lock-in.
4.  **Referencing (Inline):** Use \`[Point:ID]\` (singular "Point", single ID) for direct inline mentions of an EXISTING point. If you need to refer to multiple points in a list, use separate tags for each, e.g., "Discussion on [Point:123], [Point:456], and [Point:789] is relevant." **DO NOT use ranges (e.g., \`[Point:1-5]\`) or comma-separated lists within a single tag (e.g., \`[Point:1,2,3]\`). Do NOT use the plural \`[Points:...]\`.** Actively look for opportunities to connect the conversation back to EXISTING points provided in the CONTEXT using the correct \`[Point:ID]\` format. Use \`[Discourse Post:ID]\` for discourse posts.
    *   Example: \"Regarding [Point:123], we should...\" or \"As mentioned in [Discourse Post:456]...\"
5.  **Avoid Duplicates:** Before suggesting a new point (\`[Suggest Point]>\`), check if a very similar point already exists in the CONTEXT. If so, **reference the existing point using the correct \`[Point:ID]\` format instead of creating a redundant suggestion.**
6.  **Source Attribution:** Use parentheses \`(Source: Type ID:ID)\` *after* presenting information derived from a specific source in the context, but *only if you haven't just used the inline reference for the same ID*. This clarifies where the summarized information came from.
    *   Format (Points): \`(Source: Point ID:ID)\`
    *   Format (Discourse): \`(Source: Discourse Post ID:ID)\`
    *   Example: \"The discussion seems to focus on budget constraints (Source: Discourse Post ID:789).\"
    *   **Crucial:** DO NOT use \`(Source:...)\` if you just used \`[Point:ID]\` or \`[Discourse Post:ID]\` for the *exact same ID* in the same sentence or clause. Avoid redundancy.
7.  **Interaction:** Ask clarifying questions to better understand the user's stance if needed. Encourage elaboration. Be concise.
8.  **Formatting:** Standard Markdown (GFM). Double newlines between paragraphs. Use lists for suggestions.

MARKDOWN FORMATTING:
*   Standard Markdown (GFM).
*   **Double newlines** between paragraphs.
*   Use lists (\`-\` or \`*\`) for multiple suggestions.
*   If providing multiple suggestions (points or negations) that stem from a common introductory bullet point or context, **each individual suggestion MUST be its own distinct, nested bullet point.** Do not group multiple \`[Suggest Point]>\` or \`[Suggest Negation For:ID]>\` blocks within the text content of a single bullet point. Each suggestion block should be the primary content of its own list item.
    *   Correct Example:
        *   Some introductory context.
            *   [Suggest Negation For:123]> Suggestion A.
            *   [Suggest Point]> Suggestion B.
    *   Incorrect Example (DO NOT DO THIS):
        *   Some introductory context. [Suggest Negation For:123]> Suggestion A. [Suggest Point]> Suggestion B.

YOUR TASK:
*   Analyze the user's message, chat history, and the provided context (points in space, ownership/endorsement status, discourse posts) **to understand the user's likely perspective and claims.**
*   **Prioritize referencing existing relevant points (\`[Point:ID]\`)** that align with the user's perspective.
*   Generate relevant suggestions for **truly NEW points (\`[Suggest Point]>\`) that the user might want to make** to support their stance.
*   Generate relevant suggestions for **NEGATIONS of EXISTING points (\`[Suggest Negation For:ID]>\`) that the user might raise** based on their context.
*   Engage in a focused brainstorming dialogue aimed at helping the user articulate and refine **their own arguments.**
*   Strictly adhere to the specified tag formats and rules for referencing, attribution, and suggestions.
*   Match the language of the user's messages. Do not translate to English.`;
}

function buildContextString(
  allPointsInSpace: PointInSpace[],
  ownedPointIds: Set<number>,
  endorsedPointIds: Set<number>,
  discourseMessages: DiscourseMessage[]
): string {
  let context = "";

  if (allPointsInSpace.length > 0) {
    context += "All Points in this Space:\n";
    allPointsInSpace.forEach((p) => {
      const content = sanitizeText(p.content || "[Content unavailable]");
      let ownershipLabel = "";
      if (ownedPointIds.has(p.pointId)) {
        ownershipLabel = " (You created this)";
      } else if (endorsedPointIds.has(p.pointId)) {
        ownershipLabel = " (You endorsed this)";
      }
      context += `- [Point:${p.pointId}] ${content.substring(0, 100)}...${ownershipLabel}\n`;
    });
    context += "\n";
  } else {
    context += "There are no points in this space yet.\n\n";
  }

  if (discourseMessages.length > 0) {
    context += "Relevant Recent Discourse Posts:\n";
    discourseMessages.forEach((m) => {
      context += `- [Discourse Post:${m.id}] ${sanitizeText(m.raw || m.content).substring(0, 150)}...\n`;
    });
    context += "\n";
  } else {
    context += "No recent Discourse posts provided or enabled.\n";
  }

  return context.trim();
}

export const generateSuggestionChatBotResponse = async (
  messages: ChatMessage[],
  settings: ChatSettings,
  allPointsInSpace: PointInSpace[] = [],
  ownedPointIds: Set<number> = new Set(),
  endorsedPointIds: Set<number> = new Set(),
  discourseMessages: DiscourseMessage[] = []
) => {
  try {
    const chatMessages = messages.filter((m) => m.role !== "system");

    if (chatMessages.length === 0) {
      throw new Error("No chat messages found for response generation");
    }

    const viewerId = await getUserId();

    const relevantDiscourseMessages = settings.includeDiscourseMessages
      ? discourseMessages.slice(-5)
      : [];

    const systemPrompt = buildGenerateSystemPrompt();
    const contextString = buildContextString(
      allPointsInSpace,
      ownedPointIds,
      endorsedPointIds,
      relevantDiscourseMessages
    );
    const chatHistoryString = chatMessages
      .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
      .join("\n\n");

    const finalPrompt = `${systemPrompt}\n\n---\nCONTEXT FOR THIS RESPONSE:\n${contextString}\n---\n\nCHAT HISTORY:\n${chatHistoryString}\n\nA:`;

    const aiResult = await withRetry(async () => {
      try {
        const response = await streamText({
          model: google("gemini-2.0-flash"),
          prompt: finalPrompt,
        });
        if (!response) throw new Error("Failed to get response from AI model");
        return response;
      } catch (error) {
        if (error instanceof Error) {
          if (error.message.includes("rate limit")) {
            throw new Error("AI service is currently busy. Please try again.");
          } else if (error.message.includes("context length")) {
            throw new Error(
              "Conversation context is too long. Please try shortening your message or starting a new chat."
            );
          }
        }
        throw error;
      }
    });

    const elementStream = aiResult.textStream;
    if (!elementStream) {
      throw new Error("Failed to initialize response stream");
    }
    return elementStream;
  } catch (error) {
    if (error instanceof Error) {
      if (
        error.message.includes("AI service") ||
        error.message.includes("context is too long")
      ) {
        throw error;
      }
    }
    throw new Error(
      "Failed to generate suggestion response. Please try again."
    );
  }
};
