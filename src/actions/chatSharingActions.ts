"use server";

import { db } from "@/services/db";
import { chatsTable } from "@/db/tables/chatsTable";
import { getUserId } from "./getUserId";
import { eq, and } from "drizzle-orm";
import { z } from "zod";

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
    console.log("[fetchSharedChatContent] No chatId provided.");
    return null;
  }
  console.log(
    `[fetchSharedChatContent] Attempting to fetch chat for chatId: ${chatId}`
  );

  try {
    const result = await db
      .select({
        title: chatsTable.title,
        messages: chatsTable.messages,
      })
      .from(chatsTable)
      .where(and(eq(chatsTable.id, chatId), eq(chatsTable.is_deleted, false)))
      .limit(1);

    console.log(
      `[fetchSharedChatContent] Query result for chatId ${chatId}:`,
      result
    );

    if (result.length === 0) {
      console.log(
        `[fetchSharedChatContent] Chat not found or deleted for chatId: ${chatId}`
      );
      return null;
    }

    const chatData = {
      ...result[0],
      messages:
        typeof result[0].messages === "string"
          ? JSON.parse(result[0].messages)
          : result[0].messages,
    };

    const validatedContent = SharedChatContentSchema.safeParse(chatData);
    if (!validatedContent.success) {
      console.error(
        `[fetchSharedChatContent] Failed Zod validation for chatId ${chatId}:`,
        validatedContent.error,
        "Raw data:",
        chatData
      );
      return null;
    }

    return validatedContent.data;
  } catch (error) {
    console.error(
      `[fetchSharedChatContent] Error fetching shared chat for chatId ${chatId}:`,
      error
    );
    return null;
  }
}
