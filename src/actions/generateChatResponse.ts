"use server";

import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
import { z } from "zod";
import { withRetry } from "@/lib/withRetry";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export interface EndorsedPoint {
  pointId: number;
  content: string;
  cred: number;
}

interface Rationale {
  id: string;
  title: string;
  description: string;
  graph: {
    nodes: Array<{
      id: string;
      type: string;
      data: {
        content?: string;
        statement?: string;
        pointId?: number;
      };
    }>;
    edges: Array<{
      id: string;
      type: string;
      source: string;
      target: string;
    }>;
  };
  statistics: {
    views: number;
    copies: number;
    totalCred: number;
    averageFavor: number;
  };
}

export const generateChatResponse = async (
  messages: Message[],
  endorsedPoints?: EndorsedPoint[],
  rationales?: Rationale[]
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

    const prompt = `You are an AI assistant in the Negation Game platform, focused on helping users construct and articulate their arguments through viewpoints (also called rationales). Your primary purpose is to help users:

1. Write well-structured rationale descriptions that:
   - Present clear arguments and reasoning
   - Support claims with evidence
   - Address potential counterarguments
   - Follow a logical structure
   - Maintain clear and engaging writing style

2. Understand and construct viewpoint graphs which have a specific structure:
   - ONE statement/question node at the top (type: "statement")
   - Regular point nodes below that negate either:
     a) The main statement directly
     b) Other negating points
   - All relationships are negations - there are no supporting relationships
   - The graph structure is built through negation edges only
   - Must use EXISTING points from the same space (cannot create new points)
   - Must form a Directed Acyclic Graph (DAG) - no cycles allowed
   - Title can be different from the statement node's content

Example Viewpoint Graph:
{
  "nodes": [
    {
      "id": "statement",
      "type": "statement", 
      "data": { 
        "statement": "Should marijuana be legal?"
      },
      "position": { "x": 100, "y": 100 }
    },
    {
      "id": "abc123", // Random unique ID
      "type": "point",
      "data": {
        "pointId": 123, // Must be an existing point ID from the points table
        "parentId": "statement"
      },
      "position": { "x": 100, "y": 200 }
    },
    {
      "id": "def456", // Random unique ID
      "type": "point", 
      "data": {
        "pointId": 124, // Must be an existing point ID from the points table
        "parentId": "abc123"
      },
      "position": { "x": 100, "y": 300 }
    }
  ],
  "edges": [
    {
      "id": "edge1", // Random unique ID
      "type": "negation",
      "source": "abc123", // ID of the negating point node
      "target": "statement" // ID of the node being negated (statement or another point)
    },
    {
      "id": "edge2",
      "type": "negation", 
      "source": "def456",
      "target": "abc123"
    }
  ]
}

CRITICAL RULES for Viewpoint Graphs:
1. Node IDs must be unique random strings (except for the "statement" node)
2. Every point node must reference an existing point ID from the database
3. Edges must connect existing nodes using their node IDs (not point IDs)
4. The graph must be acyclic (no circular negation chains)
5. All relationships are negations - there are no supporting relationships
6. Points must come from the same space as the rationale
7. Each node must have a position (x, y coordinates)

When helping construct viewpoints:
1. Start with a clear statement node with ID "statement"
2. Help identify EXISTING points that directly negate the main statement
3. For each of those points, find EXISTING points that negate them
4. Generate unique random IDs for each point node
5. Create negation edges using the node IDs
6. Ensure no cycles are created
7. Include x/y positions for visual layout

IMPORTANT FORMATTING INSTRUCTIONS:
1. Use proper markdown syntax for all formatting
2. Use double newlines between paragraphs
3. Use proper list formatting with newlines:
   - Each list item on a new line
   - Proper indentation for nested lists
4. Use proper heading syntax:
   - # for main headings
   - ## for subheadings
   - ### for sub-subheadings
5. Format emphasis properly:
   - **bold** for emphasis
   - *italic* for secondary emphasis
6. Ensure proper spacing:
   - Empty line before and after lists
   - Empty line before and after headings
   - Empty line before and after code blocks
7. Be very generous with the use of newlines. It helps our markdown parser to render the output correctly. Every line should have a newline unless it's explicitly part the previous bit or in formatting that doesn't need it.
${
  contextMessages.length > 0
    ? `Here are the user's forum posts that provide context about their writing style and previous arguments:

${contextMessages.map((m) => m.content).join("\n\n")}

Use these posts to understand their perspective and help them develop their rationales more effectively.`
    : ""
}

${
  endorsedPoints && endorsedPoints.length > 0
    ? `The user has endorsed the following points in the Negation Game platform:

${endorsedPoints.map((p) => '- "' + p.content + '" (endorsed with ' + p.cred + " cred)").join("\n")}

These are the ONLY points you can use to construct the viewpoint graph, along with other points from the same space.`
    : ""
}

${
  rationales && rationales.length > 0
    ? `The user has created the following rationales (viewpoint structures):

${rationales
  .map((r) => {
    const statementNode = r.graph.nodes.find(
      (n) => n.type === "statement" && !n.data.pointId
    );
    const statement = statementNode?.data.statement || r.title;
    const pointNodes = r.graph.nodes.filter(
      (n) => n.type === "point" && n.data.content
    );
    const relationships = r.graph.edges
      .map((edge) => {
        const sourceNode = r.graph.nodes.find((n) => n.id === edge.source);
        const targetNode = r.graph.nodes.find((n) => n.id === edge.target);
        if (!sourceNode || !targetNode) return null;
        const sourceContent =
          sourceNode.data.content || sourceNode.data.statement;
        const targetContent =
          targetNode.data.content || targetNode.data.statement;
        if (!sourceContent || !targetContent) return null;
        return '- "' + sourceContent + '" negates "' + targetContent + '"';
      })
      .filter(Boolean);

    return (
      'Rationale: "' +
      statement +
      '"\n' +
      "Description: " +
      r.description +
      "\n" +
      "Statistics: " +
      r.statistics.views +
      " views, " +
      r.statistics.copies +
      " copies, " +
      r.statistics.totalCred +
      " total cred, " +
      r.statistics.averageFavor +
      " average favor\n\n" +
      "Points that form the negation chain:\n" +
      pointNodes.map((n) => '- "' + n.data.content + '"').join("\n") +
      "\n\n" +
      "Negation Relationships:\n" +
      relationships.join("\n")
    );
  })
  .join("\n\n")}

Use these rationales to understand how viewpoint graphs are structured through negation chains.`
    : ""
}

CHAT HISTORY:
${chatMessages.map((m) => m.role.toUpperCase() + ":\n" + m.content + "\n").join("\n")}

Remember: 
1. A rationale consists of a statement/question and a chain of negating points
2. Every relationship is a negation - points can only negate other points or the main statement
3. You can ONLY use existing points from the same space
4. The graph must be acyclic (no cycles)
5. The description should explain the argument flow through the negations

A:`;

    const { elementStream } = await withRetry(async () => {
      try {
        const response = await streamObject({
          model: google("gemini-2.0-flash"),
          output: "array",
          schema: z.string().describe("Assistant's response"),
          prompt,
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
        // Re-throw other errors to be handled by withRetry
        throw error;
      }
    });

    if (!elementStream) {
      throw new Error("Failed to initialize response stream");
    }

    return elementStream;
  } catch (error) {
    console.error("Error in generateChatResponse:", error);

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
