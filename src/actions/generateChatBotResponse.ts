"use server";

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { withRetry } from "@/lib/withRetry";
import { searchContent, SearchResult } from "./searchContent";
import { getUserId } from "./getUserId";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface EndorsedPoint {
  pointId: number;
  content: string;
  cred: number;
}

interface RationaleContext {
  id: string;
  title: string;
  description: string;
  statistics?: {
    views?: number;
    copies?: number;
    totalCred?: number;
    averageFavor?: number;
  };
}

interface DiscourseMessageContext {
  id: number | string;
  content: string;
  raw?: string;
  topic_title?: string;
  topic_id?: number;
}

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

const filterProblematicContent = (
  rationales: RationaleContext[]
): RationaleContext[] => {
  const profanityRegex =
    /\b(fuck|shit|damn|ass|bitch|cunt|dick|twat|kill|murder)\b/i;
  const gibberishRegex =
    /\b(a{4,}|w{4,}|d{4,}|test|lorem|ipsum|aaaaa|ddddd)\b/i;

  return rationales.filter((r) => {
    if (
      !r.title ||
      r.title.length < 3 ||
      !r.description ||
      r.description.length < 10
    ) {
      console.log(`[Filtering] Skipping rationale with ID:${r.id} - too short`);
      return false;
    }

    if (profanityRegex.test(r.title) || profanityRegex.test(r.description)) {
      console.log(
        `[Filtering] Skipping rationale with ID:${r.id} - contains profanity`
      );
      return false;
    }

    if (gibberishRegex.test(r.title) || gibberishRegex.test(r.description)) {
      console.log(
        `[Filtering] Skipping rationale with ID:${r.id} - contains gibberish/test content`
      );
      return false;
    }

    return true;
  });
};

