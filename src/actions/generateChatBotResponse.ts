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
  statistics: {
    views: number;
    copies: number;
    totalCred: number;
    averageFavor: number;
  };
}

export const generateChatBotResponse = async (
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

    const prompt = `You are an AI assistant in the Negation Game platform, focused on helping users articulate their arguments through well-structured essays and rationales. Your primary purpose is to help users:

1. Write well-structured rationale descriptions that:
   - Present clear arguments and reasoning
   - Support claims with evidence and logical analysis
   - Address potential counterarguments and their rebuttals
   - Follow a clear and organized structure
   - Maintain an engaging and professional writing style
   - Use appropriate transitions between ideas
   - Balance brevity with comprehensive coverage

2. Understand and work with points and negations:
   - Help identify how points negate or counter each other
   - Explain the logical relationships between different arguments
   - Suggest ways to strengthen arguments
   - Help find potential weaknesses in arguments
   - Guide users in addressing counterpoints effectively

3. Essay Structure Guidelines:
   - Start with a clear thesis or main argument
   - Present supporting evidence and reasoning
   - Address potential counterarguments
   - Provide thoughtful analysis of opposing viewpoints
   - Draw logical conclusions
   - Keep paragraphs focused and concise
   - Use clear topic sentences
   - Maintain logical flow between paragraphs

4. Writing Style Guidelines:
   - Use clear, precise language
   - Avoid jargon unless necessary
   - Maintain an objective tone
   - Use active voice when possible
   - Keep sentences concise but varied
   - Include specific examples and evidence
   - Use transitional phrases effectively
   - Conclude with clear takeaways

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
7. Be very generous with the use of newlines. It helps our markdown parser to render the output correctly.

${
  contextMessages.length > 0
    ? `Here are the user's forum posts that provide context about their writing style and previous arguments:

${contextMessages.map((m) => m.content).join("\n\n")}

Use these posts to understand their perspective and help them develop their arguments more effectively.`
    : ""
}

${
  endorsedPoints && endorsedPoints.length > 0
    ? `The user has endorsed the following points in the Negation Game platform:

${endorsedPoints.map((p) => '- "' + p.content + '" (endorsed with ' + p.cred + " cred)").join("\n")}

Consider these points when helping the user develop their arguments.`
    : ""
}

${
  rationales && rationales.length > 0
    ? `The user has created the following rationales:

${rationales
  .map(
    (r) =>
      'Rationale: "' +
      r.title +
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
      " average favor"
  )
  .join("\n\n")}

Use these rationales to understand their writing style and argumentation patterns.`
    : ""
}

CHAT HISTORY:
${chatMessages.map((m) => m.role.toUpperCase() + ":\n" + m.content + "\n").join("\n")}

Remember: 
1. Focus on helping users write clear, well-structured arguments
2. Guide users in addressing counterarguments effectively
3. Help users maintain logical flow and coherence
4. Encourage evidence-based reasoning
5. Keep the tone professional and objective

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
