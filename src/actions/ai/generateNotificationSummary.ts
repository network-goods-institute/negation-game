"use server";

import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { withRetry } from "@/lib/utils/withRetry";
import { db } from "@/services/db";
import { pointsTable, viewpointsTable, usersTable } from "@/db/schema";
import { eq } from "drizzle-orm";

interface NotificationData {
  type: string;
  title: string;
  content: string;
  metadata?: any;
}

interface EnhancedContext {
  sourceUser?: { username: string };
  targetPoint?: { content: string; id: number };
  counterpointContent?: string;
  rationaleTitle?: string;
  rationaleDescription?: string;
  credAmount?: number;
}

export const generateNotificationSummary = async (
  notification: NotificationData
): Promise<string | null> => {
  try {
    // Fetch additional context based on notification type and metadata
    const context = await fetchNotificationContext(notification);

    const prompt = `Generate a brief, helpful AI summary for this notification:

Type: ${notification.type}
Title: ${notification.title}
Content: ${notification.content}

ENHANCED CONTEXT:
${context.sourceUser ? `Source User: ${context.sourceUser.username}` : ""}
${context.targetPoint ? `Target Point: "${context.targetPoint.content}"` : ""}
${context.counterpointContent ? `Counterpoint: "${context.counterpointContent}"` : ""}
${context.rationaleTitle ? `Rationale: "${context.rationaleTitle}"` : ""}
${context.rationaleDescription ? `Rationale Description: ${context.rationaleDescription.substring(0, 200)}...` : ""}
${context.credAmount ? `Cred Amount: ${context.credAmount}` : ""}

Create a 1-2 sentence summary that:
- Provides additional context or insight about the specific action
- Explains the significance within the Negation Game system
- Helps the user understand what happened and why it matters
- Is concise and actionable
- Uses friendly, conversational tone
- References specific content when relevant

NEGATION GAME CONTEXT:
- Points are individual arguments or claims
- Negations are counterarguments that challenge points
- Endorsements show support through cred (credibility points)
- Rationales are structured collections of connected arguments
- Restakes are commitments to change one's mind if a negation proves true
- Slashes are admissions that a negation changed someone's mind
- Doubts are bets against restakers following through

Example summaries based on type:
- Endorsement: "This endorsement shows growing support for your argument - the ${context.credAmount || "X"} cred investment demonstrates serious conviction."
- Negation: "This counterpoint directly challenges your main premise - consider the evidence and decide whether to respond or potentially self-slash if you've restaked."
- Rationale mention: "Your point is being used as evidence in a broader argument structure, increasing its visibility and impact."
- Restake: "Someone is putting their credibility on the line, committing to change their mind about your point if the negation proves convincing."

Summary:`;

    const { text } = await withRetry(async () => {
      return generateText({
        model: openai("gpt-4o-mini"),
        prompt,
        maxTokens: 120,
        temperature: 0.7,
      });
    });

    return text?.trim() || null;
  } catch (error) {
    console.error("Failed to generate notification summary:", error);
    return null;
  }
};

async function fetchNotificationContext(
  notification: NotificationData
): Promise<EnhancedContext> {
  const context: EnhancedContext = {};

  try {
    const metadata = notification.metadata || {};

    // Use passed data first, only fetch if missing

    // Fetch source user info if available and not already passed
    if (metadata.sourceUserId && !metadata.sourceUsername) {
      const sourceUser = await db
        .select({ username: usersTable.username })
        .from(usersTable)
        .where(eq(usersTable.id, metadata.sourceUserId))
        .limit(1);

      if (sourceUser[0]) {
        context.sourceUser = sourceUser[0];
      }
    } else if (metadata.sourceUsername) {
      context.sourceUser = { username: metadata.sourceUsername };
    }

    // Use point content from metadata if available, otherwise fetch
    if (metadata.pointContent) {
      context.targetPoint = {
        content: metadata.pointContent,
        id: metadata.pointId,
      };
    } else if (metadata.pointId) {
      const point = await db
        .select({ content: pointsTable.content, id: pointsTable.id })
        .from(pointsTable)
        .where(eq(pointsTable.id, metadata.pointId))
        .limit(1);

      if (point[0]) {
        context.targetPoint = point[0];
      }
    }

    // Use counterpoint content from metadata if available
    if (metadata.counterpointContent) {
      context.counterpointContent = metadata.counterpointContent;
    } else if (notification.type === "negation" && metadata.counterpointId) {
      const counterpoint = await db
        .select({ content: pointsTable.content })
        .from(pointsTable)
        .where(eq(pointsTable.id, metadata.counterpointId))
        .limit(1);

      if (counterpoint[0]) {
        context.counterpointContent = counterpoint[0].content;
      }
    }

    // Use negated point content from metadata if available
    if (metadata.negatedPointContent) {
      context.targetPoint = {
        content: metadata.negatedPointContent,
        id: metadata.negatedPointId,
      };
    } else if (
      (notification.type === "restake" ||
        notification.type === "doubt" ||
        notification.type === "slash") &&
      metadata.negatedPointId
    ) {
      const negatedPoint = await db
        .select({ content: pointsTable.content })
        .from(pointsTable)
        .where(eq(pointsTable.id, metadata.negatedPointId))
        .limit(1);

      if (negatedPoint[0]) {
        context.targetPoint = {
          content: negatedPoint[0].content,
          id: metadata.negatedPointId,
        };
      }
    }

    // Use rationale data from metadata if available
    if (metadata.rationaleTitle) {
      context.rationaleTitle = metadata.rationaleTitle;
      context.rationaleDescription = metadata.rationaleDescription;
    } else if (
      notification.type === "rationale_mention" &&
      metadata.rationaleId
    ) {
      const rationale = await db
        .select({
          title: viewpointsTable.title,
          description: viewpointsTable.description,
        })
        .from(viewpointsTable)
        .where(eq(viewpointsTable.id, metadata.rationaleId))
        .limit(1);

      if (rationale[0]) {
        context.rationaleTitle = rationale[0].title;
        context.rationaleDescription = rationale[0].description;
      }
    }

    // Add cred amount if available (works for endorsements, restakes, doubts, slashes)
    if (metadata.credAmount || metadata.amount) {
      context.credAmount = metadata.credAmount || metadata.amount;
    }
  } catch (error) {
    console.error("Error fetching notification context:", error);
  }

  return context;
}