export const generateChatBotResponse = async (
  messages: Message[],
  allEndorsedPoints: EndorsedPoint[] = [],
  allRationales: RationaleContext[] = [],
  allDiscourseMessages: DiscourseMessageContext[] = []
) => {
  try {
    if (!messages || messages.length === 0) {
      throw new Error("No messages provided for chat response generation");
    }

    const contextMessages = messages.filter((m) => m.role === "system");
    const chatMessages = messages.filter((m) => m.role !== "system");

    if (chatMessages.length === 0) {
      throw new Error("No chat messages found for response generation");
    }

    console.log("[generateChatBotResponse] Starting relevance filtering...");
    const viewerId = await getUserId();
    console.log(`[generateChatBotResponse] Viewer ID: ${viewerId}`);

    const filteredRationales = filterProblematicContent(allRationales);
    console.log(
      `[generateChatBotResponse] Filtered out ${allRationales.length - filteredRationales.length} problematic rationales`
    );

    // Specific message sent by frontend for distill flow
    const distillInitialMessage =
      "I'd like to distill my existing rationales into a well-structured essay. Please help me organize and refine my thoughts based on my rationales that you can see.";
    const isDistillFlowStart =
      chatMessages.length === 1 &&
      chatMessages[0].content === distillInitialMessage;

    // Define limits (can be adjusted)
    const RELEVANCE_SEARCH_MESSAGE_COUNT = 4;
    const MAX_RELEVANT_POINTS = 5;
    const MAX_RELEVANT_RATIONALES = 3;
    const MAX_RELEVANT_DISCOURSE = 5;

    let relevantPoints: SearchResult[] = [];
    let relevantRationales: RationaleContext[] | SearchResult[] = [];
    let relevantDiscourseMessages: DiscourseMessageContext[] = [];

    if (viewerId && chatMessages.length > 0) {
      const searchQuery = chatMessages
        .slice(-RELEVANCE_SEARCH_MESSAGE_COUNT)
        .map((m) => m.content)
        .join("\\n\\n");

      console.log(
        "[generateChatBotResponse] Constructed Search Query:",
        searchQuery
      );

      if (searchQuery.trim().length > 0) {
        try {
          console.log("[generateChatBotResponse] Calling searchContent...");
          const searchResults = await searchContent(searchQuery);
          console.log(
            `[generateChatBotResponse] searchContent returned ${searchResults.length} results.`
          );

          relevantPoints = searchResults
            .filter(
              (r) =>
                r.type === "point" &&
                allEndorsedPoints.some((p) => p.pointId === r.id)
            )
            .slice(0, MAX_RELEVANT_POINTS);
          console.log(
            `[generateChatBotResponse] Filtered to ${relevantPoints.length} relevant points.`
          );

          if (isDistillFlowStart) {
            relevantRationales = filteredRationales;
            console.log(
              `[generateChatBotResponse] Distill flow detected, using all ${filteredRationales.length} filtered rationales directly.`
            );
          } else {
            relevantRationales = searchResults
              .filter(
                (r) =>
                  r.type === "rationale" &&
                  filteredRationales.some(
                    (rat) => String(rat.id) === String(r.id)
                  )
              )
              .slice(0, MAX_RELEVANT_RATIONALES);
            console.log(
              `[generateChatBotResponse] Filtered to ${relevantRationales.length} relevant rationales via search.`
            );
          }
        } catch (searchError) {
          console.error(
            "[generateChatBotResponse] Error during relevance search:",
            searchError
          );
          // Fallback or proceed with empty relevant points/rationales
        }
      }

      if (allDiscourseMessages.length > 0) {
        relevantDiscourseMessages = allDiscourseMessages.slice(
          -MAX_RELEVANT_DISCOURSE
        );
        console.log(
          `[generateChatBotResponse] Using latest ${relevantDiscourseMessages.length} discourse messages.`
        );
      }
    } else {
      console.log(
        "[generateChatBotResponse] Skipping relevance search (no viewerId or chatHistory). Using empty context."
      );
    }
    console.log("[generateChatBotResponse] Relevance filtering finished.");

    console.log(
      "[generateChatBotResponse] Data for prompt - relevantPoints:",
      relevantPoints.length
    );
    console.log(
      "[generateChatBotResponse] Data for prompt - relevantRationales:",
      relevantRationales
        .map((r) => ({ id: (r as any).id, title: (r as any).title }))
        .slice(0, 10)
    );
    console.log(
      "[generateChatBotResponse] Data for prompt - relevantDiscourseMessages:",
      relevantDiscourseMessages.length
    );

    console.log("[generateChatBotResponse] Constructing prompt string...");
    let prompt;
    try {
      prompt = `You are an AI assistant in the Negation Game platform. Your goal is to help users articulate, refine, and structure their arguments using points, negations, and rationales.

RULES & CAPABILITIES:
1.  **Argument Construction:** Help users build arguments. Suggest new points or negations where appropriate.
2.  **Referencing (Inline):** Use bracketed tags for direct inline references within your text. These become clickable links.
    *   Points: \`[Point:ID "Optional Snippet"]\` (e.g., \`[Point:123 "key phrase"]\`)
    *   Rationales: \`[Rationale:ID "Optional Title"]\` (e.g., \`[Rationale:abc-123 "Main Argument"]\`)
    *   Discourse Posts: \`[Discourse Post:ID]\` (e.g., \`[Discourse Post:456]\`) - **Do not include titles/snippets for Discourse Posts.**
    *   **Usage:** Use these when directly mentioning an entity. Include a short, relevant snippet/title for Points/Rationales only if needed for clarity or to quote a specific part. Avoid redundancy.

3.  **Source Attribution:** Use parentheses for citing the source of information you are summarizing or directly quoting. This adds context about where the information came from.
    *   Format (Points/Rationales): \`(Source: Type ID:ID Title:"Title")\` or \`(Source: Type "Title" ID:ID)\`
    *   Format (Discourse): \`(Source: Discourse Post ID:ID)\` - **Do not include Topic/Title for Discourse Posts.**
    *   Examples:
        *   \`(Source: Endorsed Point ID:123)\`
        *   \`(Source: Rationale "Funding Options" ID:xyz-789)\`
        *   \`(Source: Discourse Post ID:456)\`
    *   **Usage:** Add this *after* presenting information derived from a specific source in the context.

4.  **Suggesting New Points:** Use \`[Suggest Point]>\` on its own line, followed by the suggested point text on the next line(s).
    *   Example:
        [Suggest Point]>
        We should consider the long-term maintenance costs.

5.  **Suggesting Negations:** Use \`[Suggest Negation For:ID]>\` on its own line, followed by the suggested negation text on the next line(s). \`ID\` is the ID of the point being negated.
    *   Example:
        [Suggest Negation For:123]>
        The proposal overlooks the potential security risks involved.

6.  **Structure & Style:** Follow essay structure and writing style guidelines below. Maintain logical flow and use clear language.

7.  **Formatting:** STRICTLY follow Markdown formatting rules below. Double newlines between paragraphs are crucial.

MARKDOWN FORMATTING:
*   Use standard Markdown (GFM).
*   **Double newlines** between paragraphs.
*   Proper list formatting (newlines, indentation).
*   Headings: \`#\`, \`##\`, \`###\`.
*   Emphasis: \`**bold**\`, \`*italic*\`.
*   Ensure spacing around lists, headings, blocks. Use newlines generously.

ESSAY/RATIONALE STRUCTURE:
*   Clear thesis/main argument.
*   Supporting evidence/reasoning.
*   Address counterarguments.
*   Logical conclusions.
*   Focused paragraphs, clear topic sentences.

WRITING STYLE:
*   Clear, precise language. Avoid jargon.
*   Objective tone. Active voice preferred.
*   Concise, varied sentences. Specific examples.
*   Effective transitions. Clear takeaways.

---
CONTEXT FOR THIS RESPONSE (Use this information and cite sources using the \`(Source: ...)\` format):

${
  // Use RELEVANT points
  relevantPoints.length > 0
    ? `Relevant Endorsed Points:\n${relevantPoints.map((p) => `- [Point:${p.id} \"${p.content}\"] (Source: Endorsed Point ID:${p.id})`).join("\n")}`
    : "No specific points seem highly relevant to the current discussion turn."
}

${
  // Use RELEVANT rationales
  relevantRationales.length > 0
    ? `Relevant Rationales:\n${relevantRationales
        .map((r, index) => {
          try {
            const title =
              (r as SearchResult).title ?? (r as RationaleContext).title;
            const id = (r as SearchResult).id ?? (r as RationaleContext).id;
            const description =
              ((r as RationaleContext).description ??
                (r as SearchResult).content) ||
              ""; // Ensure description is string

            const sanitizedTitle = sanitizeText(title) || "[Untitled]";
            const sanitizedDescription =
              sanitizeText(description) || "[No description]";

            if (title === undefined || id === undefined) {
              console.warn(
                `[Prompt Map Warning] Missing title or id for rationale at index ${index}:`,
                r
              );
              return `- [Skipped Rationale due to missing title/id at index ${index}]`;
            }
            // Provide context as: Rationale "Title" (ID:ID) - Description... (Source: Rationale "Title" ID:ID)
            return `- Rationale \"${sanitizedTitle}\" (ID:${id}) - ${sanitizedDescription.substring(0, 150)}... (Source: Rationale \"${sanitizedTitle}\" ID:${id})`;
          } catch (mapError) {
            console.error(
              `[Prompt Map Error] Failed to process rationale at index ${index}:`,
              mapError,
              r
            );
            return `- [Error processing rationale at index ${index}]`; // Indicate error in prompt
          }
        })
        .join("\n")}`
    : "No specific rationales seem highly relevant or provided for the current discussion turn."
}

${
  relevantDiscourseMessages.length > 0
    ? // Provide context as: Post ID:ID - Content... (Source: Discourse Post ID:ID)
      `Relevant Recent Discourse Posts:\n${relevantDiscourseMessages.map((m) => `- Post ID:${m.id} - ${m.raw || m.content} (Source: Discourse Post ID:${m.id})`).join("\n\n")}`
    : "No recent Discourse posts provided or deemed relevant."
}
---

CHAT HISTORY:
${chatMessages.map((m) => m.role.toUpperCase() + ":\n" + m.content + "\n").join("\n")}

Remember: 
1.  Focus on helping the user build structured arguments within the Negation Game framework.
2.  Use the correct tag formats: \`[...]\` for inline references (ID only for Discourse), \`(Source: ...)\` for attribution (ID only for Discourse), \`[Suggest...]>/...\` for suggestions.
3.  Cite sources accurately when using information from the Context section.
4.  Adhere strictly to Markdown rules, especially double newlines between paragraphs.

A:`;
      console.log(
        "[generateChatBotResponse] Prompt string constructed successfully."
      );
      console.log(prompt);
    } catch (promptError) {
      console.error(
        "[generateChatBotResponse] FATAL ERROR during prompt construction:",
        promptError
      );
      throw new Error("Failed during prompt construction");
    }

    console.log(
      "[generateChatBotResponse] Calling AI model (streamText) with retry..."
    );
    // Use withRetry for the AI call
    const aiResult = await withRetry(async () => {
      try {
        console.log(
          "[generateChatBotResponse][withRetry] Calling streamText..."
        );
        const response = await streamText({
          model: google("gemini-1.5-flash"),
          prompt,
        });

        if (!response) {
          console.error(
            "[generateChatBotResponse][withRetry] Failed to get response object from AI model."
          );
          throw new Error("Failed to get response from AI model");
        }

        console.log(
          "[generateChatBotResponse][withRetry] AI call successful, returning response object."
        );
        return response;
      } catch (error) {
        if (error instanceof Error) {
          console.log(error.message);
          if (error.message.includes("rate limit")) {
            throw new Error(
              "AI service is currently busy. Please try again in a moment."
            );
          } else if (error.message.includes("context length")) {
            throw new Error(
              "The conversation is too long. Please start a new chat."
            );
          } else if (error.message.includes("invalid")) {
            throw new Error(
              "Invalid request format. Please try again with simpler input."
            );
          }
        }
        console.error(
          "[generateChatBotResponse][withRetry] Non-retriable error during AI call:",
          error
        );
        throw error;
      }
    });

    const elementStream = aiResult.textStream;
    if (!elementStream) {
      console.error(
        "[generateChatBotResponse] Failed to get textStream from AI model result after retry."
      );
      throw new Error("Failed to initialize response stream");
    }

    console.log(
      "[generateChatBotResponse] Returning elementStream directly (safety/testing temporarily bypassed)."
    );
    return elementStream;
  } catch (error) {
    console.error("Error in generateChatBotResponse:", error);

    if (error instanceof Error) {
      console.log(error.message);
      if (
        error.message.includes("AI response blocked") ||
        error.message.includes("AI response stopped") ||
        error.message.includes("AI service") ||
        error.message.includes("conversation is too long") ||
        error.message.includes("Invalid request format") ||
        error.message.includes("No messages provided") ||
        error.message.includes("No chat messages found")
      ) {
        throw error;
      }
    }
    throw new Error("Failed to generate AI response. Please try again.");
  }
};
