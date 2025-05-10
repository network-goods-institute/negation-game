"use server";

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { withRetry } from "@/lib/withRetry";
import { getUserId } from "@/actions/getUserId";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { PointInSpace } from "@/actions/fetchAllSpacePoints";
import { ChatMessage, DiscourseMessage } from "@/types/chat";
import { PointNodeData } from "@/components/graph/PointNode";
import { StatementNodeData } from "@/components/graph/StatementNode";
import { AddPointNodeData } from "@/components/graph/AddPointNode";

interface RationaleCreationResponse {
  textStream: ReadableStream<string>;
  suggestedGraph: ViewpointGraph;
}

interface RationaleCreationContext {
  currentGraph: ViewpointGraph;
  allPointsInSpace: PointInSpace[];
  discoursePost?: DiscourseMessage;
  linkUrl?: string;
  rationaleDescription?: string;
}

type NodeData = StatementNodeData | PointNodeData | AddPointNodeData;

export const generateRationaleCreationResponse = async (
  messages: ChatMessage[],
  context: RationaleCreationContext
): Promise<RationaleCreationResponse> => {
  try {
    const chatMessages = messages.filter((m) => m.role !== "system");
    if (chatMessages.length === 0) {
      throw new Error("No chat messages found for response generation");
    }

    const viewerId = await getUserId();
    if (!viewerId) {
      throw new Error("User not authenticated");
    }

    const graphContext = buildGraphContext(
      context.currentGraph,
      context.rationaleDescription
    );
    const pointsContext = buildPointsContext(context.allPointsInSpace);
    const discourseContext = context.discoursePost
      ? buildDiscourseContext(context.discoursePost)
      : "";
    const linkContext = context.linkUrl
      ? `\nProvided Source Link: ${context.linkUrl}`
      : "";

    // ** Enhanced System Prompt with Negation Game Concepts **
    const systemPrompt = `You are an AI assistant collaborating with a user to create a rationale graph in the Negation Game platform. A rationale represents a **single user's structured argument or viewpoint** on a specific topic, starting from a central statement.

**NEGATION GAME CONCEPTS:**
*   **Rationale Purpose:** To map out *one person's* line of reasoning. It's not a summary of all views in the space.
*   **Statement Node:** The single root node (type: "statement") defines the main topic/thesis of *this specific rationale*.
*   **Point Nodes:** Individual arguments or claims (type: "point"). They contain "content" (max 160 chars).
*   **Negation Edges:** Connect nodes (type: "negation"). An edge from A to B (Source A -> Target B) means Point B *negates, refines, challenges, or provides a consequence* of Point A.
*   **Endorsements (viewerCred):** A number on a point node showing the *user's personal conviction* in that point *within this rationale*. Higher means stronger belief. You should *suggest* this (e.g., 5 or 10) for new points if the user expresses conviction, but the user has final control.
*   **Rationale Description:** (Provided in context if available) A brief summary of the overall argument being built.

**INPUT CONTEXT:**
- Current Graph Structure: The rationale being built (title, description, nodes, edges).
- Existing Points in Space: Other points in the wider space.
- Source Discourse Post: Optional linked forum post content.
- Provided Source Link: Optional external URL.
- Chat History: Our conversation so far.

**YOUR TASK (Based on User's Last Message & History):**
1.  **Analyze:** Understand the user's request to modify or expand the rationale.
2.  **Update Graph:** Modify the 'Current Graph Structure'.
    *   Add/Modify Points: Add new points or refine existing ones based on user input. Suggest 'viewerCred' for new points reflecting user conviction.
    *   Add Edges: Connect points *logically* using "negation" edges (Source -> Target where Target negates/refines Source).
    *   Preserve IDs: Keep the original 'id' for nodes/edges that are NOT modified.
    *   Include Position: Ensure EVERY node in the output JSON has a 'position' object with 'x' and 'y' coordinates. Preserve original positions for unmodified nodes. Calculate reasonable positions for new nodes (e.g., below their source).
    *   **New IDs:** Assign simple, temporary, unique string IDs (e.g., "new-point-1") to *new* nodes/edges.
    *   **Resolve 'addPoint' Nodes:** VERY IMPORTANT: Replace any temporary "addPoint" nodes from the input context with proper "point" nodes (with content/cred) or remove them entirely. Your final JSON output MUST NOT contain "addPoint" nodes.
    *   **Existing Point Content:** If the user's idea mirrors an 'Existing Point in Space', create a *new* point node in *this rationale's graph* using that content (give it a new ID like "new-point-from-123"). Mention the original ID (e.g., 123) in your text response, but do NOT use the original ID (123) in the output JSON graph structure.
3.  **Generate Text Response:** Explain your graph changes conversationally. Clarify the meaning of new points and connections (especially negations). Ask questions if needed.
4.  **Output JSON:** AFTER your text response, output the COMPLETE, UPDATED graph (all nodes and edges) as a JSON object inside \`\`\`json ... \`\`\`. This MUST be the absolute final part of your response.

**OUTPUT FORMAT EXAMPLE:**
<Your conversational text response explaining changes...>

\`\`\`json
{
  "nodes": [
    { "id": "statement", "type": "statement", "position": { "x": 100, "y": 50 }, "data": { "statement": "Updated main topic" } },
    { "id": "point-abc", "type": "point", "position": { "x": 100, "y": 150 }, "data": { "content": "Existing point text", "viewerCred": 10 } }, // Unchanged node
    { "id": "new-point-1", "type": "point", "position": { "x": 100, "y": 250 }, "data": { "content": "Newly added point text", "viewerCred": 5 } } // New node
  ],
  "edges": [
    { "id": "edge-xyz", "source": "statement", "target": "point-abc", "type": "negation" }, // Unchanged edge
    { "id": "new-edge-1", "source": "point-abc", "target": "new-point-1", "type": "negation" } // New edge
  ]
}
\`\`\`

**CURRENT CONTEXT:**
${graphContext}
${pointsContext}
${discourseContext}
${linkContext}

**Remember:**
- A rationale represents a *single user's argument*.
- Output the *entire updated graph* in the final JSON block.
- Resolve *all* 'addPoint' nodes.
- Max 160 chars for point content.
- Negation edges show challenge/refinement (Source -> Target).
- Suggest viewerCred based on user's conviction.
- JSON block is the *very last* thing.`;

    const chatHistoryString = chatMessages
      .map((m) => `${m.role.toUpperCase()}:\n${m.content}`)
      .join("\n\n");

    const finalPrompt = `${systemPrompt}\n\nCHAT HISTORY:\n${chatHistoryString}\n\nA:`;

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
          } else if (
            error.message.includes("blocked") ||
            error.message.includes("stopped")
          ) {
            throw new Error(
              "AI response was blocked due to content safety reasons. Please review your input."
            );
          }
        }
        console.error("AI Call Error:", error);
        throw new Error(
          `AI call failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    const fullResponseReader = aiResult.textStream.getReader();
    let accumulatedText = "";
    while (true) {
      const { done, value } = await fullResponseReader.read();
      if (done) break;
      accumulatedText += value;
    }

    if (!accumulatedText) {
      throw new Error("AI response was empty.");
    }
    const { textContent, suggestedGraph } = extractTextAndGraph(
      accumulatedText,
      context.currentGraph
    );

    const textOnlyStream = new ReadableStream<string>({
      start(controller) {
        controller.enqueue(textContent);
        controller.close();
      },
    });

    return {
      textStream: textOnlyStream,
      suggestedGraph: suggestedGraph,
    };
  } catch (error) {
    console.error("Error in generateRationaleCreationResponse:", error);
    if (
      error instanceof Error &&
      (error.message.includes("AI response blocked") ||
        error.message.includes("AI response stopped") ||
        error.message.includes("AI service") ||
        error.message.includes("conversation is too long") ||
        error.message.includes("Invalid request format") ||
        error.message.includes("No messages provided") ||
        error.message.includes("No chat messages found") ||
        error.message.includes("User not authenticated") ||
        error.message.includes("AI response was empty") ||
        error.message.includes("AI call failed"))
    ) {
      throw error;
    }
    throw new Error(
      "Failed to generate AI response for rationale creation. Please try again."
    );
  }
};

function buildGraphContext(
  graph: ViewpointGraph,
  description?: string
): string {
  const { nodes, edges } = graph;
  let context = "Current Rationale Draft:\n";

  const statementNode = nodes.find((n) => n.type === "statement");
  const rationaleTitle =
    (statementNode?.data as StatementNodeData)?.statement || "[No Title Set]";
  context += `- Title: "${rationaleTitle}"\n`;
  if (description) {
    context += `- Description: ${description.substring(0, 200)}${description.length > 200 ? "..." : ""}\n`;
  }

  context += "- Nodes:\n";
  if (nodes.length === 0) {
    context += "    (No nodes yet)\n";
  } else {
    nodes.forEach((node) => {
      context += `    - id: ${node.id}, type: ${node.type}, position: { x: ${Math.round(node.position.x)}, y: ${Math.round(node.position.y)} }`;
      if (node.type === "statement") {
        // Title already included
      } else if (node.type === "point") {
        const data = node.data as PointNodeData;
        const content =
          (data as any).content ||
          `[Content for Point ID: ${data.pointId || "N/A"}]`;
        const viewerCred = (data as any).viewerCred;
        context += `, content: "${content}"${viewerCred ? `, viewerCred: ${viewerCred}` : ""}`;
      } else if (node.type === "addPoint") {
        const data = node.data as AddPointNodeData;
        context += `, parentId: ${data.parentId}`; // Explicitly note it's an AddPoint node needing resolution
      }
      context += "\n";
    });
  }

  context += "- Edges:\n";
  if (edges.length === 0) {
    context += "    (No edges yet)\n";
  } else {
    edges.forEach((edge) => {
      context += `    - id: ${edge.id}, source: ${edge.source}, target: ${edge.target}, type: ${edge.type || "negation"}\n`;
    });
  }
  return context;
}

function buildPointsContext(points: PointInSpace[]): string {
  if (points.length === 0) return "\nExisting Points in Space: (None)\n";
  return `\nExisting Points in Space:\n${points
    .map((p) => `- ID: ${p.id}, Content: "${p.content}"`) // Simplified
    .join("\n")}\n`;
}

function buildDiscourseContext(post: DiscourseMessage): string {
  return `\nSource Discourse Post:\nID: ${post.id}\nTitle: ${post.topic_title || "[No Title]"}\nContent Preview: ${(post.raw || post.content || "").substring(0, 200)}${(post.raw || post.content || "").length > 200 ? "..." : ""}\n`;
}

function extractTextAndGraph(
  fullResponse: string,
  fallbackGraph: ViewpointGraph
): { textContent: string; suggestedGraph: ViewpointGraph } {
  const jsonBlockRegex = /```json\n([\s\S]*?)\n```$/;
  const match = fullResponse.match(jsonBlockRegex);
  let textContent = fullResponse.trim();
  let suggestedGraph = fallbackGraph;
  if (match && match[1]) {
    try {
      const jsonStr = match[1];
      const parsedGraph = JSON.parse(jsonStr) as ViewpointGraph;
      if (
        parsedGraph &&
        Array.isArray(parsedGraph.nodes) &&
        Array.isArray(parsedGraph.edges)
      ) {
        if (
          parsedGraph.nodes.every((n) => n.id && n.type && n.data) &&
          parsedGraph.edges.every((e) => e.id && e.source && e.target)
        ) {
          suggestedGraph = parsedGraph;
          textContent = fullResponse.substring(0, match.index).trim();
        } else {
          console.warn(
            "Parsed graph has invalid node/edge structure. Falling back..."
          );
        }
      } else {
        console.warn(
          "Parsed JSON is not a valid ViewpointGraph structure. Falling back..."
        );
      }
    } catch (error) {
      console.error("Failed to parse JSON graph:", error);
      textContent =
        fullResponse.trim() + "\n\n[Error: Could not parse graph changes.]";
    }
  } else {
    console.warn("No JSON graph block found at end. Returning original graph.");
    textContent =
      fullResponse.trim() + "\n\n[Warning: No graph suggestions detected.]";
  }
  return { textContent, suggestedGraph };
}
