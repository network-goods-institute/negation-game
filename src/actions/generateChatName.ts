"use server";

import { google } from "@ai-sdk/google";
import { streamObject } from "ai";
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

    const prompt = `Generate a concise title (max 30 chars) for this chat:

${messages.map((m) => m.role.toUpperCase() + ": " + m.content).join("\n\n")}

Rules:
- Title must be 30 characters or less
- No quotes or formatting
- Just the title text
- Be descriptive and clear

A:`;

    const { elementStream } = await withRetry(async () => {
      try {
        const response = await streamObject({
          model: google("gemini-2.0-flash"),
          output: "array",
          schema: z.string().describe("Chat title"),
          prompt,
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
        throw error;
      }
    });

    if (!elementStream) {
      throw new Error("Failed to initialize response stream");
    }

    return elementStream;
  } catch (error) {
    throw error;
  }
};
