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
  const contextMessages = messages.filter((m) => m.role === "system");
  const chatMessages = messages.filter((m) => m.role !== "system");

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
${chatMessages.map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n")}

ASSISTANT:`;

  const { elementStream } = await withRetry(async () => {
    return streamObject({
      model: google("gemini-2.0-flash"),
      output: "array",
      schema: z.string().describe("Assistant's response"),
      prompt,
    });
  });

  return elementStream;
};
