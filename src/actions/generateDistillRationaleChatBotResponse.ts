"use server";

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { withRetry } from "@/lib/withRetry";
import { searchContent, SearchResult } from "./searchContent";
import { getUserId } from "./getUserId";
import { generateSearchQueries } from "./generateSearchQueries";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/AppNode";
import { AppEdge } from "@/components/graph/AppEdge";
import { PointNodeData } from "@/components/graph/PointNode";
import { db } from "@/services/db";
import { endorsementsTable, viewpointsTable, pointsTable } from "@/db/schema";
import { SelectViewpoint } from "@/db/tables/viewpointsTable";
import { and, eq, inArray } from "drizzle-orm";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface EndorsedPoint {
  pointId: number;
  content: string;
  cred: number;
}

interface DiscourseMessageContext {
  id: number | string;
  content: string;
  raw?: string;
  topic_title?: string;
  topic_id?: number;
}

interface ChatSettings {
  includeEndorsements: boolean;
  includeRationales: boolean;
  includePoints: boolean;
  includeDiscourseMessages: boolean;
}

type PromptRationaleItem = {
  id: string | number;
  title: string;
  content?: string;
  description?: string;
  graph?: ViewpointGraph;
  createdBy?: string;
};

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

export const generateDistillRationaleChatBotResponse = async (
  messages: Message[],
  settings: ChatSettings,
  allDiscourseMessages: DiscourseMessageContext[] = [],
  selectedRationaleId: string | null = null
) => {
  try {
    const chatMessages = messages.filter((m) => m.role !== "system");

    if (chatMessages.length === 0) {
      throw new Error("No chat messages found for response generation");
    }

    console.log(
      `[generateDistillRationaleChatBotResponse] Starting... Selected Rationale ID: ${selectedRationaleId}`
    );
    const viewerId = await getUserId();
    console.log(
      `[generateDistillRationaleChatBotResponse] Viewer ID: ${viewerId}`
    );

    let fetchedRationaleData: SelectViewpoint | undefined = undefined;
    let creatorEndorsementsString = "";
    let contextRationaleSection = "";
    let nodesString = "";
    let edgesString = "";
    let pointIdsInGraph: number[] = [];
    let relevantPoints: SearchResult[] = [];
    let relevantRationalesFromSearch: PromptRationaleItem[] = [];
    let pointsDataMap = new Map<number, string>();

    if (selectedRationaleId) {
      try {
        fetchedRationaleData = await db.query.viewpointsTable.findFirst({
          where: eq(viewpointsTable.id, selectedRationaleId),
        });
        if (!fetchedRationaleData) throw new Error(`Rationale not found.`);
        console.log(
          `[generateDistillRationaleChatBotResponse] Fetched rationale ${selectedRationaleId}.`
        );
      } catch (dbError) {
        console.error(
          `[generateDistillRationaleChatBotResponse] DB error fetching rationale ${selectedRationaleId}:`,
          dbError
        );
        throw new Error(`Failed to fetch rationale data.`);
      }

      const rationaleDescription = fetchedRationaleData.description;
      const rationaleCreatorId = fetchedRationaleData.createdBy;
      const rationaleGraph = fetchedRationaleData.graph;
      const rationaleTitle = fetchedRationaleData.title;

      pointIdsInGraph =
        rationaleGraph?.nodes
          .filter(
            (n) =>
              n.type === "point" &&
              typeof (n.data as PointNodeData).pointId === "number"
          )
          .map((n) => (n.data as PointNodeData).pointId)
          .filter((value, index, self) => self.indexOf(value) === index) || [];

      if (pointIdsInGraph.length > 0) {
        try {
          const pointsData = await db
            .select({
              id: pointsTable.id,
              content: pointsTable.content,
            })
            .from(pointsTable)
            .where(inArray(pointsTable.id, pointIdsInGraph));
          pointsDataMap = new Map(
            pointsData.map((p) => [p.id, p.content || "[Content missing]"])
          );
          console.log(
            `[generateDistillRationaleChatBotResponse] Fetched content for ${pointsDataMap.size} points in graph.`
          );
        } catch (dbError) {
          console.error(
            `[generateDistillRationaleChatBotResponse] Failed to fetch point content for rationale ${selectedRationaleId}:`,
            dbError
          );
        }

        try {
          type EndorsementRecord = { pointId: number; cred: number };
          const creatorEndorsements: EndorsementRecord[] = await db
            .select({
              pointId: endorsementsTable.pointId,
              cred: endorsementsTable.cred,
            })
            .from(endorsementsTable)
            .where(
              and(
                eq(endorsementsTable.userId, rationaleCreatorId),
                inArray(endorsementsTable.pointId, pointIdsInGraph)
              )
            );

          creatorEndorsementsString =
            creatorEndorsements.length > 0
              ? `Points Endorsed by Creator (ID: ${rationaleCreatorId}):\n${creatorEndorsements.map((e) => `- [Point:${e.pointId}] (Cred: ${e.cred})`).join("\n")}`
              : "No points in this rationale were endorsed by the creator.";
          console.log(
            `[generateDistillRationaleChatBotResponse] Fetched ${creatorEndorsements.length} creator endorsements.`
          );
        } catch (dbError) {
          console.error(
            `[generateDistillRationaleChatBotResponse] Failed to fetch creator endorsements:`,
            dbError
          );
          creatorEndorsementsString = "Error fetching creator endorsements.";
        }

        const getNodePromptString = (node: AppNode): string => {
          let idPart = "";
          let textPart = "";

          if (node.type === "point") {
            const pointId = (node.data as PointNodeData).pointId;
            idPart = pointId ? ` Point ID: ${pointId}` : "";
            textPart = pointId
              ? pointsDataMap.get(pointId) ||
                `[Content Missing for ID: ${pointId}]`
              : `[Invalid Point Node Data]`;
          } else if (node.type === "statement") {
            textPart = node.data.statement || "";
          } else if (node.type === "addPoint") {
            textPart = node.data.content || "";
            if (!textPart && !node.data.hasContent) {
              textPart = "[Empty Add Point Node]";
            }
          } else {
            textPart = "[Unknown Node Type]";
          }
          const sanitizedTextPart =
            node.type !== "point" ? sanitizeText(textPart) : textPart;

          return `- Node ${node.id}${idPart}: ${sanitizedTextPart}`;
        };

        nodesString =
          rationaleGraph?.nodes?.map(getNodePromptString)?.join("\n") ||
          "No nodes found.";
        edgesString =
          rationaleGraph?.edges
            ?.map((e: AppEdge) => `- Edge: ${e.source} -> ${e.target}`)
            ?.join("\n") || "No edges found.";

        contextRationaleSection = `Selected Rationale for Distillation:\n- Rationale Title: \"${sanitizeText(rationaleTitle)}\" (ID:${selectedRationaleId})\n- Description: ${sanitizeText(rationaleDescription)}\n- ${creatorEndorsementsString}\n- Graph Structure:\n    Nodes:\n${nodesString}\n    Edges:\n${edgesString}\n(Source: Rationale \"${sanitizeText(rationaleTitle)}\" ID:${selectedRationaleId})`;
      } else {
        console.log(
          `[generateDistillRationaleChatBotResponse] No point nodes found in rationale graph.`
        );
        creatorEndorsementsString =
          "No points found in this rationale to check for creator endorsements.";
      }

      contextRationaleSection = `Selected Rationale for Distillation:\n- Rationale Title: \"${sanitizeText(rationaleTitle)}\" (ID:${selectedRationaleId})\n- Description: ${sanitizeText(rationaleDescription)}\n- ${creatorEndorsementsString}\n(Source: Rationale \"${sanitizeText(rationaleTitle)}\" ID:${selectedRationaleId})`;
    } else {
      const queryGenContext = settings.includeDiscourseMessages
        ? allDiscourseMessages
        : [];
      const searchQueries = await generateSearchQueries(
        chatMessages,
        queryGenContext
      );
      let searchResults: SearchResult[] = [];
      if (viewerId && searchQueries.length > 0) {
        console.log(
          `[generateDistillRationaleChatBotResponse] Non-Distill: Calling searchContent...`
        );
        try {
          searchResults = await searchContent(searchQueries);
          console.log(
            `[generateDistillRationaleChatBotResponse] Non-Distill: searchContent returned ${searchResults.length} results.`
          );
        } catch (searchError) {
          console.error(
            "[generateDistillRationaleChatBotResponse] Non-Distill: Error during search:",
            searchError
          );
        }
      }
      const MAX_RELEVANT_POINTS = 10;
      const MAX_RELEVANT_RATIONALES_SEARCH = 5;
      relevantPoints = searchResults
        .filter((r) => r.type === "point")
        .slice(0, MAX_RELEVANT_POINTS);
      relevantRationalesFromSearch = searchResults
        .filter((r) => r.type === "rationale")
        .slice(0, MAX_RELEVANT_RATIONALES_SEARCH)
        .map((r) => ({
          id: r.id,
          title: r.title || "[Untitled Search Result]",
          content: r.content,
        }));
    }

    const relevantDiscourseMessagesForPrompt = settings.includeDiscourseMessages
      ? allDiscourseMessages.slice(-3)
      : [];

    console.log(
      "[generateDistillRationaleChatBotResponse] Context preparation finished."
    );

    console.log(
      "[generateDistillRationaleChatBotResponse] Data for prompt - relevantPoints:",
      relevantPoints.length
    );
    console.log(
      "[generateDistillRationaleChatBotResponse] Data for prompt - relevantRationales:",
      relevantRationalesFromSearch
        .map((r) => ({ id: (r as any).id, title: (r as any).title }))
        .slice(0, 10)
    );
    console.log(
      "[generateDistillRationaleChatBotResponse] Data for prompt - relevantDiscourseMessages:",
      relevantDiscourseMessagesForPrompt.length
    );

    console.log(
      "[generateDistillRationaleChatBotResponse] Constructing final prompt string..."
    );
    let finalPromptString;
    try {
      let mainGoalInstruction = "";
      let suggestionRule = "";
      let contextSectionBuild = "";
      let distillSpecificRules = "";

      if (selectedRationaleId && fetchedRationaleData) {
        mainGoalInstruction = `Your primary goal is to distill the selected rationale (ID: ${selectedRationaleId}) into a **first-person essay that reflects the author's perspective *as indicated by their specific endorsements* within this rationale.** Write **as if you are the author**, synthesizing the arguments from the points they endorsed (listed in Creator Endorsements) and the overall rationale structure (Title, Description, Graph). Focus *exclusively* on presenting the content and arguments derived from the rationale details provided below. **Analyze the Creator Endorsements list (point IDs and cred amounts) to understand the author's main focus and conviction levels.** The essay should explain *why* the author endorses certain points, incorporating the **cred amount** as a measure of conviction where appropriate.`;
        suggestionRule = `**IMPORTANT:** Do NOT suggest new points or negations using \`[Suggest Point]>\` or \`[Suggest Negation For:ID]>\` tags in this distillation task.`;
        distillSpecificRules = `**IMPORTANT (Distill Flow):**
*   **Do NOT use \`[Point:ID]\` or \`[Rationale:ID]\` bracket tags in your essay response.**
*   **Refer to points by synthesizing their FULL content.** You are provided with the complete text for each point node in the 'Graph Structure' section below. Use this full text to accurately represent the arguments.
*   **Explicitly mention the key points the author endorsed** based on the 'Creator Endorsements' list. Focus your analysis and explanation on the **full arguments** presented in these specific points.
*   **Incorporate the 'cred' amount** associated with endorsements naturally into the text to signify the level of agreement or importance (e.g., "I strongly agree with the argument that '[full point text summary]', endorsing it with [X] cred because...", or "My [X] cred endorsement for the point stating '[full point text summary]' highlights...").
*   Use the provided graph structure (Nodes/Edges) to understand the relationships between the endorsed points and structure the essay logically.`;

        contextSectionBuild = `${contextRationaleSection}\n\n${relevantDiscourseMessagesForPrompt.length > 0 ? `Relevant Recent Discourse Posts:\n${relevantDiscourseMessagesForPrompt.map((m) => `- Post ID:${m.id} - ${m.raw || m.content} (Source: Discourse Post ID:${m.id})`).join("\n\n")}` : "No relevant Discourse posts provided."}`;
      } else {
        mainGoalInstruction = `You are an AI assistant in the Negation Game platform. Your goal is to help users articulate, refine, and structure their arguments using points, negations, and rationales.`;
        suggestionRule = `4.  **Suggesting New Points:** When suggesting a new, independent point, use \`[Suggest Point]>\` on **its own line**, followed by the suggested point text on the next line(s). Render this as a distinct block. **The suggested point text MUST be less than 160 characters.**
    *   Example:
        [Suggest Point]>\n        We should consider the long-term maintenance costs.\n\n5.  **Suggesting Negations:** When suggesting a negation for a specific **existing point** (e.g., Point 123 provided in the CONTEXT), place the \`[Suggest Negation For:123]>\` tag **immediately after discussing Point 123**, on a **new line**, potentially indented or formatted like a sub-item. Follow the tag immediately with the negation text. \`ID\` **must be the numeric ID of an EXISTING Point** provided in the CONTEXT section. **DO NOT suggest negations for Rationales (string IDs) or Discourse Posts (numeric IDs). Do NOT invent Point IDs.** **The suggested negation text MUST be less than 160 characters.**
    *   Example (after discussing Point 123):\n        ... discussion referencing Point 123 (Source: Endorsed Point ID:123).\n        - [Suggest Negation For:123]> The proposal overlooks the potential security risks involved.`;

        const nonDistillRationaleContext =
          relevantRationalesFromSearch.length > 0
            ? `Relevant Rationales (from search):\n${relevantRationalesFromSearch
                .map((r) => {
                  const sanitizedTitle = sanitizeText(r.title) || "[Untitled]";
                  const sanitizedContent =
                    sanitizeText(r.content || "") || "[No content]";
                  return `- Rationale \"${sanitizedTitle}\" (ID:${r.id}) - ${sanitizedContent} (Source: Search Result Rationale ID:${r.id})`;
                })
                .join("\n")}`
            : "No specific rationales found via search for the current discussion turn.";

        const viewerEndorsedPointsSection =
          relevantPoints.length > 0
            ? `Relevant Endorsed Points (by You, the Viewer - User ID: ${viewerId}):\n${relevantPoints
                .map(
                  (p) =>
                    `- [Point:${p.id} \"${p.content}\"] (Source: Endorsed Point ID:${p.id})`
                )
                .join("\n")}`
            : "You have not endorsed any relevant points recently.";

        contextSectionBuild = `${viewerEndorsedPointsSection}\n\n${nonDistillRationaleContext}\n\n${relevantDiscourseMessagesForPrompt.length > 0 ? `Relevant Recent Discourse Posts:\n${relevantDiscourseMessagesForPrompt.map((m) => `- Post ID:${m.id} - ${m.raw || m.content} (Source: Discourse Post ID:${m.id})`).join("\n\n")}` : "No relevant Discourse posts provided."}`;
      }

      finalPromptString = `You are an AI assistant in the Negation Game platform. ${mainGoalInstruction}

RULES & CAPABILITIES:
1.  **Argument Construction:** Help users build arguments. Suggest new points or negations where appropriate (unless in distill flow).
2.  **Referencing (Inline):** Use bracketed tags for direct inline references within your text. These become clickable links.
    *   Points: \`[Point:ID "Optional Snippet"]\` (e.g., \`[Point:123 "key phrase"]\`)
    *   Rationales: \`[Rationale:ID "Optional Title"]\` (e.g., \`[Rationale:abc-123 "Main Argument"]\`)
    *   Discourse Posts: \`[Discourse Post:ID]\` (e.g., \`[Discourse Post:456]\`) - **Do not include titles/snippets for Discourse Posts.**
    *   **Usage:** Use these when directly mentioning an entity. Include a short, relevant snippet/title for Points/Rationales only if needed for clarity or to quote a specific part. Avoid redundancy.

${distillSpecificRules}

3.  **Source Attribution:** Use parentheses for citing the source of information you are summarizing or directly quoting. This adds context about where the information came from.
    *   **DISTILL FLOW Exception:** When distilling (selectedRationaleId is present), **only use (Source: ...) tags for context elements *other than* the main rationale being distilled** (e.g., for Creator Endorsed Points or Discourse Posts). Do not add a source tag every time you reference content from the main rationale itself, as the entire essay represents that rationale.
    *   Format (Points/Rationales): \`(Source: Type ID:ID Title:"Title")\` or \`(Source: Type "Title" ID:ID)\`
    *   Format (Discourse): \`(Source: Discourse Post ID:ID)\` - **Do not include Topic/Title for Discourse Posts.**
    *   Examples:
        *   \`(Source: Endorsed Point ID:123)\`
        *   \`(Source: Rationale "Funding Options" ID:xyz-789)\`
        *   \`(Source: Discourse Post ID:456)\`
    *   **Usage:** Add this *after* presenting information derived from a specific source in the context.

${suggestionRule}

6.  **Structure & Style:** Follow essay structure and writing style guidelines below. Maintain logical flow and use clear language.

7.  **Formatting:** STRICTLY follow Markdown formatting rules below. Double newlines between paragraphs are crucial.

8.  **Rule 8: Do not invent Point IDs.** Only use the \`[Point:ID]\` or \`(Source: ... ID:ID)\` tags for points explicitly provided in the CONTEXT section with their numeric IDs. Do not create tags like \`[Point:1 "Some Concept"]\` for concepts you are introducing. (This rule is less relevant for the distill flow now, given the added restriction).

MARKDOWN FORMATTING:
*   Use standard Markdown (GFM).
*   **Double newlines** between paragraphs.
*   Proper list formatting (newlines, indentation).
*   Headings: \`#\`, \`##\`, \`###\`.\n*   Emphasis: \`**bold**\`, \`*italic*\`.\n*   Ensure spacing around lists, headings, blocks. Use newlines generously.

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
*   **DISTILL FLOW:** Write in the **first person** (I, my, we). Present the rationale's arguments constructively, **emphasizing the points the author endorsed and their stated conviction (cred amount).** Avoid meta-commentary or analysis *of* the rationale itself; focus on articulating the author's endorsed view *within* it.

---
CONTEXT FOR THIS RESPONSE (Use this information and cite sources using the \`(Source: ...)\` format ONLY for external context like Discourse Posts):

${contextSectionBuild}
---

CHAT HISTORY:
${chatMessages.map((m) => m.role.toUpperCase() + ":\n" + m.content + "\n").join("\n")}

Remember:
${selectedRationaleId ? "5. You are distilling. Use source tags only for external context. **Do not use bracket tags like [Point:ID] in your response.** Focus on the author's endorsed points and cred." : "1. Focus on helping..."}

INSTRUCTIONS:
${selectedRationaleId && fetchedRationaleData ? "*   Follow the **first-person** perspective...\n*   **Synthesize the 'Creator Endorsements' (points and cred) into the essay's core argument.**\n*   **DO NOT suggest new points or negations...**\n*   **DO NOT use bracket tags like [Point:ID] or [Rationale:ID] in your essay.**\n*   **Consider the entire chat history to understand the user's follow-up requests, but write the essay based *only* on the provided rationale context and endorsements.**" : "*   Suggest new points or negations..."}

A:`;

      console.log(
        "[generateDistillRationaleChatBotResponse] Prompt string constructed successfully."
      );
    } catch (promptError) {
      console.error(
        "[generateDistillRationaleChatBotResponse] FATAL ERROR during prompt construction:",
        promptError
      );
      throw new Error("Failed during prompt construction");
    }

    console.log(
      "[generateDistillRationaleChatBotResponse] Calling AI model (streamText) with retry..."
    );
    const aiResult = await withRetry(async () => {
      try {
        console.log(
          "[generateDistillRationaleChatBotResponse][withRetry] Calling streamText..."
        );
        const response = await streamText({
          model: google("gemini-1.5-flash"),
          prompt: finalPromptString,
        });

        if (!response) {
          console.error(
            "[generateDistillRationaleChatBotResponse][withRetry] Failed to get response object from AI model."
          );
          throw new Error("Failed to get response from AI model");
        }

        console.log(
          "[generateDistillRationaleChatBotResponse][withRetry] AI call successful, returning response object."
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
          "[generateDistillRationaleChatBotResponse][withRetry] Non-retriable error during AI call:",
          error
        );
        throw error;
      }
    });

    const elementStream = aiResult.textStream;
    if (!elementStream) {
      console.error(
        "[generateDistillRationaleChatBotResponse] Failed to get textStream from AI model result after retry."
      );
      throw new Error("Failed to initialize response stream");
    }

    console.log(
      "[generateDistillRationaleChatBotResponse] Returning elementStream."
    );
    return elementStream;
  } catch (error) {
    console.error("Error in generateDistillRationaleChatBotResponse:", error);

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
      if (error.message.startsWith("Permission Denied:")) {
        throw error;
      }
    }
    if (error instanceof Error && error.message === "Rationale not found.") {
      throw error;
    }
    throw new Error("Failed to generate AI response. Please try again.");
  }
};
