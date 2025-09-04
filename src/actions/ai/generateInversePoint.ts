"use server";

import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { z } from "zod";
import { withRetry } from "@/lib/utils/withRetry";

const InverseSchema = z.object({
  inverse: z
    .string()
    .describe(
      "A clear, concise counterpoint that directly opposes the original statement"
    ),
});

export async function generateInversePoint(content: string): Promise<string> {
  if (!content || typeof content !== "string") {
    return `Not ${content}`;
  }

  const prompt = `You are a helpful assistant that generates precise counterpoints for debate arguments.

ORIGINAL STATEMENT:
${content}

Generate a single, clear counterpoint that directly opposes this statement. The counterpoint should:
- Be concise
- Present an opposing perspective 
- Be mutually exclusive to the original statement
- Be roughly the same length or shorter than the original

Examples:
The earth is flat -> The earth is not flat
The earth is round -> The earth is not round
We should pass the Scroll governance proposal -> We should not pass the Scroll governance proposal
Cats are better pets than dogs -> Dogs are better pets than cats
Climate change is caused by humans -> Climate change is not caused by humans
We should increase taxes -> We should not increase taxes
Remote work is more productive than office work -> Office work is more productive than remote work
Artificial intelligence will benefit society -> Artificial intelligence will not benefit society
School uniforms should be mandatory -> School uniforms should not be mandatory
Technology makes life easier -> Technology does not make life easier
`;

  try {
    const result = await withRetry(
      async () => {
        const { object } = await generateObject({
          model: openai("gpt-4o-mini"),
          schema: InverseSchema,
          prompt,
          maxTokens: 200,
        });
        return object;
      },
      { maxRetries: 3 }
    );

    return result.inverse;
  } catch (error) {
    console.error("Failed to generate inverse:", error);
    return `Not ${content}`;
  }
}
