"use server";

import { ViewpointGraph } from "@/atoms/viewpointAtoms";
import { pointsTable } from "@/db/tables/pointsTable";
import { db } from "@/services/db";
import { google } from "@ai-sdk/google";
import { generateObject } from "ai";
import { inArray } from "drizzle-orm";
import { z } from "zod";
import { withRetry } from "@/lib/withRetry";

export interface GenerateRationaleSummaryArgs {
  title: string;
  description: string;
  graph: ViewpointGraph;
}

interface WithPointId {
  pointId: number;
}

/**
 * Generates an AI summary for a copied rationale based on its points
 */
export async function generateRationaleSummary({
  title,
  description,
  graph,
}: GenerateRationaleSummaryArgs): Promise<string> {
  try {
    // Extract all point IDs from the graph - only include nodes of type 'point' with a valid pointId
    const pointIds = graph.nodes
      .filter((node) => {
        if (node.type !== "point" || !node.data) return false;
        return (
          typeof node.data === "object" &&
          "pointId" in node.data &&
          typeof node.data.pointId === "number"
        );
      })
      .map((node) => (node.data as WithPointId).pointId);

    if (pointIds.length === 0) {
      return `Copy of the rationale "${title.trim()}". This is a copy of an existing rationale.`;
    }

    // Fetch the content of all points
    const points = await db
      .select({
        id: pointsTable.id,
        content: pointsTable.content,
      })
      .from(pointsTable)
      .where(inArray(pointsTable.id, pointIds))
      .execute();

    if (points.length === 0) {
      return `Copy of the rationale "${title.trim()}". This is a copy of an existing rationale.`;
    }

    const prompt = `You are helping summarize a rationale (an interconnected set of arguments or points) for a debate platform.

TITLE OF THE RATIONALE:
${title}

ORIGINAL DESCRIPTION:
${description || "No original description provided."}

POINTS INCLUDED IN THE RATIONALE:
${points.map((p) => `- ${p.content}`).join("\n")}

Create a clear, concise summary of what this rationale seems to be arguing or explaining, based on its title, description, and included points.
The summary should:
- Be 2-4 sentences
- Capture the main thesis and key arguments
- Use neutral, objective language
- Avoid editorializing or judging the merits of the argument
- Note where the rationale is a copy of another user's work
- Conclude with "This is a copy of an existing rationale."
- Match the language of the input title, description, and points.

Write the summary in clear, straightforward language that would be appropriate for a general audience.`;

    const { object: result } = await withRetry(async () => {
      return generateObject({
        model: google("gemini-2.0-flash"),
        schema: z.object({
          summary: z.string().describe("A concise summary of the rationale"),
        }),
        prompt,
      });
    });

    return result.summary;
  } catch (error) {
    console.error("Error generating rationale summary:", error);
    return `Copy of the rationale "${title.trim()}". This is a copy of an existing rationale.`;
  }
}
