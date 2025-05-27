"use server";

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { withRetry } from "@/lib/utils/withRetry";
import { searchContent, SearchResult } from "@/actions/search/searchContent";
import { getUserId } from "@/actions/users/getUserId";
import { generateSearchQueries } from "./generateSearchQueries";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { AppNode } from "@/components/graph/nodes/AppNode";
import { AppEdge } from "@/components/graph/edges/AppEdge";
import { PointNodeData } from "@/components/graph/nodes/PointNode";
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

    const viewerId = await getUserId();

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
      } catch (dbError) {
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
        } catch (dbError) {}

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
        } catch (dbError) {
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

          return `- Node ${node.id}${idPart}: ${sanitizeText(textPart).substring(0, 150)}...`;
        };

        nodesString =
          rationaleGraph?.nodes?.map(getNodePromptString)?.join("\n") ||
          "No nodes found.";
        edgesString =
          rationaleGraph?.edges
            ?.map((e: AppEdge) => `- Edge: ${e.source} -> ${e.target}`)
            ?.join("\n") || "No edges found.";

        contextRationaleSection = `Selected Rationale for Distillation:\n- Rationale Title: "${sanitizeText(rationaleTitle)}" (ID:${selectedRationaleId})\n- Description: ${sanitizeText(rationaleDescription).substring(0, 500)}...\n- ${creatorEndorsementsString}\n- Graph Structure:\n    Nodes:\n${nodesString}\n    Edges:\n${edgesString}\n(Source: Rationale "${sanitizeText(rationaleTitle)}" ID:${selectedRationaleId})`;
      } else {
        creatorEndorsementsString =
          "No points found in this rationale to check for creator endorsements.";
      }

      contextRationaleSection = `Selected Rationale for Distillation:\n- Rationale Title: "${sanitizeText(rationaleTitle)}" (ID:${selectedRationaleId})\n- Description: ${sanitizeText(rationaleDescription).substring(0, 500)}...\n- ${creatorEndorsementsString}\n(Source: Rationale "${sanitizeText(rationaleTitle)}" ID:${selectedRationaleId})`;
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
        try {
          searchResults = await searchContent(searchQueries);
        } catch (searchError) {}
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

    // Determine if this is a revision request (has prior assistant message)
    const assistantCount = messages.filter(
      (m) => m.role === "assistant"
    ).length;
    const isDistillFlow = Boolean(selectedRationaleId && fetchedRationaleData);
    // Build two variants: initial distill instructions vs revision instructions
    const initialDistillInstr = `*   Follow the **first-person** perspective, writing as the rationale creator.
*   **Base the essay primarily on the points the creator endorsed** (listed in context), explaining their significance and 'Cred' values.
*   Use the full rationale graph for context and flow, but prioritize the endorsed points for the core argument.
*   **Explicitly detail the endorsed points and their cred within the essay.**
*   **Do NOT suggest new points or negations.**`;
    const revisionDistillInstr = `*   Follow the **first-person** perspective, writing as the rationale creator.
*   **Base the essay primarily on the points the creator endorsed** (listed in context), explaining their significance and 'Cred' values.
*   Use the full rationale graph for context and flow, but prioritize the endorsed points for the core argument.
*   **Explicitly detail the endorsed points and their cred within the essay.**
*   **Do NOT suggest new points or negations.**
*   **Review the CHAT HISTORY.** The current user message is a follow-up requesting changes to the last essay you generated.
*   **Identify your most recent complete essay in the chat history. Refine *that specific essay* based on the latest user instruction. For example, if the user asks to make it shorter, modify your previous essay text to be shorter. If they ask to elaborate on a point, modify your previous essay text to elaborate on that point.**
*   **After refining, present the complete, updated essay.**
*   **Maintain a conversational tone when you respond. You can briefly acknowledge the user's request (e.g., "Okay, I've revised the essay to be shorter as you requested:") before presenting the full refined essay. Longer responses are also okay. Feel free to skip generation entirely if appropriate.**
*   **Ensure the refined essay remains grounded in the original rationale's content, especially the endorsed points, and does not introduce new topics or points not derivable from the source rationale.**`;
    let finalPromptString;
    try {
      let mainGoalInstruction = "";
      let suggestionRule = "";
      let contextSectionBuild = "";
      let distillSpecificRules = "";

      if (selectedRationaleId && fetchedRationaleData) {
        mainGoalInstruction = `Your goal is to help the user distill their selected rationale (ID: ${selectedRationaleId}) into a well-structured **first-person essay**. Write **as if you are the author** articulating the arguments **based primarily on the points you (the creator) have endorsed within this rationale**. Focus on explaining *why* you hold a certain position by unpacking the specific points listed in the 'Points Endorsed by Creator' section below, referencing their content (available in the graph nodes) and the 'Cred' you assigned to them. Use the overall rationale structure (Title, Description, Graph) for context and flow, but **prioritize the endorsed points** to shape the core argument. **Do NOT suggest new points or negations.** **Do NOT analyze or critique the rationale itself**; simply present the argument derived from your endorsed points coherently from the first-person perspective. If endorsed points present conflicting views, acknowledge this tension and explain the overall stance based on the relative 'Cred' assigned.`;
        suggestionRule = `**IMPORTANT:** Do NOT suggest new points or negations using \`[Suggest Point]>\` or \`[Suggest Negation For:ID]>\` tags in this distillation task.`;
        distillSpecificRules = `**IMPORTANT (Distill Flow):**
        *   **Unpack Endorsed Points:** Explicitly mention the points the creator endorsed (from the 'Points Endorsed by Creator' list) and their associated 'Cred' within the essay body. Explain how these specific points and their endorsement levels support the overall argument.
        *   **No Bracket Tags:** Do NOT use \`[Point:ID]\` or \`[Rationale:ID]\` tags in your essay response. Weave the arguments from the endorsed points (using their content from the graph nodes) into the narrative naturally.`;

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
                  return `- Rationale "${sanitizedTitle}" (ID:${r.id}) - ${sanitizedContent.substring(0, 150)}... (Source: Search Result Rationale ID:${r.id})`;
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
*   Match the language of the input chat history and context.

---
CONTEXT FOR THIS RESPONSE (Use this information and cite sources using the \`(Source: ...)\` format ONLY for external context like Discourse Posts):

${contextSectionBuild}
---

CHAT HISTORY:
${chatMessages.map((m) => m.role.toUpperCase() + ":\n" + m.content + "\n").join("\n")}

Remember:
${selectedRationaleId ? "5. You are distilling. Focus on the creator's endorsed points and cred. Use source tags only for external context. **Do not use bracket tags like [Point:ID] in your response.**" : "1. Focus on helping..."}

INSTRUCTIONS:
${
  isDistillFlow
    ? assistantCount > 0
      ? revisionDistillInstr
      : initialDistillInstr
    : suggestionRule
}

A:`;
    } catch (promptError) {
      throw new Error("Failed during prompt construction");
    }

    const aiResult = await withRetry(async () => {
      try {
        const response = await streamText({
          model: google("gemini-1.5-flash"),
          prompt: finalPromptString,
        });

        if (!response) {
          throw new Error("Failed to get response from AI model");
        }

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
