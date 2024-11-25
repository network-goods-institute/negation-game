"use server";

import { openai } from '@ai-sdk/openai';
import { generateText } from 'ai';

export const improvePoint = async (content: string): Promise<string | null> => {
  if (!content?.trim()) {
    return null;
  }

  const { text } = await generateText({
    model: openai('gpt-4o-mini'),
    messages: [
      {
        role: 'system',
        content: `You are a helpful assistant that improves the phrasing of points in a debate/discussion platform.
A good point:
- Is a declarative statement (e.g., "Climate change will cause over $100B in economic damages by 2030." or "Pineapple is good on pizza.")
- Makes a single, standalone claim
- Is a complete sentence (starts with a capital letter, ends with a period)
- Is grammatically correct
- Is concise
- Is easily understandable

Provide 2-3 improved versions of the user's point that follow these guidelines. Each suggestion should be on a new line.
DO NOT include any explanations or additional text—ONLY output the improved versions.`
      },
      {
        role: 'user',
        content
      }
    ],
    temperature: 0.7,
    maxTokens: 200,
  });

  return text || null;
};
