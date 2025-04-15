"use server";

import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { z } from "zod";
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
            relevantRationales = allRationales;
            console.log(
              `[generateChatBotResponse] Distill flow detected, using all ${allRationales.length} provided rationales directly.`
            );
          } else {
            relevantRationales = searchResults
              .filter(
                (r) =>
                  r.type === "rationale" &&
                  allRationales.some((rat) => String(rat.id) === String(r.id))
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
2.  **Referencing:** Refer to existing points using the format: [Point:ID "Optional Content Snippet"]. Fetching full content happens client-side.
3.  **Suggesting New Points:** Use the format: [Suggest Point]>\n...\n(Provide the suggested point text on the next line(s)).
4.  **Suggesting Negations:** Use the format: [Suggest Negation For:ID]>\n...\n(Provide the suggested negation text on the next line(s)).
5.  **Source Attribution:** When using information from the provided context, cite the source clearly:
    *   Rationale: (Source: Rationale "Title" ID:XYZ)
    *   Endorsed Point: (Source: Endorsed Point ID:123)
    *   Discourse Message: (Source: Discourse Post ID:456 Topic:"Title")
6.  **Structure & Style:** Follow essay structure and writing style guidelines below. Maintain logical flow and use clear language.
7.  **Formatting:** STRICTLY follow Markdown formatting rules below. Double newlines between paragraphs are crucial.

MARKDOWN FORMATTING:
*   Use standard Markdown (GFM).
*   Double newlines between paragraphs.
*   Proper list formatting (newlines, indentation).
*   Headings: #, ##, ###.
*   Emphasis: **bold**, *italic*.
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
CONTEXT FOR THIS RESPONSE (Use this information and cite sources):

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
            if (title === undefined || id === undefined) {
              console.warn(
                `[Prompt Map Warning] Missing title or id for rationale at index ${index}:`,
                r
              );
              return `- [Skipped Rationale due to missing title/id at index ${index}]`;
            }
            return `- Rationale \"${title}\" (ID:${id}) - ${description.substring(0, 150)}... (Source: Rationale \"${title}\" ID:${id})`; // Limit description length in prompt
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
    ? `Relevant Recent Discourse Posts:\n${relevantDiscourseMessages.map((m) => `- Post ID:${m.id} (Topic: \"${m.topic_title || "Untitled"}\"): ${m.raw || m.content} (Source: Discourse Post ID:${m.id} Topic:\"${m.topic_title || "Untitled"}\")`).join("\n\n")}`
    : "No recent Discourse posts provided or deemed relevant."
}
---

CHAT HISTORY:
${chatMessages.map((m) => m.role.toUpperCase() + ":\n" + m.content + "\n").join("\n")}

Remember: 
1.  Focus on helping the user build structured arguments within the Negation Game framework.
2.  Use the specific [Point:ID], [Suggest Point]>, [Suggest Negation For:ID]> formats.
3.  Cite sources accurately using the (Source: ...) format.
4.  Adhere strictly to Markdown rules, especially double newlines.

A:`;
      console.log(
        "[generateChatBotResponse] Prompt string constructed successfully."
      );
    } catch (promptError) {
      console.error(
        "[generateChatBotResponse] FATAL ERROR during prompt construction:",
        promptError
      );
      throw new Error("Failed during prompt construction");
    }

    console.log(
      "[generateChatBotResponse] Calling AI model (streamObject) with retry..."
    );
    const { elementStream } = await withRetry(async () => {
      try {
        const response = await streamObject({
          model: google("gemini-2.0-flash"),
          output: "array",
          schema: z
            .string()
            .describe("Assistant's structured markdown response"),
          prompt,
        });

        if (!response) {
          console.error(
            "[generateChatBotResponse][withRetry] Failed to get response from AI model inside retry."
          );
          throw new Error("Failed to get response from AI model");
        }
        // Return the whole object containing the stream
        return response;
      } catch (error) {
        if (error instanceof Error) {
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

    if (!elementStream) {
      console.error(
        "[generateChatBotResponse] Failed to get elementStream from AI model result."
      );
      throw new Error("Failed to initialize response stream");
    }

    console.log(
      "[generateChatBotResponse] Successfully obtained AI result object containing stream. Returning elementStream."
    );

    return elementStream;
  } catch (error) {
    console.error("Error in generateChatBotResponse:", error);

    if (error instanceof Error) {
      if (
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
