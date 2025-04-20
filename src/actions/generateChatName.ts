"use server";

import { google } from "@ai-sdk/google";
import { streamText } from "ai";
import { z } from "zod";
import { withRetry } from "@/lib/withRetry";

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

TITLE:`;

    const { textStream } = await withRetry(async () => {
      try {
        const response = await streamText({
          model: google("gemini-2.0-flash"),
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
        console.error("[generateChatName Action Error]", error);
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
    console.error("[generateChatName Top Level Error]", error);
    throw error;
  }
};
