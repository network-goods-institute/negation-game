"use server";

import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { withRetry } from "@/lib/utils/withRetry";import { logger } from "@/lib/logger";

interface Message {
  role: "user" | "assistant" | "system";
  content: string;
}

export const generateChatName = async (messages: Message[]) => {
  try {
    if (!messages || messages.length === 0) {
      throw new Error("No messages provided for chat name generation");
    }

    const prompt = `Generate a concise title (max 30 chars) for this chat based on the initial messages:

${messages
  .slice(0, 3)
  .map((m) => `${m.role.toUpperCase()}: ${m.content.substring(0, 100)}...`)
  .join("\n\n")}

Rules:
- Title must be 30 characters or less
- No quotes or formatting
- Just the title text
- Be descriptive and clear
- Match the language of the input messages

TITLE:`;

    const { textStream } = await withRetry(async () => {
      try {
        const response = await streamText({
          model: openai("gpt-4o-mini"),
          prompt,
          maxTokens: 20,
        });

        if (!response) {
          throw new Error("Failed to get response from AI model");
        }

        return response;
      } catch (error) {
        if (error instanceof Error && error.message.includes("rate limit")) {
          throw new Error(
            "AI service is currently busy. Please try again in a moment."
          );
        }
        logger.error("[generateChatName Action Error]", error);
        throw new Error(
          `AI title generation failed: ${error instanceof Error ? error.message : String(error)}`
        );
      }
    });

    if (!textStream) {
      throw new Error("Failed to initialize response text stream");
    }

    return textStream;
  } catch (error) {
    throw error;
  }
};
