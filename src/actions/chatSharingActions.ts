"use server";

import { db } from "@/services/db";
import { chatsTable } from "@/db/tables/chatsTable";
import { getUserId } from "./getUserId";
import { eq, and } from "drizzle-orm";
import { nanoid } from "nanoid";
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
 * Makes a chat shareable and returns its share ID.
 * Verifies ownership and generates a share ID if one doesn't exist.
 * @param chatId The ID of the chat to share.
 * @returns Promise<{ success: boolean; shareId: string | null; error?: string }>
 */
export async function shareChat(
  chatId: string
): Promise<{ success: boolean; shareId: string | null; error?: string }> {
  const userId = await getUserId();
  if (!userId) {
    return { success: false, shareId: null, error: "Authentication required." };
  }

  if (!chatId) {
    return { success: false, shareId: null, error: "Chat ID required." };
  }

  const startTime = Date.now();
  console.log(`[shareChat ${chatId}] Start`);

  try {
    // Check ownership and get current share status/ID
    console.log(`[shareChat ${chatId}] Querying existing chat...`);
    const queryStartTime = Date.now();
    const existing = await db
      .select({
        share_id: chatsTable.share_id,
        is_shared: chatsTable.is_shared,
      })
      .from(chatsTable)
      .where(
        and(
          eq(chatsTable.id, chatId),
          eq(chatsTable.userId, userId),
          eq(chatsTable.is_deleted, false)
        )
      )
      .limit(1);
    const queryEndTime = Date.now();
    console.log(
      `[shareChat ${chatId}] Query finished in ${queryEndTime - queryStartTime}ms.`
    );

    if (existing.length === 0) {
      console.log(`[shareChat ${chatId}] Chat not found or access denied.`);
      return {
        success: false,
        shareId: null,
        error: "Chat not found or access denied.",
      };
    }

    let shareId = existing[0].share_id;
    let needsUpdate = !existing[0].is_shared || !shareId;

    if (!shareId) {
      shareId = nanoid(10); // Generate a new, shorter share ID
      needsUpdate = true;
    }

    if (needsUpdate) {
      console.log(`[shareChat ${chatId}] Needs update. Performing update...`);
      const updateStartTime = Date.now();
      await db
        .update(chatsTable)
        .set({ is_shared: true, share_id: shareId, updatedAt: new Date() })
        .where(eq(chatsTable.id, chatId));
      console.log(
        `[shareChat] Updated chat ${chatId} to be shared with shareId: ${shareId}`
      );
      const updateEndTime = Date.now();
      console.log(
        `[shareChat ${chatId}] Update finished in ${updateEndTime - updateStartTime}ms.`
      );
    } else {
      console.log(
        `[shareChat] Chat ${chatId} already shared with shareId: ${shareId}`
      );
    }

    const endTime = Date.now();
    console.log(
      `[shareChat ${chatId}] Completed successfully in ${endTime - startTime}ms.`
    );
    return { success: true, shareId: shareId };
  } catch (error) {
    const errorEndTime = Date.now();
    console.error(
      `[shareChat ${chatId}] Error after ${errorEndTime - startTime}ms:`,
      error
    );
    return { success: false, shareId: null, error: "Failed to share chat." };
  }
}

/**
 * Fetches the content of a shared chat using its share ID.
 * Does not require authentication.
 * @param shareId The unique share ID of the chat.
 * @returns Promise<SharedChatContent | null>
 */
export async function getSharedChat(
  shareId: string
): Promise<SharedChatContent | null> {
  if (!shareId) {
    console.log("[getSharedChat] No shareId provided.");
    return null;
  }
  console.log(
    `[getSharedChat] Attempting to fetch chat for shareId: ${shareId}`
  );

  try {
    const result = await db
      .select({
        title: chatsTable.title,
        messages: chatsTable.messages,
      })
      .from(chatsTable)
      .where(
        and(
          eq(chatsTable.share_id, shareId),
          eq(chatsTable.is_shared, true),
          eq(chatsTable.is_deleted, false)
        )
      )
      .limit(1);

    console.log(`[getSharedChat] Query result for shareId ${shareId}:`, result);

    if (result.length === 0) {
      console.log(
        `[getSharedChat] Shared chat not found for shareId: ${shareId}`
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
        `[getSharedChat] Failed Zod validation for shareId ${shareId}:`,
        validatedContent.error,
        "Raw data:",
        chatData
      );
      return null;
    }

    return validatedContent.data;
  } catch (error) {
    console.error(
      `[getSharedChat] Error fetching shared chat for shareId ${shareId}:`,
      error
    );
    return null;
  }
}
