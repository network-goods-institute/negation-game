"use server";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";

const POINT_PROMPT = `You are a helpful assistant that improves the phrasing of points in a debate/discussion platform.
A good point:
- Is a declarative statement (e.g., "Climate change will cause over $100B in economic damages by 2030." or "Pineapple is good on pizza.")
- Makes a single, standalone claim
- Is a complete sentence (starts with a capital letter, ends with a period)
- Is grammatically correct
- Is concise
- Is easily understandable

If the user's input is insufficient or unclear, generate a complete point that captures their likely intent.
Provide 2-3 improved versions of the point that follow these guidelines. Each suggestion should be on a new line.
DO NOT include any explanations or additional text—ONLY output the improved versions.`;

const NEGATION_PROMPT = (
  parentPoint: string,
) => `You are a helpful assistant that improves the phrasing of counterpoints in a debate/discussion platform.

The user is trying to NEGATE this point: "${parentPoint}"

Your job is to improve the user's counterpoint while ensuring it remains a strong negation of the parent point above.

A good counterpoint:
- Is a declarative statement
- Makes a single, standalone claim
- Is a complete sentence (starts with a capital letter, ends with a period)
- Is grammatically correct
- Is concise
- Is easily understandable
- MUST MAINTAIN THE SAME POSITION as the user's input
- Must effectively argue AGAINST the parent point shown above
- Should provide evidence or reasoning that shows why the parent point is wrong

If the user's input is unclear, improve it while keeping their intended position AGAINST the parent point.
Provide 2-3 improved versions that follow these guidelines. Each suggestion should be on a new line.
DO NOT include any explanations or additional text—ONLY output the improved versions.`;

export const improvePoint = async (content: string): Promise<string | null> => {
  if (!content?.trim()) {
    return null;
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: POINT_PROMPT,
      },
      {
        role: "user",
        content,
      },
    ],
    temperature: 0.7,
    maxTokens: 200,
  });

  return text || null;
};

export const improveNegation = async (
  content: string,
  parentPoint: string,
): Promise<string | null> => {
  if (!content?.trim()) {
    return null;
  }

  const { text } = await generateText({
    model: openai("gpt-4o-mini"),
    messages: [
      {
        role: "system",
        content: NEGATION_PROMPT(parentPoint),
      },
      {
        role: "user",
        content,
      },
    ],
    temperature: 0.7,
    maxTokens: 200,
  });

  return text || null;
};
