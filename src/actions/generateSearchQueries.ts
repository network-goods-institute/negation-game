"use server";

import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { z } from "zod";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

interface DiscourseContext {
  id: number | string;
  content: string;
  raw?: string;
  topic_title?: string;
}

const searchKeywordsSchema = z.object({
  keywords: z
    .array(
      z
        .string()
        .min(2)
        .describe(
          "A single relevant keyword (noun, key term, acronym) mentioned or implied in the input."
        )
    )
    .describe("List of relevant keywords (will be truncated to 30 max)."),
});

/**
 * Analyzes conversation context and generates relevant keywords
 * for fetching Points and Rationales.
 */
export const generateSearchQueries = async (
  messages: Message[],
  discourseContext: DiscourseContext[] = []
): Promise<string[]> => {
  console.log("[generateSearchQueries] Starting keyword generation...");
  try {
    const latestMessages = messages.slice(-4);
    const discourseSummary = discourseContext
      .slice(-3)
      .map(
        (d) =>
          `Discourse Post (${d.topic_title || "Untitled"}): ${d.raw || d.content}`
      )
      .join("\n---\n");

    const prompt = `You are an AI assistant tasked with analyzing a conversation about arguments, points, and rationales within the Negation Game platform. Your goal is to identify the core topics and specific entities being discussed to generate relevant keywords for retrieving Points and Rationales from a database.

Analyze the following CONVERSATION HISTORY and relevant DISCOURSE CONTEXT (if provided).

CONVERSATION HISTORY:
${latestMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n")}

${discourseSummary ? `DISCOURSE CONTEXT:\n${discourseSummary}\n` : ""}
Based *only* on the provided history and context, identify the 20-30 most important and distinct **single keywords** (nouns, key terms, acronyms, potential point/rationale identifiers) that should be used to find relevant content. Prioritize terms specific to the discussion.

Output *only* a JSON object matching the required schema containing a list of these keywords. Do not add any explanation or commentary. List only single words or short acronyms.`;

    console.log(
      "[generateSearchQueries] Calling generateObject for keywords..."
    );
    const { object } = await generateObject({
      model: google("gemini-2.0-flash"),
      schema: searchKeywordsSchema,
      prompt,
      mode: "json",
    });

    console.log("[generateSearchQueries] Received object:", object);

    if (!object || typeof object !== "object") {
      console.warn(
        "[generateSearchQueries] AI returned invalid object structure."
      );
      return [];
    }

    const rawKeywords = Array.isArray(object.keywords) ? object.keywords : [];

    if (rawKeywords.length === 0) {
      console.warn(
        "[generateSearchQueries] AI did not return any keywords in the array."
      );
      return [];
    }

    const validKeywords = rawKeywords
      .filter((kw) => typeof kw === "string")
      .map((kw) => kw.trim())
      .filter((kw) => kw.length >= 2 && kw.length < 25)
      .slice(0, 30);

    console.log(
      `[generateSearchQueries] Processed ${validKeywords.length} valid keywords (truncated to 30 max).`
    );
    return validKeywords;
  } catch (error) {
    console.error(
      "[generateSearchQueries] Error generating search queries:",
      error
    );
    return [];
  }
};
