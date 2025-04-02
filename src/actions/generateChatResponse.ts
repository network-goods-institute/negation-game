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

export const generateChatResponse = async (
  messages: Message[],
  endorsedPoints?: EndorsedPoint[]
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

    const prompt = `You are an AI assistant in the Negation Game platform, focused on helping users write well-structured essays. Your primary goal is to help users articulate their arguments effectively.

A good essay should:
- Present a clear thesis and main arguments
- Support claims with evidence and reasoning
- Address potential counterarguments
- Follow a logical structure
- Maintain clear and engaging writing style

${
  contextMessages.length > 0
    ? `
Here are some relevant forum posts from the user that provide context about their writing style and previous arguments:

${contextMessages.map((m) => m.content).join("\n\n")}

Use these posts to understand their perspective and help them develop their essay more effectively.
`
    : ""
}

${
  endorsedPoints && endorsedPoints.length > 0
    ? `
The user has endorsed the following points in the Negation Game platform:

${endorsedPoints.map((p) => `- "${p.content}" (endorsed with ${p.cred} cred)`).join("\n")}

Use these endorsed points to understand their perspective and the arguments they value.
`
    : ""
}

CHAT HISTORY:
${chatMessages.map((m) => `${m.role.toUpperCase()}:\n${m.content}\n`).join("\n")}

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
