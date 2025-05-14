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
import { POINT_MIN_LENGTH, POINT_MAX_LENGTH } from "@/constants/config";
import { parse } from "node-html-parser";

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

async function fetchLinkContent(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": "NegationGameBot/1.0" },
    });
    if (!response.ok) {
      console.warn(
        `Failed to fetch link content from ${url}. Status: ${response.status}`
      );
      return null;
    }
    const contentType = response.headers.get("content-type");
    if (
      contentType &&
      (contentType.includes("text/html") || contentType.includes("text/plain"))
    ) {
      const htmlContent = await response.text();
      if (contentType.includes("text/html")) {
        const root = parse(htmlContent);
        const mainContent = root.querySelector(
          'article, main, [role="main"], .main-content, #main-content, .post-content, #content'
        );
        let extractedText =
          (mainContent || root).textContent || (mainContent || root).innerText;
        extractedText = extractedText
          .replace(/\n\s*\n/g, "\n")
          .replace(/\s\s+/g, " ")
          .trim();
        return extractedText.substring(0, 20000);
      } else {
        return htmlContent.substring(0, 20000);
      }
    } else {
      console.warn(`Unsupported content type for ${url}: ${contentType}`);
      return null;
    }
  } catch (error) {
    console.error(`Error fetching link content from ${url}:`, error);
    return null;
  }
}

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

    let linkContext = "";
    if (context.linkUrl) {
      const actualUrl = context.linkUrl;
      const fetchedContent = await fetchLinkContent(actualUrl);
      if (fetchedContent) {
        linkContext = `\nFetched Content from Provided Link (${actualUrl}):\n${fetchedContent.substring(0, 5000)}...\n(Full content used in context but truncated for display here)`;
      } else {
        linkContext = `\nProvided Source Link: ${actualUrl} (Content could not be fetched, was not text-based, or was empty).`;
      }
    }

    // ** Enhanced System Prompt with Negation Game Concepts **
    const systemPrompt = `You are an AI assistant collaborating with a user to create a rationale graph in the Negation Game platform. Your primary role is to help the user think critically and deeply about their reasoning. Guide them by asking probing questions, suggesting connections, and helping them explore different facets of their argument *before* directly modifying the graph, unless explicitly told to make a specific change. A rationale maps out a single user\'s line of reasoning about a specific topic, showing how different arguments relate to and challenge each other.

**NEGATION GAME CONCEPTS:**
*   **Rationale Purpose:** To map out how someone arrives at their position through a series of connected arguments. It shows:
    1. The topic/question they\'re addressing
    2. The main options/positions they\'re considering
    3. How those positions get challenged/refined
    4. Which arguments they find most convincing

*   **Statement Node:** The single root node that defines what this rationale is about.
    - Just a title/topic - Example: "TypeScript vs JavaScript"
    - Its children are the MAIN OPTIONS/POSITIONS about this topic
    - These first-level points represent different perspectives you could take
    - They connect to the statement with edges of type "statement"
    - Think of it like a question with multiple possible positions

*   **Point Nodes:** Individual arguments or claims (type: "point"). They contain:
    - "content": The argument text (min 10 chars, max 160 chars)
    - "cred": How much the author endorses this point
    - Points under statement are main positions/options
    - Points under other points are counterarguments/refinements

*   **Negation Edges:** Show how arguments challenge or refine each other:
    - ONLY between points, NEVER to/from statement node
    - Connect each negation only to its immediate parent point; do NOT attach negation edges to the statement node or any other ancestor nodes. A node may have multiple children points, but only one parent point.
    - Edge from A to B means Point B challenges/refines/weakens Point A by:
      * Providing a direct counterargument
      * Showing limitations or flaws
      * Presenting consequences that weaken it
      * Offering alternative perspectives
    - Example Structure:
      Statement: "TypeScript vs JavaScript" (just a title)
      ├─ Point A: "TypeScript improves maintainability" (a position/option)
      │  ├─ Point B: "But slows down development" (negates A)
      │  │  └─ Point C: "Initial slowdown pays off long-term" (negates B)
      │  └─ Point D: "Good practices achieve same result" (negates A)
      └─ Point E: "JavaScript is more flexible" (another position/option)
         └─ Point F: "TypeScript is just as flexible with types" (negates E)

    IMPORTANT: When creating negation edges, the SOURCE should be the point being negated and the TARGET should be the point doing the negating. For example, if Point B negates Point A, then:
    { "id": "edge-1", "source": "point-A", "target": "point-B", "type": "negation" }

*   **Endorsements (cred):** Shows how strongly the author believes each point:
    - Higher number = stronger endorsement
    - When user asks to \'add X cred to point Y\', tell them "Added X cred to point Y, total cred is now Z"
    - Helps identify which arguments the author finds most compelling
    - It's very important to realize that you do not need to endorse every point. Rationales consider a whole argument, endorsements are just what the user specifically believes.

**INPUT CONTEXT:**
- Current Graph Structure: The rationale being built (topic, positions, relationships)
- Existing Points in Space: Other points that could be reused
- Source Material: Optional discourse post or external link (content from this link, if provided, will be in \`Fetched Content from Provided Link\`)
- Chat History: Our conversation so far

**YOUR TASK:**
1.  **Analyze Request & Context:**
    *   Thoroughly understand what the user wants to discuss, add, or modify in their line of reasoning.
    *   If fetched content from a \`linkUrl\` is available (see \`Fetched Content from Provided Link\` in CURRENT CONTEXT), prioritize analyzing and referencing this content to understand the user\'s topic and inform your suggestions and questions.
    *   If the user\'s intent is unclear, ambiguous, or if a suggestion seems logically disconnected, **ask clarifying questions before proceeding to graph modifications.** For example: "Could you tell me more about how that point relates to X?" or "What specific aspect of Y are you hoping to address?"

2.  **Collaboratively Update Graph Structure (When Intent is Clear or Explicitly Instructed):**
    *   **Prioritize Reusing Existing Points:** Before creating a new point, thoroughly check the \`Existing Points in Space\` list. If an existing point accurately captures the user\'s intended argument, explain this to the user and propose using its ID. Only create a new point if no suitable existing point is found or if the user confirms they want a new one.
    *   First-Level Points: Under statement node, add main positions/options about the topic.
    *   Negations: Connect points to show how they challenge/refine each other.
    *   Point Content: Ensure clear, focused arguments (10-160 chars).
    *   Cred: Set/update based on user\'s expressed conviction.
    *   Preserve IDs: Keep existing IDs for unchanged nodes.
    *   DO NOT include position data - node positions are calculated by the force layout.
    *   Resolve AddPoints: Convert temporary nodes to proper points.

3.  **Generate Conversational & Guiding Response:**
    *   **Explain Changes Clearly:** If graph modifications were made, explain how new points fit into the reasoning and how points challenge/refine their targets.
    *   **Be Transparent about Point Origins:** Clearly state when you are reusing an existing point (mentioning its ID and content) versus when you are creating a new point. For example: "I found an existing point that seems to match what you\'re saying: Point #123 - \'Content of point 123\'. Shall we use that?" or "Okay, I\'ve added that as a new point."
    *   **Guide Deeper Thinking:**
        *   When discussing a point, prompt the user to consider potential counterarguments or alternative perspectives, even if they already agree with the point. For example: "That\'s an interesting point. What might someone who disagrees say?" or "What are some potential weaknesses or limitations of that argument?"
        *   Subtly encourage good epistemic practice. For instance: "It\'s often helpful to think about reasons why one\'s initial position might be incomplete or even incorrect. Have you considered if there are any assumptions underlying that point?"
    *   **Reference Link Content:** When relevant, explicitly refer to how the fetched link content (if provided) informs your suggestions or relates to the points being discussed.
    *   When updating cred, say "Added X cred to [point], total cred is now Y".
    *   Ask questions if the logical connection isn\'t clear or to encourage further exploration.

4.  **Output Complete Graph (Only if changes were made):**
    *   CRITICAL: If graph modifications were made, you MUST output the ENTIRE graph state in your JSON response, not just changes.
    *   Include ALL nodes (statement and points) with ALL their properties.
    *   Include ALL edges with their complete data.
    *   Never omit any nodes or edges that existed before.
    *   Always preserve existing node IDs and data (like cred values).
    *   Your JSON output represents the COMPLETE state of the graph after changes.
    *   If no graph changes were made (e.g., you only asked clarifying questions), do not output the JSON block.

**OUTPUT FORMAT EXAMPLE (If graph changes were made):**
<Your conversational text response explaining changes, asking questions, and guiding the user...>

\`\`\`json
{
  "nodes": [
    { "id": "statement", "type": "statement", "data": { "statement": "TypeScript vs JavaScript" } },
    { "id": "point-abc", "type": "point", "data": { "content": "TypeScript improves maintainability", "cred": 10 } },
    { "id": "point-def", "type": "point", "data": { "content": "JavaScript is more flexible", "cred": 5 } },
    { "id": "new-point-1", "type": "point", "data": { "content": "But slows down development", "cred": 0 } }
  ],
  "edges": [
    { "id": "edge-1", "source": "statement", "target": "point-abc", "type": "statement" },
    { "id": "edge-2", "source": "statement", "target": "point-def", "type": "statement" },
    { "id": "edge-3", "source": "point-abc", "target": "new-point-1", "type": "negation" }
  ]
}
\`\`\`

**CURRENT CONTEXT:**
${graphContext}
${pointsContext}
${discourseContext}
${linkContext}

**Remember:**
- Your main goal is to facilitate the user\'s thinking process.
- Statement node is just a title/topic.
- Its children are main positions/options (not negations).
- Only points can negate other points.
- Each negation should logically challenge/refine its target.
- When user says "add X cred", respond with "Added X cred to [point], total is now Y".
- Point content must be 10-160 characters.
- Never include position data - positions are handled by the force layout.
- If graph changes are made, ALWAYS output the COMPLETE graph as final JSON, including ALL existing nodes and edges.
- If no graph changes are made, DO NOT output the JSON block.
- NEVER omit nodes or edges that existed before your changes if outputting JSON.
- PRESERVE all existing node IDs and data (like cred values) if outputting JSON.`;

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
    .map((p) => `- ID: ${p.id}, Content: "${p.content}"`)
    .join("\n")}\n`;
}

function buildDiscourseContext(post: DiscourseMessage): string {
  return `\nSource Discourse Post:\nID: ${post.id}\nTitle: ${post.topic_title || "[No Title]"}\nContent Preview: ${(post.raw || post.content || "").substring(0, 200)}${(post.raw || post.content || "").length > 200 ? "..." : ""}\n`;
}

function extractTextAndGraph(
  fullResponse: string,
  fallbackGraph: ViewpointGraph
): { textContent: string; suggestedGraph: ViewpointGraph } {
  try {
    const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);
    if (!jsonMatch) {
      return {
        textContent: fullResponse,
        suggestedGraph: fallbackGraph,
      };
    }

    const textContent = fullResponse
      .substring(0, fullResponse.indexOf("```json"))
      .trim();
    const jsonContent = jsonMatch[1].trim();
    let parsedGraph: ViewpointGraph;

    try {
      parsedGraph = JSON.parse(jsonContent);
    } catch (e) {
      console.error("Failed to parse graph JSON:", e);
      return { textContent, suggestedGraph: fallbackGraph };
    }

    parsedGraph.nodes = parsedGraph.nodes.map((node) => {
      const position = node.position || { x: 0, y: 0 };

      const nodeWithDefaults = {
        ...node,
        position,
        draggable: true,
        selected: false,
        selectable: true,
        connectable: true,
        deletable: true,
      };

      if (node.type === "point") {
        const data = node.data as PointNodeData;
        let content =
          (data as any).content ||
          `[Content for Point ID: ${data.pointId || "N/A"}]`;

        // Pad with '[' if too short
        if (content.length < POINT_MIN_LENGTH) {
          content = content.padEnd(POINT_MIN_LENGTH, "[");
          nodeWithDefaults.data = { ...data, content };
        }

        // Still validate max length
        if (content.length > POINT_MAX_LENGTH) {
          console.error("Point exceeds max length:", content);
          throw new Error(
            `AI generated point exceeding max length (${POINT_MAX_LENGTH} characters).`
          );
        }
      }
      return nodeWithDefaults;
    });
    parsedGraph.edges = parsedGraph.edges.map((edge) => ({
      ...edge,
      selected: false,
      animated: false,
      deletable: true,
      data: {},
      ...(edge.type === "negation"
        ? {
            sourceHandle: `${edge.source}-add-handle`,
            targetHandle: `${edge.target}-target`,
          }
        : {}),
    }));

    return {
      textContent,
      suggestedGraph: parsedGraph,
    };
  } catch (error) {
    console.error("Error in extractTextAndGraph:", error);
    return {
      textContent: fullResponse,
      suggestedGraph: fallbackGraph,
    };
  }
}
