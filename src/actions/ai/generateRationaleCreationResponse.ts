"use server";

import {
  geminiService,
  type Message as GeminiMessage,
} from "@/services/ai/geminiService";
import { getUserId } from "@/actions/users/getUserId";
import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { PointInSpace } from "@/actions/points/fetchAllSpacePoints";
import { ChatMessage, DiscourseMessage } from "@/types/chat";
import { PointNodeData } from "@/components/graph/nodes/PointNode";
import { StatementNodeData } from "@/components/graph/nodes/StatementNode";
import { AddPointNodeData } from "@/components/graph/nodes/AddPointNode";
import {
  POINT_MIN_LENGTH,
  REGULAR_POINT_MAX_LENGTH,
  OPTION_POINT_MAX_LENGTH,
} from "@/constants/config";
import { parse } from "node-html-parser";
import { getDiscourseContent } from "@/actions/search/getDiscourseContent";
import { toast } from "sonner";
import { GraphCommand } from "@/types/graphCommands";

const ALLOWED_DOMAINS = [
  "forum.ethereum.org",
  "gov.gitcoin.co",
  "commonwealth.im",
  "discourse.sourcecred.io",
  "forum.scroll.io",
  "github.com",
  "docs.google.com",
  "medium.com",
  "blog.ethereum.org",
  "ethereum.org",
];

function isValidExternalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);

    // Only allow HTTPS
    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    // Block private IP ranges and localhost (comprehensive check)
    const hostname = parsedUrl.hostname;
    if (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      hostname.startsWith("127.") ||
      hostname.startsWith("10.") ||
      hostname.startsWith("192.168.") ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./) ||
      hostname.match(/^169\.254\./) || // Link-local
      hostname.match(/^224\./) || // Multicast
      hostname.match(/^f[cd][0-9a-f]{2}:/i) // IPv6 private
    ) {
      return false;
    }

    // Only allow specific trusted domains (exact match)
    if (!ALLOWED_DOMAINS.includes(hostname)) {
      return false;
    }

    // Block suspicious query parameters
    if (parsedUrl.search && parsedUrl.search.includes("redirect")) {
      return false;
    }

    // Block data URLs and other protocols
    if (parsedUrl.protocol !== "https:") {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

interface RationaleCreationResponse {
  textStream: ReadableStream<string>;
  suggestedGraph: ViewpointGraph;
  commands?: GraphCommand[];
}

interface RationaleCreationContext {
  currentGraph: ViewpointGraph;
  allPointsInSpace: PointInSpace[];
  discoursePost?: DiscourseMessage;
  linkUrl?: string;
  rationaleDescription?: string;
}

async function fetchLinkContent(url: string): Promise<string | null> {
  const discourseText = await getDiscourseContent(url);
  if (discourseText) {
    return discourseText;
  }

  if (!isValidExternalUrl(url)) {
    console.warn("Blocked request to invalid URL:", url);
    return null;
  }

  try {
    // Re-validate URL before making request
    if (!isValidExternalUrl(url)) {
      console.warn("URL validation failed before fetch:", url);
      return null;
    }

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "User-Agent": "NegationGameBot/1.0",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "error", // Prevent redirects that could bypass validation
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });
    if (!response.ok) {
      console.warn(
        "Failed to fetch link content from URL:",
        url,
        "Status:",
        response.status
      );
      toast.error(
        `Failed to fetch link content from ${url}. Status: ${response.status} This may because it's not a discourse link or the link is private.`
      );
      return null;
    }
    // Check content length
    const contentLength = response.headers.get("content-length");
    if (contentLength && parseInt(contentLength) > 5000000) {
      // 5MB limit
      console.warn("Response too large:", url, "Size:", contentLength);
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
        return extractedText.substring(0, 50000);
      } else {
        return htmlContent.substring(0, 50000);
      }
    } else {
      console.warn(
        "Unsupported content type for URL:",
        url,
        "Type:",
        contentType
      );
      return null;
    }
  } catch (error) {
    console.error(
      "Error fetching link content from URL:",
      url,
      "Error:",
      error
    );
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
        linkContext = `\nFetched Content from Provided Link (${actualUrl}):\n${fetchedContent}...\n(Content truncated to 50k chars for token limits)`;
      } else {
        linkContext = `\nProvided Source Link: ${actualUrl} (Content could not be fetched, was not text-based, or was empty).`;
      }
    }

    const systemPrompt = `You are an AI assistant collaborating with a user to create a rationale graph in the Negation Game platform. 

CRITICAL: You are having a conversation with ONE USER. Never simulate dialogue exchanges or write "USER:" followed by imagined responses. Write only YOUR response to the user's actual message, then stop.

Your primary role is to help the user think critically and deeply about their reasoning. You cannot read or fetch links pasted directly into the chat. Link fetching is handled by the Discourse Link input at the top of the interface. Whenever you see a URL in a user's message and do not notice the content from that link in your context, instruct them to paste it into the Discourse Link field and verify it is correctly formatted, rather than trying to process it directly. Guide them by asking probing questions, suggesting connections, and helping them explore different facets of their argument *before* directly modifying the graph, unless explicitly told to make a specific change. A rationale maps out a single user's line of reasoning about a specific topic, showing how different arguments relate to and challenge each other.

    Note: Always treat the graph state provided in the context as the authoritative current graph. Users may have edited it independently since any prior AI suggestions; base all modifications on the received graphData and do not assume you were the last to modify the graph.

IMPORTANT: When you make modifications to the graph, output a list of commands as a JSON code block after your response text, wrapped in \`\`\`json ... \`\`\`. Each command specifies exactly what change to make. If no changes are needed, do not include any JSON block.

**NEGATION GAME CONCEPTS:**
*   **Rationale Purpose:** To map out how someone arrives at their position through a series of connected arguments. It shows:
    1. The topic/question they're addressing
    2. The main options/positions they're considering
    3. How those positions get challenged/refined
    4. Which arguments they find most convincing

*   **Statement Node:** The single root node that defines what this rationale is about. **It is a NEUTRAL TOPIC or QUESTION, not an arguable position itself.**
    - Just a title/topic - Example: "TypeScript vs JavaScript" or "Best approach for state management in React?"
    - Its children are the MAIN OPTIONS/POSITIONS/STANCES about this topic.
    - These first-level points represent different perspectives or answers related to the statement.
    - They connect to the statement with edges of type "statement".
    - **IMPORTANT: The statement node itself is NOT a claim to be supported or negated by its children.** Think of it like the title of a debate or a research question.

*   **Point Nodes:** Individual arguments or claims (type: "point"). They contain:
    - "content": The argument text (min 10 chars, max ${REGULAR_POINT_MAX_LENGTH} chars; ${OPTION_POINT_MAX_LENGTH} if it is a direct child of the statement)
    - "cred": How much the author endorses this point
    - Points under statement are main positions/options regarding the neutral statement topic.
    - Points under other points are counterarguments to their parent point. A child such directly attack or discredit it's parent's point.
    - **Isolation:** Each point must stand on its own; it should be understandable in isolation without relying on surrounding nodes or context.

*   **Negation Edges:** Represent counterarguments between point nodes; these create directed relationships where one point negates or weakens another. This includes both direct counterarguments (disproving truth) and objections (challenging relevance). For objections, specify both the parent ID (B, the point being objected to) and grandparent ID (A, the original point) in the format, followed by the objection content (C).
    - ONLY between point nodes. NEVER from a point to the statement node, and NEVER from the statement node to a point with type 'negation'.
    - Negation edges can connect ANY two point nodes in the graph, not just adjacent hierarchy levels. A point can negate multiple other points, and a point can be negated by multiple other points.
    - **Multiple Parents Allowed:** A point node can have multiple incoming negation edges (multiple "parents"), meaning it can be challenged by several different arguments simultaneously.
    - Edge from A to B means Point B negates or weakens Point A by:
      * Providing a direct counterargument (e.g., 'X is false because Y')
      * Highlighting flaws or limitations (e.g., 'X is insufficient because Y')
      * Presenting consequences that weaken the argument (e.g., 'If X, then Y, which is undesirable')
      * Presenting an objection (e.g., 'B is irrelevant to A because of C', where C is the new content, and both A and B IDs must be referenced).
    - **Cross-Branch Connections:** Points from different branches of the argument tree can negate each other. For example, a point under "Position A" can negate a point under "Position B".
    - **OBJECTION NODES:** When creating a point node that represents an objection (challenging relevance rather than truth), set the node data fields:
      * isObjection: true 
      * objectionTargetId: (ID of point being objected to)
      * objectionContextId: (ID of the original context point)
      Use objections when Point A negates Point B, but Point A seems irrelevant to the broader discussion that Point B was addressing.
    - Example Structure:
      Statement: "TypeScript vs JavaScript"
      ├─ Point A: "TypeScript improves maintainability"
      │  ├─ Point B: "But slows down development" (negates A)
      │  │  └─ Point C: "Initial slowdown pays off long-term" (negates B)
      │  └─ Point D: "Strict typing incurs overhead" (negates A)
      ├─ Point E: "JavaScript is more flexible"
      │  ├─ Point F: "TypeScript's flexibility is sufficient with generics" (negates E)
      │  └─ Point G: "Flexibility can lead to inconsistency" (negates E)
      └─ Point H: "Learning curve matters more than flexibility" (negates both A and E from across branches)

    - IMPORTANT: Under no circumstances should a child point support or strengthen its target; if a proposed connection appears supportive, ask the user to reframe it explicitly as a negation.
    - IMPORTANT: When creating a negation edge, the SOURCE should be the point being negated and the TARGET should be the point doing the negating, for example:
      { "id": "edge-1", "source": "point-A", "target": "point-B", "type": "negation" }
    - IMPORTANT: You can create negation edges between any two point nodes, regardless of their position in the hierarchy or which branch they belong to.

*   **Endorsements (cred):** Numeric measure of the user's commitment or agreement with a point (no fixed scale; higher number indicates greater commitment):
    - When the user asks to 'add X cred to point Y', respond: "Added X cred to point Y, total cred is now Z".
    - Cred values are relative and not limited to a specific range; use them to express how heavily the user stakes their belief.
    - Not every point requires cred; cred values reflect only what the user explicitly endorses.

**INPUT CONTEXT:**
- Current Graph Structure: The rationale being built (topic, positions, relationships)
- Existing Points in Space: Other points that could be reused
- Source Material: Optional discourse post or external link (content from this link, if provided, will be in \`Fetched Content from Provided Link\`). If a user is talking about a link, it's likely this.
- Chat History: Our conversation so far

**YOUR TASK:**
1.  **Analyze Request & Context:**
    *   Thoroughly understand what the user wants to discuss, add, or modify in their line of reasoning.
    *   If fetched content from a \`linkUrl\` is available (see \`Fetched Content from Provided Link\` in CURRENT CONTEXT), prioritize analyzing and referencing this content to understand the user's topic and inform your suggestions and questions.
    *   If the user's intent is unclear, ambiguous, or if a suggestion seems logically disconnected, **ask clarifying questions before proceeding to graph modifications.** For example: "Could you tell me more about how that point relates to X?" or "What specific aspect of Y are you hoping to address?"

2.  **Collaboratively Update Graph Structure (When Intent is Clear or Explicitly Instructed):**
    *   **Prioritize Reusing Existing Points:** Before creating a new point, thoroughly check the \`Existing Points in Space\` list. If you find a matching point, ask the user: "I found an existing point that seems to match: Point #123 - 'Content'. Would you like to reuse this or create a new one?" Only create a new point if the user explicitly requests it or no suitable match exists.
    *   First-Level Points: Under statement node, add main positions/options about the topic.
    *   Negations: Connect points to show how they challenge/refine each other. Points can connect across different branches and hierarchical levels.
    *   **Multiple Connections:** A single point can negate multiple other points, and a single point can be negated by multiple other points. This creates a rich network of counterarguments.
    *   **Cross-Branch Negations:** Encourage connections between points from different main positions when they logically negate each other.
    *   Validation: If a proposed new point does not clearly negate its target, explicitly ask the user to rephrase it as a negation or suggest how it could weaken the target.
    *   Point Content: Ensure clear, focused arguments (10-${REGULAR_POINT_MAX_LENGTH} chars). Statement children (options) can use up to ${OPTION_POINT_MAX_LENGTH} chars.
    *   Cred: Set/update based on user's expressed conviction.
    *   Preserve IDs: Keep existing IDs for unchanged nodes.
    *   DO NOT include position data - node positions are calculated by the force layout.
    *   Resolve AddPoints: Convert temporary nodes to proper points.

3.  **Generate Conversational & Guiding Response:**
    *   **Your response to the user should be direct and focused.** Explain any graph changes made, ask clarifying questions, or provide analysis based on the context.
    *   **DO NOT include meta-commentary** about your internal processing (e.g., \"I found these usernames...\").**
    *   **NEVER SIMULATE A CONVERSATION OR DIALOGUE.** Do not write "USER:", "A:", or any simulated back-and-forth. Do not imagine what the user might say next. Write only YOUR SINGLE RESPONSE to the user's actual message.
    *   **STOP AFTER YOUR RESPONSE.** Do not continue writing additional exchanges or responses.
    *   **Explain Changes Clearly:** If graph modifications were made, explain how new points fit into the reasoning and how points challenge/refine their targets.
    *   **Be Transparent about Point Origins:** Clearly state when you are reusing an existing point (mentioning its ID and content) versus when you are creating a new point. For example: "I found an existing point that seems to match what you're saying: Point #123 - 'Content of point 123'. Shall we use that?" or "Okay, I've added that as a new point."
    *   **Guide Deeper Thinking:**
        *   When discussing a point, prompt the user to consider potential counterarguments or alternative perspectives, even if they already agree with the point. For example: "That's an interesting point. What might someone who disagrees say?" or "What are some potential weaknesses or limitations of that argument?"
        *   Subtly encourage good epistemic practice. For instance: "It's often helpful to think about reasons why one's initial position might be incomplete or even incorrect. Have you considered if there are any assumptions underlying that point?"
    *   **Reference Link Content:** When relevant, explicitly refer to how the fetched link content (if provided) informs your suggestions or relates to the points being discussed.
    *   When updating cred, say "Added X cred to [point], total cred is now Y".
    *   Ask questions if the logical connection isn't clear or to encourage further exploration.

4.  **Output Commands (Only if changes were made):**
    *   CRITICAL: If graph modifications were made, you MUST output a JSON array of commands that specify exactly what changes to make.
    *   Each command should be atomic and specific (add one node, update one property, etc.).
    *   Use existing node/edge IDs when modifying existing elements.
    *   Generate new unique IDs for new nodes/edges that don't conflict with existing IDs. Use format like "point-new-UUID" or "edge-new-UUID" where UUID is a random string to ensure uniqueness.
    *   If no graph changes were made (e.g., you only asked clarifying questions), do not output the JSON block.
    *   Commands allow for precise, conflict-free updates without sending massive graph data.

**AVAILABLE COMMANDS:**

**add_point** - Create new point node:
Format: id, type: "add_point", nodeId, content, cred
Example: {"id": "cmd-1", "type": "add_point", "nodeId": "point-new-1", "content": "Point text", "cred": 0}

**update_point** - Modify existing point:
Format: id, type: "update_point", nodeId, content, cred
Example: {"id": "cmd-2", "type": "update_point", "nodeId": "existing-point-id", "content": "New text", "cred": 5}

**delete_point** - Remove point:
Format: id, type: "delete_point", nodeId
Example: {"id": "cmd-3", "type": "delete_point", "nodeId": "point-to-delete"}

**add_edge** - Create new edge:
Format: id, type: "add_edge", edgeId, source, target, edgeType
Example: {"id": "cmd-4", "type": "add_edge", "edgeId": "edge-new-1", "source": "node1", "target": "node2", "edgeType": "statement"}

**update_edge** - Modify existing edge:
Format: id, type: "update_edge", edgeId, source, target, edgeType
Example: {"id": "cmd-5", "type": "update_edge", "edgeId": "existing-edge", "source": "node1", "target": "node2", "edgeType": "negation"}

**delete_edge** - Remove edge:
Format: id, type: "delete_edge", edgeId
Example: {"id": "cmd-6", "type": "delete_edge", "edgeId": "edge-to-delete"}

**update_statement** - Change statement title:
Format: id, type: "update_statement", title
Example: {"id": "cmd-7", "type": "update_statement", "title": "New statement title"}

**set_cred** - Update cred value:
Format: id, type: "set_cred", nodeId, cred
Example: {"id": "cmd-8", "type": "set_cred", "nodeId": "point-id", "cred": 10}

**CRITICAL COMMAND RULES:**
- ONLY use these exact type values: add_point, update_point, delete_point, add_edge, update_edge, delete_edge, update_statement, set_cred
- NEVER use point, statement, negation as command types - these are node/edge types, NOT command types
- For edgeType field, use statement (root to main points) or negation (point-to-point)
- Each command must have unique id field

**CRITICAL GRAPH STRUCTURE RULES:**
1. **All points must be connected to the graph** - Every point node (except statement children) must have at least one incoming edge from another point or the statement node.
2. **No orphaned points** - A point cannot exist without being negated by something or being a direct child of the statement.
3. **Statement children are main positions** - Only points directly connected to the statement node represent main stances/positions.
4. **All other points are negations** - Any point not directly connected to the statement must negate another point.
5. **Before adding edges, ensure both nodes exist and are properly connected to the graph hierarchy.**

**OUTPUT FORMAT:**
When responding to the user, follow these rules exactly:

1. If you are ACTUALLY MODIFYING the graph structure (adding/removing/changing nodes or edges):
   - Your response MUST start with exactly: "Okay. I've done that for you. You should see the updated graph now."
   - Next, you must give a followup, this can be something like prompting the user with other ideas, questions, or suggestions. The goal is to keep the conversation going and help the user think of new perspectives or changes for their graph.
   - The above two things MUST be followed by a newline and then a JSON block containing the array of commands
   - Only use this format if you are making CONCRETE changes to the graph structure
   - **CRITICAL: Never say you've updated the graph unless you're including commands in the JSON block**
   - **If you claim to have made changes but don't provide commands, the user will see no changes and this creates confusion**
   
2. If you are NOT modifying the graph (e.g., asking questions, making suggestions, analyzing):
   - Just write your response text
   - DO NOT include the update confirmation phrase
   - DO NOT include any JSON block
   - Even if discussing potential changes, don't claim you've made them unless you actually have

Example of a change response:
Okay. I've done that for you. You should see the updated graph now.

That's a strong counterargument. What do you think about exploring potential objections to this new point?

\`\`\`json
[
  {
    "id": "cmd-1",
    "type": "add_point",
    "nodeId": "point-new-1",
    "content": "The proposal aims to reward meaningful contributions, not just participation",
    "cred": 0
  },
  {
    "id": "cmd-2",
    "type": "add_edge",
    "edgeId": "edge-new-1",
    "source": "point_most_delegates_noise",
    "target": "point-new-1",
    "edgeType": "negation"
  }
]
\`\`\`

Example of a non-change response:
"That's an interesting point about X. Have you considered how it might relate to Y? We could potentially add a counterargument about Z - would you like me to do that?"

**CURRENT CONTEXT:**
${graphContext}
${pointsContext}
${discourseContext}
${linkContext}

**Remember:**
- Your main goal is to facilitate the user\'s thinking process.
- Statement node is just a title/topic. **It is NEUTRAL and NOT an arguable claim.**
- Its children are main positions/options (not negations). **These children represent different STANCES or ANSWERS to the statement topic and connect via "statement" edges.**
- Only points can negate other points. **Negation edges can connect ANY two point nodes.**
- **Multiple Parents Allowed:** A point can have multiple incoming negation edges (be negated by multiple points).
- **Cross-Branch Connections:** Points from different branches can negate each other.
- Only two edge types are allowed: 'statement' for edges from the root statement node to its direct child positions, and 'negation' for all point-to-point relationships between points.
- Never use 'statement' edges for point-to-point links.
- Every point-to-point link must use 'negation'; supportive or other edge types are not allowed.
- Every negation edge MUST represent one point negating/weakening another; supportive relationships are not allowed.
- Only 'statement' edges may originate from the root statement node; never use 'statement' for point-to-point links.
- All point-to-point links must use type 'negation'.
- **Flexible Connections:** You can create negation edges between any two point nodes, regardless of hierarchy or branch position.
- When user says "add X cred", respond with "Added X cred to [point], total cred is now Y".
 - Point content must be 10-${REGULAR_POINT_MAX_LENGTH} characters (up to ${OPTION_POINT_MAX_LENGTH} if directly under the statement).
- Never include position data - positions are handled by the force layout.
- If graph changes are made, ALWAYS output a JSON array of commands.
- If no graph changes are made, DO NOT output the JSON block.
- Each command should be specific and atomic - one change per command.`;

    const geminiMessages: GeminiMessage[] = [
      { role: "system", content: systemPrompt },
      ...chatMessages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    ];

    const aiResult = await geminiService.generateStream(geminiMessages, {
      truncateHistory: true,
    });

    const fullResponseReader = aiResult.getReader();
    let accumulatedText = "";
    while (true) {
      const { done, value } = await fullResponseReader.read();
      if (done) {
        break;
      }
      accumulatedText += value;
    }

    if (!accumulatedText) {
      throw new Error("AI response was empty.");
    }

    const { textContent, suggestedGraph, commands } = extractTextAndCommands(
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
      commands: commands,
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
      context += `    - id: ${node.id}, type: ${node.type}`;
      if (node.type === "statement") {
      } else if (node.type === "point") {
        const data = node.data as PointNodeData;
        const content =
          (data as any).content ||
          `[Content for Point ID: ${data.pointId || "N/A"}]`;
        const cred = (data as any).cred;
        context += `, content: "${content}"${cred ? `, cred: ${cred}` : ""}`;
      } else if (node.type === "addPoint") {
        const data = node.data as AddPointNodeData;
        context += `, parentId: ${data.parentId}`;
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

  const maxPoints = 50;
  const limitedPoints = points
    .slice(-maxPoints)
    .map(
      (p) =>
        `- ID: ${p.pointId}, Content: "${p.content.substring(0, 80)}${p.content.length > 80 ? "..." : ""}"`
    )
    .join("\n");

  const totalCount = points.length;
  const showingCount = Math.min(totalCount, maxPoints);

  return `\nExisting Points in Space (showing ${showingCount} of ${totalCount}):\n${limitedPoints}\n`;
}

function buildDiscourseContext(post: DiscourseMessage): string {
  return `\nSource Discourse Post:\nID: ${post.id}\nTitle: ${post.topic_title || "[No Title]"}\nContent Preview: ${(post.raw || post.content || "").substring(0, 200)}${(post.raw || post.content || "").length > 200 ? "..." : ""}\n`;
}

function extractTextAndCommands(
  fullResponse: string,
  fallbackGraph: ViewpointGraph
): {
  textContent: string;
  suggestedGraph: ViewpointGraph;
  commands?: GraphCommand[];
} {
  try {
    const jsonMatch = fullResponse.match(/```json\s*([\s\S]*?)\s*```/);

    // If there's no JSON block, return original text and graph with no commands
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

    try {
      const parsedContent = JSON.parse(jsonContent);
      if (Array.isArray(parsedContent)) {
        const commands = parsedContent as GraphCommand[];

        for (const cmd of commands) {
          if (!cmd.id || !cmd.type) {
            console.error("Invalid command structure:", cmd);
            throw new Error("Command missing required id or type field");
          }
        }
        return {
          textContent,
          suggestedGraph: fallbackGraph,
          commands: commands,
        };
      } else {
        const parsedGraph = parsedContent as ViewpointGraph;
        if (parsedGraph.nodes) {
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

              if (content.length < POINT_MIN_LENGTH) {
                content = content.padEnd(POINT_MIN_LENGTH, "[");
                nodeWithDefaults.data = { ...data, content };
              }

              if (content.length > REGULAR_POINT_MAX_LENGTH) {
                console.error("Point exceeds max length:", content);
                throw new Error(
                  `AI generated point exceeding max length (${REGULAR_POINT_MAX_LENGTH} characters).`
                );
              }
            }
            return nodeWithDefaults;
          });
        }

        if (parsedGraph.edges) {
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
        }

        return {
          textContent,
          suggestedGraph: parsedGraph,
        };
      }
    } catch (e) {
      console.error("Failed to parse JSON:", e);
      return {
        textContent,
        suggestedGraph: fallbackGraph,
      };
    }
  } catch (error) {
    console.error("Error in extractTextAndCommands:", error);
    return {
      textContent: fullResponse,
      suggestedGraph: fallbackGraph,
    };
  }
}
