"use server";

import { db } from "@/services/db";
import { chatsTable } from "@/db/tables/chatsTable";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import type { ViewpointGraph } from "@/types/chat";

const SharedChatContentSchema = z.object({
  title: z.string(),
  messages: z.array(
    z.object({
      role: z.enum(["user", "assistant", "system"]),
      content: z.string(),
      sources: z
        .array(
          z.object({ type: z.string(), id: z.union([z.string(), z.number()]) })
        )
        .optional(),
    })
  ),
  graph: z.custom<ViewpointGraph>().optional(),
});
export type SharedChatContent = z.infer<typeof SharedChatContentSchema>;

/**
 * Fetches the content of a chat using its original chat ID.
 * Only checks that the chat is not deleted.
 * Does not require authentication or check is_shared flag.
 * @param chatId The original ID of the chat to fetch.
 * @returns Promise<SharedChatContent | null>
 */
export async function fetchSharedChatContent(
  chatId: string
): Promise<SharedChatContent | null> {
  if (!chatId) {
    return null;
  }

  try {
    const result = await db
      .select({
        title: chatsTable.title,
        messages: chatsTable.messages,
        graph: chatsTable.graph,
      })
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.is_deleted, false)))
      .limit(1);

    if (result.length === 0) {
      return null;
    }

    const raw = result[0];
    const chatData = {
      title: raw.title,
      messages:
        typeof raw.messages === "string"
          ? JSON.parse(raw.messages)
          : raw.messages,
      graph: raw.graph ?? undefined,
    };

    const validatedContent = SharedChatContentSchema.safeParse(chatData);
    if (!validatedContent.success) {
      return null;
    }

    return validatedContent.data;
  } catch (error) {
    return null;
  }
}
